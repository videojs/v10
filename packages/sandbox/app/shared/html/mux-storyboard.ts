import { getMuxAssetId } from '../mux';
import type { SourceId } from '../sources';

export function renderMuxStoryboard(source: SourceId): string {
  const id = getMuxAssetId(source);
  return id
    ? `<track kind="metadata" label="thumbnails" src="https://image.mux.com/${id}/storyboard.vtt" default />`
    : '';
}
