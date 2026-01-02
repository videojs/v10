import { isBoolean } from '@videojs/utils';
import { StoreError } from './errors';

/**
 * A guard gates request execution.
 *
 * - Truthy → proceed
 * - Falsy → cancel
 * - Promise resolves truthy → proceed
 * - Promise resolves falsy → cancel
 * - Promise rejects → cancel
 */
export type Guard<Target> = (ctx: {
  target: Target;
  signal: AbortSignal;
}) => boolean | Promise<unknown>;

/**
 * Combine guards: All must pass (truthy).
 */
export function all<Target>(
  ...guards: Guard<Target>[]
): Guard<Target> {
  return async (ctx) => {
    for (const guard of guards) {
      const result = await guard(ctx);
      if (!result) return false;
    }

    return true;
  };
}

/**
 * Combine guards: Any must pass (first truthy wins).
 */
export function any<Target>(
  ...guards: Guard<Target>[]
): Guard<Target> {
  return (ctx) => {
    const results = guards.map(g => g(ctx));

    // Check sync results first
    if (results.includes(true)) return true;

    // Filter to promises only
    const promises = results.filter((r): r is Promise<unknown> => !isBoolean(r));

    if (promises.length === 0) return false;

    // Race: first truthy wins, all falsy = false
    return new Promise((resolve, reject) => {
      let pending = promises.length;
      for (const p of promises) {
        p.then((value) => {
          if (value) resolve(value);
          else if (--pending === 0) resolve(false);
        }, reject);
      }
    });
  };
}

/**
 * Add timeout to a guard.
 */
export function timeout<Target>(
  guard: Guard<Target>,
  ms: number,
  name = 'guard',
): Guard<Target> {
  return async (ctx) => {
    const result = guard(ctx);

    if (isBoolean(result)) {
      return result;
    }

    return Promise.race([
      result,
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new StoreError(`Timeout: ${name}`)), ms);
        ctx.signal.addEventListener('abort', () => clearTimeout(timer));
      }),
    ]);
  };
}
