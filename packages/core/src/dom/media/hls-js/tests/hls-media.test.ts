import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaError } from '../../../../core/media/media-error';
import type { RemotePlaybackLike } from '../../../../core/media/types';
import { addComponent, type Component } from '../../media-host';
import { NativeHlsMedia } from '../../native-hls';
import { ContentTypes, Hls, HlsJsMedia } from '../index';

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
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

  const media = new HlsJsMedia();
  media.attach(video);

  const handler = vi.fn();
  media.addEventListener('error', handler);

  media.config = { preferPlayback: 'native', contentType: ContentTypes.M3U8 };
  media.load();

  return { media, video, handler };
}

describe('HlsJsMedia', () => {
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

      const media = new HlsJsMedia();
      media.attach(video);

      const pauseHandler = vi.fn();
      media.addEventListener('pause', pauseHandler);

      media.config = { preferPlayback: 'native', contentType: ContentTypes.M3U8 };
      media.load();

      video.dispatchEvent(new Event('pause'));

      expect(pauseHandler).toHaveBeenCalledOnce();
    });
  });

  describe('loadstart', () => {
    it('dispatches loadstart to listeners once per load', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const media = new HlsJsMedia();
      media.attach(video);

      const handler = vi.fn();
      media.addEventListener('loadstart', handler);

      media.load();

      expect(handler).toHaveBeenCalledOnce();
    });

    it('does not forward the native loadstart from the target', () => {
      const { media, video } = setup();

      const handler = vi.fn();
      media.addEventListener('loadstart', handler);

      video.dispatchEvent(new Event('loadstart'));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('config', () => {
    it('recreates the engine when a new hlsJs config is assigned', () => {
      const { media, video } = setup();

      fireDurationChange(video, Infinity);
      expect(media.streamType).toBe('live');

      const handler = vi.fn();
      media.addEventListener('streamtypechange', handler);

      // New `hlsJs` option values must recreate the engine to take effect.
      media.config = { ...media.config, hlsJs: { maxBufferLength: 60 } };
      media.load();

      // Teardown `live` → `unknown`, then the new delegate re-detects `live`.
      expect(handler).toHaveBeenCalledTimes(2);
      expect(media.streamType).toBe('live');
    });

    it('does not recreate the engine for an equivalent hlsJs config', () => {
      const { media, video } = setup();

      media.config = { ...media.config, hlsJs: { maxBufferLength: 60 } };
      media.load();

      fireDurationChange(video, Infinity);
      const handler = vi.fn();
      media.addEventListener('streamtypechange', handler);

      // Same option values in a new object (e.g. an inline React prop).
      media.config = { ...media.config, hlsJs: { maxBufferLength: 60 } };
      media.load();

      // No engine teardown → no streamType churn.
      expect(handler).not.toHaveBeenCalled();
    });

    it('recreates the engine when inferred content type changes', () => {
      vi.spyOn(Hls, 'isSupported').mockReturnValue(true);

      const video = document.createElement('video');
      document.body.appendChild(video);

      const media = new HlsJsMedia();
      media.attach(video);

      media.src = 'https://example.com/video.mp4';
      media.load();

      expect(media.engine).toBeNull();

      media.src = 'https://example.com/video.m3u8';
      media.load();

      expect(media.engine).not.toBeNull();
    });

    it('resets free-form config when a new object is assigned', () => {
      const { media } = setup();

      media.config = { hlsJs: { maxBufferLength: 60 } };

      // A new config object signals a fresh start: prior free-form keys
      // (set in `setup()`) are dropped rather than merged.
      expect(media.config.preferPlayback).toBeUndefined();
      expect(media.config.contentType).toBeUndefined();
      expect(media.config.hlsJs).toEqual({ maxBufferLength: 60 });
    });
  });

  describe('remote playback load', () => {
    function setupConnected(load: () => Promise<void>) {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const media = new HlsJsMedia();
      media.attach(video);

      const component: Component = {
        get targetOverride() {
          return { remote: { state: 'connected' } as RemotePlaybackLike, load };
        },
      };
      addComponent(media, component);

      return { media };
    }

    it('awaits the receiver load while connected', async () => {
      let resolveLoad!: () => void;
      const load = vi.fn(() => new Promise<void>((resolve) => (resolveLoad = resolve)));
      const { media } = setupConnected(load);

      let settled = false;
      const result = media.load().then(() => {
        settled = true;
      });

      expect(load).toHaveBeenCalledTimes(1);
      await Promise.resolve();
      expect(settled).toBe(false);

      resolveLoad();
      await result;
      expect(settled).toBe(true);
    });

    it('rejects when the receiver load rejects', async () => {
      const load = vi.fn(() => Promise.reject(new Error('receiver failed')));
      const { media } = setupConnected(load);

      await expect(media.load()).rejects.toThrow('receiver failed');
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
      const media = new HlsJsMedia();
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
      // `config.hlsJs.debug` is part of `HlsJsMedia`'s engine props — toggling it
      // recreates the native delegate without switching playback engines.
      media.config = { ...media.config, hlsJs: { debug: true } };
      media.load();

      // Teardown: a single `live` → `unknown`, then the new delegate re-detects
      // `live` from the same element during `attach`.
      expect(handler).toHaveBeenCalledTimes(2);
      expect(media.streamType).toBe('live');
    });

    it('does not emit a transient auto-detected `streamType` before a user override when the native delegate is recreated', () => {
      const { media, video } = setup();

      Object.defineProperty(video, 'duration', { value: 120, configurable: true });
      media.streamType = 'live';
      expect(media.streamType).toBe('live');

      const seen: string[] = [];
      media.addEventListener('streamtypechange', () => {
        seen.push(media.streamType);
      });

      // Recreates the native delegate; duration would otherwise sync-detect as `on-demand`.
      media.config = { ...media.config, hlsJs: { debug: true } };
      media.load();

      expect(seen).not.toContain('on-demand');
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
      const media = new HlsJsMedia();
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

      media.config = { ...media.config, preferPlayback: 'mse' };
      media.load();

      expect(media.streamType).toBe('live');
    });

    it('stops preserving after the user override is cleared with `unknown`', () => {
      const { media } = setup();

      media.streamType = 'live';
      media.streamType = 'unknown';

      media.config = { ...media.config, preferPlayback: 'mse' };
      media.load();

      expect(media.streamType).toBe('unknown');
    });
  });

  describe('live edge', () => {
    it('defaults to `NaN` for both values before load', () => {
      const media = new HlsJsMedia();
      expect(media.liveEdgeStart).toBeNaN();
      expect(media.targetLiveWindow).toBeNaN();
    });

    it('forwards `NaN` from the native delegate', () => {
      const { media } = setup();
      expect(media.liveEdgeStart).toBeNaN();
      expect(media.targetLiveWindow).toBeNaN();
    });

    it('returns `NaN` again after destroy', () => {
      const { media } = setup();

      media.destroy();

      expect(media.liveEdgeStart).toBeNaN();
      expect(media.targetLiveWindow).toBeNaN();
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
