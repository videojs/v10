import { isNil } from '@videojs/utils/predicate';
import { camelCase, snakeCase } from '@videojs/utils/string';

export const MUX_VIDEO_DOMAIN = 'mux.com';

export type MuxResolution = '270p' | '360p' | '480p' | '540p' | '720p' | '1080p' | '1440p' | '2160p';
export type MuxRenditionOrder = 'desc';
export type MuxThumbnailExt = 'webp' | 'jpg' | 'png';
export type MuxThumbnailFitMode = 'preserve' | 'stretch' | 'crop' | 'smartcrop' | 'pad';

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

export interface MuxThumbnailParams {
  token?: string | undefined;
  /** Image format used in the URL path (`thumbnail.<ext>`). Defaults to `webp`. */
  ext?: MuxThumbnailExt | undefined;
  /** Video time (in seconds) the image is pulled from. Defaults to the middle of the video. */
  time?: number | undefined;
  /** Width of the thumbnail (in pixels). Defaults to the width of the original video. */
  width?: number | undefined;
  /** Height of the thumbnail (in pixels). Defaults to the height of the original video. */
  height?: number | undefined;
  /** Rotate the image clockwise by the given number of degrees. */
  rotate?: number | undefined;
  /** How to fit the thumbnail within the specified width + height. */
  fitMode?: MuxThumbnailFitMode | undefined;
  /** Flip the image top-bottom after performing all other transformations. */
  flipV?: boolean | undefined;
  /** Flip the image left-right after performing all other transformations. */
  flipH?: boolean | undefined;
  /** Thumbnail time for instant-clipping assets, as an epoch integer compared to the stream's program date time. */
  programTime?: number | undefined;
  /** Pull the latest thumbnail from an ongoing live stream. */
  latest?: boolean | undefined;
  [param: string]: string | number | boolean | undefined;
}

export interface MuxStoryboardParams {
  token?: string | undefined;
  [param: string]: string | number | undefined;
}

export interface MuxDrmParams {
  token?: string | undefined;
}

export interface MuxSource {
  playbackId: string;
  customDomain?: string | undefined;
  playback?: MuxPlaybackParams | undefined;
  thumbnail?: MuxThumbnailParams | MuxThumbnailParams[] | undefined;
  storyboard?: MuxStoryboardParams | undefined;
  drm?: MuxDrmParams | undefined;
}

/**
 * Serialize params to a query string (`?a=1&b=2`), mapping camelCase keys to
 * `snake_case` and skipping nullish values. A `token` replaces every other
 * param — signed URLs bake all modifiers into the token itself.
 */
export function toMuxQuery(params: Record<string, unknown> = {}): string {
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
export function toMuxVideoURL(source?: MuxSource | null): string | undefined {
  if (!source?.playbackId) return undefined;
  const { playbackId, customDomain = MUX_VIDEO_DOMAIN, playback } = source;

  if (__DEV__ && playback?.minResolution && playback?.maxResolution) {
    if (Number.parseInt(playback.maxResolution, 10) < Number.parseInt(playback.minResolution, 10)) {
      console.warn(
        `[vjs-mux] minResolution (${playback.minResolution}) must be <= maxResolution (${playback.maxResolution})`
      );
    }
  }

  return `https://stream.${customDomain}/${playbackId}.m3u8${toMuxQuery(playback)}`;
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
    playback[camelCase(key)] = value;
  }
  if (Object.keys(playback).length > 0) source.playback = playback;

  return source;
}

/**
 * Build the thumbnail image URL for a source. Uses the first entry when
 * `source.thumbnail` is an array, unless explicit `params` are given.
 */
export function toMuxThumbnailURL(source?: MuxSource | null, params?: MuxThumbnailParams): string | undefined {
  if (!source?.playbackId) return undefined;
  const { playbackId, customDomain = MUX_VIDEO_DOMAIN, thumbnail, playback } = source;
  const { ext = 'webp', token, ...query } = params ?? (Array.isArray(thumbnail) ? thumbnail[0] : thumbnail) ?? {};

  // Thumbnail tokens must carry the image (`t`) audience.
  if (token && parseJwt(token)?.aud !== 't') return undefined;
  // Signed playback requires a matching thumbnail token; an unsigned URL would be rejected.
  if (!token && playback?.token) return undefined;

  return `https://image.${customDomain}/${playbackId}/thumbnail.${ext}${toMuxQuery({ token, ...query })}`;
}

/** Build the storyboard (thumbnail sprite) VTT URL for a source. */
export function toMuxStoryboardURL(source?: MuxSource | null): string | undefined {
  if (!source?.playbackId) return undefined;
  const { playbackId, customDomain = MUX_VIDEO_DOMAIN, storyboard, playback } = source;
  const { token, ...query } = storyboard ?? {};

  // Storyboard tokens must carry the storyboard (`s`) audience.
  if (token && parseJwt(token)?.aud !== 's') return undefined;
  // Signed playback requires a matching storyboard token; an unsigned URL would be rejected.
  if (!token && playback?.token) return undefined;

  return `https://image.${customDomain}/${playbackId}/storyboard.vtt${toMuxQuery({ token, format: 'webp', ...query })}`;
}

export type MuxJWT = {
  sub: string;
  aud: 'v' | 't' | 'g' | 's' | 'd';
  exp: number;
};

/** Decode the payload of a Mux JWT, returning `undefined` for invalid tokens. */
export function parseJwt(token: string | undefined): Partial<MuxJWT> | undefined {
  const base64Url = (token ?? '').split('.')[1];
  if (!base64Url) return undefined;

  try {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}
