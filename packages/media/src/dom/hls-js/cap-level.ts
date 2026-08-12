import Hls, { type Level } from 'hls.js';
import type { MediaResolution } from '../../core/types';

/**
 * Live cap inputs the installed cap-level controller reads on every evaluation.
 *
 * hls.js fixes `capLevelController` when the engine is constructed, so the class
 * cannot carry values that change during playback. The media element owns this
 * object and mutates it in place instead, which is what lets a cap change skip
 * rebuilding the engine.
 */
export interface RenditionCapPolicy {
  /** Highest resolution ABR may auto-select, or `undefined` for no cap. */
  maxAutoResolution: MediaResolution | undefined;
  /** Registered by the controller's own constructor. */
  controller?: RenditionCapController | undefined;
}

export interface RenditionCapController {
  /** Re-evaluate the policy now rather than on hls.js's next tick. */
  apply(): void;
}

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

/**
 * Highest level index that keeps automatic selection at or below `resolution`.
 *
 * `autoLevelCapping` is a ceiling on the *index*, so every level at or below it
 * stays eligible. That makes the answer the end of the leading run that fits the
 * budget, not the single best match: hls.js orders levels by height, so a wider
 * rendition can exceed the pixel budget from a lower index, and capping at the
 * best match would leave it selectable.
 *
 * Falls back to index `0` when even the lowest rung is over budget — playing
 * something over-spec beats refusing to adapt.
 *
 * Returns `undefined` when there is nothing to cap: no resolution requested, or
 * no levels to choose from.
 */
export function levelIndexAtOrBelow(
  levels: readonly Level[],
  resolution: MediaResolution | undefined
): number | undefined {
  const maxPixelArea = resolutionToPixelArea(resolution);
  if (maxPixelArea === Number.POSITIVE_INFINITY || levels.length === 0) return undefined;

  const overBudget = levels.findIndex((level) => (level.width ?? 0) * (level.height ?? 0) > maxPixelArea);

  // Everything fits: the whole ladder is eligible. Otherwise stop one short of
  // the first level that does not, and never below index 0.
  return overBudget === -1 ? levels.length - 1 : Math.max(0, overBudget - 1);
}

type CapLevelControllerClass = typeof Hls.DefaultConfig.capLevelController;

/**
 * Build the `capLevelController` class to hand to the hls.js constructor.
 *
 * `hls.autoLevelCapping` has exactly one writer: hls.js's own
 * `CapLevelController`, which rewrites it on a one-second interval for as long
 * as `capLevelToPlayerSize` is on — and it is on by default here. Assigning the
 * property from outside is undone within a second, so a cap has to be applied
 * from inside the controller rather than in competition with it.
 *
 * The only seam hls.js offers is `getMaxLevel()`, which every value the capping
 * loop writes passes through. Overriding it makes the requested ceiling part of
 * the same single-writer computation.
 *
 * @param policy - Live cap inputs, re-read on every evaluation.
 * @param BaseController - Controller to layer on top of, so a controller passed
 *   through `source.engine.capLevelController` keeps its behavior.
 */
export function createCapLevelController(
  policy: RenditionCapPolicy,
  BaseController: CapLevelControllerClass = Hls.DefaultConfig.capLevelController
): CapLevelControllerClass {
  return class RenditionCapLevelController extends BaseController {
    #hls: Hls;
    #capping = false;

    constructor(hls: Hls) {
      super(hls);
      this.#hls = hls;
      policy.controller = this;

      // hls.js re-evaluates on both of these itself, but only while its capping
      // loop runs. These cover the case where it never starts.
      hls.on(Hls.Events.MANIFEST_PARSED, this.#onLevelsChanged);
      hls.on(Hls.Events.LEVELS_UPDATED, this.#onLevelsChanged);
    }

    destroy() {
      this.#hls.off(Hls.Events.MANIFEST_PARSED, this.#onLevelsChanged);
      this.#hls.off(Hls.Events.LEVELS_UPDATED, this.#onLevelsChanged);
      if (policy.controller === this) policy.controller = undefined;
      super.destroy();
    }

    // hls.js keeps the interval handle private, so the loop is tracked through
    // the public start/stop pair instead of reaching into it.
    startCapping() {
      this.#capping = true;
      super.startCapping();
    }

    stopCapping() {
      this.#capping = false;
      super.stopCapping();
    }

    /**
     * Intersect hls.js's player-size ceiling with the requested one. Deferring
     * to `super` first keeps the behavior it owns — notably the level
     * restrictions `capLevelOnFPSDrop` accumulates.
     *
     * The translation from resolution to level index happens here, not when the
     * policy is set, because levels arrive after the option does and shift
     * whenever hls.js drops one.
     */
    getMaxLevel(capLevelIndex: number): number {
      const bySize = super.getMaxLevel(capLevelIndex);
      const byResolution = levelIndexAtOrBelow(this.#hls.levels, policy.maxAutoResolution);

      return byResolution === undefined ? bySize : Math.min(bySize, byResolution);
    }

    /**
     * hls.js measures the element here and writes the ceiling it derives. It
     * backs out entirely when the element has no measurable size — sensible for
     * a cap that *is* the element's size, but a requested resolution ceiling
     * does not depend on layout. A player that is hidden, detached, or not laid
     * out yet still has to honor it.
     */
    detectPlayerSize() {
      super.detectPlayerSize();
      if (this.mediaWidth > 0 && this.mediaHeight > 0) return;
      this.#applyResolutionCap();
    }

    apply() {
      // While the loop runs it owns the slot, so go through its own path;
      // everything it writes already passes through `getMaxLevel()`.
      if (this.#capping) {
        this.detectPlayerSize();
        return;
      }
      this.#applyResolutionCap();
    }

    /** The ceiling on its own, for when the size measurement is unavailable. */
    #applyResolutionCap() {
      const { levels } = this.#hls;
      if (!levels?.length) return;

      // `-1` is how hls.js spells "uncapped".
      this.#hls.autoLevelCapping = levelIndexAtOrBelow(levels, policy.maxAutoResolution) ?? -1;
    }

    #onLevelsChanged = () => this.apply();
  };
}
