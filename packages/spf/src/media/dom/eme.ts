/**
 * Browser EME helpers for DRM-composed engines: `MediaKeySystemAccess` negotiation, MediaKeys attachment, and the
 * license POST. Stateless helpers — `setupMediaKeys` and `exchangeLicenses` own all lifecycle.
 *
 * Everything system-specific lives in a {@link KeySystemModule} (`./key-systems.ts`); these helpers only read the
 * contract, so adding a system touches no code here — and this module deliberately does not re-export the modules
 * themselves, so importing these helpers never pulls a key system's code in. The DOM-free DRM model half (config
 * contract, module contract, declared keys, candidate selection) lives in `../drm.ts` and is re-exported here.
 */
import { type KeySystemModule } from '../drm';
import type { MaybeResolvedPresentation } from '../types';
import { buildMimeCodec } from './mse/mediasource-setup';

export {
  type DrmHeaders,
  type DrmSystemConfig,
  type DrmSystemsConfig,
  type DrmUrl,
  declaredDrmKeys,
  declaredEncryptionScheme,
  type KeySystemModule,
  keySystemCandidates,
  NO_KEY_SYSTEM,
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
 * - **Video robustness** (`preferredVideoRobustness`), then unset.
 *
 * Scheme is the outer preference because a mismatched scheme risks failing decode outright, whereas a lower robustness
 * tier only means weaker content protection.
 */
export function buildKeySystemConfigurations(
  module_: KeySystemModule,
  contentTypes: { video: readonly string[]; audio: readonly string[] },
  encryptionScheme?: 'cbcs' | 'cenc'
): MediaKeySystemConfiguration[] {
  const configuration = (scheme?: 'cbcs' | 'cenc', robustness?: string): MediaKeySystemConfiguration => {
    const capability = (contentType: string) => ({
      contentType,
      ...(scheme !== undefined && { encryptionScheme: scheme }),
    });
    const videoCapability = (contentType: string) => ({
      ...capability(contentType),
      ...(robustness !== undefined && { robustness }),
    });

    return {
      initDataTypes: [...(module_.initDataTypes ?? ['cenc'])],
      ...(contentTypes.video.length > 0 && { videoCapabilities: contentTypes.video.map(videoCapability) }),
      ...(contentTypes.audio.length > 0 && { audioCapabilities: contentTypes.audio.map(capability) }),
    };
  };

  const schemes =
    encryptionScheme === undefined
      ? [undefined]
      : module_.schemeFallback === false
        ? [encryptionScheme]
        : [encryptionScheme, undefined];
  // Only worth a second entry when there are video capabilities to carry it — otherwise the two
  // configurations would be identical.
  const preferredRobustness = module_.preferredVideoRobustness;
  const robustnessLevels =
    preferredRobustness !== undefined && contentTypes.video.length > 0 ? [preferredRobustness, undefined] : [undefined];

  return schemes.flatMap((scheme) => robustnessLevels.map((robustness) => configuration(scheme, robustness)));
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
 * Shape a CDM license message for its server, per the negotiated module. Widevine and FairPlay POST the raw bytes as
 * octet-stream (Mux's FairPlay server takes the bare SPC), which is the default a module opts out of by declaring
 * `shapeLicenseRequest`.
 */
export function shapeLicenseRequest(
  module_: KeySystemModule | undefined,
  message: BufferSource
): { body: BufferSource; headers: Record<string, string> } {
  return (
    module_?.shapeLicenseRequest?.(message) ?? {
      body: message,
      headers: { 'Content-Type': 'application/octet-stream' },
    }
  );
}

/**
 * Fetch the DRM server (application) certificate. FairPlay needs it applied (`MediaKeys.setServerCertificate`) before
 * any license request can be generated; Widevine and PlayReady configs simply don't name one.
 */
export async function fetchServerCertificate(
  serverCertificateUrl: string,
  signal: AbortSignal
): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(serverCertificateUrl, { signal });
  if (!response.ok) throw new Error(`Server certificate request failed with status ${response.status}`);

  return new Uint8Array(await response.arrayBuffer());
}

/** Attach (or with `null`, detach) MediaKeys on a media element. */
export function attachMediaKeys(mediaElement: HTMLMediaElement, mediaKeys: MediaKeys | null): Promise<void> {
  return mediaElement.setMediaKeys(mediaKeys);
}

/** Exchange a CDM license message for the server's license. Body and headers come from {@link shapeLicenseRequest}. */
export async function fetchLicense(
  licenseUrl: string,
  message: BufferSource,
  signal: AbortSignal,
  headers: Record<string, string> = { 'Content-Type': 'application/octet-stream' }
): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(licenseUrl, {
    method: 'POST',
    headers,
    body: message,
    signal,
  });
  if (!response.ok) throw new Error(`License request failed with status ${response.status}`);

  return new Uint8Array(await response.arrayBuffer());
}
