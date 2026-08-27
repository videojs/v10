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

/**
 * `state.negotiatedKeySystem` when negotiation ran and every candidate was refused.
 *
 * A sentinel rather than `null` or a second slot, so the slot stays `string | undefined` and its three meanings read
 * off one value: absent means negotiation hasn't settled, this means it settled on nothing, anything else is the chosen
 * key system. Cannot collide with a real id — those are reverse-DNS (`com.widevine.alpha`).
 *
 * The distinction is load-bearing for pruning: "not yet" must leave encrypted renditions alone, while "refused" is the
 * late fact that makes them unplayable (see `excludeRefusedKeySystems`).
 */
export const NO_KEY_SYSTEM = 'none';

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
 * Everything one key system needs to be negotiated and licensed, as a value a composition includes or omits.
 *
 * The unit of DRM composability. Per-system knowledge used to sit in six string-keyed lookup tables spread across this
 * module and `dom/eme.ts`, which made every system's code reachable from every composition and split a single system's
 * facts across the DOM boundary. Here each system is one value: drop `playReadyKeySystem` from an engine's `keySystems`
 * and its request-string variants, its PSSH wrap, and its XML envelope unwrap all leave with it.
 *
 * Declared DOM-free so the pruning path (`keySystemCandidates`) can consume modules without a DOM dependency; the
 * modules themselves live in `dom/key-systems.ts`, since license-message shaping needs browser APIs.
 */
export interface KeySystemModule {
  /** EME key-system id. What a CDM is asked for, and what `source.drm` and the negotiated-system state are keyed by. */
  readonly keySystem: string;
  /**
   * The HLS `KEYFORMAT` identities that declare this system. Widevine declares itself by its DASH system-id URN;
   * PlayReady's KEYFORMAT happens to equal its key system; FairPlay uses Apple's streaming-key-delivery name.
   */
  readonly keyFormats: readonly string[];
  /**
   * Request strings to try, most-preferred first. Defaults to `[keySystem]`. Exists because PlayReady exposes a second
   * id (`.recommendation`) selecting the hardware security level, and the two are not interchangeable.
   */
  readonly requestVariants?: readonly string[];
  /**
   * `MediaKeySystemConfiguration.initDataTypes` for this system. Defaults to `['cenc']`. FairPlay's are its own —
   * Safari rejects a cenc-only configuration; on the MSE path its init data arrives as `sinf`.
   */
  readonly initDataTypes?: readonly string[];
  /**
   * Video robustness offered ahead of the CDM's default. Naming it as a preference (an extra configuration, not a
   * retry) means a device that has the tier negotiates it while one that doesn't still gets access rather than a
   * refusal. Audio is deliberately left at the CDM's default — no audio tier is worth a failed negotiation.
   */
  readonly preferredVideoRobustness?: string;
  /**
   * Whether to offer an encryption-scheme-unstamped fallback configuration alongside the stamped one. Defaults to
   * `true`. Windows PlayReady is why it exists: it decrypts cbcs content but refuses a cbcs-stamped configuration,
   * which is why hls.js leaves the member unset altogether. Set `false` on a system whose CDMs are known to honour the
   * member, to negotiate one configuration instead of two.
   */
  readonly schemeFallback?: boolean;
  /**
   * Project a manifest-carried key URI into EME init data, or `undefined` when this URI carries none. Omit the field
   * entirely for a system whose manifest never carries init data (FairPlay's `skd://`), which routes it to the
   * `encrypted`-event path.
   */
  readonly toInitData?: (uri: string) => { initDataType: string; initData: Uint8Array<ArrayBuffer> } | undefined;
  /**
   * Shape a CDM license message for this system's server. Defaults to POSTing the raw bytes as octet-stream, which is
   * what Widevine and FairPlay want (Mux's FairPlay server takes the bare SPC).
   */
  readonly shapeLicenseRequest?: (message: BufferSource) => { body: BufferSource; headers: Record<string, string> };
}

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

/**
 * The key-system modules worth asking the CDM for: declared by the presentation's keys _and_ resolving to a license
 * server, in `keySystems` order. Keys without a `KEYFORMAT` any module claims (e.g. `identity` AES-128) contribute
 * nothing.
 *
 * Negotiation preference is the caller's array order rather than a table here — hls.js's order (the platform-native
 * system first, FairPlay existing only on Apple UAs so it costs nothing elsewhere) is what `DEFAULT_KEY_SYSTEMS`
 * encodes, and a composition that wants another just orders its own list.
 *
 * A resolved license server rather than a named entry is what counts, so a config naming every system it could ever
 * license still refuses the sources it holds no credentials for.
 */
export function keySystemCandidates(
  keys: readonly MediaPlaylistKey[],
  drm: DrmSystemsConfig,
  keySystems: readonly KeySystemModule[]
): KeySystemModule[] {
  const declared = new Set(keys.map((key) => key.keyFormat).filter((keyFormat) => keyFormat !== undefined));

  return keySystems.filter(
    (module_) =>
      module_.keyFormats.some((keyFormat) => declared.has(keyFormat)) &&
      resolveDrmUrl(drm[module_.keySystem]?.licenseUrl) !== undefined
  );
}
