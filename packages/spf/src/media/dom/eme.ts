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
 * A single `cenc` MediaKeySystemConfiguration over the given content types.
 * No robustness ladder — the CDM's default suffices until security-level
 * constraint filtering lands (see drm-support.md's security-level phase).
 */
export function buildKeySystemConfigurations(contentTypes: {
  video: readonly string[];
  audio: readonly string[];
}): MediaKeySystemConfiguration[] {
  return [
    {
      initDataTypes: ['cenc'],
      ...(contentTypes.video.length > 0 && {
        videoCapabilities: contentTypes.video.map((contentType) => ({ contentType })),
      }),
      ...(contentTypes.audio.length > 0 && {
        audioCapabilities: contentTypes.audio.map((contentType) => ({ contentType })),
      }),
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
 * Negotiate CDM access: ask for each candidate in order, first success wins.
 * Resolves `undefined` when every candidate is refused (or none were given).
 */
export async function requestKeySystemAccess(
  keySystems: readonly string[],
  configurations: MediaKeySystemConfiguration[]
): Promise<{ keySystem: string; access: MediaKeySystemAccess } | undefined> {
  for (const keySystem of keySystems) {
    try {
      return { keySystem, access: await navigator.requestMediaKeySystemAccess(keySystem, configurations) };
    } catch {
      // Refused — try the next candidate.
    }
  }
  return undefined;
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
