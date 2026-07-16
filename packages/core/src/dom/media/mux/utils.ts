import { isNil } from '@videojs/utils/predicate';

export const MUX_VIDEO_DOMAIN = 'mux.com';

export type MuxMaxResolution = '720p' | '1080p' | '1440p' | '2160p';
export type MuxMinResolution = '480p' | '540p' | '720p' | '1080p' | '1440p' | '2160p';
export type MuxRenditionOrder = 'asc' | 'desc';

export interface MuxTokens {
  playback?: string;
  drm?: string;
  thumbnail?: string;
  storyboard?: string;
}

export interface MuxVideoURLProps {
  playbackId?: string | undefined;
  customDomain?: string | undefined;
  maxResolution?: MuxMaxResolution | undefined;
  minResolution?: MuxMinResolution | undefined;
  renditionOrder?: MuxRenditionOrder | undefined;
  programStartTime?: number | undefined;
  programEndTime?: number | undefined;
  assetStartTime?: number | undefined;
  assetEndTime?: number | undefined;
  playbackToken?: string | undefined;
  tokens?: MuxTokens | undefined;
  extraSourceParams?: Record<string, string | undefined> | undefined;
}

/** Build a Mux HLS stream URL from a playback ID and optional source params. */
export function toMuxVideoURL({
  playbackId: playbackIdWithParams,
  customDomain: domain = MUX_VIDEO_DOMAIN,
  maxResolution,
  minResolution,
  renditionOrder,
  programStartTime,
  programEndTime,
  assetStartTime,
  assetEndTime,
  playbackToken,
  // Normalizes the different ways of providing a playback token.
  tokens: { playback: token = playbackToken } = {},
  extraSourceParams = {},
}: MuxVideoURLProps = {}): string | undefined {
  if (!playbackIdWithParams) return undefined;

  // Normalizes the different ways of providing a playback ID.
  const [playbackId, queryPart = ''] = toPlaybackIdParts(playbackIdWithParams);
  const url = new URL(`https://stream.${domain}/${playbackId}.m3u8${queryPart}`);

  // Signed playback IDs only honor the `token`; every other feature must be
  // baked into the signing token, so strip all other query params here.
  if (token || url.searchParams.has('token')) {
    const keys = Array.from(url.searchParams.keys());
    for (const key of keys) {
      if (key !== 'token') url.searchParams.delete(key);
    }
    if (token) url.searchParams.set('token', token);
    return url.toString();
  }

  if (maxResolution) url.searchParams.set('max_resolution', maxResolution);
  if (minResolution) {
    url.searchParams.set('min_resolution', minResolution);
    if (__DEV__ && maxResolution && Number.parseInt(maxResolution, 10) < Number.parseInt(minResolution, 10)) {
      console.warn(`[vjs-mux] minResolution (${minResolution}) must be <= maxResolution (${maxResolution})`);
    }
  }
  if (renditionOrder) url.searchParams.set('rendition_order', renditionOrder);
  if (programStartTime) url.searchParams.set('program_start_time', `${programStartTime}`);
  if (programEndTime) url.searchParams.set('program_end_time', `${programEndTime}`);
  if (assetStartTime) url.searchParams.set('asset_start_time', `${assetStartTime}`);
  if (assetEndTime) url.searchParams.set('asset_end_time', `${assetEndTime}`);

  for (const [key, value] of Object.entries(extraSourceParams)) {
    if (!isNil(value)) url.searchParams.set(key, value);
  }

  return url.toString();
}

/** Split a playback ID into its ID and optional (`?...`) query parts. */
export function toPlaybackIdParts(playbackId: string): [string, string?] {
  const queryIndex = playbackId.indexOf('?');
  if (queryIndex < 0) return [playbackId];
  return [playbackId.slice(0, queryIndex), playbackId.slice(queryIndex)];
}
