import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { rafThrottle } from '../raf-throttle';

describe('rafThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls function on next animation frame', () => {
    const fn = vi.fn();
    const throttled = rafThrottle(fn);

    throttled(1);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(16);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it('collapses multiple calls into one with latest args', () => {
    const fn = vi.fn();
    const throttled = rafThrottle(fn);

    throttled(1);
    throttled(2);
    throttled(3);

    vi.advanceTimersByTime(16);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it('cancel prevents pending call', () => {
    const fn = vi.fn();
    const throttled = rafThrottle(fn);

    throttled(1);
    throttled.cancel();

    vi.advanceTimersByTime(16);

    expect(fn).not.toHaveBeenCalled();
  });

  it('works after cancel', () => {
    const fn = vi.fn();
    const throttled = rafThrottle(fn);

    throttled(1);
    throttled.cancel();

    throttled(2);
    vi.advanceTimersByTime(16);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(2);
  });
});
