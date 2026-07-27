import { parseMuxVideoURL } from '@videojs/core/dom/media/mux';
import { SOURCES, type SourceId } from './sources';

export function getMuxAssetId(source: SourceId): string | undefined {
  return parseMuxVideoURL(SOURCES[source].url)?.playbackId;
}
