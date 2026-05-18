import { getMuxAssetId } from './mux';

export const SOURCES = {
  'hls-1': {
    label: 'HLS - Big Buck Bunny',
    url: 'https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8',
    type: 'hls',
    subType: 'ts',
  },
  'hls-2': {
    label: 'HLS - Elephants Dream',
    url: 'https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008.m3u8',
    type: 'hls',
    subType: 'ts',
  },
  'hls-3': {
    label: 'HLS - Dancing Dude',
    url: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4.m3u8',
    type: 'hls',
    subType: 'mp4',
  },
  'hls-4': {
    label: 'HLS - View From A Blue Moon Trailer',
    url: 'https://stream.mux.com/lyrKpPcGfqyzeI00jZAfW6MvP6GNPrkML.m3u8',
    type: 'hls',
    subType: 'mp4',
  },
  'hls-5': {
    label: 'HLS - Mad Max Fury Road Trailer',
    url: 'https://stream.mux.com/JX01bG8eB4uaoV3OpDuK602rBfvdSgrMObjwuUOBn4JrQ.m3u8',
    type: 'hls',
    subType: 'mp4',
  },
  'hls-live': {
    label: 'HLS - Live Stream Big Buck Bunny',
    url: 'https://stream.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4FUyk02rW4gxRM.m3u8',
    type: 'hls',
    subType: 'mp4',
    live: true,
  },
  'mp4-1': {
    label: 'MP4 - Dancing Dude',
    url: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4',
    type: 'mp4',
  },
  'dash-1': {
    label: 'DASH - Big Buck Bunny',
    url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
    type: 'dash',
  },
  'dash-2': {
    label: 'DASH - Envivio Test Stream',
    url: 'https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd',
    type: 'dash',
  },
  'vimeo-1': {
    label: 'The World In HDR 4K',
    url: 'https://vimeo.com/648359100',
    type: 'vimeo',
  },
  'vimeo-2': {
    label: 'Caminandes 1: Llama Drama',
    url: 'https://vimeo.com/638371504',
    type: 'vimeo',
  },
  'youtube-1': {
    label: 'Big Buck Bunny',
    url: 'https://www.youtube.com/watch?v=YE7VzlLtp-4',
    type: 'youtube',
  },
  'youtube-2': {
    label: 'Tears of Steel',
    url: 'https://www.youtube.com/watch?v=eRsGyueVLvQ',
    type: 'youtube',
  },
} as const;

export type SourceId = keyof typeof SOURCES;

export const SOURCE_IDS = Object.keys(SOURCES) as SourceId[];
export const NON_DASH_SOURCE_IDS = SOURCE_IDS.filter(
  (id) => SOURCES[id].type !== 'dash' && SOURCES[id].type !== 'vimeo' && SOURCES[id].type !== 'youtube'
);
export const MP4_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type === 'mp4');
export const DASH_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type === 'dash');
export const VIMEO_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type === 'vimeo');
export const YOUTUBE_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type === 'youtube');
export const DEFAULT_VIMEO_SOURCE: SourceId = 'vimeo-1';
export const DEFAULT_YOUTUBE_SOURCE: SourceId = 'youtube-1';
export const DEFAULT_SOURCE: SourceId = 'hls-1';
export const DEFAULT_AUDIO_SOURCE: SourceId = 'mp4-1';
export const DEFAULT_DASH_SOURCE: SourceId = 'dash-1';

export const BACKGROUND_VIDEO_SRC = 'https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008/low.mp4';

/** Returns true when the given source represents a live stream and should use the live-video skin. */
export function isLiveSource(id: SourceId): boolean {
  return (SOURCES[id] as { live?: boolean }).live === true;
}

export function getPosterSrc(source: SourceId): string | undefined {
  const id = getMuxAssetId(source);
  return id ? `https://image.mux.com/${id}/thumbnail.jpg` : undefined;
}

export function getStoryboardSrc(source: SourceId): string | undefined {
  // Storyboards aren't generated for live streams, so skip the request entirely.
  if (isLiveSource(source)) return undefined;
  const id = getMuxAssetId(source);
  return id ? `https://image.mux.com/${id}/storyboard.vtt` : undefined;
}
