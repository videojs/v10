import type {
  ThumbnailConstraints,
  ThumbnailCrossOrigin,
  ThumbnailFetchPriority,
  ThumbnailImage,
  ThumbnailLoading,
  ThumbnailResizeResult,
} from './types';

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

export interface ThumbnailState {
  /** The thumbnail image is loading. */
  loading: boolean;
  /** The thumbnail image failed to load. */
  error: boolean;
  /** No thumbnail is available and not loading — the component should be hidden. */
  hidden: boolean;
}

export class ThumbnailCore {
  findActiveThumbnail(thumbnails: ThumbnailImage[], time: number): ThumbnailImage | undefined {
    if (thumbnails.length === 0) return undefined;

    let low = 0;
    let high = thumbnails.length - 1;
    let result: ThumbnailImage | undefined;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      const image = thumbnails[mid]!;

      if (time >= image.startTime) {
        result = image;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return result;
  }

  /**
   * Parse CSS constraint strings into numeric `ThumbnailConstraints`.
   *
   * Accepts any object with string `minWidth`/`maxWidth`/`minHeight`/`maxHeight`
   * properties — `CSSStyleDeclaration` satisfies this structurally.
   */
  parseConstraints(raw: {
    minWidth: string;
    maxWidth: string;
    minHeight: string;
    maxHeight: string;
  }): ThumbnailConstraints {
    const minW = parseFloat(raw.minWidth);
    const maxW = parseFloat(raw.maxWidth);
    const minH = parseFloat(raw.minHeight);
    const maxH = parseFloat(raw.maxHeight);

    return {
      minWidth: Number.isFinite(minW) ? minW : 0,
      maxWidth: Number.isFinite(maxW) ? maxW : Infinity,
      minHeight: Number.isFinite(minH) ? minH : 0,
      maxHeight: Number.isFinite(maxH) ? maxH : Infinity,
    };
  }

  /**
   * Calculate a uniform scale factor that fits `tileWidth × tileHeight` within the
   * given CSS min/max constraints while preserving aspect ratio.
   *
   * - Scales down when the tile exceeds max constraints.
   * - Scales up when the tile is smaller than min constraints.
   * - Returns `1` when no scaling is needed.
   */
  calculateScale(tileWidth: number, tileHeight: number, constraints: ThumbnailConstraints): number {
    const { minWidth, maxWidth, minHeight, maxHeight } = constraints;

    const maxRatio = Math.min(maxWidth / tileWidth, maxHeight / tileHeight);
    const minRatio = Math.max(minWidth / tileWidth, minHeight / tileHeight);

    // Scale down if exceeding max constraints.
    if (Number.isFinite(maxRatio) && maxRatio < 1) return maxRatio;
    // Scale up if below min constraints.
    if (Number.isFinite(minRatio) && minRatio > 1) return minRatio;

    return 1;
  }

  /**
   * Compute container and image dimensions for the current thumbnail, scaled to
   * fit within the element's CSS min/max constraints.
   *
   * The container clips the sprite sheet via `overflow: hidden`, and the image is
   * positioned with `transform: translate()` to show the correct tile.
   */
  resize(
    thumbnail: ThumbnailImage,
    imgNaturalWidth: number,
    imgNaturalHeight: number,
    constraints: ThumbnailConstraints
  ): ThumbnailResizeResult | undefined {
    const tileWidth = thumbnail.width ?? imgNaturalWidth;
    const tileHeight = thumbnail.height ?? imgNaturalHeight;

    if (!tileWidth || !tileHeight) return undefined;

    const scale = this.calculateScale(tileWidth, tileHeight, constraints);

    const coordX = thumbnail.coords?.x ?? 0;
    const coordY = thumbnail.coords?.y ?? 0;

    // Inset by 1px to eat the interpolation fringe the browser introduces when
    // scaling the sprite sheet (bilinear filtering blends across tile boundaries).
    const inset = scale !== 1 ? 1 : 0;

    return {
      scale,
      // Floor container so it never extends past the tile boundary.
      containerWidth: Math.max(0, Math.floor(tileWidth * scale) - inset * 2),
      containerHeight: Math.max(0, Math.floor(tileHeight * scale) - inset * 2),
      // Ceil image so the sprite sheet always fills the container.
      imageWidth: Math.ceil(imgNaturalWidth * scale),
      imageHeight: Math.ceil(imgNaturalHeight * scale),
      // Ceil offset so it never undershoots the tile origin (prevents top/left bleed).
      offsetX: Math.ceil(coordX * scale) + inset,
      offsetY: Math.ceil(coordY * scale) + inset,
    };
  }

  getState(loading: boolean, error: boolean, thumbnail: ThumbnailImage | undefined): ThumbnailState {
    return {
      loading,
      error,
      hidden: !loading && !thumbnail,
    };
  }

  getAttrs(_state: ThumbnailState) {
    return {
      role: 'img' as const,
      'aria-hidden': 'true' as const,
    };
  }
}

export namespace ThumbnailCore {
  export type Props = ThumbnailProps;
  export type State = ThumbnailState;
}
