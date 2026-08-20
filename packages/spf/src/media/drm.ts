/**
 * DOM-free DRM model helpers: the `source.drm`-shaped config contract, HLS
 * `KEYFORMAT` → EME key-system identity mapping, manifest-declared key
 * collection, and key-system candidate selection. The browser-touching EME
 * half (access negotiation, MediaKeys attachment, init-data decoding, license
 * POST) lives in `dom/eme.ts`, which re-exports these.
 */
import {
  getMediaPlaylistMetadata,
  isResolvedTrack,
  type MaybeResolvedPresentation,
  type MediaPlaylistKey,
} from './types';

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
