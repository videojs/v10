import { describe, expect, it } from 'vitest';
import { waitForMediaElementMetadata } from '../mediaelement-setup';

describe('waitForMediaElementMetadata', () => {
  it('resolves immediately when readyState is already >= HAVE_METADATA', async () => {
    const el = Object.create(HTMLMediaElement.prototype, {
      readyState: { value: HTMLMediaElement.HAVE_METADATA, writable: true },
    }) as HTMLMediaElement;
    const controller = new AbortController();
    let resolved = false;
    await waitForMediaElementMetadata(el, controller.signal).then(() => {
      resolved = true;
    });
    expect(resolved).toBe(true);
  });

  it('resolves on the next loadedmetadata event when starting below HAVE_METADATA', async () => {
    const el = document.createElement('video');
    Object.defineProperty(el, 'readyState', { value: HTMLMediaElement.HAVE_NOTHING, writable: true });
    const controller = new AbortController();
    const pending = waitForMediaElementMetadata(el, controller.signal);
    let resolved = false;
    pending.then(() => {
      resolved = true;
    });

    // Not resolved yet
    await new Promise((r) => setTimeout(r, 0));
    expect(resolved).toBe(false);

    el.dispatchEvent(new Event('loadedmetadata'));
    await pending;
    expect(resolved).toBe(true);
  });

  it('resolves when the signal aborts before loadedmetadata fires', async () => {
    const el = document.createElement('video');
    Object.defineProperty(el, 'readyState', { value: HTMLMediaElement.HAVE_NOTHING, writable: true });
    const controller = new AbortController();
    const pending = waitForMediaElementMetadata(el, controller.signal);
    controller.abort();
    await expect(pending).resolves.toBeUndefined();
  });

  it('resolves immediately when the signal is already aborted', async () => {
    const el = document.createElement('video');
    Object.defineProperty(el, 'readyState', { value: HTMLMediaElement.HAVE_NOTHING, writable: true });
    const controller = new AbortController();
    controller.abort();
    await expect(waitForMediaElementMetadata(el, controller.signal)).resolves.toBeUndefined();
  });
});
