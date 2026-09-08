/**
 * Browser EME helpers for DRM-composed engines: `MediaKeySystemAccess` negotiation, MediaKeys attachment, and the
 * license POST. Stateless helpers — `setupMediaKeys` and `exchangeLicenses` own all lifecycle.
 *
 * Everything system-specific lives in a {@link KeySystemModule} (`./key-systems.ts`); these helpers only read the
 * contract, so adding a system touches no code here — and this module deliberately does not re-export the modules
 * themselves, so importing these helpers never pulls a key system's code in. The DOM-free DRM model half (config
 * contract, module contract, declared keys, candidate selection) lives in `../drm.ts` and is re-exported here.
 */
import { fetchWithRetry } from '../../network/retry';
import { type DrmRequest, type KeySystemModule } from '../drm';
import type { MaybeResolvedPresentation } from '../types';
import { buildMimeCodec } from './mse/mediasource-setup';

export {
  type DrmCredentials,
  type DrmHeaders,
  type DrmRequest,
  type DrmRequestTransform,
  type DrmResponseTransform,
  type DrmSystemConfig,
  type DrmSystemsConfig,
  type DrmUrl,
  declaredDrmKeys,
  declaredEncryptionScheme,
  firstNonDrmEncryptionKey,
  type KeySystemModule,
  keySystemCandidates,
  NO_KEY_SYSTEM,
  resolveDrmCredentials,
  resolveDrmHeaders,
  resolveDrmUrl,
} from '../drm';

/**
 * The unique audio/video content types across every track that declares codecs — the capability surface a
 * `MediaKeySystemConfiguration` negotiates over. Includes unresolved tracks: the multivariant already carries
 * `CODECS`.
 */
export function contentTypesFromPresentation(presentation: MaybeResolvedPresentation | undefined): {
  video: string[];
  audio: string[];
} {
  const video = new Set<string>();
  const audio = new Set<string>();

  for (const selectionSet of presentation?.selectionSets ?? []) {
    for (const switchingSet of selectionSet.switchingSets) {
      for (const track of switchingSet.tracks) {
        if (track.type !== 'video' && track.type !== 'audio') continue;

        if (!track.mimeType || !track.codecs?.length) continue;

        const bucket = track.type === 'video' ? video : audio;

        bucket.add(buildMimeCodec({ mimeType: track.mimeType, codecs: track.codecs }));
      }
    }
  }

  return { video: [...video], audio: [...audio] };
}

/**
 * MediaKeySystemConfigurations for one key-system module over the given content types, most-preferred first.
 *
 * `requestMediaKeySystemAccess` takes the whole list and picks the first entry the CDM supports, so every preference
 * here is expressed by offering an extra configuration rather than by retrying — and each one can only widen what
 * negotiation accepts.
 *
 * Two module-declared preferences compose, encryption scheme outermost:
 *
 * - **Declared encryption scheme** (see `declaredEncryptionScheme`), stamped on every capability, then dropped when the
 *   module keeps `schemeFallback`. CDMs that honour the member negotiate the exact scheme; CDMs that refuse it outright
 *   still negotiate instead of failing the request.
 * - **Robustness** (`videoRobustnessTiers` / `audioRobustnessTiers`), strongest rung first, then unset. One configuration
 *   per rung: a device without the top tier descends to the next rather than falling straight through to an unstamped
 *   configuration, which is what leaves a level unspecified. Unset stays last so nothing is refused outright.
 *
 * Scheme is the outer preference because a mismatched scheme risks failing decode outright, whereas a lower robustness
 * tier only means weaker content protection.
 */
export function buildKeySystemConfigurations(
  module_: KeySystemModule,
  contentTypes: { video: readonly string[]; audio: readonly string[] },
  encryptionScheme?: 'cbcs' | 'cenc'
): MediaKeySystemConfiguration[] {
  // A shorter list clamps to its last entry, so one audio tier serves every video rung.
  const tierAt = (tiers: readonly string[] | undefined, rung: number): string | undefined =>
    tiers === undefined || tiers.length === 0 ? undefined : tiers[Math.min(rung, tiers.length - 1)];

  const configuration = (scheme?: 'cbcs' | 'cenc', rung?: number): MediaKeySystemConfiguration => {
    const capability = (robustness: string | undefined) => (contentType: string) => ({
      contentType,
      ...(scheme !== undefined && { encryptionScheme: scheme }),
      ...(robustness !== undefined && { robustness }),
    });
    const video = rung === undefined ? undefined : tierAt(module_.videoRobustnessTiers, rung);
    const audio = rung === undefined ? undefined : tierAt(module_.audioRobustnessTiers, rung);

    return {
      initDataTypes: [...(module_.initDataTypes ?? ['cenc'])],
      ...(contentTypes.video.length > 0 && { videoCapabilities: contentTypes.video.map(capability(video)) }),
      ...(contentTypes.audio.length > 0 && { audioCapabilities: contentTypes.audio.map(capability(audio)) }),
    };
  };

  const schemes =
    encryptionScheme === undefined
      ? [undefined]
      : module_.schemeFallback === false
        ? [encryptionScheme]
        : [encryptionScheme, undefined];
  // One rung per tier a present capability could carry, then `undefined` for the unstamped last
  // resort. A module naming no tier for the types on offer gets that entry alone — otherwise the
  // configurations would be identical.
  const rungCount = Math.max(
    contentTypes.video.length > 0 ? (module_.videoRobustnessTiers?.length ?? 0) : 0,
    contentTypes.audio.length > 0 ? (module_.audioRobustnessTiers?.length ?? 0) : 0
  );
  const rungs: Array<number | undefined> = [...Array.from({ length: rungCount }, (_, rung) => rung), undefined];

  return schemes.flatMap((scheme) => rungs.map((rung) => configuration(scheme, rung)));
}

/**
 * Negotiate CDM access: ask for each candidate module (and each of its request-string variants) in order with a
 * configuration built for that module, first success wins. Resolves `undefined` when every candidate is refused (or
 * none were given).
 *
 * Reports the module rather than the request string that won: license-server lookup and message shaping key off the
 * configured `keySystem`, not off the variant a CDM happened to accept.
 */
export async function requestKeySystemAccess(
  keySystems: readonly KeySystemModule[],
  contentTypes: { video: readonly string[]; audio: readonly string[] },
  encryptionScheme?: 'cbcs' | 'cenc'
): Promise<{ module: KeySystemModule; access: MediaKeySystemAccess } | undefined> {
  for (const module_ of keySystems) {
    const configurations = buildKeySystemConfigurations(module_, contentTypes, encryptionScheme);

    for (const variant of module_.requestVariants ?? [module_.keySystem]) {
      try {
        return { module: module_, access: await navigator.requestMediaKeySystemAccess(variant, configurations) };
      } catch {
        // Refused — try the next variant / candidate.
      }
    }
  }

  return undefined;
}

/**
 * Apply the negotiated module's license-request transform to a request already carrying the source's URL and headers.
 * With no transform the default POSTs the raw message as octet-stream (Widevine and FairPlay want this; Mux's FairPlay
 * server takes the bare SPC) — octet-stream wins over a configured `Content-Type`, matching the prior contract.
 * PlayReady's module transform unwraps the challenge envelope instead.
 */
export function applyLicenseRequest(
  module_: KeySystemModule | undefined,
  request: DrmRequest
): DrmRequest | Promise<DrmRequest> {
  return (
    module_?.licenseRequest?.(request) ?? {
      ...request,
      headers: { ...request.headers, 'Content-Type': 'application/octet-stream' },
    }
  );
}

/**
 * Apply the negotiated module's license-response transform. With no transform the response passes through unchanged
 * (Mux and EZDRM return the raw CDM license); a module whose server wraps the license overrides it to unwrap. The
 * per-source override composes after this, in `exchangeLicenses`.
 */
export function applyLicenseResponse(
  module_: KeySystemModule | undefined,
  response: Uint8Array<ArrayBuffer>
): Uint8Array<ArrayBuffer> | Promise<Uint8Array<ArrayBuffer>> {
  return module_?.licenseResponse?.(response) ?? response;
}

/**
 * Apply the negotiated module's certificate-request transform. No shipped system needs one — the default is the plain
 * GET FairPlay's certificate endpoints answer — so this is identity unless a module declares its own. The per-source
 * override composes after it, in `setupMediaKeys`.
 */
export function applyCertificateRequest(
  module_: KeySystemModule | undefined,
  request: DrmRequest
): DrmRequest | Promise<DrmRequest> {
  return module_?.certificateRequest?.(request) ?? request;
}

/** Apply the negotiated module's certificate-response transform. Identity unless a module unwraps its certificate. */
export function applyCertificateResponse(
  module_: KeySystemModule | undefined,
  response: Uint8Array<ArrayBuffer>
): Uint8Array<ArrayBuffer> | Promise<Uint8Array<ArrayBuffer>> {
  return module_?.certificateResponse?.(response) ?? response;
}

/** Attach (or with `null`, detach) MediaKeys on a media element. */
export function attachMediaKeys(mediaElement: HTMLMediaElement, mediaKeys: MediaKeys | null): Promise<void> {
  return mediaElement.setMediaKeys(mediaKeys);
}

/**
 * Perform one DRM network exchange — a license POST, a certificate GET — and return the raw response bytes. Method,
 * headers, and body all ride on the {@link DrmRequest} (already shaped by the module default and any per-source
 * override), so this is the single fetch seam the license and certificate paths share and the shape a future network
 * layer slots into. Wrapped in {@link fetchWithRetry}'s naive retry + first-byte timeout so a transient blip on the
 * (routinely flaky, rate-limited) license server doesn't park the source on a single failure.
 */
export async function fetchDrm(request: DrmRequest, signal: AbortSignal): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetchWithRetry(
    request.url,
    { method: request.method, headers: request.headers, body: request.body, credentials: request.credentials },
    signal
  );
  if (!response.ok) throw new Error(`DRM request failed with status ${response.status}`);

  return new Uint8Array(await response.arrayBuffer());
}
