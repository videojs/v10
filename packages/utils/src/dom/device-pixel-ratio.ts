import { listen } from './listen';

/** The environment's `devicePixelRatio`, or `1` where it isn't reported. */
export function getDevicePixelRatio(): number {
  return globalThis.devicePixelRatio || 1;
}

/**
 * Call `onChange` with the new ratio whenever `devicePixelRatio` changes.
 *
 * `devicePixelRatio` fires no change event, so the ratio is watched through a
 * `(resolution: …dppx)` media query — which only ever matches the ratio it was
 * built with, so each change detaches the current query and arms a fresh one
 * against the new ratio.
 *
 * Worth watching separately from an element's size: browser zoom, or dragging
 * the window to a display with a different ratio, changes the ratio without
 * resizing the element.
 *
 * @param onChange - Called with the new `devicePixelRatio` after each change
 * @returns Cleanup that detaches the armed query
 */
export function watchDevicePixelRatio(onChange: (devicePixelRatio: number) => void): () => void {
  if (typeof globalThis.matchMedia !== 'function') return () => {};

  let removeListener = () => {};

  const setupListener = () => {
    const query = globalThis.matchMedia(`(resolution: ${getDevicePixelRatio()}dppx)`);
    removeListener = listen(query, 'change', handleChange);
  };

  const handleChange = () => {
    removeListener();
    setupListener();
    onChange(getDevicePixelRatio());
  };

  setupListener();
  return () => removeListener();
}
