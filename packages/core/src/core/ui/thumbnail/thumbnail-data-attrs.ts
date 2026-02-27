import type { StateAttrMap } from '../types';
import type { ThumbnailState } from './thumbnail-core';

export const ThumbnailDataAttrs = {
  loading: 'data-loading',
  error: 'data-error',
  hidden: 'data-hidden',
} as const satisfies StateAttrMap<ThumbnailState>;
