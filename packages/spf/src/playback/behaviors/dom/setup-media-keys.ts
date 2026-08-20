/**
 * **Own the EME lifecycle for the current source.** When a mediaElement and a
 * resolved presentation whose tracks declare DRM keys are both in scope,
 * negotiates a key system over the configured license servers (the minimal
 * key-system probe — capability-probing's full async probe supersedes it when
 * that lands), creates and attaches MediaKeys, opens one MediaKeySession per
 * manifest-carried init data (Widevine PSSH / PlayReady PRO as `data:` URIs),
 * and exchanges each license message against the chosen system's server.
 *
 * Publishes the attached MediaKeys on `context.mediaKeys` and drives the
 * `awaitingMediaKeys` load gate: raised synchronously on entry, lowered once
 * MediaKeys attach. Appending encrypted data with no MediaKeys attached
 * misbehaves on Chromium, so the segment-load dispatchers park while the gate
 * is up (see `load-segments.ts`); compose this behavior ahead of them so the
 * gate is up before their first dispatch. Failures report onto the errors
 * sequence via `emitError` (SVTA 4008 no usable key system, 4010 MediaKeys
 * init, 4004 license request, 4016 license rejected, 4021 request
 * generation); a refused negotiation leaves the gate up — playback stays
 * parked rather than failing decode, and severity is the adapter's call.
 *
 * Single-positive-state reactor riding the resolver's resolved/unresolved
 * lifecycle, like `setupMediaSource`: source replacement routes through
 * `'preconditions-unmet'`, whose state-exit cleanup closes sessions, detaches
 * MediaKeys (`setMediaKeys(null)`), and clears both slots before the next
 * source's setup runs. Teardown-per-source is deliberate — MediaKeys re-use
 * across sources is an optimization with prior art (see drm-support.md).
 *
 * Sole writer of `context.mediaKeys` and `state.awaitingMediaKeys`. Composed
 * only into DRM engine variants — non-DRM compositions carry neither the
 * machinery nor the gate slot.
 *
 * Out of scope for the first slice (tracked in drm-support.md):
 * `encrypted`-event fallback for keys with no manifest init data (FairPlay
 * `skd://`), server-certificate fetch, key rotation / keys declared after
 * entry, and `keystatuschange` reactivity.
 */
import { listen } from '@videojs/utils/dom';
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal, type Signal } from '../../../core/signals/primitives';
import {
  attachMediaKeys,
  buildKeySystemConfigurations,
  contentTypesFromPresentation,
  type DrmSystemsConfig,
  declaredDrmKeys,
  fetchLicense,
  initDataFromKeyUri,
  KEY_SYSTEM_BY_KEY_FORMAT,
  keySystemCandidates,
  requestKeySystemAccess,
} from '../../../media/dom/eme';
import {
  SVTA_BAD_LICENSE_REQUEST,
  SVTA_DRM_INITIALIZATION_ERROR,
  SVTA_DRM_LICENSE_REJECTED,
  SVTA_DRM_LICENSE_REQUEST_GENERATION_FAILED,
  SVTA_UNSUPPORTED_DRM_SYSTEM,
} from '../../../media/errors';
import { isResolvedPresentation, type MaybeResolvedPresentation } from '../../../media/types';
import { type ErrorEmitterState, emitError } from '../collect-errors';

/** State shape for MediaKeys setup. */
export interface MediaKeysState {
  presentation?: MaybeResolvedPresentation;
  /** DRM load gate; semantics on `SegmentLoadingState['awaitingMediaKeys']`. */
  awaitingMediaKeys?: boolean;
}

/** Context shape for MediaKeys setup. */
export interface MediaKeysContext {
  mediaElement?: HTMLMediaElement | undefined;
  mediaKeys?: MediaKeys;
}

/** Config for MediaKeys setup. */
export interface MediaKeysSetupConfig {
  /**
   * License servers keyed by EME key-system id — `source.drm`'s shape.
   * Required: license URLs are intrinsically source- or provider-specific,
   * so no default exists; the DRM engine variant supplies it.
   */
  drm: DrmSystemsConfig;
}

type MediaKeysFsmState = 'preconditions-unmet' | 'media-keys-required';

function setupMediaKeysSetup({
  state,
  context,
  config,
}: {
  state: {
    presentation: ReadonlySignal<MediaKeysState['presentation']>;
    awaitingMediaKeys: Signal<MediaKeysState['awaitingMediaKeys']>;
  } & ErrorEmitterState;
  context: {
    mediaElement: ReadonlySignal<MediaKeysContext['mediaElement']>;
    mediaKeys: Signal<MediaKeysContext['mediaKeys']>;
  };
  config: MediaKeysSetupConfig;
}): Reactor<MediaKeysFsmState | 'destroying' | 'destroyed'> {
  const derivedStateSignal = computed<MediaKeysFsmState>(() => {
    const presentation = state.presentation.get();
    if (!context.mediaElement.get() || !isResolvedPresentation(presentation)) return 'preconditions-unmet';
    // Keys are declared per media playlist, so this flips only once an
    // encrypted rendition has resolved — exactly when encrypted segments
    // become loadable.
    if (declaredDrmKeys(presentation).length === 0) return 'preconditions-unmet';
    return 'media-keys-required';
  });

  return createMachineReactor<MediaKeysFsmState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},

      'media-keys-required': {
        // entry body is auto-untracked. Raises the gate synchronously, then
        // runs the async EME pipeline; state-exit cleanup aborts in-flight
        // work and tears the attachment down in order.
        entry: () => {
          const mediaElement = context.mediaElement.get()!;
          const presentation = state.presentation.get()!;
          const controller = new AbortController();
          const sessions: MediaKeySession[] = [];

          state.awaitingMediaKeys.set(true);

          const negotiate = async () => {
            const keys = declaredDrmKeys(presentation);
            const candidates = keySystemCandidates(keys, config.drm);
            const result = await requestKeySystemAccess(
              candidates,
              buildKeySystemConfigurations(contentTypesFromPresentation(presentation))
            );
            if (controller.signal.aborted) return;
            if (!result) {
              // Gate stays up: parked playback beats guaranteed decode
              // failure. Severity is the adapter's call, per errors.md.
              emitError(state, { code: SVTA_UNSUPPORTED_DRM_SYSTEM, data: { keySystems: candidates } });
              return;
            }

            const mediaKeys = await result.access.createMediaKeys();
            if (controller.signal.aborted) return;
            await attachMediaKeys(mediaElement, mediaKeys);
            if (controller.signal.aborted) {
              attachMediaKeys(mediaElement, null).catch(() => {});
              return;
            }
            context.mediaKeys.set(mediaKeys);
            state.awaitingMediaKeys.set(false);

            // One session per manifest-carried init data of the chosen
            // system. Keys without inline init data (FairPlay `skd://`) wait
            // on the encrypted-event fallback (out of slice).
            const { keySystem } = result;
            const { licenseUrl } = config.drm[keySystem]!;
            const exchange = async (session: MediaKeySession, message: BufferSource) => {
              let license: Uint8Array<ArrayBuffer>;
              try {
                license = await fetchLicense(licenseUrl, message, controller.signal);
              } catch (error) {
                if (controller.signal.aborted) return;
                emitError(state, { code: SVTA_BAD_LICENSE_REQUEST, data: { keySystem, reason: String(error) } });
                return;
              }
              try {
                await session.update(license);
              } catch (error) {
                if (controller.signal.aborted) return;
                emitError(state, { code: SVTA_DRM_LICENSE_REJECTED, data: { keySystem, reason: String(error) } });
              }
            };
            for (const key of keys) {
              if (key.keyFormat === undefined || KEY_SYSTEM_BY_KEY_FORMAT[key.keyFormat] !== keySystem) continue;
              const initData = key.uri === undefined ? undefined : initDataFromKeyUri(key.uri);
              if (!initData) continue;

              const session = mediaKeys.createSession();
              sessions.push(session);
              listen(session, 'message', (event) => void exchange(session, (event as MediaKeyMessageEvent).message), {
                signal: controller.signal,
              });
              session.generateRequest('cenc', initData).catch((error) => {
                if (controller.signal.aborted) return;
                emitError(state, {
                  code: SVTA_DRM_LICENSE_REQUEST_GENERATION_FAILED,
                  data: { keySystem, reason: String(error) },
                });
              });
            }
          };

          negotiate().catch((error) => {
            if (controller.signal.aborted) return;
            emitError(state, { code: SVTA_DRM_INITIALIZATION_ERROR, data: { reason: String(error) } });
          });

          // State-exit cleanup — source unload, element detach, or destroy.
          // Order: abort first (kills the negotiation and the message
          // listeners), close sessions, clear the slots, then detach.
          return () => {
            controller.abort();
            for (const session of sessions) session.close().catch(() => {});
            context.mediaKeys.set(undefined);
            state.awaitingMediaKeys.set(false);
            attachMediaKeys(mediaElement, null).catch(() => {});
          };
        },
      },
    },
  });
}

export const setupMediaKeys = defineBehavior({
  stateKeys: ['presentation', 'awaitingMediaKeys'],
  contextKeys: ['mediaElement', 'mediaKeys'],
  setup: setupMediaKeysSetup,
});
