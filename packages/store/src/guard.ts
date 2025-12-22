import { GuardTimeoutError, RequestCancelledError } from './errors';

/**
 * A guard gates request execution.
 *
 * Returns true if ready, false if it should be skipped, or a Promise that resolves when ready.
 */
export type Guard<Target> = (ctx: {
  target: Target;
  signal: AbortSignal;
}) => boolean | Promise<unknown>;

/**
 * Combine guards: All must pass.
 */
export function all<Target>(
  ...guards: Guard<Target>[]
): Guard<Target> {
  return async (ctx) => {
    for (const guard of guards) {
      const result = guard(ctx);

      if (result === false) {
        throw new RequestCancelledError('Guard skip');
      }

      if (result !== true) {
        await result;
      }

      if (ctx.signal.aborted) {
        throw new RequestCancelledError('Guard aborted');
      }
    }

    return true;
  };
}

/**
 * Combine guards: Any must pass.
 */
export function any<Target>(
  ...guards: Guard<Target>[]
): Guard<Target> {
  return (ctx) => {
    const results = guards.map(g => g(ctx));

    if (results.includes(true)) {
      return true;
    }

    return Promise.race(
      results.filter((r): r is Promise<void> => !isBoolean(r)),
    );
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
  return (ctx) => {
    const result = guard(ctx);

    if (result === true) {
      return true;
    }

    return Promise.race([
      result,
      new Promise<void>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new GuardTimeoutError(name));
        }, ms);

        ctx.signal.addEventListener('abort', () => {
          clearTimeout(timer);
        });
      }),
    ]);
  };
}
