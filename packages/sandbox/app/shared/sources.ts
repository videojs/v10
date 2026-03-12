export const SOURCES = {
  'hls-1': {
    label: 'HLS - Big Buck Bunny',
    url: 'https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8',
    type: 'hls',
    subType: 'ts',
  },
  'hls-2': {
    label: 'HLS - 2',
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
  'mp4-1': {
    label: 'MP4 - Dancing Dude',
    url: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4',
    type: 'mp4',
  },
} as const;

export type SourceId = keyof typeof SOURCES;

export const SOURCE_IDS = Object.keys(SOURCES) as SourceId[];
export const MP4_SOURCE_IDS = SOURCE_IDS.filter((id) => SOURCES[id].type === 'mp4');
export const DEFAULT_SOURCE: SourceId = 'hls-1';
export const DEFAULT_AUDIO_SOURCE: SourceId = 'mp4-1';

export const BACKGROUND_VIDEO_SRC = 'https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008/low.mp4';
