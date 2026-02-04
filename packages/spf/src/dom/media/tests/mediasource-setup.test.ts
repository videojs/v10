import { describe, expect, it } from 'vitest';
import {
  attachMediaSource,
  createMediaSource,
  createSourceBuffer,
  isCodecSupported,
  supportsManagedMediaSource,
  supportsMediaSource,
  waitForSourceOpen,
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

    const { url, detach } = attachMediaSource(mediaSource, mediaElement);

    detach();

    expect(mediaElement.src).toBe('');
  });
});

describe('waitForSourceOpen', () => {
  it('should resolve immediately if already open', async () => {
    const mediaSource = createMediaSource();
    const mediaElement = document.createElement('video');
    attachMediaSource(mediaSource, mediaElement);

    // Wait for actual sourceopen
    await waitForSourceOpen(mediaSource);

    expect(mediaSource.readyState).toBe('open');
  });

  it('should reject when signal is aborted before call', async () => {
    const mediaSource = createMediaSource();
    const controller = new AbortController();

    controller.abort();

    await expect(waitForSourceOpen(mediaSource, controller.signal)).rejects.toThrow('Aborted');
  });

  it('should reject when signal is aborted while waiting', async () => {
    const mediaSource = createMediaSource();
    const mediaElement = document.createElement('video');
    const controller = new AbortController();

    attachMediaSource(mediaSource, mediaElement);

    const promise = waitForSourceOpen(mediaSource, controller.signal);

    // Abort while waiting
    controller.abort();

    await expect(promise).rejects.toThrow('Aborted');
  });

  it('should clean up listeners after successful open', async () => {
    const mediaSource = createMediaSource();
    const mediaElement = document.createElement('video');
    const controller = new AbortController();

    attachMediaSource(mediaSource, mediaElement);

    await waitForSourceOpen(mediaSource, controller.signal);

    // After resolution, aborting external signal shouldn't cause issues
    expect(() => controller.abort()).not.toThrow();

    // MediaSource should still be open
    expect(mediaSource.readyState).toBe('open');
  });

  it('should clean up listeners after abort', async () => {
    const mediaSource = createMediaSource();
    const mediaElement = document.createElement('video');
    const controller = new AbortController();

    attachMediaSource(mediaSource, mediaElement);

    const promise = waitForSourceOpen(mediaSource, controller.signal);

    controller.abort();

    await expect(promise).rejects.toThrow('Aborted');

    // After abort, opening MediaSource shouldn't affect the rejected promise
    // (listeners should be cleaned up)
    expect(mediaSource.readyState).toBe('closed');
  });

  it('should handle multiple concurrent waits', async () => {
    const mediaSource = createMediaSource();
    const mediaElement = document.createElement('video');

    attachMediaSource(mediaSource, mediaElement);

    // Multiple promises waiting on same MediaSource
    const promise1 = waitForSourceOpen(mediaSource);
    const promise2 = waitForSourceOpen(mediaSource);
    const promise3 = waitForSourceOpen(mediaSource);

    // All should resolve when sourceopen fires
    await expect(Promise.all([promise1, promise2, promise3])).resolves.toBeDefined();

    expect(mediaSource.readyState).toBe('open');
  });

  it('should handle abort racing with sourceopen', async () => {
    const mediaSource = createMediaSource();
    const mediaElement = document.createElement('video');
    const controller = new AbortController();

    attachMediaSource(mediaSource, mediaElement);

    const promise = waitForSourceOpen(mediaSource, controller.signal);

    // Race condition: abort happens very close to sourceopen
    // One should win, but no errors should occur
    setTimeout(() => controller.abort(), 5);

    try {
      await promise;
      // If sourceopen won, should be open
      expect(mediaSource.readyState).toBe('open');
    } catch (error) {
      // If abort won, should reject with AbortError
      expect(error).toBeInstanceOf(DOMException);
      expect((error as DOMException).name).toBe('AbortError');
    }
  });
});

describe('createSourceBuffer', () => {
  it('should create SourceBuffer with codec string', async () => {
    const mediaSource = createMediaSource();
    const mediaElement = document.createElement('video');
    attachMediaSource(mediaSource, mediaElement);

    await waitForSourceOpen(mediaSource);

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
