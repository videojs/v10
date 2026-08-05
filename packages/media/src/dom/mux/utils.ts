import { parseJwt } from '@videojs/utils/jwt';
import { isNil } from '@videojs/utils/predicate';
import { camelCase, snakeCase } from '@videojs/utils/string';
import type { DRMSystemsConfiguration } from 'hls.js';
import type { HlsSource } from '../hls-js';

export const MUX_VIDEO_DOMAIN = 'mux.com';

export type MuxResolution = '270p' | '360p' | '480p' | '540p' | '720p' | '1080p' | '1440p' | '2160p';
export type MuxRenditionOrder = 'desc';
export type MuxImageExt = 'webp' | 'jpg' | 'png';
export type MuxPosterFitMode = 'preserve' | 'stretch' | 'crop' | 'smartcrop' | 'pad';

/**
 * Playback modifiers appended to the stream URL as `snake_case` query params
 * (e.g. `assetStartTime` → `asset_start_time`). A signed playback `token`
 * replaces every other param — they must be baked into the signing token.
 */
export interface MuxPlaybackParams {
  token?: string | undefined;
  /** Maximum resolution of renditions included in the manifest. */
  maxResolution?: MuxResolution | undefined;
  /** Minimum resolution of renditions included in the manifest. */
  minResolution?: MuxResolution | undefined;
  /** Logic to order renditions in the HLS manifest. */
  renditionOrder?: MuxRenditionOrder | undefined;
  /** Start time for instant-clipping assets, as an epoch integer compared to the stream's program date time. */
  programStartTime?: number | undefined;
  /** End time for instant-clipping assets, as an epoch integer compared to the stream's program date time. */
  programEndTime?: number | undefined;
  /** Relative start time of the asset (in seconds) when using the instant clipping feature. */
  assetStartTime?: number | undefined;
  /** Relative end time of the asset (in seconds) when using the instant clipping feature. */
  assetEndTime?: number | undefined;
  /** Include HLS redundant streams in the manifest. */
  redundantStreams?: boolean | undefined;
  /** Add support for timeline hover previews on Roku devices. */
  rokuTrickPlay?: boolean | undefined;
  /** Default subtitles/captions language (BCP 47 compliant language code). */
  defaultSubtitlesLang?: string | undefined;
  /** Omit `EXT-X-PROGRAM-DATE-TIME` tags from HLS manifests for assets from live streams. */
  excludePdt?: boolean | undefined;
  [param: string]: string | number | boolean | undefined;
}

/**
 * Modifiers for the poster still, appended to the image URL as `snake_case`
 * query params. Mux serves it from its `thumbnail` image endpoint.
 */
export interface MuxPosterParams {
  token?: string | undefined;
  /** Image format used in the URL path (`thumbnail.<ext>`). Defaults to `webp`. */
  ext?: MuxImageExt | undefined;
  /** Video time (in seconds) the image is pulled from. Defaults to the middle of the video. */
  time?: number | undefined;
  /** Width of the image (in pixels). Defaults to the width of the original video. */
  width?: number | undefined;
  /** Height of the image (in pixels). Defaults to the height of the original video. */
  height?: number | undefined;
  /** Rotate the image clockwise by the given number of degrees. */
  rotate?: number | undefined;
  /** How to fit the image within the specified width + height. */
  fitMode?: MuxPosterFitMode | undefined;
  /** Flip the image top-bottom after performing all other transformations. */
  flipV?: boolean | undefined;
  /** Flip the image left-right after performing all other transformations. */
  flipH?: boolean | undefined;
  /** Poster time for instant-clipping assets, as an epoch integer compared to the stream's program date time. */
  programTime?: number | undefined;
  /** Pull the latest frame from an ongoing live stream. */
  latest?: boolean | undefined;
  [param: string]: string | number | boolean | undefined;
}

export interface MuxStoryboardParams {
  token?: string | undefined;
  /** Image format of the storyboard tiles referenced by the VTT. Defaults to `webp`. */
  format?: MuxImageExt | undefined;
  [param: string]: string | number | undefined;
}

export interface MuxDrmParams {
  /**
   * DRM license token: a JWT signed for the playback ID with the DRM (`d`)
   * audience. Mux derives every license server URL from it, so it is the only
   * thing a caller supplies. DRM playback is always signed, so a matching
   * `playback.token` is required alongside it.
   */
  token?: string | undefined;
}

/**
 * Structured Mux source. `playbackId` and `customDomain` identify the stream and
 * derive `src`; the inherited `engine` carries HLS engine options, and the
 * inherited `src` is a fallback for playing a non-Mux URL.
 */
export interface MuxSource extends HlsSource {
  playbackId?: string | undefined;
  customDomain?: string | undefined;
  playback?: MuxPlaybackParams | undefined;
  poster?: MuxPosterParams | undefined;
  storyboard?: MuxStoryboardParams | undefined;
  drm?: MuxDrmParams | undefined;
}

/**
 * Serialize params to a query string (`?a=1&b=2`), mapping camelCase keys to
 * `snake_case` and skipping nullish values. A `token` replaces every other
 * param — signed URLs bake all modifiers into the token itself.
 */
export function createMuxQuery(params: Record<string, unknown> = {}): string {
  const { token, ...rest } = params;
  if (token) return `?${new URLSearchParams({ token: String(token) })}`;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(rest)) {
    if (!isNil(value)) search.set(snakeCase(key), String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}

/** Build the Mux HLS stream URL for a source. */
export function createMuxVideoURL(source?: MuxSource | null): string | undefined {
  if (!source?.playbackId) return undefined;
  const { playbackId, customDomain = MUX_VIDEO_DOMAIN, playback } = source;

  if (__DEV__ && playback?.minResolution && playback?.maxResolution) {
    if (Number.parseInt(playback.maxResolution, 10) < Number.parseInt(playback.minResolution, 10)) {
      console.warn(
        `[vjs-mux] minResolution (${playback.minResolution}) must be <= maxResolution (${playback.maxResolution})`
      );
    }
  }

  return `https://stream.${customDomain}/${playbackId}.m3u8${createMuxQuery(playback)}`;
}

/**
 * Parse a Mux stream URL (`https://stream.<domain>/<playback-id>.m3u8?...`)
 * into a `MuxSource`, mapping `snake_case` query params back to camelCase
 * playback params. Returns `undefined` for non-Mux URLs.
 */
export function parseMuxVideoURL(src: string): MuxSource | undefined {
  if (!src) return undefined;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return undefined;
  }

  const [, domain] = url.hostname.match(/^stream\.(.+)$/) ?? [];
  const [, playbackId] = url.pathname.match(/^\/([^/]+)\.m3u8$/) ?? [];
  if (!domain || !playbackId) return undefined;

  const source: MuxSource = { playbackId };
  if (domain !== MUX_VIDEO_DOMAIN) source.customDomain = domain;

  const playback: MuxPlaybackParams = {};
  for (const [key, value] of url.searchParams) {
    playback[camelCase(key)] = key === 'token' ? value : parseMuxParamValue(value);
  }
  if (Object.keys(playback).length > 0) source.playback = playback;

  return source;
}

/**
 * Coerce a query param string back to the boolean/number types declared on
 * `MuxPlaybackParams`. Numbers only convert when the string round-trips exactly
 * (so `1080p`, `007`, and JWTs stay strings).
 */
function parseMuxParamValue(value: string): string | number | boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value !== '' && String(Number(value)) === value) return Number(value);
  return value;
}

/**
 * Build the poster image URL a source describes. Read through `MuxMedia`'s
 * `contentData`.
 *
 * @internal
 */
export function createMuxPosterURL(source?: MuxSource | null): string | undefined {
  if (!source?.playbackId) return undefined;
  const { playbackId, customDomain = MUX_VIDEO_DOMAIN, poster, playback } = source;
  const { ext = 'webp', token, ...query } = poster ?? {};

  // Image tokens must carry the image (`t`) audience.
  if (token && parseJwt<MuxJWT>(token)?.aud !== 't') return undefined;
  // Signed playback requires a matching image token; an unsigned URL would be rejected.
  if (!token && playback?.token) return undefined;

  return `https://image.${customDomain}/${playbackId}/thumbnail.${ext}${createMuxQuery({ token, ...query })}`;
}

/**
 * Build the hls.js `drmSystems` a source describes, keyed by EME key system id.
 * Mux signs one license token per playback ID and serves every system from a
 * URL derived from it, so `drm.token` is all a caller provides.
 *
 * Returns `undefined` when no license token is present, or when the token is
 * not scoped to DRM — an unsigned license request is always rejected, so there
 * is nothing useful to configure.
 *
 * @internal
 */
export function createMuxDrmSystems(source?: MuxSource | null): DRMSystemsConfiguration | undefined {
  if (!source?.playbackId) return undefined;
  const { playbackId, customDomain = MUX_VIDEO_DOMAIN, drm } = source;
  const { token } = drm ?? {};

  // License tokens must carry the DRM (`d`) audience.
  if (!token || parseJwt<MuxJWT>(token)?.aud !== 'd') return undefined;

  const query = createMuxQuery({ token });
  const url = (path: string) => `https://license.${customDomain}/${path}/${playbackId}${query}`;

  // Every system is configured unconditionally: which one a browser negotiates
  // is up to its CDM, and Mux serves all three from the same token.
  return {
    'com.apple.fps': { licenseUrl: url('license/fairplay'), serverCertificateUrl: url('appcert/fairplay') },
    'com.widevine.alpha': { licenseUrl: url('license/widevine') },
    'com.microsoft.playready': { licenseUrl: url('license/playready') },
  };
}

/**
 * Build the storyboard (thumbnail sprite) VTT URL a source describes. Read
 * through `MuxMedia`'s `contentData`.
 *
 * @internal
 */
export function createMuxStoryboardURL(source?: MuxSource | null): string | undefined {
  if (!source?.playbackId) return undefined;
  const { playbackId, customDomain = MUX_VIDEO_DOMAIN, storyboard, playback } = source;
  const { token, ...query } = storyboard ?? {};

  // Storyboard tokens must carry the storyboard (`s`) audience.
  if (token && parseJwt<MuxJWT>(token)?.aud !== 's') return undefined;
  // Signed playback requires a matching storyboard token; an unsigned URL would be rejected.
  if (!token && playback?.token) return undefined;

  return `https://image.${customDomain}/${playbackId}/storyboard.vtt${createMuxQuery({ token, format: 'webp', ...query })}`;
}

export type MuxJWT = {
  sub: string;
  aud: 'v' | 't' | 'g' | 's' | 'd';
  exp: number;
};
