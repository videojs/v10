import { parseMuxVideoURL } from '@videojs/media/dom/mux';
import { SOURCES, type SourceId } from './sources';

export function getMuxAssetId(source: SourceId): string | undefined {
  const { url } = SOURCES[source];
  // MP4 renditions (`https://stream.mux.com/<playback-id>/<rendition>.mp4`) aren't stream URLs.
  return parseMuxVideoURL(url)?.playbackId ?? url.match(/stream\.mux\.com\/([\w-]+)\/[\w-]+\.mp4/)?.[1];
}
