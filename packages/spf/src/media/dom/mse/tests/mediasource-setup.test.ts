import { describe, expect, it, vi } from 'vitest';
import {
  attachMediaSource,
  attachMediaSourceAsSourceElement,
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

describe('attachMediaSourceAsSourceElement', () => {
  it('attaches a regular MediaSource via the src attribute, same as attachMediaSource', () => {
    const mediaElement = document.createElement('video');
    const mediaSource = createMediaSource();

    const { url, detach } = attachMediaSourceAsSourceElement(mediaSource, mediaElement);

    expect(mediaElement.src).toBe(url);
    expect(mediaElement.querySelector('source')).toBeNull();

    detach();
    expect(mediaElement.getAttribute('src')).toBeNull();
  });

  it('attaches a ManagedMediaSource as the FIRST <source> child, keeping siblings', () => {
    class FakeManagedMediaSource extends EventTarget {
      readyState = 'closed';
    }
    vi.stubGlobal('ManagedMediaSource', FakeManagedMediaSource);
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-mms');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    try {
      const mediaSource = new FakeManagedMediaSource() as unknown as MediaSource;
      const mediaElement = document.createElement('video');
      mediaElement.setAttribute('src', 'https://example.com/old.mp4');
      const sibling = document.createElement('source');
      mediaElement.append(sibling);

      const { url, detach } = attachMediaSourceAsSourceElement(mediaSource, mediaElement);

      expect(url).toBe('blob:fake-mms');
      // Bare src dropped; MSE source is the FIRST child so local playback
      // selects it; the sibling alternative stays second.
      expect(mediaElement.getAttribute('src')).toBeNull();
      expect(mediaElement.disableRemotePlayback).toBe(true);
      const sources = mediaElement.querySelectorAll('source');
      expect(sources).toHaveLength(2);
      expect(sources[0]!.src).toBe('blob:fake-mms');
      expect(sources[0]!.type).toBe('video/mp4');
      expect(sources[1]).toBe(sibling);

      detach();
      expect(mediaElement.querySelectorAll('source')).toHaveLength(1);
      expect(mediaElement.querySelector('source')).toBe(sibling);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-mms');
    } finally {
      vi.unstubAllGlobals();
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
    }
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
