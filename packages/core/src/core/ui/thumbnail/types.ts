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

export type CrossOriginValue = 'anonymous' | 'use-credentials' | '' | null;

export interface ThumbnailProps {
  /** Thumbnail source — a VTT URL, JSON storyboard URL, or pre-parsed array. */
  src?: ThumbnailSrc | undefined;
  /** Time in seconds to display the thumbnail for. */
  time?: number | undefined;
  /** CORS setting for the thumbnail source and images. */
  crossOrigin?: CrossOriginValue | undefined;
  /** Image loading strategy. */
  loading?: 'eager' | 'lazy' | undefined;
  /** Image fetch priority hint. */
  fetchPriority?: 'high' | 'low' | 'auto' | undefined;
}

export interface ThumbnailState {
  loading: boolean;
  error: boolean;
  hidden: boolean;
}

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

export type { MediaTextCue } from '../../media/state';
