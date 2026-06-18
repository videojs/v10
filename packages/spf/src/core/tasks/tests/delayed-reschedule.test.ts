import { afterEach, describe, expect, it, vi } from 'vitest';
import { delayedReschedule } from '../delayed-reschedule';
import type { TaskLike } from '../task';

afterEach(() => {
  vi.useRealTimers();
});

/**
 * A minimal {@link TaskLike} for exercising `delayedReschedule` in isolation:
 * the cadence only reads `run()`, `previous`, and `signal`.
 */
function fakeTask(
  run: () => Promise<number>,
  previous?: number,
  signal: AbortSignal = new AbortController().signal
): TaskLike<number> {
  return {
    id: 'x',
    status: 'pending',
    value: undefined,
    error: undefined,
    previous,
    signal,
    run,
    abort() {},
    clone() {
      return this;
    },
  };
}

describe('delayedReschedule', () => {
  it('observes the run result + previous, then waits the cadence before resolving true', async () => {
    vi.useFakeTimers();
    const cadence = vi.fn(() => 100);
    const reschedule = delayedReschedule<number>(cadence);

    let resolved: boolean | undefined;
    const done = reschedule(fakeTask(async () => 5, 4)).then((v) => {
      resolved = v;
    });

    await vi.advanceTimersByTimeAsync(0); // run settles → cadence consulted
    expect(cadence).toHaveBeenCalledWith(5, 4);
    expect(resolved).toBeUndefined(); // still waiting out the cadence

    await vi.advanceTimersByTimeAsync(100);
    await done;
    expect(resolved).toBe(true);
  });

  it('start-anchors: subtracts the run elapsed from the cadence', async () => {
    vi.useFakeTimers();
    // A run that takes 40ms; cadence 100 → next run ~60ms after the run settles
    // (so the interval is 100ms measured from the run's start).
    const reschedule = delayedReschedule<number>(() => 100);

    let resolved = false;
    const done = reschedule(
      fakeTask(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 40));
        return 1;
      })
    ).then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(40); // run completes; 40ms elapsed
    await vi.advanceTimersByTimeAsync(59);
    expect(resolved).toBe(false); // 99ms from start — not yet

    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(resolved).toBe(true); // 100ms from start
  });

  it('resolves false (stop) without waiting when the cadence returns null', async () => {
    vi.useFakeTimers();
    const reschedule = delayedReschedule<number>(() => null);

    await expect(reschedule(fakeTask(async () => 1))).resolves.toBe(false);
  });

  it('passes undefined to the cadence when the run errors (so it can retry)', async () => {
    vi.useFakeTimers();
    const cadence = vi.fn(() => 50); // retry on error
    const reschedule = delayedReschedule<number>(cadence);

    let resolved: boolean | undefined;
    const done = reschedule(
      fakeTask(async () => {
        throw new Error('boom');
      })
    ).then((v) => {
      resolved = v;
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(cadence).toHaveBeenCalledWith(undefined, undefined);

    await vi.advanceTimersByTimeAsync(50);
    await done;
    expect(resolved).toBe(true);
  });

  it('rejects when aborted during the wait', async () => {
    vi.useFakeTimers();
    const reschedule = delayedReschedule<number>(() => 100);
    const ac = new AbortController();

    const done = reschedule(fakeTask(async () => 1, undefined, ac.signal));
    await vi.advanceTimersByTimeAsync(0); // run settles → into the wait
    ac.abort(new DOMException('Aborted', 'AbortError'));

    await expect(done).rejects.toBeInstanceOf(DOMException);
  });
});
