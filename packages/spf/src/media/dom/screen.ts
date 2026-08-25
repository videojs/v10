/**
 * Screen resolution, as the signal source for a screen-size rendition cap.
 *
 * Reported as a width and a height rather than a `"720p"`-style tier, because the cap that consumes it compares against
 * real track dimensions. A tier only describes a track once you assume its aspect ratio, and that assumption
 * mis-measures an anamorphic or otherwise non-16:9 rendition.
 *
 * The signal source for the screen-size cap in `internal/design/spf/features/rendition-selection-caps.md`.
 *
 * The screen underneath a window is not stable: rotating a device swaps the axes, and unplugging a monitor or dragging
 * the window to another display changes the numbers _and_ which physical screen they describe. So `getScreenResolution`
 * reads at call time and caches nothing, and `watchScreenResolution` layers the reacting on top rather than the reader
 * holding state of its own.
 */

import { getDevicePixelRatio, listen, watchDevicePixelRatio } from '@videojs/utils/dom';
import { shallowEqual } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';

import { type Resolution, scaleResolution } from '../primitives/resolution';

/** A screen's pixel dimensions. */
export type ScreenResolution = Resolution;

export interface ScreenResolutionOptions {
  /**
   * Scale the reading from CSS pixels into device pixels. On by default, since device pixels are what the screen
   * actually has, and a rendition's dimensions are in the same units.
   *
   * Opt out for CSS pixels. Note that derating — a 3x phone rarely wanting 3x the pixels of its layout — is a scale
   * applied over this reading rather than a reason to turn it off.
   *
   * ⚠️ Chromium and Gecko fold page zoom into `devicePixelRatio`, so with this on, zooming moves the reading even
   * though the screen didn't change. WebKit holds the ratio independent of zoom and is unaffected. Whether a cap should
   * track zoom is the cap's call; this flag is only what puts zoom in scope.
   */
  useDevicePixelRatio: boolean;
}

/**
 * Read the screen's resolution, or `undefined` where there isn't one to read.
 *
 * `undefined` means "unknown", which is the answer a cap needs in order to not cap. `screenResolutionCap` reads it that
 * way and declines to narrow, so an unknown screen is "no cap" rather than a cap of zero — the reading a naive `?? 0`
 * would produce, which would pin every source to its smallest rendition on exactly the environments we know least
 * about.
 *
 * Dimensions are reported as-is, including the axis swap a rotated device applies to them. Normalizing orientation away
 * is a policy question — whether a cap should flap on rotation, or hold the larger budget across both — and belongs to
 * the cap rather than to the reading.
 */
export function getScreenResolution(
  { useDevicePixelRatio }: ScreenResolutionOptions = { useDevicePixelRatio: true }
): ScreenResolution | undefined {
  const screen = globalThis.screen;
  if (!screen) return undefined;

  // A missing or nonsense ratio falls back to 1 (see `getDevicePixelRatio`): a
  // CSS-pixel reading is still true and still cappable, so it isn't worth failing
  // the whole answer over. Rounding, and the nothing-to-report case a `NaN` or
  // zero dimension lands in, belong to `scaleResolution`.
  return scaleResolution(screen, useDevicePixelRatio ? getDevicePixelRatio() : 1);
}

/**
 * Call `onChange` whenever {@link getScreenResolution} would start answering differently. Returns a function that stops
 * watching.
 *
 * There is no single event for "the screen changed", so this subscribes to every signal that implies one and compares
 * readings to decide whether anything actually moved. Comparing is what makes that safe: the signals overlap and
 * `resize` in particular is noisy, so over-subscribing costs a discarded read rather than a spurious call.
 *
 * `onChange` is called once on subscribe with the starting value — including `undefined` where there is no screen — and
 * after that only on a genuine change. So a consumer gets its initial state from the watcher and never has to pair it
 * with a separate {@link getScreenResolution} call.
 *
 * The signals, and what each one is here for:
 *
 * - **`screen`'s own `change`** — the screen itself being reconfigured, or the window landing on a different one. The
 *   direct signal, and the only one that catches a window moving between two same-size, same-ratio displays. From the
 *   Window Management API, but on the base `Screen` rather than behind `getScreenDetails()`, so it needs no permission
 *   — only a secure context. Measured present in Chromium and absent in WebKit and Firefox, hence the three below
 *   rather than this alone.
 * - **`resize`** — the window changing size, which is also what the OS does to it when the display it was on goes away.
 * - **`screen.orientation` change** — rotation, which swaps the axes without necessarily resizing the window.
 * - **a `(resolution: <ratio>dppx)` media query** (`watchDevicePixelRatio`) — the device pixel ratio changing under a
 *   window that kept its size, which is the cross-display drag between displays of different density.
 *
 *   Worth keeping despite looking redundant, because it is the only coverage that case has in WebKit and Firefox: neither
 *   implements `screen`'s change event, and the drag doesn't resize the window. It is also a cleaner signal in Safari
 *   than elsewhere — WebKit holds `devicePixelRatio` independent of page zoom, so there it moves only on a real density
 *   change, where Chromium and Gecko fold zoom into it as well.
 *
 * ⚠️ Known gap, on engines without `screen`'s change event: dragging a window between two different-size displays that
 * share a ratio, without the window resizing, changes the reading with nothing firing. Closing it there would mean
 * polling, whose interval and battery cost are a policy decision this function shouldn't be making.
 */
export function watchScreenResolution(
  onChange: (resolution: ScreenResolution | undefined) => void,
  options: ScreenResolutionOptions = { useDevicePixelRatio: true }
): () => void {
  // One signal for every listener, so stopping is one call rather than a handle
  // per subscription. Also makes a late ratio re-arm inert: `addEventListener`
  // drops a listener whose signal has already aborted.
  const disconnect = new AbortController();
  const { signal } = disconnect;
  let current = getScreenResolution(options);

  const check = () => {
    const next = getScreenResolution(options);
    if (shallowEqual(current, next)) return;

    current = next;
    onChange(next);
  };

  // Deliver the starting value up front, so a consumer gets its initial state from
  // the watcher rather than having to pair it with a separate read. Unconditional,
  // rather than falling out of comparing against an empty `current`: an unknown
  // reading is a value too, and a consumer that only ever heard from us about a
  // *known* screen couldn't tell "there is no screen" from "not called yet".
  //
  // Before the listeners rather than after, so a callback that throws takes
  // nothing with it — there is no subscription yet to strand.
  onChange(current);

  watchDevicePixelRatio(check, signal);

  // Each signal is optional for the same reason the reading is: an environment
  // missing one has nothing to report from it, which is not a reason to fail.
  // `screen`'s own change event is subscribed without feature-detecting — where
  // it isn't implemented it simply never fires, and a signal that never fires
  // costs nothing under comparison.
  const screen = globalThis.screen;
  const orientation = screen?.orientation;

  if (globalThis.window) listen(globalThis.window, 'resize', check, { signal });

  // NOTE: Chromium browsers support screen change event.
  // See: https://developer.mozilla.org/en-US/docs/Web/API/Screen/change_event
  if (isEventTarget(screen)) listen(screen, 'change', check, { signal });

  if (orientation) listen(orientation, 'change', check, { signal });

  return () => disconnect.abort();
}

function isEventTarget(value: any): value is EventTarget {
  return isFunction(value?.addEventListener);
}
