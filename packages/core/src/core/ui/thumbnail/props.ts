import type { ThumbnailCrossOrigin, ThumbnailFetchPriority, ThumbnailLoading } from './types';

export interface ThumbnailProps {
  /** Time in seconds to display the thumbnail for. */
  time?: number | undefined;
  /** CORS setting forwarded to the inner `<img>`. */
  crossOrigin?: ThumbnailCrossOrigin | undefined;
  /** Image loading strategy forwarded to the inner `<img>`. */
  loading?: ThumbnailLoading | undefined;
  /** Image fetch priority hint forwarded to the inner `<img>`. */
  fetchPriority?: ThumbnailFetchPriority | undefined;
}
