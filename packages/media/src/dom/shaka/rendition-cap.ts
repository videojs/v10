import type shaka from 'shaka-player/dist/shaka-player.compiled-es2021';
import { DEFAULT_MIN_AUTO_RESOLUTION, resolutionToPixelArea } from '../../core/resolution';
import type { MediaResolution } from '../../core/types';

/** Cap inputs, replaced together whenever the source changes. */
export interface RenditionCapInputs {
  /** Highest resolution ABR may auto-select, or `undefined` for no cap. */
  maxAutoResolution?: MediaResolution | undefined;
  /** Whether the element's rendered size caps automatic selection. Defaults to `true`. */
  capToPlayerSize?: boolean | undefined;
  /** Lowest resolution {@link capToPlayerSize} may cap down to. Defaults to `'720p'`. */
  minAutoResolution?: MediaResolution | undefined;
  /**
   * The source's own `abr.restrictions`, which the computed ceilings must stay
   * within. Shaka merges every `configure()` call, so whatever this controller
   * writes last into the keys it owns is what stands — intersecting here is
   * what keeps a stricter caller-configured ceiling in force.
   */
  baseRestrictions?: Partial<shaka.extern.Restrictions> | undefined;
}

/** The slice of `abr.restrictions` this controller owns. */
interface CapRestrictions {
  maxPixels: number;
  maxWidth: number;
  maxHeight: number;
}

/**
 * Translates the source's rendition caps into Shaka's `abr.restrictions` — the
 * Shaka spelling of what the hls.js media's cap-level controller does.
 *
 * `abr.restrictions` is the right seam for the same reason `autoLevelCapping`
 * is on hls.js: it bounds automatic selection only. Renditions above a ceiling
 * stay in `videoRenditions` and stay selectable by hand, and when nothing
 * satisfies the restrictions Shaka falls back to the lowest-bandwidth variant
 * rather than refusing to adapt.
 *
 * Shaka's own `abr.restrictToElementSize` is not used for the player-size cap
 * because it offers no floor: the element measurement is inlined in
 * `SimpleAbrManager.chooseVariant()` with nothing to override, so
 * `minAutoResolution` could never reach it. This controller measures the
 * element itself, floors the measurement, and rounds up to the smallest
 * covering rendition — the same round-up Shaka's own cap performs.
 */
export class RenditionCapController {
  #engine: shaka.Player;
  #target: HTMLElement | null = null;
  #resizeObserver: ResizeObserver | null = null;
  #maxAutoResolution: MediaResolution | undefined;
  #capToPlayerSize = true;
  #minAutoResolution: MediaResolution = DEFAULT_MIN_AUTO_RESOLUTION;
  #base: Partial<shaka.extern.Restrictions> = {};

  constructor(engine: shaka.Player) {
    this.#engine = engine;
    // The ladder the size cap rounds up on arrives with the manifest and
    // shifts whenever the playable set does.
    engine.addEventListener('trackschanged', this.#onTracksChanged);
  }

  destroy() {
    this.#engine.removeEventListener('trackschanged', this.#onTracksChanged);
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#target = null;
  }

  /** Follow `target`'s rendered size; `null` stops following. */
  observe(target: HTMLElement | null) {
    if (target === this.#target) return;

    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#target = target;

    if (target && typeof ResizeObserver === 'function') {
      this.#resizeObserver = new ResizeObserver(() => this.#apply());
      this.#resizeObserver.observe(target);
    }

    this.#apply();
  }

  /**
   * Replace the cap inputs and re-evaluate now. Absent fields fall back to
   * their defaults, so handing over a source with no caps named restores them.
   */
  update(inputs: RenditionCapInputs) {
    this.#maxAutoResolution = inputs.maxAutoResolution;
    this.#capToPlayerSize = inputs.capToPlayerSize ?? true;
    this.#minAutoResolution = inputs.minAutoResolution ?? DEFAULT_MIN_AUTO_RESOLUTION;
    this.#base = inputs.baseRestrictions ?? {};
    this.#apply();
  }

  #apply() {
    this.#engine.configure({ abr: { restrictions: this.#computeRestrictions() } });
  }

  /**
   * The requested resolution ceiling lands on `maxPixels` — area, so
   * anamorphic renditions are judged by the pixels they actually carry — and
   * the size-derived one on `maxWidth`/`maxHeight`, the dimensions Shaka's own
   * element cap weighs. Keeping them on separate keys is what lets each lift
   * without disturbing the other. `Infinity` is Shaka's own "unrestricted", so
   * lifting a cap writes the default back rather than leaving a stale ceiling
   * behind.
   */
  #computeRestrictions(): CapRestrictions {
    const size = this.#playerSizeCeiling();

    return {
      maxPixels: Math.min(this.#base.maxPixels ?? Infinity, resolutionToPixelArea(this.#maxAutoResolution)),
      maxWidth: Math.min(this.#base.maxWidth ?? Infinity, size?.width ?? Infinity),
      maxHeight: Math.min(this.#base.maxHeight ?? Infinity, size?.height ?? Infinity),
    };
  }

  /**
   * Dimensions of the smallest rendition that still covers the element,
   * measured in device pixels, or `null` when there is no size to cap on.
   *
   * The floor lifts the measurement rather than the outcome: a 200px-tall
   * player with a `'720p'` floor is capped as if it were 720 tall, and the
   * round-up then admits whatever rendition covers *that*. A floor the ladder
   * cannot reach caps nothing — every rendition already fits under it — which
   * is what keeps the floor a bound on capping rather than a quality minimum.
   */
  #playerSizeCeiling(): { width: number; height: number } | null {
    const target = this.#target;
    if (!this.#capToPlayerSize || !target) return null;

    const scale = globalThis.devicePixelRatio || 1;
    const measuredWidth = target.clientWidth * scale;
    const measuredHeight = target.clientHeight * scale;

    // This cap *is* the element's size, so an element with no measurable size —
    // hidden, detached, not laid out yet — derives none. A requested
    // `maxAutoResolution` does not depend on layout and stands regardless.
    if (!(measuredWidth > 0 && measuredHeight > 0)) return null;

    const floorHeight = resolutionHeight(this.#minAutoResolution);
    const width = Math.max(measuredWidth, Math.ceil((floorHeight * 16) / 9));
    const height = Math.max(measuredHeight, floorHeight);

    const ladder = this.#engine
      .getVideoTracks()
      .map((track) => ({ width: track.width ?? 0, height: track.height ?? 0 }))
      .filter((track) => track.width > 0 && track.height > 0)
      .sort((a, b) => a.width * a.height - b.width * b.height);

    const covering = ladder.find((track) => track.width >= width && track.height >= height);
    if (covering) return covering;

    // Nothing covers the (floored) element: the whole ladder sits below it and
    // needs no ceiling — a cap at the measurement could only cut out an
    // oddly-shaped rendition that exceeds it on one axis alone.
    if (ladder.length > 0) return null;

    // No ladder to round up on yet. Cap at the measurement until the tracks
    // arrive; `trackschanged` re-evaluates with the real rungs.
    return { width: Math.ceil(width), height: Math.ceil(height) };
  }

  #onTracksChanged = () => this.#apply();
}

function resolutionHeight(resolution: MediaResolution): number {
  const height = Number.parseInt(resolution, 10);
  return Number.isFinite(height) && height > 0 ? height : 0;
}
