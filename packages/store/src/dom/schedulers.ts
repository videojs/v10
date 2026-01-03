import type { TaskScheduler } from '../core/queue';

import { animationFrame, idleCallback } from '@videojs/utils/dom';

/**
 * Create a scheduler that delays task execution until the next animation frame.
 *
 * Uses `requestAnimationFrame` under the hood. Ideal for UI updates that should
 * sync with the browser's repaint cycle.
 *
 * @returns A TaskScheduler for use with the queue
 *
 * @example
 * ```ts
 * import { createQueue } from '@videojs/store';
 * import { raf } from '@videojs/store/dom';
 *
 * const queue = createQueue();
 *
 * queue.enqueue({
 *   name: 'update-ui',
 *   key: 'ui',
 *   schedule: raf(),
 *   handler: async () => {
 *     // This runs on the next animation frame
 *   },
 * });
 * ```
 */
export function raf(): TaskScheduler {
  return flush => animationFrame(flush);
}

/**
 * Create a scheduler that delays task execution until the browser is idle.
 *
 * Uses `requestIdleCallback` under the hood (with `setTimeout` fallback for Safari).
 * Ideal for non-critical background work.
 *
 * @param options - Optional idle callback options (e.g., timeout)
 * @returns A TaskScheduler for use with the queue
 *
 * @example
 * ```ts
 * import { createQueue } from '@videojs/store';
 * import { idle } from '@videojs/store/dom';
 *
 * const queue = createQueue();
 *
 * queue.enqueue({
 *   name: 'analytics',
 *   key: 'analytics',
 *   schedule: idle(),
 *   handler: async () => {
 *     // This runs when the browser is idle
 *   },
 * });
 * ```
 *
 * @example
 * ```ts
 * // With timeout to ensure execution within 2 seconds
 * queue.enqueue({
 *   name: 'critical-background',
 *   key: 'bg',
 *   schedule: idle({ timeout: 2000 }),
 *   handler: async () => {
 *     // Runs when idle, or after 2 seconds
 *   },
 * });
 * ```
 */
export function idle(options?: IdleRequestOptions): TaskScheduler {
  return flush => idleCallback(flush, options);
}
