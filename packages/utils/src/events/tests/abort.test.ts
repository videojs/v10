import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { abortable, anyAbortSignal } from '../abort';

describe('abortable', () => {
  it('resolves when promise resolves before abort', async () => {
    const controller = new AbortController();
    const result = await abortable(Promise.resolve('value'), controller.signal);

    expect(result).toBe('value');
  });

  it('rejects when promise rejects before abort', async () => {
    const controller = new AbortController();

    await expect(abortable(Promise.reject(new Error('fail')), controller.signal)).rejects.toThrow('fail');
  });

  it('rejects immediately if signal already aborted', async () => {
    const controller = new AbortController();
    const reason = new Error('aborted');

    controller.abort(reason);

    await expect(abortable(Promise.resolve('value'), controller.signal)).rejects.toBe(reason);
  });

  it('rejects when signal aborts before promise settles', async () => {
    const controller = new AbortController();
    const reason = new Error('aborted');
    const neverResolves = new Promise(() => {});

    const promise = abortable(neverResolves, controller.signal);

    controller.abort(reason);

    await expect(promise).rejects.toBe(reason);
  });

  it('cleans up abort listener after promise resolves', async () => {
    const controller = new AbortController();
    const removeEventListenerSpy = vi.spyOn(controller.signal, 'removeEventListener');

    await abortable(Promise.resolve('value'), controller.signal);

    expect(removeEventListenerSpy).toHaveBeenCalled();
  });

  it('cleans up abort listener after promise rejects', async () => {
    const controller = new AbortController();
    const removeEventListenerSpy = vi.spyOn(controller.signal, 'removeEventListener');

    await abortable(Promise.reject(new Error('fail')), controller.signal).catch(() => {});

    expect(removeEventListenerSpy).toHaveBeenCalled();
  });

  it('cleans up abort listener after abort', async () => {
    const controller = new AbortController();
    const removeEventListenerSpy = vi.spyOn(controller.signal, 'removeEventListener');
    const neverResolves = new Promise(() => {});

    const promise = abortable(neverResolves, controller.signal);

    controller.abort(new Error('aborted'));

    await promise.catch(() => {});

    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});

describe('anyAbortSignal', () => {
  it('returns an AbortSignal', () => {
    const a = new AbortController();
    const b = new AbortController();
    const signal = anyAbortSignal([a.signal, b.signal]);

    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it('is not aborted initially when no input is aborted', () => {
    const a = new AbortController();
    const b = new AbortController();
    const signal = anyAbortSignal([a.signal, b.signal]);

    expect(signal.aborted).toBe(false);
  });

  it('aborts immediately if the first input signal is already aborted', () => {
    const a = new AbortController();
    const b = new AbortController();
    const reason = new Error('already aborted');

    a.abort(reason);

    const signal = anyAbortSignal([a.signal, b.signal]);

    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(reason);
  });

  it('aborts immediately if the second input signal is already aborted', () => {
    const a = new AbortController();
    const b = new AbortController();
    const reason = new Error('already aborted');

    b.abort(reason);

    const signal = anyAbortSignal([a.signal, b.signal]);

    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(reason);
  });

  it('aborts when the first input signal fires', () => {
    const a = new AbortController();
    const b = new AbortController();
    const signal = anyAbortSignal([a.signal, b.signal]);
    const reason = new Error('a aborted');

    a.abort(reason);

    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(reason);
  });

  it('aborts when the second input signal fires', () => {
    const a = new AbortController();
    const b = new AbortController();
    const signal = anyAbortSignal([a.signal, b.signal]);
    const reason = new Error('b aborted');

    b.abort(reason);

    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(reason);
  });

  it('propagates the reason from the triggering signal', () => {
    const a = new AbortController();
    const b = new AbortController();
    const signal = anyAbortSignal([a.signal, b.signal]);
    const reason = 'custom reason';

    a.abort(reason);

    expect(signal.reason).toBe(reason);
  });

  it('works with more than two signals', () => {
    const a = new AbortController();
    const b = new AbortController();
    const c = new AbortController();
    const signal = anyAbortSignal([a.signal, b.signal, c.signal]);
    const reason = new Error('c aborted');

    c.abort(reason);

    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(reason);
  });

  describe('fallback path', () => {
    const nativeAny = AbortSignal.any;

    beforeEach(() => {
      // @ts-expect-error -- removing native to test fallback
      delete AbortSignal.any;
    });

    afterEach(() => {
      AbortSignal.any = nativeAny;
    });

    it('works without native AbortSignal.any', () => {
      const a = new AbortController();
      const b = new AbortController();
      const signal = anyAbortSignal([a.signal, b.signal]);

      expect(signal.aborted).toBe(false);

      a.abort(new Error('fallback'));

      expect(signal.aborted).toBe(true);
      expect(signal.reason).toEqual(new Error('fallback'));
    });

    it('aborts immediately if input is already aborted (fallback)', () => {
      const a = new AbortController();

      a.abort(new Error('pre-aborted'));

      const signal = anyAbortSignal([a.signal]);

      expect(signal.aborted).toBe(true);
      expect(signal.reason).toEqual(new Error('pre-aborted'));
    });
  });
});
