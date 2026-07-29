import { effect } from './effect';

/**
 * Resolve once `condition` returns true. The condition is a tracked read — it
 * re-evaluates whenever a signal it read changes — so this is the promise
 * bridge from signal space into async task bodies (await a state condition
 * mid-task without polling).
 *
 * Settles synchronously when the condition already holds. Rejects with the
 * abort reason when `signal` aborts first (an already-aborted signal rejects
 * without evaluating the condition), so a task awaiting a condition dies with
 * its runner instead of leaking the subscription.
 */
export function when(condition: () => boolean, options: { signal?: AbortSignal } = {}): Promise<void> {
  const { signal } = options;
  if (signal?.aborted) return Promise.reject(signal.reason);

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const settle = (complete: () => void) => {
      if (settled) return;
      settled = true;
      complete();
      // Deferred: on the effect's synchronous initial run `stop` isn't
      // assigned yet, and stopping an effect from inside its own body is
      // undefined behavior for the scheduler either way.
      queueMicrotask(() => {
        signal?.removeEventListener('abort', onAbort);
        stop();
      });
    };
    const onAbort = () => settle(() => reject(signal?.reason));
    signal?.addEventListener('abort', onAbort, { once: true });
    const stop = effect(() => {
      if (!settled && condition()) settle(resolve);
    });
  });
}
