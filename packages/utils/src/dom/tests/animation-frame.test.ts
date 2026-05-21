import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  afterDoubleAnimationFrame,
  animationFrame,
  type DoubleAnimationFrameHandles,
  scheduleDoubleAnimationFrame,
} from '../animation-frame';

describe('animationFrame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls the callback on next animation frame', async () => {
    const callback = vi.fn();

    animationFrame(callback);

    expect(callback).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();

    expect(callback).toHaveBeenCalledOnce();
  });

  it('passes timestamp to callback', async () => {
    const callback = vi.fn();

    animationFrame(callback);
    await vi.runAllTimersAsync();

    expect(callback).toHaveBeenCalledWith(expect.any(Number));
  });

  it('returns a cleanup function', () => {
    const callback = vi.fn();

    const cancel = animationFrame(callback);

    expect(cancel).toBeTypeOf('function');
  });

  it('cancel prevents callback from being called', async () => {
    const callback = vi.fn();

    const cancel = animationFrame(callback);
    cancel();

    await vi.runAllTimersAsync();

    expect(callback).not.toHaveBeenCalled();
  });

  it('cancel can be called multiple times safely', async () => {
    const callback = vi.fn();

    const cancel = animationFrame(callback);
    cancel();
    cancel();
    cancel();

    await vi.runAllTimersAsync();

    expect(callback).not.toHaveBeenCalled();
  });

  it('allows multiple independent animation frames', async () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const callback3 = vi.fn();

    animationFrame(callback1);
    animationFrame(callback2);
    const cancel3 = animationFrame(callback3);

    cancel3();
    await vi.runAllTimersAsync();

    expect(callback1).toHaveBeenCalledOnce();
    expect(callback2).toHaveBeenCalledOnce();
    expect(callback3).not.toHaveBeenCalled();
  });
});

describe('scheduleDoubleAnimationFrame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs callback after two frames when guard stays true', async () => {
    const run = vi.fn();
    const handles: DoubleAnimationFrameHandles = { first: 0, second: 0 };

    scheduleDoubleAnimationFrame(handles, () => true, run);

    await vi.runAllTimersAsync();

    expect(run).toHaveBeenCalledOnce();
  });

  it('does not run when guard is false before the nested frame', async () => {
    const run = vi.fn();
    const handles: DoubleAnimationFrameHandles = { first: 0, second: 0 };

    scheduleDoubleAnimationFrame(handles, () => false, run);

    await vi.runAllTimersAsync();

    expect(run).not.toHaveBeenCalled();
  });

  it('drops a stale callback when superseded via the same handles', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const handles: DoubleAnimationFrameHandles = { first: 0, second: 0 };

    scheduleDoubleAnimationFrame(handles, () => true, first);
    scheduleDoubleAnimationFrame(handles, () => true, second);

    await vi.runAllTimersAsync();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});

describe('afterDoubleAnimationFrame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs callback after two frames when guard stays true', async () => {
    const run = vi.fn();

    afterDoubleAnimationFrame(() => true, run);

    await vi.runAllTimersAsync();

    expect(run).toHaveBeenCalledOnce();
  });
});
