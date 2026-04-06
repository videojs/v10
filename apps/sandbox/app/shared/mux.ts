import { SOURCES, type SourceId } from './sources';

export function getMuxAssetId(source: SourceId): string | undefined {
  return SOURCES[source].url.match(/stream\.mux\.com\/([a-zA-Z0-9]+)/)?.[1];
}
