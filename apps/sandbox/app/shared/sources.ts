import { getMuxAssetId } from './mux';

export const SOURCES = {
  'hls-1': {
    label: 'HLS - Big Buck Bunny',
    url: 'https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8',
    playbackId: 'VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA',
    type: 'hls',
    subType: 'ts',
  },
  'hls-2': {
    label: 'HLS - Elephants Dream',
    url: 'https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008.m3u8',
    playbackId: 'Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008',
    type: 'hls',
    subType: 'ts',
  },
  'hls-3': {
    label: 'HLS - Dancing Dude',
    url: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4.m3u8',
    playbackId: 'lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4',
    type: 'hls',
    subType: 'mp4',
  },
  'hls-4': {
    label: 'HLS - View From A Blue Moon Trailer',
    url: 'https://stream.mux.com/lyrKpPcGfqyzeI00jZAfW6MvP6GNPrkML.m3u8',
    playbackId: 'lyrKpPcGfqyzeI00jZAfW6MvP6GNPrkML',
    type: 'hls',
    subType: 'mp4',
  },
  'hls-5': {
    label: 'HLS - Mad Max Fury Road Trailer',
    url: 'https://stream.mux.com/JX01bG8eB4uaoV3OpDuK602rBfvdSgrMObjwuUOBn4JrQ.m3u8',
    playbackId: 'JX01bG8eB4uaoV3OpDuK602rBfvdSgrMObjwuUOBn4JrQ',
    type: 'hls',
    subType: 'mp4',
  },
  'mp4-1': {
    label: 'MP4 - Dancing Dude',
    url: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4',
    playbackId: 'lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4',
    type: 'mp4',
  },
  'dash-1': {
    label: 'DASH - Big Buck Bunny',
    url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
    playbackId: null,
    type: 'dash',
  },
  'dash-2': {
    label: 'DASH - Envivio Test Stream',
    url: 'https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd',
    playbackId: null,
    type: 'dash',
  },
} as const;

export type SourceId = keyof typeof SOURCES;

export const SOURCE_IDS = Object.keys(SOURCES) as SourceId[];
export const NON_DASH_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type !== 'dash');
export const MP4_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type === 'mp4');
export const DASH_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type === 'dash');
export const MUX_SOURCE_IDS = SOURCE_IDS.filter((id) => !!SOURCES[id].playbackId);
export const DEFAULT_SOURCE: SourceId = 'hls-1';
export const DEFAULT_AUDIO_SOURCE: SourceId = 'mp4-1';
export const DEFAULT_DASH_SOURCE: SourceId = 'dash-1';

export const BACKGROUND_VIDEO_SRC = 'https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008/low.mp4';

export function getPosterSrc(source: SourceId): string | undefined {
  const id = getMuxAssetId(source);
  return id ? `https://image.mux.com/${id}/thumbnail.jpg` : undefined;
}

export function getStoryboardSrc(source: SourceId): string | undefined {
  const id = getMuxAssetId(source);
  return id ? `https://image.mux.com/${id}/storyboard.vtt` : undefined;
}
