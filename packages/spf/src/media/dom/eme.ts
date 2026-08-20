/**
 * EME helpers for DRM-composed engines: HLS `KEYFORMAT` → EME key-system
 * mapping, manifest-declared key collection, `MediaKeySystemAccess`
 * negotiation, MediaKeys attachment, manifest-carried init-data decoding, and
 * the license POST. Stateless helpers — `setupMediaKeys` owns all lifecycle.
 */
import {
  getMediaPlaylistMetadata,
  isResolvedTrack,
  type MaybeResolvedPresentation,
  type MediaPlaylistKey,
} from '../types';
import { buildMimeCodec } from './mse/mediasource-setup';

/**
 * Where one key system's licenses come from. Structurally mirrors
 * `@videojs/media`'s `DrmSystemConfig`, so a `source.drm` entry passes through
 * adapters unchanged; defined locally so driving an engine directly costs no
 * `@videojs/media`.
 */
export interface DrmSystemConfig {
  /** License server the CDM's license request is POSTed to. */
  licenseUrl: string;
  /**
   * URL of the DRM server (application) certificate. FairPlay needs one unless
   * its CDM is pre-provisioned; Widevine and PlayReady ignore it.
   */
  serverCertificateUrl?: string | undefined;
}

/** License servers keyed by EME key-system id — the shape of `source.drm`. */
export type DrmSystemsConfig = Partial<Record<string, DrmSystemConfig>>;

/**
 * EME key-system id per HLS `KEYFORMAT` identity. Widevine declares itself by
 * its DASH system-id URN; PlayReady's KEYFORMAT happens to equal its key
 * system; FairPlay uses Apple's streaming-key-delivery name.
 */
export const KEY_SYSTEM_BY_KEY_FORMAT: Readonly<Record<string, string>> = {
  'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed': 'com.widevine.alpha',
  'com.microsoft.playready': 'com.microsoft.playready',
  'com.apple.streamingkeydelivery': 'com.apple.fps',
};

/**
 * Fixed negotiation order (hls.js's): the platform-native system first where
 * present (FairPlay exists only on Apple UAs, so it costs nothing elsewhere).
 */
const KEY_SYSTEM_PREFERENCE = ['com.apple.fps', 'com.widevine.alpha', 'com.microsoft.playready'] as const;

/**
 * Every DRM key declaration across the presentation's resolved tracks, deduped
 * by full attribute identity. Empty until at least one encrypted rendition's
 * media playlist has resolved — `EXT-X-KEY` is a media-playlist tag, and Mux
 * emits no `EXT-X-SESSION-KEY` in the multivariant.
 */
export function declaredDrmKeys(presentation: MaybeResolvedPresentation | undefined): MediaPlaylistKey[] {
  const keys: MediaPlaylistKey[] = [];
  const seen = new Set<string>();
  for (const selectionSet of presentation?.selectionSets ?? []) {
    for (const switchingSet of selectionSet.switchingSets) {
      for (const track of switchingSet.tracks) {
        if (!isResolvedTrack(track)) continue;
        for (const key of getMediaPlaylistMetadata(track)?.keys ?? []) {
          const identity = [key.method, key.uri, key.keyFormat, key.keyId, key.iv].join(' ');
          if (seen.has(identity)) continue;
          seen.add(identity);
          keys.push(key);
        }
      }
    }
  }
  return keys;
}

/**
 * The key systems worth asking the CDM for: declared by the presentation's
 * keys *and* holding a configured license server, in {@link KEY_SYSTEM_PREFERENCE}
 * order. Keys without a recognized DRM `KEYFORMAT` (e.g. `identity` AES-128)
 * contribute nothing.
 */
export function keySystemCandidates(keys: readonly MediaPlaylistKey[], drm: DrmSystemsConfig): string[] {
  const declared = new Set(
    keys.map((key) => (key.keyFormat === undefined ? undefined : KEY_SYSTEM_BY_KEY_FORMAT[key.keyFormat]))
  );
  return KEY_SYSTEM_PREFERENCE.filter((keySystem) => declared.has(keySystem) && drm[keySystem] !== undefined);
}

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
