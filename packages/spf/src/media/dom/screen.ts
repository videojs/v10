/**
 * Screen resolution, as the signal source for a screen-size rendition cap.
 *
 * Reported as a width and a height rather than a `"720p"`-style tier, because
 * the cap that consumes it compares against real track dimensions. A tier only
 * describes a track once you assume its aspect ratio — the assumption
 * `maxResolutionToPixelArea` has to make, and the one that mis-measures an
 * anamorphic or otherwise non-16:9 rendition.
 *
 * This is the first slice of the screen-size cap in
 * `internal/design/spf/features/rendition-selection-caps.md`. What it leaves out
 * is reacting to change: this is a one-shot read, and the screen underneath a
 * window is not stable. Rotating a device swaps the axes; unplugging or
 * reattaching a monitor, or dragging the window to a different display, changes
 * the numbers *and* which physical screen they describe. So a live cap has to
 * re-read rather than cache — which is why this reads the ambient screen at call
 * time, with no subscription and no memoization of its own. A watcher belongs
 * over this function, not inside it.
 */

/** A screen's pixel dimensions. */
export interface ScreenResolution {
  readonly width: number;
  readonly height: number;
}

export interface ScreenResolutionOptions {
  /**
   * Scale the reading from CSS pixels into device pixels. On by default, since
   * device pixels are what the screen actually has, and a rendition's dimensions
   * are in the same units.
   *
   * Opt out for CSS pixels. Note that derating — a 3x phone rarely wanting 3x the
   * pixels of its layout — is a scale applied over this reading rather than a
   * reason to turn it off.
   */
  useDevicePixelRatio?: boolean | undefined;
}

/**
 * Read the screen's resolution, or `undefined` where there isn't one to read.
 *
 * `undefined` means "unknown", which is the answer a cap needs in order to not
 * cap. That lines up with `maxResolutionToPixelArea(undefined)` returning
 * `+Infinity`, so an unknown screen is a cap of "no cap" rather than a cap of
 * zero — the reading a naive `?? 0` would produce, which would pin every source
 * to its smallest rendition on exactly the environments we know least about.
 *
 * Dimensions are reported as-is, including the axis swap a rotated device
 * applies to them. Normalizing orientation away is a policy question — whether a
 * cap should flap on rotation, or hold the larger budget across both — and
 * belongs to the cap rather than to the reading.
 */
export function getScreenResolution(options: ScreenResolutionOptions = {}): ScreenResolution | undefined {
  const screen = globalThis.screen;
  if (!screen) return undefined;

  // `|| 1` covers a missing or nonsense ratio: a CSS-pixel reading is still true
  // and still cappable, so it isn't worth failing the whole answer over.
  const { useDevicePixelRatio = true } = options;
  const ratio = useDevicePixelRatio ? globalThis.devicePixelRatio || 1 : 1;

  // Rounded because device pixels are whole and a fractional ratio doesn't divide
  // a screen evenly. `NaN` from a nonsense dimension fails the check below, since
  // no comparison against it holds.
  const width = Math.round(screen.width * ratio);
  const height = Math.round(screen.height * ratio);

  return width > 0 && height > 0 ? { width, height } : undefined;
}
