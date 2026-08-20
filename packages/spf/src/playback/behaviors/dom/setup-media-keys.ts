/**
 * **Own the EME lifecycle for the current source.** When a mediaElement and a
 * resolved presentation whose tracks declare DRM keys are both in scope,
 * negotiates a key system over the configured license servers (the minimal
 * key-system probe — capability-probing's full async probe supersedes it when
 * that lands) with per-system init-data types and the declared encryption
 * scheme, creates MediaKeys, applies the server certificate when the chosen
 * system configures one (FairPlay can't request a license without it), and
 * attaches. Sessions open manifest-driven — one per inline init data
 * (Widevine PSSH / PlayReady PRO as `data:` URIs) — or, when the manifest
 * carries none (FairPlay `skd://`), event-driven off the element's
 * `encrypted` events, deduped by init-data bytes. Each license message is
 * exchanged against the chosen system's server.
 *
 * Publishes the attached MediaKeys on `context.mediaKeys` and drives the
 * `awaitingMediaKeys` load gate: raised synchronously on entry, lowered once
 * MediaKeys attach. Appending encrypted data with no MediaKeys attached
 * misbehaves on Chromium, so the segment-load dispatchers park while the gate
 * is up (see `load-segments.ts`); compose this behavior ahead of them so the
 * gate is up before their first dispatch — but lowered on *attach*, not on
 * license: the appends that follow are what fire `encrypted` for the
 * event-driven path, and browsers queue decode on missing keys. Failures
 * report onto the errors sequence via `emitError` (SVTA 4008 no usable key
 * system, 4010 MediaKeys init, 4013 certificate, 4004 license request, 4016
 * license rejected, 4021 request generation); a refused negotiation or
 * failed certificate leaves the gate up — playback stays parked rather than
 * failing decode, and severity is the adapter's call.
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
 * Still out of scope (tracked in drm-support.md): key rotation / keys
 * declared after entry, `keystatuschange` reactivity, and per-vendor license
 * body shaping (Mux takes the raw message as octet-stream for every system).
 */
import { listen } from '@videojs/utils/dom';
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal, type Signal } from '../../../core/signals/primitives';
import {
  attachMediaKeys,
  contentTypesFromPresentation,
  type DrmSystemsConfig,
  declaredDrmKeys,
  declaredEncryptionScheme,
  fetchLicense,
  fetchServerCertificate,
  initDataFromKeyUri,
  KEY_SYSTEM_BY_KEY_FORMAT,
  keySystemCandidates,
  requestKeySystemAccess,
  shapeLicenseRequest,
  toCencInitData,
} from '../../../media/dom/eme';
import {
  SVTA_BAD_LICENSE_REQUEST,
  SVTA_DRM_CERTIFICATE_ERROR,
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
              contentTypesFromPresentation(presentation),
              declaredEncryptionScheme(keys)
            );
            if (controller.signal.aborted) return;
            if (!result) {
              // Gate stays up: parked playback beats guaranteed decode
              // failure. Severity is the adapter's call, per errors.md.
              emitError(state, { code: SVTA_UNSUPPORTED_DRM_SYSTEM, data: { keySystems: candidates } });
              return;
            }

            const { keySystem } = result;
            const { licenseUrl, serverCertificateUrl } = config.drm[keySystem]!;
            const mediaKeys = await result.access.createMediaKeys();
            if (controller.signal.aborted) return;

            // FairPlay can't generate a license request without the server
            // (application) certificate, so its failure parks the source like
            // an unusable key system rather than proceeding to certain
            // failure. Skipped entirely when the config names no URL.
            if (serverCertificateUrl !== undefined) {
              try {
                const certificate = await fetchServerCertificate(serverCertificateUrl, controller.signal);
                await mediaKeys.setServerCertificate(certificate);
              } catch (error) {
                if (controller.signal.aborted) return;
                emitError(state, { code: SVTA_DRM_CERTIFICATE_ERROR, data: { keySystem, reason: String(error) } });
                return;
              }
              if (controller.signal.aborted) return;
            }

            await attachMediaKeys(mediaElement, mediaKeys);
            if (controller.signal.aborted) {
              attachMediaKeys(mediaElement, null).catch(() => {});
              return;
            }
            context.mediaKeys.set(mediaKeys);
            state.awaitingMediaKeys.set(false);

            const exchange = async (session: MediaKeySession, message: BufferSource) => {
              const { body, headers } = shapeLicenseRequest(keySystem, message);
              let license: Uint8Array<ArrayBuffer>;
              try {
                license = await fetchLicense(licenseUrl, body, controller.signal, headers);
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
            const openSession = (initDataType: string, initData: Uint8Array<ArrayBuffer>) => {
              const session = mediaKeys.createSession();
              sessions.push(session);
              listen(session, 'message', (event) => void exchange(session, (event as MediaKeyMessageEvent).message), {
                signal: controller.signal,
              });
              session.generateRequest(initDataType, initData).catch((error) => {
                if (controller.signal.aborted) return;
                emitError(state, {
                  code: SVTA_DRM_LICENSE_REQUEST_GENERATION_FAILED,
                  data: { keySystem, reason: String(error) },
                });
              });
            };

            // One session per manifest-carried init data of the chosen system
            // (Widevine PSSH / PlayReady PRO as `data:` URIs).
            for (const key of keys) {
              if (key.keyFormat === undefined || KEY_SYSTEM_BY_KEY_FORMAT[key.keyFormat] !== keySystem) continue;
              const initData = key.uri === undefined ? undefined : initDataFromKeyUri(key.uri);
              if (!initData) continue;
              openSession('cenc', toCencInitData(keySystem, initData));
            }

            // Event-driven fallback: keys without inline init data (FairPlay
            // `skd://`) surface protection only once an appended init segment
            // fires `encrypted` (`sinf` on the MSE path). Active only when the
            // manifest path opened no session — on manifest-licensed sources
            // appends re-fire `encrypted` for content already being licensed,
            // and reacting would double-license. Deduped by init-data bytes:
            // demuxed audio and video both fire.
            if (sessions.length === 0) {
              const seenInitData: Uint8Array[] = [];
              listen(
                mediaElement,
                'encrypted',
                (event) => {
                  const { initDataType, initData } = event as MediaEncryptedEvent;
                  if (!initData) return;
                  const bytes = new Uint8Array(initData);
                  const isSeen = seenInitData.some(
                    (seen) => seen.length === bytes.length && seen.every((byte, i) => byte === bytes[i])
                  );
                  if (isSeen) return;
                  seenInitData.push(bytes);
                  openSession(initDataType, bytes);
                },
                { signal: controller.signal }
              );
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
