import type { StateAttrMap } from '../types';
import type { PosterState } from './poster-core';

/** Data attributes the poster reflects from {@link PosterState}. */
export const PosterDataAttrs = {
  /** Present when the poster image should be visible (before playback starts). */
  visible: 'data-visible',
} as const satisfies StateAttrMap<PosterState>;
