import { describe, expect, it, vi } from 'vitest';

import { throttle } from '../throttle';

describe('throttle', () => {
  it('fires on trailing edge after the specified delay', () => {
    vi.useFakeTimers();

    const callback = vi.fn();
    const throttled = throttle(callback, 100);

    throttled('first');

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith('first');

    vi.useRealTimers();
  });

  it('coalesces rapid calls and uses the latest arguments', () => {
    vi.useFakeTimers();

    const callback = vi.fn();
    const throttled = throttle(callback, 100);

    throttled('first');
    throttled('second');
    throttled('third');

    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith('third');

    vi.useRealTimers();
  });

  it('cancel prevents the pending invocation', () => {
    vi.useFakeTimers();

    const callback = vi.fn();
    const throttled = throttle(callback, 100);

    throttled('value');
    throttled.cancel();

    vi.advanceTimersByTime(200);

    expect(callback).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('accepts new calls after cancel', () => {
    vi.useFakeTimers();

    const callback = vi.fn();
    const throttled = throttle(callback, 100);

    throttled('before-cancel');
    throttled.cancel();

    throttled('after-cancel');
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith('after-cancel');

    vi.useRealTimers();
  });

  it('schedules a new timer after the previous one fires', () => {
    vi.useFakeTimers();

    const callback = vi.fn();
    const throttled = throttle(callback, 100);

    throttled('first-batch');
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledOnce();

    throttled('second-batch');
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('second-batch');

    vi.useRealTimers();
  });

  it('cancel is a no-op when no timer is pending', () => {
    const callback = vi.fn();
    const throttled = throttle(callback, 100);

    expect(() => throttled.cancel()).not.toThrow();
  });
});
