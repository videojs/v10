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
 * gate is up before their first dispatch. A refused negotiation or failed
 * license warns and leaves the gate up — playback stays parked rather than
 * failing decode.
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
 * entry, `keystatuschange` reactivity, and error-sequence reporting.
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
import { isResolvedPresentation, type MaybeResolvedPresentation } from '../../../media/types';

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
  };
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
              // failure. Error-sequence reporting is the slice follow-up.
              console.warn('[setupMediaKeys] no configured key system is usable for this source:', candidates);
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
            const { licenseUrl } = config.drm[result.keySystem]!;
            for (const key of keys) {
              if (key.keyFormat === undefined || KEY_SYSTEM_BY_KEY_FORMAT[key.keyFormat] !== result.keySystem) continue;
              const initData = key.uri === undefined ? undefined : initDataFromKeyUri(key.uri);
              if (!initData) continue;

              const session = mediaKeys.createSession();
              sessions.push(session);
              listen(
                session,
                'message',
                (event) => {
                  const { message } = event as MediaKeyMessageEvent;
                  fetchLicense(licenseUrl, message, controller.signal)
                    .then((license) => session.update(license))
                    .catch((error) => {
                      if (controller.signal.aborted) return;
                      console.warn('[setupMediaKeys] license exchange failed:', error);
                    });
                },
                { signal: controller.signal }
              );
              session.generateRequest('cenc', initData).catch((error) => {
                if (controller.signal.aborted) return;
                console.warn('[setupMediaKeys] license request could not be generated:', error);
              });
            }
          };

          negotiate().catch((error) => console.error('[setupMediaKeys] EME setup failed:', error));

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
