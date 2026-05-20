import type { StateAttrMap } from '../types';
import type { ThumbnailState } from './thumbnail-core';

/** Data attributes the thumbnail reflects from {@link ThumbnailState}. */
export const ThumbnailDataAttrs = {
  /** Present while the active thumbnail image is loading. */
  loading: 'data-loading',
  /** Present when the active thumbnail image failed to load. */
  error: 'data-error',
  /** Present when no thumbnail is available and the component is hidden. */
  hidden: 'data-hidden',
} as const satisfies StateAttrMap<ThumbnailState>;
