import { Poster } from '@videojs/react';

import { getMuxAssetId } from '../mux';
import type { SourceId } from '../sources';

type MuxPosterProps = {
  source: SourceId;
};

export function MuxPoster({ source }: MuxPosterProps) {
  const id = getMuxAssetId(source);
  if (!id) return null;
  return <Poster src={`https://image.mux.com/${id}/thumbnail.jpg`} />;
}
