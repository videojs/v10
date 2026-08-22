import type { MediaResolution } from './types';

/**
 * Floor applied to the player-size cap unless a source names another.
 *
 * The low rungs of a ladder are there for bad network conditions, and at that
 * end the relationship between resolution and perceived quality stops holding:
 * a small player capped to 360p looks worse than its size alone suggests. No
 * reliable signal exists to key that on, so a fixed floor stands in for one.
 */
export const DEFAULT_MIN_AUTO_RESOLUTION: MediaResolution = '720p';

/**
 * Pixel area of a resolution shorthand, assuming 16:9 — `'720p'` is
 * `1280 × 720`, or `921_600`.
 *
 * Renditions are matched on area rather than literal height so anamorphic
 * variants are judged by how many pixels they actually carry: a 2560×1080
 * ultrawide rendition costs more than 16:9 1080p and is capped accordingly.
 *
 * Mirrors `maxResolutionToPixelArea` in `@videojs/spf`, and agrees with it on
 * every rung whose 16:9 width is a whole number. It parts company at `'480p'`
 * on purpose: 16:9 at 480 tall is 853.33 wide, ladders ship the rounded-up
 * 854×480, and the exact area would put the standard 480p rendition over its
 * own cap. Rounding the width up admits it while still excluding anything
 * genuinely wider.
 */
export function resolutionToPixelArea(resolution: MediaResolution | undefined): number {
  if (resolution === undefined) return Number.POSITIVE_INFINITY;

  const height = Number.parseInt(resolution, 10);
  if (!(Number.isFinite(height) && height > 0)) return Number.POSITIVE_INFINITY;

  return Math.ceil((height * 16) / 9) * height;
}
