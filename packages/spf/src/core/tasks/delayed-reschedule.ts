import { sleep } from '@videojs/utils/time';
import type { Reschedule } from './task';

/**
 * Build a {@link Reschedule} from a pure cadence function — the common
 * timer-based, *start-anchored* implementation.
 *
 * Invoked concurrently with the run, it observes the result, then waits
 * `cadence(current, previous)` milliseconds **measured from when it was invoked**
 * (≈ the run's start): it subtracts the run's own elapsed time, so consecutive
 * runs begin one cadence apart regardless of how long each run takes (per
 * RFC 8216 §6.3.4's "measured from the last time the client began loading"). If
 * the run takes longer than the cadence, the next run starts immediately.
 *
 * A `null` cadence stops the recurrence. An errored run passes `current` as
 * `undefined`, so the cadence function can choose to retry (return a delay) or
 * stop (return `null`).
 */
export function delayedReschedule<TValue>(
  cadence: (current: TValue | undefined, previous: TValue | undefined) => number | null
): Reschedule<TValue> {
  return async (task) => {
    const startedAt = Date.now();
    let current: TValue | undefined;
    try {
      current = await task.run();
    } catch {
      current = undefined;
    }
    // `task.previous` is the prior successful value (carried by the runner's
    // clone); read-only for the cadence, hence the cast off `DeepReadonly`.
    const ms = cadence(current, task.previous as TValue | undefined);
    if (ms === null) return false;
    await sleep(Math.max(0, ms - (Date.now() - startedAt)), task.signal);
    return true;
  };
}
