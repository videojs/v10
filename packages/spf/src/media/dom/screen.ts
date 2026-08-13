/**
 * Screen resolution, as the signal source for a screen-size rendition cap.
 *
 * Reported as a width and a height rather than a `"720p"`-style tier, because
 * the cap that consumes it compares against real track dimensions. A tier only
 * describes a track once you assume its aspect ratio — the assumption
 * `maxResolutionToPixelArea` has to make, and the one that mis-measures an
 * anamorphic or otherwise non-16:9 rendition.
 *
 * The signal source for the screen-size cap in
 * `internal/design/spf/features/rendition-selection-caps.md`.
 *
 * The screen underneath a window is not stable: rotating a device swaps the axes,
 * and unplugging a monitor or dragging the window to another display changes the
 * numbers *and* which physical screen they describe. So `getScreenResolution`
 * reads at call time and caches nothing, and `watchScreenResolution` layers the
 * reacting on top rather than the reader holding state of its own.
 */

import { listen } from '@videojs/utils/dom';

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

/**
 * Call `onChange` whenever {@link getScreenResolution} would start answering
 * differently. Returns a function that stops watching.
 *
 * There is no single event for "the screen changed", so this subscribes to every
 * signal that implies one and compares readings to decide whether anything
 * actually moved. Comparing is what makes that safe: the signals overlap and
 * `resize` in particular is noisy, so over-subscribing costs a discarded read
 * rather than a spurious call. `onChange` fires only on a genuine change, and
 * never on subscribe — call {@link getScreenResolution} for the starting value.
 *
 * The signals, and what each one is here for:
 *
 * - **`resize`** — the window changing size, which is also what the OS does to it
 *   when the display it was on goes away.
 * - **`screen.orientation` change** — rotation, which swaps the axes without
 *   necessarily resizing the window.
 * - **a `(resolution: <ratio>dppx)` media query** — the device pixel ratio
 *   changing under a window that kept its size, from zoom or from moving to a
 *   display with a different ratio. Armed against the current ratio and re-armed
 *   when it moves, since the query only reports on the ratio it was built for.
 *
 * ⚠️ Known gap: dragging a window between two same-ratio displays of different
 * sizes, without the window resizing, changes the reading with none of the above
 * firing. Closing it needs the Window Management API's screen-change events,
 * which are permission-gated and not broadly available — so it is deliberately
 * out of this slice rather than approximated with polling, whose interval and
 * battery cost are a policy decision this function shouldn't be making.
 */
export function watchScreenResolution(
  onChange: (resolution: ScreenResolution | undefined) => void,
  options: ScreenResolutionOptions = {}
): () => void {
  let current = getScreenResolution(options);
  let armedRatio: number | undefined;
  let stopRatioQuery: (() => void) | undefined;

  const check = () => {
    armRatioQuery();

    const next = getScreenResolution(options);
    if (isSameResolution(current, next)) return;

    current = next;
    onChange(next);
  };

  // Re-armed rather than armed once: a `dppx` query only answers about the ratio
  // it was built for, so after the ratio moves the old query goes quiet.
  const armRatioQuery = () => {
    const ratio = globalThis.devicePixelRatio;
    if (ratio === armedRatio) return;

    stopRatioQuery?.();
    stopRatioQuery = undefined;
    armedRatio = ratio;

    if (!(typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0)) return;

    const query = globalThis.matchMedia?.(`(resolution: ${ratio}dppx)`);
    if (query) stopRatioQuery = listen(query, 'change', check);
  };

  armRatioQuery();

  // Each signal is optional for the same reason the reading is: an environment
  // missing one has nothing to report from it, which is not a reason to fail.
  const stopResize = globalThis.window ? listen(globalThis.window, 'resize', check) : undefined;
  const orientation = globalThis.screen?.orientation;
  const stopOrientation = orientation ? listen(orientation, 'change', check) : undefined;

  return () => {
    stopResize?.();
    stopOrientation?.();
    stopRatioQuery?.();
    stopRatioQuery = undefined;
  };
}

/** Whether two readings say the same thing, counting two unknowns as agreeing. */
function isSameResolution(a: ScreenResolution | undefined, b: ScreenResolution | undefined): boolean {
  if (!a || !b) return a === b;
  return a.width === b.width && a.height === b.height;
}
