import { SOURCES, type SourceId } from './sources';

export function getMuxAssetId(source: SourceId): string | undefined {
  return SOURCES[source].url.match(/stream\.mux\.com\/([a-zA-Z0-9]+)/)?.[1];
}

export function getMuxPosterSrc(source: SourceId): string | undefined {
  const id = getMuxAssetId(source);
  return id ? `https://image.mux.com/${id}/thumbnail.jpg` : undefined;
}
