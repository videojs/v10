export interface ThumbnailCoords {
  x: number;
  y: number;
}

export interface ThumbnailImage {
  url: string;
  startTime: number;
  endTime?: number;
  width?: number;
  height?: number;
  coords?: ThumbnailCoords;
}

export type ThumbnailSrc = string | ThumbnailImage[] | null;

export type ThumbnailCrossOrigin = 'anonymous' | 'use-credentials' | '' | null;

export type ThumbnailLoading = 'eager' | 'lazy';

export type ThumbnailFetchPriority = 'high' | 'low' | 'auto';

export interface ThumbnailConstraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

export interface ThumbnailResizeResult {
  scale: number;
  containerWidth: number;
  containerHeight: number;
  imageWidth: number;
  imageHeight: number;
  offsetX: number;
  offsetY: number;
}
