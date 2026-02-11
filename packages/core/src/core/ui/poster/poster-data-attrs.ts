import type { StateAttrMap } from '../types';
import type { PosterState } from './poster-core';

export const PosterDataAttrs = {
  visible: 'data-visible',
} as const satisfies StateAttrMap<PosterState>;
