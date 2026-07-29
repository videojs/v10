import { describe, expect, it, vi } from 'vitest';
import {
  attachMediaSource,
  createMediaSource,
  createSourceBuffer,
  isCodecSupported,
  supportsManagedMediaSource,
  supportsMediaSource,
  waitForMediaSourceOpen,
} from '../mediasource-setup';

describe('supportsMediaSource', () => {
  it('should return true when MediaSource is available', () => {
    expect(supportsMediaSource()).toBe(true);
  });
});

describe('supportsManagedMediaSource', () => {
  it('should detect ManagedMediaSource availability', () => {
    // Will test actual browser API
    const result = supportsManagedMediaSource();
    expect(typeof result).toBe('boolean');
  });
});

describe('createMediaSource', () => {
  it('should create MediaSource instance', () => {
    const ms = createMediaSource();
    expect(ms).toBeInstanceOf(MediaSource);
    expect(ms.readyState).toBe('closed');
  });

  it('should create ManagedMediaSource when preferManaged is true and available', () => {
    const ms = createMediaSource({ preferManaged: true });
    expect(ms).toBeInstanceOf(MediaSource);
  });
});

describe('attachMediaSource', () => {
  it('should attach MediaSource using object URL', () => {
    const mediaElement = document.createElement('video');
    const mediaSource = createMediaSource();

    const { url, detach } = attachMediaSource(mediaSource, mediaElement);

    expect(url).toBeTruthy();
    expect(url).toContain('blob:');
    expect(mediaElement.src).toBe(url);
    expect(typeof detach).toBe('function');
  });

  it('should return detach function that cleans up', () => {
    const mediaElement = document.createElement('video');
    const mediaSource = createMediaSource();

    const { detach } = attachMediaSource(mediaSource, mediaElement);

    detach();

    expect(mediaElement.src).toBe('');
  });

  it('detach resets the element when tearing down a live attachment it still owns', async () => {
    const mediaElement = document.createElement('video');
    const mediaSource = createMediaSource();
    const { url, detach } = attachMediaSource(mediaSource, mediaElement);
    // A live attachment: the MediaSource has opened (readyState is 'closed'
    // until the browser's async attach completes).
    await new Promise<void>((resolve) => mediaSource.addEventListener('sourceopen', () => resolve(), { once: true }));

    // The element committed to our resource (browser resource selection is
    // async — stage the committed state directly).
    Object.defineProperty(mediaElement, 'currentSrc', { value: url, configurable: true });
    const load = vi.spyOn(mediaElement, 'load');

    detach();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('detach skips the reset for a UA-closed MediaSource — the element carries the recovery snapshot', () => {
    const mediaElement = document.createElement('video');
    const mediaSource = createMediaSource();
    const { url, detach } = attachMediaSource(mediaSource, mediaElement);

    Object.defineProperty(mediaElement, 'currentSrc', { value: url, configurable: true });
    // The UA killed the MediaSource out from under the engine (AirPlay
    // handoff, MMS eviction). A load() here would wipe the element's frozen
    // currentTime/paused — the recovery restore state — and re-run resource
    // selection under an AirPlay receiver.
    Object.defineProperty(mediaSource, 'readyState', { value: 'closed', configurable: true });
    const load = vi.spyOn(mediaElement, 'load');

    detach();

    expect(load).not.toHaveBeenCalled();
    expect(mediaElement.getAttribute('src')).toBeNull();
  });

  it('detach skips the reset when the element has moved to another resource', () => {
    const mediaElement = document.createElement('video');
    const mediaSource = createMediaSource();
    const { detach } = attachMediaSource(mediaSource, mediaElement);

    // Resource selection moved on (e.g. Safari switched to a native-HLS
    // fallback source for an AirPlay handoff) — resetting would rip that
    // resource out from under its owner.
    Object.defineProperty(mediaElement, 'currentSrc', {
      value: 'https://example.com/fallback.m3u8',
      configurable: true,
    });
    const load = vi.spyOn(mediaElement, 'load');

    detach();

    expect(load).not.toHaveBeenCalled();
  });
});

describe('createSourceBuffer', () => {
  it('should create SourceBuffer with codec string', async () => {
    const mediaSource = createMediaSource();
    const mediaElement = document.createElement('video');
    attachMediaSource(mediaSource, mediaElement);

    await new Promise<void>((resolve) => mediaSource.addEventListener('sourceopen', () => resolve(), { once: true }));

    const buffer = createSourceBuffer(mediaSource, 'video/mp4; codecs="avc1.42E01E"');

    expect(buffer).toBeDefined();
    expect(mediaSource.sourceBuffers.length).toBe(1);
  });

  it('should throw when MediaSource is not open', () => {
    const mediaSource = createMediaSource();

    expect(() => createSourceBuffer(mediaSource, 'video/mp4; codecs="avc1.42E01E"')).toThrow('MediaSource is not open');
  });
});

describe('isCodecSupported', () => {
  it('should return true for supported codecs', () => {
    // Test with common H.264 codec
    expect(isCodecSupported('video/mp4; codecs="avc1.42E01E"')).toBe(true);
  });

  it('should return false for unsupported codecs', () => {
    // Test with unlikely/unsupported codec
    expect(isCodecSupported('video/invalid; codecs="fake"')).toBe(false);
  });
});

describe('waitForMediaSourceOpen', () => {
  it('resolves immediately when readyState is already open', async () => {
    const mediaSource = createMediaSource();
    const mediaElement = document.createElement('video');
    attachMediaSource(mediaSource, mediaElement);
    await new Promise<void>((resolve) => mediaSource.addEventListener('sourceopen', () => resolve(), { once: true }));

    expect(mediaSource.readyState).toBe('open');
    const controller = new AbortController();
    await waitForMediaSourceOpen(mediaSource, controller.signal);
  });

  it('resolves once readyState transitions out of closed via sourceopen', async () => {
    const mediaSource = createMediaSource();
    expect(mediaSource.readyState).toBe('closed');

    const controller = new AbortController();
    const ready = waitForMediaSourceOpen(mediaSource, controller.signal);

    const mediaElement = document.createElement('video');
    attachMediaSource(mediaSource, mediaElement);

    await ready;
    expect(mediaSource.readyState).toBe('open');
  });

  it('resolves on abort even if readyState never transitions', async () => {
    const mediaSource = createMediaSource();
    const controller = new AbortController();

    const ready = waitForMediaSourceOpen(mediaSource, controller.signal);
    controller.abort();

    await ready;
  });

  it('returns an already-resolved promise when signal is pre-aborted', async () => {
    const mediaSource = createMediaSource();
    const controller = new AbortController();
    controller.abort();

    await waitForMediaSourceOpen(mediaSource, controller.signal);
  });
});
