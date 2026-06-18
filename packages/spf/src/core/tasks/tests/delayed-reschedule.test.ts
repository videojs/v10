import { afterEach, describe, expect, it, vi } from 'vitest';
import { delayedReschedule } from '../delayed-reschedule';
import { Task } from '../task';

afterEach(() => {
  vi.useRealTimers();
});

describe('delayedReschedule', () => {
  it('observes the run result + previous, then waits the cadence before resolving true', async () => {
    vi.useFakeTimers();
    const task = new Task<number>(async () => 5);
    const cadence = vi.fn(() => 100);
    const reschedule = delayedReschedule<number>(cadence);

    let resolved: boolean | undefined;
    const done = reschedule(task, 4, new AbortController().signal).then((v) => {
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
    const task = new Task<number>(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 40));
      return 1;
    });
    const reschedule = delayedReschedule<number>(() => 100);

    let resolved = false;
    const done = reschedule(task, undefined, new AbortController().signal).then(() => {
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
    const task = new Task<number>(async () => 1);
    const reschedule = delayedReschedule<number>(() => null);

    await expect(reschedule(task, undefined, new AbortController().signal)).resolves.toBe(false);
  });

  it('passes undefined to the cadence when the run errors (so it can retry)', async () => {
    vi.useFakeTimers();
    const task = new Task<number>(async () => {
      throw new Error('boom');
    });
    const cadence = vi.fn(() => 50); // retry on error
    const reschedule = delayedReschedule<number>(cadence);

    let resolved: boolean | undefined;
    const done = reschedule(task, undefined, new AbortController().signal).then((v) => {
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
    const task = new Task<number>(async () => 1);
    const reschedule = delayedReschedule<number>(() => 100);
    const ac = new AbortController();

    const done = reschedule(task, undefined, ac.signal);
    await vi.advanceTimersByTimeAsync(0); // run settles → into the wait
    ac.abort(new DOMException('Aborted', 'AbortError'));

    await expect(done).rejects.toBeInstanceOf(DOMException);
  });
});
