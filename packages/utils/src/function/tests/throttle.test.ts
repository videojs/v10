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

describe('throttle with leading: true', () => {
  it('invokes immediately on the first call', () => {
    vi.useFakeTimers();

    const callback = vi.fn();
    const throttled = throttle(callback, 100, { leading: true });

    throttled('first');

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith('first');

    vi.useRealTimers();
  });

  it('coalesces calls within the cooldown to a trailing invocation', () => {
    vi.useFakeTimers();

    const callback = vi.fn();
    const throttled = throttle(callback, 100, { leading: true });

    throttled('first');
    expect(callback).toHaveBeenCalledOnce();

    throttled('second');
    throttled('third');

    // Still only the leading call so far.
    expect(callback).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(100);

    // Trailing fires with latest args.
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('third');

    vi.useRealTimers();
  });

  it('resets to leading after cooldown expires with no pending calls', () => {
    vi.useFakeTimers();

    const callback = vi.fn();
    const throttled = throttle(callback, 100, { leading: true });

    // First leading call.
    throttled('batch-1');
    expect(callback).toHaveBeenCalledOnce();

    // Let cooldown expire without any trailing calls.
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledOnce();

    // Next call should be treated as a new leading invocation.
    throttled('batch-2');
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('batch-2');

    vi.useRealTimers();
  });

  it('chains trailing into a new cooldown window', () => {
    vi.useFakeTimers();

    const callback = vi.fn();
    const throttled = throttle(callback, 100, { leading: true });

    // Leading call.
    throttled('a');
    expect(callback).toHaveBeenCalledOnce();

    // Pending trailing.
    throttled('b');

    // Trailing fires at 100ms, starting a new cooldown.
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('b');

    // Another pending during the new cooldown.
    throttled('c');
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenLastCalledWith('c');

    vi.useRealTimers();
  });

  it('cancel prevents trailing invocation', () => {
    vi.useFakeTimers();

    const callback = vi.fn();
    const throttled = throttle(callback, 100, { leading: true });

    throttled('leading');
    throttled('pending');
    expect(callback).toHaveBeenCalledOnce();

    throttled.cancel();

    vi.advanceTimersByTime(200);

    // Only the leading call, no trailing.
    expect(callback).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it('accepts new leading call after cancel', () => {
    vi.useFakeTimers();

    const callback = vi.fn();
    const throttled = throttle(callback, 100, { leading: true });

    throttled('first');
    throttled.cancel();

    throttled('after-cancel');
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('after-cancel');

    vi.useRealTimers();
  });

  it('cancel is a no-op when no timer is pending', () => {
    const callback = vi.fn();
    const throttled = throttle(callback, 100, { leading: true });

    expect(() => throttled.cancel()).not.toThrow();
  });
});
