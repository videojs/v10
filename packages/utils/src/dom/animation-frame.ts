/**
 * Request an animation frame and return a cleanup function to cancel it.
 *
 * @param callback - The callback to invoke on the next animation frame
 * @returns A cleanup function that cancels the animation frame request
 *
 * @example
 * ```ts
 * const cancel = animationFrame((time) => {
 *   console.log('Frame at', time);
 * });
 *
 * // Later, cancel if needed
 * cancel();
 * ```
 */
export function animationFrame(callback: FrameRequestCallback): () => void {
  const id = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(id);
}
