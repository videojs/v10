import { describe, expect, it, vi } from 'vitest';

import { abortable } from '../abort';

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
