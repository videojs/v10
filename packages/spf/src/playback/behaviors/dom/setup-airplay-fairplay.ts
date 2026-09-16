/**
 * **Serve an AirPlay receiver's FairPlay key requests.** During an AirPlay session WebKit takes playback off MSE and
 * onto the native-HLS fallback `<source>` `setupAirPlay` appends, and the receiver raises its own key requests through
 * the sender's CDM as `skd`. The MediaKeys `setupMediaKeys` negotiated are configured for `sinf`/`cenc` and cannot
 * serve those, so it yields the element for the session's duration (an observed `loadingSuspended` is
 * `preconditions-unmet` there) and this behavior negotiates a second time, for `skd`, in the gap it leaves.
 *
 * The handoff is needed regardless of any browser bug: it is the init-data type, not a workaround, that the MSE
 * negotiation cannot satisfy.
 *
 * Negotiation is driven by the receiver's first request rather than by the session starting. A session on a FairPlay
 * source does not by itself mean the receiver needs anything from this CDM, and the shipped native path
 * (`adapters/native-hls-video/src/drm.ts`) resolves its key system the same lazy way. Every request awaits the one
 * negotiation, so the certificate is always applied before any `generateRequest` — the same ordering `setupMediaKeys`
 * carries across its publish, here carried by the promise.
 *
 * Deliberately **not** a writer of `context.mediaKeys`. That slot is `setupMediaKeys`' handoff to `exchangeLicenses`,
 * and publishing receiver MediaKeys into it would wake `exchangeLicenses` to license an MSE pipeline that is not
 * playing. These MediaKeys stay behavior-local, and a cleared `context.mediaKeys` is instead read as the gate proving
 * `setupMediaKeys` has finished yielding.
 *
 * Nothing here dedupes. `listenForEncryptedInitData`'s byte-identity skip is right for MSE, where demuxed audio and
 * video fire for the same key, and wrong here: the receiver proxies its own SPC on connect and again on disconnect, so
 * a repeat is a second genuine request and dropping it strands the session.
 *
 * Single-positive-state reactor like `exchangeLicenses`, with one `AbortController` per entry — the state-exit cleanup
 * is the abort, which closes every session, plus a detach of the MediaKeys this behavior attached. The detach is
 * conditional: both this behavior and `setupMediaKeys` react to the same falling edge, so it releases the element only
 * while it still holds it, exactly as the native path does.
 *
 * **Compose it ahead of `setupMediaKeys`**, beside `exchangeLicenses` and for the same reason: `createComposition`
 * calls cleanups in registration order, so the receiver MediaKeys detach before the re-entering negotiation attaches
 * its own.
 *
 * Droppable. A composition omitting it carries neither `fairPlayAirPlayKeySystem` nor this file, and — since
 * `loadingSuspended` is observed rather than declared — an engine without `setupAirPlay` never leaves
 * `'preconditions-unmet'` anyway. The legacy `WebKitMediaKeys` / `com.apple.fps.1_0` fallback for senders whose EME
 * cannot generate a request at all during a session stays out of scope, pending a device re-check (drm-support.md).
 */
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal } from '../../../core/signals/primitives';
import {
  attachMediaKeys,
  declaredDrmKeys,
  type DrmSystemsConfig,
  fetchServerCertificate,
  type KeySystemModule,
  keySystemCandidates,
  requestKeySystemAccess,
  resolveDrmUrl,
} from '../../../media/dom/eme';
import { fairPlayAirPlayKeySystem } from '../../../media/dom/key-systems';
import { listenForEncryptedInitData, openLicenseSession } from '../../../media/dom/license-sessions';
import {
  SVTA_DRM_CERTIFICATE_ERROR,
  SVTA_DRM_INITIALIZATION_ERROR,
  SVTA_UNSUPPORTED_DRM_SYSTEM,
  type SvtaError,
} from '../../../media/errors';
import { isResolvedPresentation, type MaybeResolvedPresentation } from '../../../media/types';
import { type ErrorEmitterState, emitError } from '../collect-errors';

/**
 * What an AirPlay receiver's key requests arrive as. FairPlay's `skd://` key URI carries no EME init data, so the
 * request comes from the element rather than the manifest — and it is this type, not MSE's `sinf`, that the MediaKeys
 * negotiated for the MSE pipeline cannot serve.
 */
const AIRPLAY_INIT_DATA_TYPE = 'skd';

/**
 * What FairPlay negotiates capabilities against for the receiver: the manifest, not a codec. The receiver plays the
 * native-HLS fallback source, so the renditions the MSE pipeline resolved say nothing about what it will decode.
 * Matches the shipped native path's configuration.
 */
const AIRPLAY_CONTENT_TYPE = 'application/vnd.apple.mpegurl';

/** State shape for the AirPlay FairPlay handoff. */
export interface AirPlayFairPlayState {
  presentation?: MaybeResolvedPresentation;
}

/** Context shape for the AirPlay FairPlay handoff. */
export interface AirPlayFairPlayContext {
  mediaElement?: HTMLMediaElement | undefined;
  /** `setupMediaKeys`' handoff slot, read here only as proof that it has yielded the element. */
  mediaKeys?: MediaKeys;
}

/** Config for the AirPlay FairPlay handoff. */
export interface AirPlayFairPlayConfig {
  /** License servers keyed by EME key-system id. Semantics on `MediaKeysSetupConfig['drm']`. */
  drm: DrmSystemsConfig;
  /** The key systems this composition can negotiate. Semantics on `MediaKeysSetupConfig['keySystems']`. */
  keySystems: readonly KeySystemModule[];
}

// Type aliases, not interfaces: `defineBehavior`'s stateKeys ≡ keyof inference
// goes through an index-signature constraint only aliases satisfy implicitly.
// The `errors` reporter seam stays out of the typed slice, as in the other two
// DRM behaviors. Every slot is read-only — this behavior writes none.
type AirPlayFairPlayStateMap = {
  presentation: ReadonlySignal<AirPlayFairPlayState['presentation']>;
};

type AirPlayFairPlayContextMap = {
  mediaElement: ReadonlySignal<AirPlayFairPlayContext['mediaElement']>;
  mediaKeys: ReadonlySignal<AirPlayFairPlayContext['mediaKeys']>;
};

type AirPlayFairPlayFsmState = 'preconditions-unmet' | 'serving-receiver';

function setupAirPlayFairPlaySetup({
  state,
  context,
  config,
}: {
  state: AirPlayFairPlayStateMap & ErrorEmitterState;
  context: AirPlayFairPlayContextMap;
  config: AirPlayFairPlayConfig;
}): Reactor<AirPlayFairPlayFsmState | 'destroying' | 'destroyed'> {
  // Observed, never declared — see `setupMediaKeys` for why the slot lives
  // behind a cast. Absent means no AirPlay bridge is composed, so there is no
  // session to serve and this behavior never activates.
  const loadingSuspended = (state as { loadingSuspended?: ReadonlySignal<boolean | undefined> }).loadingSuspended;

  const report = (error: SvtaError) => emitError(state, error);

  const derivedStateSignal = computed<AirPlayFairPlayFsmState>(() => {
    if (!context.mediaElement.get() || !loadingSuspended?.get()) return 'preconditions-unmet';

    // `setupMediaKeys` yields on the same fact, but not instantly — it has a
    // task to abort and an element to detach. Waiting for its slot to clear is
    // what keeps two CDMs off one element.
    if (context.mediaKeys.get()) return 'preconditions-unmet';

    const presentation = state.presentation.get();
    if (!isResolvedPresentation(presentation)) return 'preconditions-unmet';

    // A declared FairPlay KEYFORMAT *and* a `com.apple.fps` license server that
    // resolves, against the modules this composition actually carries: an
    // engine composed without FairPlay does not grow it back here.
    const carriesFairPlay = config.keySystems.some(({ keySystem }) => keySystem === fairPlayAirPlayKeySystem.keySystem);
    if (!carriesFairPlay) return 'preconditions-unmet';

    const candidates = keySystemCandidates(declaredDrmKeys(presentation), config.drm, [fairPlayAirPlayKeySystem]);

    return candidates.length > 0 ? 'serving-receiver' : 'preconditions-unmet';
  });

  return createMachineReactor<AirPlayFairPlayFsmState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},

      'serving-receiver': {
        // entry body is auto-untracked. Arms the receiver's request listener and
        // negotiates lazily behind it; everything binds to one controller, so
        // state-exit cleanup is the abort plus the conditional detach.
        entry: () => {
          const mediaElement = context.mediaElement.get()!;
          const entry = config.drm[fairPlayAirPlayKeySystem.keySystem]!;
          const controller = new AbortController();
          const { signal } = controller;

          /** The MediaKeys this behavior attached, for the conditional detach below. */
          let attached: MediaKeys | undefined;

          const negotiate = async (): Promise<MediaKeys | undefined> => {
            const licenseUrl = resolveDrmUrl(entry.licenseUrl);

            // The gate resolved this once already; a source mutated since can
            // answer nothing, and POSTing to a literal "undefined" is worse
            // than saying so.
            if (licenseUrl === undefined) {
              report({
                code: SVTA_UNSUPPORTED_DRM_SYSTEM,
                data: {
                  keySystems: [fairPlayAirPlayKeySystem.keySystem],
                  reason: 'no license server for the receiver',
                },
              });
              return undefined;
            }

            const negotiated = await requestKeySystemAccess(
              [fairPlayAirPlayKeySystem],
              { video: [AIRPLAY_CONTENT_TYPE], audio: [] },
              undefined
            );

            if (!negotiated) {
              report({ code: SVTA_UNSUPPORTED_DRM_SYSTEM, data: { keySystems: [fairPlayAirPlayKeySystem.keySystem] } });
              return undefined;
            }

            let mediaKeys: MediaKeys;

            try {
              mediaKeys = await negotiated.access.createMediaKeys();
            } catch (error) {
              report({ code: SVTA_DRM_INITIALIZATION_ERROR, data: { reason: String(error) } });
              return undefined;
            }

            // FairPlay needs its application certificate before the CDM will
            // generate an SPC, so this precedes the attach and every caller
            // awaits it.
            const certificateUrl = resolveDrmUrl(entry.serverCertificateUrl);

            if (certificateUrl !== undefined) {
              try {
                await mediaKeys.setServerCertificate(
                  await fetchServerCertificate(fairPlayAirPlayKeySystem, entry, certificateUrl, signal)
                );
              } catch (error) {
                if (signal.aborted) return undefined;

                report({
                  code: SVTA_DRM_CERTIFICATE_ERROR,
                  data: { keySystem: fairPlayAirPlayKeySystem.keySystem, reason: String(error) },
                });
                return undefined;
              }
            }

            if (signal.aborted) return undefined;

            await attachMediaKeys(mediaElement, mediaKeys);

            // The cleanup may have run while the attach was in flight; undo it
            // on the spot rather than leaving the element holding a CDM nobody
            // owns.
            if (signal.aborted) {
              attachMediaKeys(mediaElement, null).catch(() => {});
              return undefined;
            }

            attached = mediaKeys;
            return mediaKeys;
          };

          // One negotiation per session, shared by every request. Kicked off by
          // the first request rather than by entry: a session on a FairPlay
          // source is not itself evidence the receiver wants anything from this
          // CDM.
          let negotiation: Promise<MediaKeys | undefined> | undefined;

          const serve = async (initDataType: string, initData: Uint8Array<ArrayBuffer>) => {
            const mediaKeys = await (negotiation ??= negotiate());
            if (!mediaKeys || signal.aborted) return;

            openLicenseSession({
              mediaKeys,
              keySystem: fairPlayAirPlayKeySystem.keySystem,
              module: fairPlayAirPlayKeySystem,
              entry,
              licenseUrl: resolveDrmUrl(entry.licenseUrl)!,
              initDataType,
              initData,
              signal,
              report,
            });
          };

          listenForEncryptedInitData(
            mediaElement,
            (initDataType, initData) => void serve(initDataType, initData),
            signal,
            {
              dedupe: false,
              initDataTypes: [AIRPLAY_INIT_DATA_TYPE],
            }
          );

          // State-exit cleanup — session ends, source unload, element detach, or
          // destroy. The abort kills in-flight license work and the listeners
          // first, then closes each session; the detach releases the element
          // only while these MediaKeys are still the ones on it, since
          // `setupMediaKeys` re-negotiates off the same falling edge.
          return () => {
            controller.abort();

            if (attached && mediaElement.mediaKeys === attached) {
              attachMediaKeys(mediaElement, null).catch(() => {});
            }
          };
        },
      },
    },
  });
}

export const setupAirPlayFairPlay = defineBehavior({
  stateKeys: ['presentation'],
  contextKeys: ['mediaElement', 'mediaKeys'],
  setup: ({
    state,
    context,
    config,
  }: {
    state: AirPlayFairPlayStateMap;
    context: AirPlayFairPlayContextMap;
    config: AirPlayFairPlayConfig;
  }) => setupAirPlayFairPlaySetup({ state, context, config }),
});
