/** Pixel coordinates of a thumbnail tile inside a sprite sheet. */
export interface ThumbnailCoords {
  /** X offset of the tile within the sprite sheet, in pixels. */
  x: number;
  /** Y offset of the tile within the sprite sheet, in pixels. */
  y: number;
}

/** A single thumbnail tile, optionally pointing into a sprite sheet. */
export interface ThumbnailImage {
  /** Image URL (sprite sheet or standalone). */
  url: string;
  /** Time the tile starts representing, in seconds. */
  startTime: number;
  /** Time the tile stops representing, in seconds. */
  endTime?: number;
  /** Tile width inside the sprite sheet, in pixels. */
  width?: number;
  /** Tile height inside the sprite sheet, in pixels. */
  height?: number;
  /** Coordinates of the tile inside the sprite sheet. */
  coords?: ThumbnailCoords;
}

/** Allowed thumbnail source values: a manifest URL, a parsed image list, or null. */
export type ThumbnailSrc = string | ThumbnailImage[] | null;

/** Allowed `crossorigin` values for the thumbnail `<img>`. */
export type ThumbnailCrossOrigin = 'anonymous' | 'use-credentials' | '' | null;

/** Allowed `loading` values for the thumbnail `<img>`. */
export type ThumbnailLoading = 'eager' | 'lazy';

/** Allowed `fetchpriority` values for the thumbnail `<img>`. */
export type ThumbnailFetchPriority = 'high' | 'low' | 'auto';

/** Numeric min/max box constraints used to scale a thumbnail tile. */
export interface ThumbnailConstraints {
  /** Minimum width in pixels. */
  minWidth: number;
  /** Maximum width in pixels. */
  maxWidth: number;
  /** Minimum height in pixels. */
  minHeight: number;
  /** Maximum height in pixels. */
  maxHeight: number;
}

/** Container and image dimensions produced by `ThumbnailCore.resize`. */
export interface ThumbnailResizeResult {
  /** Uniform scale factor applied to the tile. */
  scale: number;
  /** Visible container width in pixels. */
  containerWidth: number;
  /** Visible container height in pixels. */
  containerHeight: number;
  /** Scaled width of the sprite sheet image. */
  imageWidth: number;
  /** Scaled height of the sprite sheet image. */
  imageHeight: number;
  /** Horizontal translation needed to bring the tile into the container. */
  offsetX: number;
  /** Vertical translation needed to bring the tile into the container. */
  offsetY: number;
}
