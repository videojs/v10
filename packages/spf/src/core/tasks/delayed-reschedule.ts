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
 * A `null` cadence stops the recurrence. A rejected run rejects this reschedule,
 * which the `RecurringRunner` propagates as the recurrence's failure — error
 * recovery (e.g. retrying transient fetch failures) belongs below, at the fetch
 * layer, not in the cadence.
 */
export function delayedReschedule<TValue>(
  cadence: (current: TValue, previous: TValue | undefined) => number | null
): Reschedule<TValue> {
  return async (task) => {
    const startedAt = Date.now();
    const current = await task.run();
    // `task.previous` is the prior successful value (carried by the runner's
    // clone); read-only for the cadence, hence the cast off `DeepReadonly`.
    const ms = cadence(current, task.previous as TValue | undefined);
    if (ms === null) return false;
    await sleep(Math.max(0, ms - (Date.now() - startedAt)), task.signal);
    return true;
  };
}
