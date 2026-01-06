import type { TaskScheduler } from '../core/queue';

import { animationFrame, idleCallback } from '@videojs/utils/dom';

/**
 * Scheduler using `requestAnimationFrame`. Ideal for UI updates.
 *
 * @example
 * ```ts
 * queue.enqueue({ key: 'ui', schedule: raf(), handler: async () => {} });
 * ```
 */
export function raf(): TaskScheduler {
  return flush => animationFrame(flush);
}

/**
 * Scheduler using `requestIdleCallback`. Ideal for background work.
 *
 * @example
 * ```ts
 * queue.enqueue({ key: 'bg', schedule: idle({ timeout: 2000 }), handler: async () => {} });
 * ```
 */
export function idle(options?: IdleRequestOptions): TaskScheduler {
  return flush => idleCallback(flush, options);
}
