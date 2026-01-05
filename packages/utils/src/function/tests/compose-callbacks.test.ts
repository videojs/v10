import { describe, expect, it, vi } from 'vitest';

import { composeCallbacks } from '../compose-callbacks';

describe('composeCallbacks', () => {
  it('returns undefined when no callbacks provided', () => {
    const result = composeCallbacks();
    expect(result).toBeUndefined();
  });

  it('returns undefined when all callbacks are null/undefined', () => {
    const result = composeCallbacks(null, undefined, null);
    expect(result).toBeUndefined();
  });

  it('returns single callback when only one provided', () => {
    const fn = vi.fn();
    const result = composeCallbacks(fn);

    expect(result).toBe(fn);
  });

  it('returns single callback when others are null/undefined', () => {
    const fn = vi.fn();
    const result = composeCallbacks(null, fn, undefined);

    expect(result).toBe(fn);
  });

  it('calls all callbacks with same args', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const fn3 = vi.fn();

    const composed = composeCallbacks(fn1, fn2, fn3);
    composed?.('arg1', 'arg2');

    expect(fn1).toHaveBeenCalledWith('arg1', 'arg2');
    expect(fn2).toHaveBeenCalledWith('arg1', 'arg2');
    expect(fn3).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('calls callbacks in order', () => {
    const order: number[] = [];
    const fn1 = () => order.push(1);
    const fn2 = () => order.push(2);
    const fn3 = () => order.push(3);

    const composed = composeCallbacks(fn1, fn2, fn3);
    composed?.();

    expect(order).toEqual([1, 2, 3]);
  });

  it('skips null/undefined in the middle', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    const composed = composeCallbacks(fn1, null, undefined, fn2);
    composed?.();

    expect(fn1).toHaveBeenCalled();
    expect(fn2).toHaveBeenCalled();
  });

  it('works with typed callbacks', () => {
    type OnSetup = (ctx: { name: string }) => void;

    const fn1: OnSetup = vi.fn();
    const fn2: OnSetup = vi.fn();

    const composed = composeCallbacks<OnSetup>(fn1, fn2);
    const ctx = { name: 'test' };
    composed?.(ctx);

    expect(fn1).toHaveBeenCalledWith(ctx);
    expect(fn2).toHaveBeenCalledWith(ctx);
  });
});
