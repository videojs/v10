import { describe, expect, it, vi } from 'vitest';

import { onEvent } from '../event';

describe('onEvent', () => {
  it('returns a promise', () => {
    const target = new EventTarget();
    const promise = onEvent(target, 'click');

    expect(promise).toBeInstanceOf(Promise);

    // Dispatch to resolve
    target.dispatchEvent(new Event('click'));
  });

  it('resolves with the event when it fires', async () => {
    const target = new EventTarget();
    const event = new Event('click');

    const promise = onEvent(target, 'click');
    target.dispatchEvent(event);

    await expect(promise).resolves.toBe(event);
  });

  it('only listens for the first occurrence (once)', async () => {
    const target = new EventTarget();

    const promise = onEvent(target, 'click');

    target.dispatchEvent(new Event('click'));
    target.dispatchEvent(new Event('click'));

    const result = await promise;
    expect(result).toBeInstanceOf(Event);
  });

  it('rejects when signal is already aborted', async () => {
    const target = new EventTarget();
    const controller = new AbortController();
    controller.abort();

    const promise = onEvent(target, 'click', { signal: controller.signal });

    await expect(promise).rejects.toThrow();
  });

  it('rejects with AbortError when signal is aborted', async () => {
    const target = new EventTarget();
    const controller = new AbortController();

    const promise = onEvent(target, 'click', { signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('rejects with custom abort reason', async () => {
    const target = new EventTarget();
    const controller = new AbortController();
    const reason = new Error('Custom reason');

    const promise = onEvent(target, 'click', { signal: controller.signal });
    controller.abort(reason);

    await expect(promise).rejects.toBe(reason);
  });

  it('cleans up abort listener when event fires', async () => {
    const target = new EventTarget();
    const controller = new AbortController();

    const promise = onEvent(target, 'click', { signal: controller.signal });
    target.dispatchEvent(new Event('click'));

    await promise;

    // Aborting after resolution should not cause issues
    controller.abort();
  });

  it('passes options to addEventListener', async () => {
    const target = new EventTarget();
    const addSpy = vi.spyOn(target, 'addEventListener');

    const promise = onEvent(target, 'click', { passive: true, capture: true });
    target.dispatchEvent(new Event('click'));

    await promise;

    expect(addSpy).toHaveBeenCalledWith(
      'click',
      expect.any(Function),
      expect.objectContaining({
        passive: true,
        capture: true,
        once: true,
      })
    );
  });

  it('works with HTMLMediaElement events', async () => {
    const video = document.createElement('video');

    const promise = onEvent(video, 'play');
    video.dispatchEvent(new Event('play'));

    const event = await promise;
    expect(event.type).toBe('play');
  });

  it('works with Window events', async () => {
    const promise = onEvent(window, 'resize');
    window.dispatchEvent(new Event('resize'));

    const event = await promise;
    expect(event.type).toBe('resize');
  });

  it('works with Document events', async () => {
    const promise = onEvent(document, 'visibilitychange');
    document.dispatchEvent(new Event('visibilitychange'));

    const event = await promise;
    expect(event.type).toBe('visibilitychange');
  });
});
