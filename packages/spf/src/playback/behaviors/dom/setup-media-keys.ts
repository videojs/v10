/**
 * **Negotiate a key system and attach its MediaKeys for the current source.** When a mediaElement and a resolved
 * presentation whose tracks declare DRM keys are both in scope, negotiates a key system over the configured license
 * servers (the minimal key-system probe — capability-probing's full async probe supersedes it when that lands) with
 * per-system init-data types and the declared encryption scheme, creates MediaKeys, applies the server certificate when
 * the chosen system configures one (FairPlay can't request a license without it), and attaches.
 *
 * Licensing is `exchangeLicenses`' job, not this behavior's. The handoff is `context.mediaKeys` +
 * `state.negotiatedKeySystem`, both published only once the certificate has been applied and the attach has resolved —
 * which is what carries the "certificate before `generateRequest`" ordering across the boundary.
 *
 * Publishes the attached MediaKeys on `context.mediaKeys`, the chosen system on `state.negotiatedKeySystem`, and drives
 * the `segmentLoadingBlocked` load gate: raised synchronously on entry, lowered once MediaKeys attach. Appending
 * encrypted data with no MediaKeys attached misbehaves on Chromium, so the segment-load dispatchers park while the gate
 * is up (see `load-segments.ts`); compose this behavior ahead of them so the gate is up before their first dispatch —
 * but lowered on _attach_, not on license: the appends that follow are what fire `encrypted` for the event-driven path,
 * and browsers queue decode on missing keys. Failures report onto the errors sequence via `emitError` (SVTA 4008 no
 * usable key system, 4010 MediaKeys init, 4013 certificate); a refused negotiation or failed certificate leaves the
 * gate up — playback stays parked rather than failing decode, and severity is the adapter's call. A refusal publishes
 * {@link NO_KEY_SYSTEM}, which is what lets rendition pruning reach the verdict `track-switching` owns.
 *
 * Single-positive-state reactor riding the resolver's resolved/unresolved lifecycle, like `setupMediaSource`: source
 * replacement routes through `'preconditions-unmet'`, whose state-exit cleanup detaches MediaKeys
 * (`setMediaKeys(null)`) and clears its slots before the next source's setup runs. Teardown-per-source is deliberate —
 * MediaKeys re-use across sources is an optimization with prior art (see drm-support.md).
 *
 * Sole writer of `context.mediaKeys`, `state.negotiatedKeySystem`, and `state.segmentLoadingBlocked`. Composed into
 * `createHlsVideoEngine` unconditionally today, degenerate on a clear source (the derived state never leaves
 * `'preconditions-unmet'`). A composition that omits it — along with `exchangeLicenses` and the two DRM-aware config
 * defaults — carries neither the machinery nor the slots, and none of this file's key-system code survives
 * tree-shaking; the DRM-free engine variant that would do so is tracked in drm-support.md.
 *
 * Still out of scope (tracked in drm-support.md): key rotation / keys declared after entry, and `keystatuschange`
 * reactivity.
 */
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal, type Signal } from '../../../core/signals/primitives';
import {
  applyCertificateRequest,
  applyCertificateResponse,
  attachMediaKeys,
  contentTypesFromPresentation,
  type DrmSystemsConfig,
  declaredDrmKeys,
  declaredEncryptionScheme,
  fetchDrm,
  type KeySystemModule,
  keySystemCandidates,
  NO_KEY_SYSTEM,
  requestKeySystemAccess,
  resolveDrmUrl,
} from '../../../media/dom/eme';
import {
  SVTA_DRM_CERTIFICATE_ERROR,
  SVTA_DRM_INITIALIZATION_ERROR,
  SVTA_UNSUPPORTED_DRM_SYSTEM,
} from '../../../media/errors';
import { isResolvedPresentation, type MaybeResolvedPresentation } from '../../../media/types';
import { type ErrorEmitterState, emitError } from '../collect-errors';

/** State shape for MediaKeys setup. */
export interface MediaKeysState {
  presentation?: MaybeResolvedPresentation;
  /** Segment-load gate; semantics on `SegmentLoadingState['segmentLoadingBlocked']`. */
  segmentLoadingBlocked?: boolean;
  /**
   * The key system negotiation settled on for the current source, or `undefined` when none has been (yet, or at all).
   *
   * The negotiation outcome as _state_, not just as the private detail it once was: `exchangeLicenses` keys its
   * per-system message shaping and license-server lookup off it, and it is the late fact rendition pruning can't
   * otherwise learn — pruning runs before the CDM has been asked, so a rendition naming a configured server survives it
   * and only negotiation reveals the CDM is absent.
   */
  negotiatedKeySystem?: string;
}

/** Context shape for MediaKeys setup. */
export interface MediaKeysContext {
  mediaElement?: HTMLMediaElement | undefined;
  mediaKeys?: MediaKeys;
}

/** Config for MediaKeys setup. */
export interface MediaKeysSetupConfig {
  /**
   * License servers keyed by EME key-system id — `source.drm`'s shape. Required: license URLs are intrinsically source-
   * or provider-specific, so no default exists; the DRM engine variant supplies it.
   */
  drm: DrmSystemsConfig;
  /**
   * The key systems this composition can negotiate, most-preferred first. Required for the same reason `drm` is: which
   * systems an engine carries is a composition decision, and each module dropped from the list drops its own
   * negotiation, init-data, and license-shaping code with it.
   */
  keySystems: readonly KeySystemModule[];
}

type MediaKeysFsmState = 'preconditions-unmet' | 'media-keys-required';

function setupMediaKeysSetup({
  state,
  context,
  config,
}: {
  state: {
    presentation: ReadonlySignal<MediaKeysState['presentation']>;
    segmentLoadingBlocked: Signal<MediaKeysState['segmentLoadingBlocked']>;
    negotiatedKeySystem: Signal<MediaKeysState['negotiatedKeySystem']>;
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

          state.segmentLoadingBlocked.set(true);

          const negotiate = async () => {
            const keys = declaredDrmKeys(presentation);
            const candidates = keySystemCandidates(keys, config.drm, config.keySystems);
            const result = await requestKeySystemAccess(
              candidates,
              contentTypesFromPresentation(presentation),
              declaredEncryptionScheme(keys)
            );

            if (controller.signal.aborted) return;

            if (!result) {
              // Gate stays up: parked playback beats guaranteed decode
              // failure. Severity is the adapter's call, per errors.md.
              emitError(state, {
                code: SVTA_UNSUPPORTED_DRM_SYSTEM,
                data: { keySystems: candidates.map((module_) => module_.keySystem) },
              });

              // Cause reported; the verdict is `track-switching`'s. Publishing
              // the refusal re-fires its constraint chain, where
              // `excludeRefusedKeySystems` prunes every encrypted rendition —
              // so a type left with nothing reports
              // SVTA_NO_SUPPORTED_{VIDEO,AUDIO}_TRACK from its owner, and a
              // type keeping a clear one still reports nothing. Set after the
              // cause so the sequence reads cause-then-verdict.
              state.negotiatedKeySystem.set(NO_KEY_SYSTEM);
              return;
            }

            const { keySystem } = result.module;
            const entry = config.drm[keySystem]!;
            const serverCertificateUrl = resolveDrmUrl(entry.serverCertificateUrl);
            const mediaKeys = await result.access.createMediaKeys();

            if (controller.signal.aborted) return;

            // FairPlay can't generate a license request without the server
            // (application) certificate, so its failure parks the source like
            // an unusable key system rather than proceeding to certain
            // failure. Skipped entirely when no certificate URL resolves.
            if (serverCertificateUrl !== undefined) {
              try {
                // Same two-layer compose as the license exchange, module first:
                // the module default (a plain GET today) then the per-source
                // override — a provider that gates its certificate behind an
                // auth header or its own URL shapes it here — around the fetch,
                // and the response unwraps the same way before it is applied.
                const shaped = await applyCertificateRequest(result.module, {
                  url: serverCertificateUrl,
                  method: 'GET',
                  headers: {},
                  body: null,
                });
                const request = entry.certificateRequest ? await entry.certificateRequest(shaped) : shaped;
                const raw = await fetchDrm(request, controller.signal);
                const unwrapped = await applyCertificateResponse(result.module, raw);
                const certificate = entry.certificateResponse ? await entry.certificateResponse(unwrapped) : unwrapped;

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

            // Published together, before any further await: `exchangeLicenses`
            // preconditions on both, and a reactor monitor cannot observe an
            // intermediate write — the flush is a microtask away.
            context.mediaKeys.set(mediaKeys);
            state.negotiatedKeySystem.set(keySystem);
            state.segmentLoadingBlocked.set(false);
          };

          negotiate().catch((error) => {
            if (controller.signal.aborted) return;

            emitError(state, { code: SVTA_DRM_INITIALIZATION_ERROR, data: { reason: String(error) } });
          });

          // State-exit cleanup — source unload, element detach, or destroy.
          // Order: abort first (kills the negotiation), clear the slots, then
          // detach. Sessions opened against these MediaKeys are closed by
          // `exchangeLicenses`, which is composed ahead of this behavior so
          // its cleanup runs first (see its file JSDoc).
          return () => {
            controller.abort();

            context.mediaKeys.set(undefined);
            state.negotiatedKeySystem.set(undefined);
            state.segmentLoadingBlocked.set(false);
            attachMediaKeys(mediaElement, null).catch(() => {});
          };
        },
      },
    },
  });
}

export const setupMediaKeys = defineBehavior({
  stateKeys: ['presentation', 'segmentLoadingBlocked', 'negotiatedKeySystem'],
  contextKeys: ['mediaElement', 'mediaKeys'],
  // The wrapper's exact keyed map keeps `defineBehavior`'s stateKeys ≡ keyof
  // inference intact; the reporter seam (`errors`, optional per
  // `ErrorEmitterState`) is deliberately not in the typed slice — the setup
  // helper accepts the map without it, and the live slot reaches it at
  // runtime when `collectErrors` is composed. Same shape as `resolve-track`.
  setup: ({
    state,
    context,
    config,
  }: {
    state: {
      presentation: ReadonlySignal<MediaKeysState['presentation']>;
      segmentLoadingBlocked: Signal<MediaKeysState['segmentLoadingBlocked']>;
      negotiatedKeySystem: Signal<MediaKeysState['negotiatedKeySystem']>;
    };
    context: {
      mediaElement: ReadonlySignal<MediaKeysContext['mediaElement']>;
      mediaKeys: Signal<MediaKeysContext['mediaKeys']>;
    };
    config: MediaKeysSetupConfig;
  }) => setupMediaKeysSetup({ state, context, config }),
});
