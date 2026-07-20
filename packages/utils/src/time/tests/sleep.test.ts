import { afterEach, describe, expect, it, vi } from 'vitest';
import { sleep } from '../sleep';

afterEach(() => {
  vi.useRealTimers();
});

describe('sleep', () => {
  it('resolves after the given delay', async () => {
    vi.useFakeTimers();
    const resolved = vi.fn();
    const promise = sleep(100).then(resolved);

    await vi.advanceTimersByTimeAsync(99);
    expect(resolved).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await promise;
    expect(resolved).toHaveBeenCalledTimes(1);
  });

  it('rejects with the signal reason and clears the timer when aborted mid-wait', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const reason = new DOMException('Aborted', 'AbortError');
    const promise = sleep(100, controller.signal);

    controller.abort(reason);
    await expect(promise).rejects.toBe(reason);

    // Timer was cleared — advancing past the delay does nothing further.
    await vi.advanceTimersByTimeAsync(200);
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController();
    const reason = new DOMException('Aborted', 'AbortError');
    controller.abort(reason);

    await expect(sleep(100, controller.signal)).rejects.toBe(reason);
  });
});
