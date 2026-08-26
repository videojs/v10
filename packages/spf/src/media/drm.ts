/**
 * DOM-free DRM model helpers: the `source.drm`-shaped config contract, HLS `KEYFORMAT` → EME key-system identity
 * mapping, manifest-declared key collection, and key-system candidate selection. The browser-touching EME half (access
 * negotiation, MediaKeys attachment, init-data decoding, license POST) lives in `dom/eme.ts`, which re-exports these.
 */
import {
  getMediaPlaylistMetadata,
  isResolvedTrack,
  type MaybeResolvedPresentation,
  type MediaPlaylistKey,
} from './types';

/**
 * A configured DRM URL: the value itself, or a resolver asked for it.
 *
 * A resolver exists because license servers are per-source while engine config is per-engine. A Media holding a
 * structured source names the key systems it could ever license once, and resolves each URL from whatever source is
 * current — no engine rebuild when the source changes.
 *
 * `undefined`, returned or given outright, means this key system has no license server for the current source. Its
 * renditions then prune exactly as an unnamed system's do, so "named but unlicensable" and "not named" agree.
 *
 * Synchronous by necessity: {@link keySystemCandidates} runs inside rendition pruning, which is a synchronous selection
 * constraint. Resolvers are called during pruning as well as at license time, so keep them cheap and free of side
 * effects.
 */
export type DrmUrl = DrmValue<string>;

/** A configured DRM value: the value itself, or a resolver asked for it. */
export type DrmValue<T> = T | undefined | (() => T | undefined);

/** Extra license-request headers, or a resolver asked for them. */
export type DrmHeaders = DrmValue<Record<string, string>>;

/**
 * Where one key system's licenses come from. Accepts `@videojs/media`'s `DrmSystemConfig` — a `source.drm` entry passes
 * through adapters unchanged — and additionally takes a resolver per URL. Defined locally so driving an engine directly
 * costs no `@videojs/media`.
 */
export interface DrmSystemConfig {
  /** License server the CDM's license request is POSTed to. */
  licenseUrl: DrmUrl;
  /**
   * URL of the DRM server (application) certificate. FairPlay needs one unless its CDM is pre-provisioned; Widevine and
   * PlayReady ignore it.
   */
  serverCertificateUrl?: DrmUrl;
  /**
   * Extra headers for this system's license request.
   *
   * How most providers authenticate: Axinom reads an `X-AxDRM-Message` entitlement, BuyDRM a `customdata`, others an
   * `Authorization`. A license URL alone can only carry a token a provider agrees to take as a query param.
   *
   * Merged with the headers the request already needs rather than replacing them, and the derived ones win — a classic
   * PlayReady challenge names the headers its own CDM requires, and those are not negotiable.
   *
   * Deliberately plain data, not a resolver like {@link DrmUrl}: it is the field most likely to be worth promoting to
   * `@videojs/media`'s shared source contract, and a function there would make every source assignment rebuild the
   * hls.js and Shaka engines, which compare `source.drm` structurally.
   */
  headers?: DrmHeaders;
}

/** License servers keyed by EME key-system id — the shape of `source.drm`. */
export type DrmSystemsConfig = Partial<Record<string, DrmSystemConfig>>;

/**
 * Resolve a {@link DrmUrl}. A resolver that throws answers `undefined`: this is called from a selection constraint,
 * where an exception would fail the whole pruning pass, and a system whose URL can't be produced is unusable anyway.
 */
export function resolveDrmUrl(url: DrmUrl): string | undefined {
  return resolveDrmValue(url);
}

/** Resolve configured license-request headers. See {@link resolveDrmUrl}. */
export function resolveDrmHeaders(headers: DrmHeaders): Record<string, string> | undefined {
  return resolveDrmValue(headers);
}

function resolveDrmValue<T>(value: DrmValue<T>): T | undefined {
  if (typeof value !== 'function') return value;

  try {
    return (value as () => T | undefined)();
  } catch {
    return undefined;
  }
}

/**
 * EME key-system id per HLS `KEYFORMAT` identity. Widevine declares itself by its DASH system-id URN; PlayReady's
 * KEYFORMAT happens to equal its key system; FairPlay uses Apple's streaming-key-delivery name.
 */
export const KEY_SYSTEM_BY_KEY_FORMAT: Readonly<Record<string, string>> = {
  'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed': 'com.widevine.alpha',
  'com.microsoft.playready': 'com.microsoft.playready',
  'com.apple.streamingkeydelivery': 'com.apple.fps',
};

/**
 * Fixed negotiation order (hls.js's): the platform-native system first where present (FairPlay exists only on Apple
 * UAs, so it costs nothing elsewhere).
 */
const KEY_SYSTEM_PREFERENCE = ['com.apple.fps', 'com.widevine.alpha', 'com.microsoft.playready'] as const;

/**
 * Every DRM key declaration across the presentation's resolved tracks, deduped by full attribute identity. Empty until
 * at least one encrypted rendition's media playlist has resolved — `EXT-X-KEY` is a media-playlist tag, and Mux emits
 * no `EXT-X-SESSION-KEY` in the multivariant.
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
 * The track types a presentation has nothing playable left in once no key system is usable: types with at least one
 * resolved rendition, every one of them encrypted.
 *
 * Pruning decides the same question at selection time, but it runs before EME has negotiated — so a rendition naming a
 * configured license server survives it, and only negotiation later reveals the CDM is absent. This is that
 * late-arriving answer, and it is a _verdict_: with the type empty, the source cannot play. A type keeping any clear
 * rendition is unaffected and reports nothing.
 *
 * Text is excluded deliberately — it runs no capability pre-pass, so it has no verdict for a cause to be matched
 * against.
 */
export function unplayableEncryptedTypes(
  presentation: MaybeResolvedPresentation | undefined
): Array<'video' | 'audio'> {
  const unplayable: Array<'video' | 'audio'> = [];

  for (const type of ['video', 'audio'] as const) {
    let resolved = 0;
    let encrypted = 0;

    for (const selectionSet of presentation?.selectionSets ?? []) {
      for (const switchingSet of selectionSet.switchingSets) {
        for (const track of switchingSet.tracks) {
          if (track.type !== type || !isResolvedTrack(track)) continue;

          resolved += 1;

          if (getMediaPlaylistMetadata(track)?.encrypted) encrypted += 1;
        }
      }
    }

    if (resolved > 0 && encrypted === resolved) unplayable.push(type);
  }

  return unplayable;
}

/** Encryption scheme per HLS `METHOD`, for the MKSA encryption-scheme query. */
const ENCRYPTION_SCHEME_BY_METHOD: Readonly<Record<string, 'cbcs' | 'cenc'>> = {
  'SAMPLE-AES': 'cbcs',
  'SAMPLE-AES-CTR': 'cenc',
  'SAMPLE-AES-CENC': 'cenc',
};

/**
 * The one encryption scheme the declared keys use, or `undefined` when they mix schemes or declare none we recognize.
 * Stamped onto negotiation capabilities so scheme-aware CDMs refuse content they can't decrypt (Mux serves `SAMPLE-AES`
 * — cbcs); UAs predating the encryption-scheme query ignore the member, so declaring it never costs support.
 */
export function declaredEncryptionScheme(keys: readonly MediaPlaylistKey[]): 'cbcs' | 'cenc' | undefined {
  const schemes = new Set(
    keys.map((key) => ENCRYPTION_SCHEME_BY_METHOD[key.method]).filter((scheme) => scheme !== undefined)
  );

  return schemes.size === 1 ? [...schemes][0] : undefined;
}

/** PlayReady's CENC system id, 9a04f079-9840-4286-ab92-e65be0885f95, as bytes. */
const PLAYREADY_SYSTEM_ID = Uint8Array.from([
  0x9a, 0x04, 0xf0, 0x79, 0x98, 0x40, 0x42, 0x86, 0xab, 0x92, 0xe6, 0x5b, 0xe0, 0x88, 0x5f, 0x95,
]);

function isPsshBox(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && bytes[4] === 0x70 && bytes[5] === 0x73 && bytes[6] === 0x73 && bytes[7] === 0x68;
}

/**
 * Project a manifest-carried key payload into `cenc` init data. Widevine ships a complete PSSH box in its `data:` URI;
 * PlayReady ships a raw PlayReady Object (WRMHEADER), which `generateRequest('cenc', …)` refuses — wrap it in a v0 PSSH
 * box under PlayReady's system id, as hls.js and Shaka do.
 */
export function toCencInitData(keySystem: string, bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  if (keySystem !== 'com.microsoft.playready' || isPsshBox(bytes)) return bytes;

  const box = new Uint8Array(32 + bytes.length);
  const view = new DataView(box.buffer);

  view.setUint32(0, box.length);
  box.set([0x70, 0x73, 0x73, 0x68], 4); // 'pssh'; version + flags stay zeroed at offset 8
  box.set(PLAYREADY_SYSTEM_ID, 12);
  view.setUint32(28, bytes.length);
  box.set(bytes, 32);
  return box;
}

/**
 * The key systems worth asking the CDM for: declared by the presentation's keys _and_ resolving to a license server, in
 * {@link KEY_SYSTEM_PREFERENCE} order. Keys without a recognized DRM `KEYFORMAT` (e.g. `identity` AES-128) contribute
 * nothing.
 *
 * A resolved license server rather than a named entry is what counts, so a config naming every system it could ever
 * license still refuses the sources it holds no credentials for.
 */
export function keySystemCandidates(keys: readonly MediaPlaylistKey[], drm: DrmSystemsConfig): string[] {
  const declared = new Set(
    keys.map((key) => (key.keyFormat === undefined ? undefined : KEY_SYSTEM_BY_KEY_FORMAT[key.keyFormat]))
  );

  return KEY_SYSTEM_PREFERENCE.filter(
    (keySystem) => declared.has(keySystem) && resolveDrmUrl(drm[keySystem]?.licenseUrl) !== undefined
  );
}
