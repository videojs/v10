import type {
  ThumbnailConstraints,
  ThumbnailImage,
  ThumbnailProps,
  ThumbnailResizeResult,
  ThumbnailState,
} from './types';

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

    return {
      scale,
      containerWidth: tileWidth * scale,
      containerHeight: tileHeight * scale,
      imageWidth: imgNaturalWidth * scale,
      imageHeight: imgNaturalHeight * scale,
      offsetX: (thumbnail.coords?.x ?? 0) * scale,
      offsetY: (thumbnail.coords?.y ?? 0) * scale,
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
