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

  it('should reject when signal is aborted', async () => {
    const mediaSource = createMediaSource();
    const controller = new AbortController();

    controller.abort();

    await expect(waitForSourceOpen(mediaSource, controller.signal)).rejects.toThrow('Aborted');
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
