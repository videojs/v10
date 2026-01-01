import { supportsIdleCallback } from './supports';

/**
 * Request an idle callback and return a cleanup function to cancel it.
 *
 * Falls back to `setTimeout` with 1ms delay in environments that don't
 * support `requestIdleCallback` (e.g., Safari).
 *
 * @param callback - The callback to invoke when the browser is idle
 * @param options - Optional idle callback options (timeout, etc.)
 * @returns A cleanup function that cancels the idle callback request
 *
 * @example
 * ```ts
 * const cancel = idleCallback((deadline) => {
 *   console.log('Time remaining:', deadline.timeRemaining());
 * });
 *
 * // Later, cancel if needed
 * cancel();
 * ```
 *
 * @example
 * ```ts
 * // With timeout option
 * const cancel = idleCallback(doWork, { timeout: 1000 });
 * ```
 */
export function idleCallback(callback: IdleRequestCallback, options?: IdleRequestOptions): () => void {
  if (supportsIdleCallback()) {
    const id = requestIdleCallback(callback, options);
    return () => cancelIdleCallback(id);
  }

  // Fallback for Safari and other browsers without requestIdleCallback
  const id = setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => 50, // Approximate idle time
    });
  }, 1);

  return () => clearTimeout(id);
}
