/**
 * **Open MediaKeySessions for the negotiated key system and exchange their licenses.** Preconditions on the handoff
 * `setupMediaKeys` publishes — attached `context.mediaKeys` plus `state.negotiatedKeySystem` — so entry implies the CDM
 * is negotiated, its server certificate applied, and the MediaKeys attached; the "certificate before `generateRequest`"
 * ordering rides that handoff rather than a position in a shared function body.
 *
 * Sessions open manifest-driven — one per inline init data the negotiated system's module can project out of a key URI
 * (Widevine PSSH / PlayReady PRO as `data:` URIs) — or, when the manifest carries none (FairPlay `skd://`),
 * event-driven off the element's `encrypted` events, deduped by init-data bytes. Each license message is shaped by the
 * negotiated system's module and exchanged against that system's configured server.
 *
 * Failures report onto the errors sequence via `emitError` (SVTA 4004 license request, 4016 license rejected, 4021
 * request generation). None of them raise the load gate: by the time this behavior runs the gate is already down —
 * deliberately, since the appends that follow are what fire `encrypted` for the event-driven path — and browsers queue
 * decode on missing keys, so an unlicensed source stalls rather than failing.
 *
 * Single-positive-state reactor, like `setupMediaKeys`. **Compose it ahead of `setupMediaKeys`**: `createComposition`
 * calls cleanups in registration order, and the sessions opened here must be closed before `setupMediaKeys` detaches
 * the MediaKeys they belong to. Setup order costs nothing in return — the precondition is reactive on
 * `context.mediaKeys`, so this behavior parks until the negotiation it consumes has published.
 *
 * Writes no slots — it only reads the handoff and talks to the CDM and the license server. Still out of scope (tracked
 * in drm-support.md): key rotation / keys declared after entry, and `keystatuschange` reactivity.
 */
import { listen } from '@videojs/utils/dom';

import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal } from '../../../core/signals/primitives';
import {
  type DrmSystemsConfig,
  declaredDrmKeys,
  fetchLicense,
  type KeySystemModule,
  NO_KEY_SYSTEM,
  resolveDrmHeaders,
  resolveDrmUrl,
  applyLicenseRequest,
} from '../../../media/dom/eme';
import {
  SVTA_BAD_LICENSE_REQUEST,
  SVTA_DRM_LICENSE_RESPONSE_REJECTED,
  SVTA_DRM_LICENSE_REQUEST_GENERATION_FAILED,
} from '../../../media/errors';
import { isResolvedPresentation, type MaybeResolvedPresentation } from '../../../media/types';
import { type ErrorEmitterState, emitError } from '../collect-errors';

/** State shape for license exchange. */
export interface ExchangeLicensesState {
  presentation?: MaybeResolvedPresentation;
  /** The negotiated key system; owned by `setupMediaKeys`. Semantics on `MediaKeysState['negotiatedKeySystem']`. */
  negotiatedKeySystem?: string;
}

/** Context shape for license exchange. */
export interface ExchangeLicensesContext {
  mediaElement?: HTMLMediaElement | undefined;
  /** The attached MediaKeys; owned by `setupMediaKeys`. */
  mediaKeys?: MediaKeys;
}

/** Config for license exchange. */
export interface ExchangeLicensesConfig {
  /** License servers keyed by EME key-system id — `source.drm`'s shape. Semantics on `MediaKeysSetupConfig['drm']`. */
  drm: DrmSystemsConfig;
  /** The key systems this composition can negotiate. Semantics on `MediaKeysSetupConfig['keySystems']`. */
  keySystems: readonly KeySystemModule[];
}

type ExchangeLicensesFsmState = 'preconditions-unmet' | 'licensing';

function setupExchangeLicenses({
  state,
  context,
  config,
}: {
  state: {
    presentation: ReadonlySignal<ExchangeLicensesState['presentation']>;
    negotiatedKeySystem: ReadonlySignal<ExchangeLicensesState['negotiatedKeySystem']>;
  } & ErrorEmitterState;
  context: {
    mediaElement: ReadonlySignal<ExchangeLicensesContext['mediaElement']>;
    mediaKeys: ReadonlySignal<ExchangeLicensesContext['mediaKeys']>;
  };
  config: ExchangeLicensesConfig;
}): Reactor<ExchangeLicensesFsmState | 'destroying' | 'destroyed'> {
  const derivedStateSignal = computed<ExchangeLicensesFsmState>(() => {
    if (!context.mediaElement.get() || !context.mediaKeys.get()) return 'preconditions-unmet';

    // `NO_KEY_SYSTEM` is negotiation's refusal, not a system to license
    // against — and `undefined` is negotiation still in flight. Neither has a
    // `drm` entry to look up.
    const keySystem = state.negotiatedKeySystem.get();
    if (keySystem === undefined || keySystem === NO_KEY_SYSTEM) return 'preconditions-unmet';

    return isResolvedPresentation(state.presentation.get()) ? 'licensing' : 'preconditions-unmet';
  });

  return createMachineReactor<ExchangeLicensesFsmState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},

      licensing: {
        // entry body is auto-untracked. Opens every session the manifest
        // justifies, else arms the event-driven fallback; state-exit cleanup
        // aborts in-flight license work and closes what it opened.
        entry: () => {
          const mediaElement = context.mediaElement.get()!;
          const mediaKeys = context.mediaKeys.get()!;
          const keySystem = state.negotiatedKeySystem.get()!;
          const presentation = state.presentation.get()!;
          const controller = new AbortController();
          const sessions: MediaKeySession[] = [];

          // Resolved once per negotiation. `keySystemCandidates` only offers a
          // system whose license server resolves, so this is a string.
          const entry = config.drm[keySystem]!;
          const licenseUrl = resolveDrmUrl(entry.licenseUrl)!;
          const module_ = config.keySystems.find((candidate) => candidate.keySystem === keySystem);

          const exchange = async (session: MediaKeySession, message: BufferSource) => {
            // Configured headers seed the request; the module's transform (e.g.
            // PlayReady's envelope unwrap) runs over them and its own headers win.
            const request = await applyLicenseRequest(module_, {
              url: licenseUrl,
              headers: { ...resolveDrmHeaders(entry.headers) },
              body: message,
            });
            let license: Uint8Array<ArrayBuffer>;

            try {
              license = await fetchLicense(
                request.url,
                request.body as BufferSource,
                controller.signal,
                request.headers
              );
            } catch (error) {
              if (controller.signal.aborted) return;

              emitError(state, { code: SVTA_BAD_LICENSE_REQUEST, data: { keySystem, reason: String(error) } });
              return;
            }

            try {
              await session.update(license);
            } catch (error) {
              if (controller.signal.aborted) return;

              emitError(state, {
                code: SVTA_DRM_LICENSE_RESPONSE_REJECTED,
                data: { keySystem, reason: String(error) },
              });
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

          // One session per manifest-carried init data of the negotiated
          // system, projected by its own module (Widevine PSSH / PlayReady PRO
          // as `data:` URIs). A module with no `toInitData` declares that its
          // manifest carries none, which routes to the fallback below.
          for (const key of declaredDrmKeys(presentation)) {
            if (key.keyFormat === undefined || !module_?.keyFormats.includes(key.keyFormat)) continue;

            const initData = key.uri === undefined ? undefined : module_.toInitData?.(key.uri);
            if (!initData) continue;

            openSession(initData.initDataType, initData.initData);
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

          // State-exit cleanup — negotiation torn down, source unload, or
          // destroy. Abort first (kills in-flight license fetches and the
          // message listeners), then close the sessions.
          return () => {
            controller.abort();

            for (const session of sessions) session.close().catch(() => {});
          };
        },
      },
    },
  });
}

export const exchangeLicenses = defineBehavior({
  stateKeys: ['presentation', 'negotiatedKeySystem'],
  contextKeys: ['mediaElement', 'mediaKeys'],
  // Same wrapper shape as `setupMediaKeys`: the exact keyed map keeps
  // `defineBehavior`'s stateKeys ≡ keyof inference intact, and the `errors`
  // reporter seam stays out of the typed slice.
  setup: ({
    state,
    context,
    config,
  }: {
    state: {
      presentation: ReadonlySignal<ExchangeLicensesState['presentation']>;
      negotiatedKeySystem: ReadonlySignal<ExchangeLicensesState['negotiatedKeySystem']>;
    };
    context: {
      mediaElement: ReadonlySignal<ExchangeLicensesContext['mediaElement']>;
      mediaKeys: ReadonlySignal<ExchangeLicensesContext['mediaKeys']>;
    };
    config: ExchangeLicensesConfig;
  }) => setupExchangeLicenses({ state, context, config }),
});
