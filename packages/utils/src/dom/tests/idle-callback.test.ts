import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { idleCallback } from '../idle-callback';

describe('idleCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls the callback when idle', async () => {
    const callback = vi.fn();

    idleCallback(callback);

    expect(callback).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();

    expect(callback).toHaveBeenCalledOnce();
  });

  it('passes deadline object to callback', async () => {
    const callback = vi.fn();

    idleCallback(callback);
    await vi.runAllTimersAsync();

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        didTimeout: expect.any(Boolean),
        timeRemaining: expect.any(Function),
      }),
    );
  });

  it('returns a cleanup function', () => {
    const callback = vi.fn();

    const cancel = idleCallback(callback);

    expect(cancel).toBeTypeOf('function');
  });

  it('cancel prevents callback from being called', async () => {
    const callback = vi.fn();

    const cancel = idleCallback(callback);
    cancel();

    await vi.runAllTimersAsync();

    expect(callback).not.toHaveBeenCalled();
  });

  it('cancel can be called multiple times safely', async () => {
    const callback = vi.fn();

    const cancel = idleCallback(callback);
    cancel();
    cancel();
    cancel();

    await vi.runAllTimersAsync();

    expect(callback).not.toHaveBeenCalled();
  });

  it('allows multiple independent idle callbacks', async () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const callback3 = vi.fn();

    idleCallback(callback1);
    idleCallback(callback2);
    const cancel3 = idleCallback(callback3);

    cancel3();
    await vi.runAllTimersAsync();

    expect(callback1).toHaveBeenCalledOnce();
    expect(callback2).toHaveBeenCalledOnce();
    expect(callback3).not.toHaveBeenCalled();
  });

  it('accepts options parameter', async () => {
    const callback = vi.fn();

    idleCallback(callback, { timeout: 1000 });
    await vi.runAllTimersAsync();

    expect(callback).toHaveBeenCalledOnce();
  });
});
