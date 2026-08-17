/**
 * **Element-box measurement.**
 * `observeElementSize` reports an element's content box from the `ResizeObserver`
 * entries themselves.
 *
 * `observeRenderedSize` composes it with `watchDevicePixelRatio` for consumers
 * that need the box in device pixels rather than CSS pixels.
 *
 * Both report what the observer reports, including the `0 × 0` box of an element
 * that isn't being rendered (detached, `display: none`). Whether that counts as
 * a measurement is the caller's call, not the primitive's.
 */

import { getDevicePixelRatio, watchDevicePixelRatio } from './device-pixel-ratio';

/** An element's content box, in CSS pixels. */
export interface ElementSize {
  width: number;
  height: number;
}

/** An element's content box plus the ratio that converts it to device pixels. */
export interface RenderedSize extends ElementSize {
  /** `devicePixelRatio` at measurement time — CSS pixels × `scale` per axis. */
  scale: number;
}

/**
 * `contentBoxSize` is writing-mode relative and per-fragment. A media element is
 * a single, horizontally-written box, so the first fragment's inline axis is its
 * width and its block axis its height.
 */
function toElementSize(entry: ResizeObserverEntry): ElementSize {
  const box = entry.contentBoxSize[0];
  return { width: box?.inlineSize ?? 0, height: box?.blockSize ?? 0 };
}

/**
 * Call `onResize` with `element`'s content box whenever it changes, starting
 * with the observer's initial delivery.
 *
 * @param element - Element to observe
 * @param onResize - Called with the content box in CSS pixels
 * @returns Cleanup that disconnects the observer
 */
export function observeElementSize(element: Element, onResize: (size: ElementSize) => void): () => void {
  if (typeof ResizeObserver !== 'function') return () => {};

  // One observed element means one entry per delivery; the last is the current
  // box either way.
  const observer = new ResizeObserver((entries) => {
    const entry = entries[entries.length - 1];
    if (entry) onResize(toElementSize(entry));
  });
  observer.observe(element);
  return () => observer.disconnect();
}

/**
 * Call `onResize` with `element`'s content box and the current
 * `devicePixelRatio` whenever either changes.
 *
 * A ratio change re-emits the last observed box — the box is in CSS pixels, so
 * it doesn't necessarily change with the ratio, but its device-pixel size does.
 * Nothing is emitted before the observer's first delivery, so `scale` never
 * travels without a box to apply it to.
 *
 * @param element - Element to observe
 * @param onResize - Called with the content box plus the device-pixel ratio
 * @returns Cleanup that stops both watchers
 */
export function observeRenderedSize(element: Element, onResize: (size: RenderedSize) => void): () => void {
  let size: ElementSize | undefined;

  const emit = () => {
    if (size) onResize({ ...size, scale: getDevicePixelRatio() });
  };

  const stopObservingSize = observeElementSize(element, (next) => {
    size = next;
    emit();
  });
  const stopWatchingDevicePixelRatio = watchDevicePixelRatio(emit);

  return () => {
    stopObservingSize();
    stopWatchingDevicePixelRatio();
  };
}
