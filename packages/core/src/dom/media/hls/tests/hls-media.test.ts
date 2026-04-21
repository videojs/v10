import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaError } from '../../../../core/media/media-error';
import { NativeHlsMedia } from '../../native-hls';
import { HlsMedia, SourceTypes } from '../index';

afterEach(() => {
  document.body.innerHTML = '';
});

function fireDurationChange(video: HTMLVideoElement, duration: number) {
  Object.defineProperty(video, 'duration', { value: duration, configurable: true });
  video.dispatchEvent(new Event('durationchange'));
}

function fireNativeError(video: HTMLVideoElement, code: number, message = '') {
  Object.defineProperty(video, 'error', {
    value: { code, message },
    configurable: true,
  });
  video.dispatchEvent(new Event('error'));
}

function setup() {
  const video = document.createElement('video');
  document.body.appendChild(video);

  const media = new HlsMedia();
  media.attach(video);

  const handler = vi.fn();
  media.addEventListener('error', handler);

  media.preferPlayback = 'native';
  media.type = SourceTypes.M3U8;
  media.load();

  return { media, video, handler };
}

describe('HlsMedia', () => {
  describe('error event delegation', () => {
    it('dispatches only the enriched error, not the raw native error', () => {
      const { video, handler } = setup();

      fireNativeError(video, MediaError.MEDIA_ERR_NETWORK, 'network failure');

      expect(handler).toHaveBeenCalledOnce();

      const event = handler.mock.calls[0]![0] as ErrorEvent;
      expect(event).toBeInstanceOf(ErrorEvent);
      expect(event.error).toBeInstanceOf(MediaError);
      expect(event.error.code).toBe(MediaError.MEDIA_ERR_NETWORK);
    });

    it('exposes enriched error via the error getter', () => {
      const { media, video } = setup();

      expect(media.error).toBeNull();

      fireNativeError(video, MediaError.MEDIA_ERR_DECODE, 'decode failure');

      expect(media.error).toBeInstanceOf(MediaError);
      expect(media.error!.code).toBe(MediaError.MEDIA_ERR_DECODE);
    });
  });

  describe('event forwarding through delegate', () => {
    it('forwards non-error events from native video once', () => {
      const { media, video } = setup();

      const playHandler = vi.fn();
      media.addEventListener('play', playHandler);

      video.dispatchEvent(new Event('play'));

      expect(playHandler).toHaveBeenCalledOnce();
    });

    it('forwards events added before load', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const media = new HlsMedia();
      media.attach(video);

      const pauseHandler = vi.fn();
      media.addEventListener('pause', pauseHandler);

      media.preferPlayback = 'native';
      media.type = SourceTypes.M3U8;
      media.load();

      video.dispatchEvent(new Event('pause'));

      expect(pauseHandler).toHaveBeenCalledOnce();
    });
  });

  describe('destroy', () => {
    it('removes forwarding listeners from the native element', () => {
      const { media, video } = setup();

      const playHandler = vi.fn();
      media.addEventListener('play', playHandler);

      video.dispatchEvent(new Event('play'));
      expect(playHandler).toHaveBeenCalledOnce();

      media.destroy();
      playHandler.mockClear();

      video.dispatchEvent(new Event('play'));
      expect(playHandler).not.toHaveBeenCalled();
    });
  });

  describe('property proxying', () => {
    it('proxies paused from the native element', () => {
      const { media } = setup();
      expect(media.paused).toBe(true);
    });

    it('proxies volume to the native element', () => {
      const { media, video } = setup();
      media.volume = 0.5;
      expect(video.volume).toBe(0.5);
    });
  });

  describe('streamType', () => {
    it('defaults to `unknown` before load', () => {
      const media = new HlsMedia();
      expect(media.streamType).toBe('unknown');
    });

    it('auto-detects `live` from a native delegate with infinite duration', () => {
      const { media, video } = setup();

      const handler = vi.fn();
      media.addEventListener('streamtypechange', handler);

      fireDurationChange(video, Infinity);

      expect(media.streamType).toBe('live');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('auto-detects `on-demand` from a native delegate with finite duration', () => {
      const { media, video } = setup();

      const handler = vi.fn();
      media.addEventListener('streamtypechange', handler);

      fireDurationChange(video, 120);

      expect(media.streamType).toBe('on-demand');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('dedupes `streamtypechange` when the detected value does not change', () => {
      const { media, video } = setup();

      const handler = vi.fn();
      media.addEventListener('streamtypechange', handler);

      fireDurationChange(video, 120);
      fireDurationChange(video, 240);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('dispatches `streamtypechange` once per transition when the engine is recreated', () => {
      const { media, video } = setup();

      const handler = vi.fn();
      media.addEventListener('streamtypechange', handler);

      fireDurationChange(video, Infinity);
      expect(media.streamType).toBe('live');

      handler.mockClear();
      // `debug` is part of `HlsMedia`'s engine props — toggling it recreates the
      // native delegate without switching playback engines.
      media.debug = true;
      media.load();

      // Teardown: a single `live` → `unknown`, then the new delegate re-detects
      // `live` from the same element during `attach`.
      expect(handler).toHaveBeenCalledTimes(2);
      expect(media.streamType).toBe('live');
    });

    it('lets user-set values win over auto-detection', () => {
      const { media, video } = setup();

      const handler = vi.fn();
      media.addEventListener('streamtypechange', handler);

      media.streamType = 'live';
      expect(media.streamType).toBe('live');
      expect(handler).toHaveBeenCalledOnce();

      fireDurationChange(video, 120);
      expect(media.streamType).toBe('live');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('clears the user override when set back to `unknown`', () => {
      const { media, video } = setup();

      media.streamType = 'live';
      fireDurationChange(video, 120);
      expect(media.streamType).toBe('live');

      media.streamType = 'unknown';

      expect(media.streamType).toBe('on-demand');
    });

    it('dispatches `streamtypechange` when set before a delegate exists', () => {
      const media = new HlsMedia();
      const handler = vi.fn();
      media.addEventListener('streamtypechange', handler);

      media.streamType = 'live';

      expect(media.streamType).toBe('live');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('preserves a user-set value across `load()` on the same engine', () => {
      const { media, video } = setup();

      media.streamType = 'live';

      const handler = vi.fn();
      media.addEventListener('streamtypechange', handler);

      media.load();

      expect(media.streamType).toBe('live');
      expect(handler).not.toHaveBeenCalled();

      fireDurationChange(video, 120);
      expect(media.streamType).toBe('live');
      expect(handler).not.toHaveBeenCalled();
    });

    it('preserves a user-set value across engine recreation', () => {
      const { media } = setup();

      media.streamType = 'live';
      expect(media.streamType).toBe('live');

      media.preferPlayback = 'mse';
      media.load();

      expect(media.streamType).toBe('live');
    });

    it('stops preserving after the user override is cleared with `unknown`', () => {
      const { media } = setup();

      media.streamType = 'live';
      media.streamType = 'unknown';

      media.preferPlayback = 'mse';
      media.load();

      expect(media.streamType).toBe('unknown');
    });
  });
});

describe('NativeHlsMedia streamType', () => {
  function setupNative() {
    const video = document.createElement('video');
    document.body.appendChild(video);
    const media = new NativeHlsMedia();
    media.attach(video);
    return { media, video };
  }

  it('defaults to `unknown`', () => {
    const media = new NativeHlsMedia();
    expect(media.streamType).toBe('unknown');
  });

  it('detects `live` and fires `streamtypechange`', () => {
    const { media, video } = setupNative();

    const handler = vi.fn();
    media.addEventListener('streamtypechange', handler);

    fireDurationChange(video, Infinity);

    expect(media.streamType).toBe('live');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('honors a user override and clears it on `unknown`', () => {
    const { media, video } = setupNative();

    media.streamType = 'live';
    fireDurationChange(video, 120);
    expect(media.streamType).toBe('live');

    media.streamType = 'unknown';
    expect(media.streamType).toBe('on-demand');
  });
});
