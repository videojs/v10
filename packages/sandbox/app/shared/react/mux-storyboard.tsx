import { getMuxAssetId } from '../mux';
import type { SourceId } from '../sources';

type MuxStoryboardProps = {
  source: SourceId;
};

export function MuxStoryboard({ source }: MuxStoryboardProps) {
  const id = getMuxAssetId(source);
  if (!id) return null;
  return <track kind="metadata" label="thumbnails" src={`https://image.mux.com/${id}/storyboard.vtt`} default />;
}
