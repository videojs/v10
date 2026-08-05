import { SOURCES, type SourceId } from './sources';

// Playback IDs from stream URLs (`https://stream.mux.com/<playback-id>.m3u8`) and
// from MP4 renditions (`https://stream.mux.com/<playback-id>/<rendition>.mp4`).
const MUX_PLAYBACK_ID = /^https:\/\/stream\.[^/]+\/([\w-]+?)(?:\.m3u8|\/[\w-]+\.mp4)/;

export function getMuxAssetId(source: SourceId): string | undefined {
  // A structured source names the playback ID outright; a plain URL hides it.
  const { source: muxSource, url } = SOURCES[source];
  return muxSource?.playbackId ?? url?.match(MUX_PLAYBACK_ID)?.[1];
}
