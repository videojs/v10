import type { StateAttrMap } from '../types';
import type { TitleState } from './core';

export const TitleDataAttrs = {
  /** Present when the element is hidden because no title is available. */
  hidden: 'data-hidden',
} as const satisfies StateAttrMap<TitleState>;
