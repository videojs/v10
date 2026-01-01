/**
 * Check if `requestIdleCallback` is supported.
 *
 * @returns `true` if `requestIdleCallback` is available
 */
export function supportsIdleCallback(): boolean {
  return typeof requestIdleCallback === 'function';
}

/**
 * Check if `requestAnimationFrame` is supported.
 *
 * @returns `true` if `requestAnimationFrame` is available
 */
export function supportsAnimationFrame(): boolean {
  return typeof requestAnimationFrame === 'function';
}
