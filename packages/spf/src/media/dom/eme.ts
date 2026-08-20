/**
 * Browser EME helpers for DRM-composed engines: `MediaKeySystemAccess`
 * negotiation, MediaKeys attachment, manifest-carried init-data decoding, and
 * the license POST. Stateless helpers — `setupMediaKeys` owns all lifecycle.
 * The DOM-free DRM model half (config contract, KEYFORMAT mapping, declared
 * keys, candidate selection) lives in `../drm.ts` and is re-exported here.
 */
import type { MaybeResolvedPresentation } from '../types';
import { buildMimeCodec } from './mse/mediasource-setup';

export {
  type DrmSystemConfig,
  type DrmSystemsConfig,
  declaredDrmKeys,
  declaredEncryptionScheme,
  KEY_SYSTEM_BY_KEY_FORMAT,
  keySystemCandidates,
} from '../drm';

/**
 * The unique audio/video content types across every track that declares
 * codecs — the capability surface a `MediaKeySystemConfiguration` negotiates
 * over. Includes unresolved tracks: the multivariant already carries `CODECS`.
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
 * Init-data types per key system. FairPlay's are its own — Safari rejects a
 * cenc-only configuration; on the MSE path its init data arrives as `sinf`.
 */
const INIT_DATA_TYPES_BY_KEY_SYSTEM: Readonly<Record<string, readonly string[]>> = {
  'com.apple.fps': ['sinf', 'cenc'],
};

/**
 * A single MediaKeySystemConfiguration for one key system over the given
 * content types, each capability stamped with the declared encryption scheme
 * when there is one (see `declaredEncryptionScheme`). No robustness ladder —
 * the CDM's default suffices until security-level constraint filtering lands
 * (see drm-support.md's security-level phase).
 */
export function buildKeySystemConfigurations(
  keySystem: string,
  contentTypes: { video: readonly string[]; audio: readonly string[] },
  encryptionScheme?: 'cbcs' | 'cenc'
): MediaKeySystemConfiguration[] {
  const capability = (contentType: string) => ({
    contentType,
    ...(encryptionScheme !== undefined && { encryptionScheme }),
  });
  return [
    {
      initDataTypes: [...(INIT_DATA_TYPES_BY_KEY_SYSTEM[keySystem] ?? ['cenc'])],
      ...(contentTypes.video.length > 0 && { videoCapabilities: contentTypes.video.map(capability) }),
      ...(contentTypes.audio.length > 0 && { audioCapabilities: contentTypes.audio.map(capability) }),
    },
  ];
}

/**
 * Decode the init data a key declaration carries inline. Mux (and RFC 8216bis
 * practice) delivers Widevine PSSH / PlayReady PRO as a base64 `data:` URI in
 * the key's `URI` attribute. Non-`data:` URIs (FairPlay's `skd://`, an
 * AES-128 key file) carry no EME init data — those flows are event-driven or
 * not EME at all.
 */
export function initDataFromKeyUri(uri: string): Uint8Array<ArrayBuffer> | undefined {
  if (!uri.startsWith('data:')) return undefined;
  const comma = uri.indexOf(',');
  if (comma === -1 || !uri.slice(0, comma).endsWith(';base64')) return undefined;
  const binary = atob(uri.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Negotiate CDM access: ask for each candidate in order with a configuration
 * built for that system, first success wins. Resolves `undefined` when every
 * candidate is refused (or none were given).
 */
export async function requestKeySystemAccess(
  keySystems: readonly string[],
  contentTypes: { video: readonly string[]; audio: readonly string[] },
  encryptionScheme?: 'cbcs' | 'cenc'
): Promise<{ keySystem: string; access: MediaKeySystemAccess } | undefined> {
  for (const keySystem of keySystems) {
    try {
      const configurations = buildKeySystemConfigurations(keySystem, contentTypes, encryptionScheme);
      return { keySystem, access: await navigator.requestMediaKeySystemAccess(keySystem, configurations) };
    } catch {
      // Refused — try the next candidate.
    }
  }
  return undefined;
}

/**
 * Fetch the DRM server (application) certificate. FairPlay needs it applied
 * (`MediaKeys.setServerCertificate`) before any license request can be
 * generated; Widevine and PlayReady configs simply don't name one.
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

/**
 * Exchange a CDM license message for the server's license. Every major key
 * system POSTs the raw message bytes; per-system body shaping (PlayReady
 * challenge unwrap, FairPlay SPC forms) layers on top when those systems land.
 */
export async function fetchLicense(
  licenseUrl: string,
  message: BufferSource,
  signal: AbortSignal
): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(licenseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: message,
    signal,
  });
  if (!response.ok) throw new Error(`License request failed with status ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}
