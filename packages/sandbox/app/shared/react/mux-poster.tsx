import { Poster } from '@videojs/react';

import { getMuxPosterSrc } from '../mux';
import type { SourceId } from '../sources';

type MuxPosterProps = {
  source: SourceId;
};

export function MuxPoster({ source }: MuxPosterProps) {
  const src = getMuxPosterSrc(source);
  if (!src) return null;
  return <Poster src={src} />;
}
