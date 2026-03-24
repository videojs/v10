import type Hls from 'hls.js';
import type { Level } from 'hls.js';
import { CapLevelController } from 'hls.js';

export type MaxResolutionValue = '720p' | '1080p' | '1440p' | '2160p';

/** Total pixel counts per Mux Video pricing tier: https://www.mux.com/docs/pricing/video#resolution-based-pricing */
const RESOLUTION_PIXEL_LIMITS: Record<MaxResolutionValue, number> = {
  '720p': 921600, // 1280 × 720
  '1080p': 2073600, // 1920 × 1080
  '1440p': 4194304, // 2560 × 1440
  '2160p': 8294400, // 3840 × 2160
};

// Keyed by hls instance so multiple players don't share state.
const maxAutoResolutionMap = new WeakMap<Hls, MaxResolutionValue>();

/**
 * hls.js CapLevelController that enforces a 720p minimum floor when capping
 * to player size, and supports an explicit `maxAutoResolution` cap for Mux
 * Video resolution-based billing.
 */
export class MuxCapLevelController extends CapLevelController {
  /** Never auto-cap below this height (pixels). */
  static readonly minMaxResolutionHeight = 720;

  static setMaxAutoResolution(hls: Hls, value: MaxResolutionValue | undefined): void {
    if (value !== undefined) {
      maxAutoResolutionMap.set(hls, value);
    } else {
      maxAutoResolutionMap.delete(hls);
    }
  }

  #maxAutoResolution(): MaxResolutionValue | undefined {
    // @ts-expect-error: hls is TS-private in CapLevelController
    return maxAutoResolutionMap.get(this.hls);
  }

  #validLevels(capLevelIndex: number): Level[] {
    // @ts-expect-error: hls, isLevelAllowed are TS-private in CapLevelController
    return ((this.hls.levels ?? []) as Level[]).filter(
      // @ts-expect-error
      (level: Level, index: number) => this.isLevelAllowed(level) && index <= capLevelIndex
    );
  }

  #maxLevelWithinResolution(capLevelIndex: number, maxAutoResolution: MaxResolutionValue): number {
    const validLevels = this.#validLevels(capLevelIndex);
    const maxPixels = RESOLUTION_PIXEL_LIMITS[maxAutoResolution];

    const withinCap = validLevels.filter((l) => l.width * l.height <= maxPixels);
    if (withinCap.length === 0) return 0;

    // Prefer an exact tier match; otherwise take the highest that stays under the cap.
    const exactIdx = withinCap.findIndex((l) => l.width * l.height === maxPixels);
    const best = exactIdx !== -1 ? withinCap[exactIdx] : withinCap[withinCap.length - 1];

    return validLevels.findIndex((l) => l === best);
  }

  override getMaxLevel(capLevelIndex: number): number {
    const maxAutoResolution = this.#maxAutoResolution();

    if (maxAutoResolution !== undefined) {
      return this.#maxLevelWithinResolution(capLevelIndex, maxAutoResolution);
    }

    const baseMaxLevel = super.getMaxLevel(capLevelIndex);
    const validLevels = this.#validLevels(capLevelIndex);

    // Out-of-bounds means no levels available yet or no capping needed — pass through.
    if (!validLevels[baseMaxLevel]) return baseMaxLevel;

    const baseHeight = Math.min(validLevels[baseMaxLevel].width, validLevels[baseMaxLevel].height);
    const minHeight = MuxCapLevelController.minMaxResolutionHeight;

    if (baseHeight >= minHeight) return baseMaxLevel;

    // Player size would cap below the floor — find the lowest level that meets it.
    return CapLevelController.getMaxLevelByMediaSize(validLevels, minHeight * (16 / 9), minHeight);
  }
}
