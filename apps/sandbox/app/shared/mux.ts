import { SOURCES, type SourceId } from './sources';

// Playback IDs from stream URLs (`https://stream.mux.com/<playback-id>.m3u8`) and
// from MP4 renditions (`https://stream.mux.com/<playback-id>/<rendition>.mp4`).
const MUX_PLAYBACK_ID = /^https:\/\/stream\.[^/]+\/([\w-]+?)(?:\.m3u8|\/[\w-]+\.mp4)/;

export function getMuxAssetId(source: SourceId): string | undefined {
  return SOURCES[source].url.match(MUX_PLAYBACK_ID)?.[1];
}
