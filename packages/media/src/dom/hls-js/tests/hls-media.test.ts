import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaError } from '../../../core/media-error';
import type { RemotePlaybackLike } from '../../../core/types';
import { addMediaComponent, type MediaComponent } from '../../media-host';
import { NativeHlsMedia } from '../../native-hls';
import { ContentTypes, Hls, HlsJsMedia, type HlsSource } from '../index';

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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

  media.source = { type: ContentTypes.M3U8, preferPlayback: 'native' };
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

      media.source = { type: ContentTypes.M3U8, preferPlayback: 'native' };
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

  describe('source', () => {
    it('recreates the engine when new engine options are assigned', () => {
      const { media, video } = setup();

      fireDurationChange(video, Infinity);
      expect(media.streamType).toBe('live');

      const handler = vi.fn();
      media.addEventListener('streamtypechange', handler);

      // New hls.js option values must recreate the engine to take effect.
      media.source = {
        type: ContentTypes.M3U8,
        preferPlayback: 'native',
        engine: { hlsJs: { maxBufferLength: 60 } },
      };
      media.load();

      // Teardown `live` → `unknown`, then the new delegate re-detects `live`.
      expect(handler).toHaveBeenCalledTimes(2);
      expect(media.streamType).toBe('live');
    });

    it('does not recreate the engine for a structurally equal source', () => {
      const { media, video } = setup();

      const source = {
        type: ContentTypes.M3U8,
        preferPlayback: 'native',
        engine: { hlsJs: { maxBufferLength: 60 } },
      } as const;

      media.source = { ...source };
      media.load();

      fireDurationChange(video, Infinity);
      const handler = vi.fn();
      media.addEventListener('streamtypechange', handler);

      // Same option values in a new object (e.g. an inline React prop).
      media.source = { ...source };
      media.load();

      // No engine teardown → no streamType churn.
      expect(handler).not.toHaveBeenCalled();
    });

    it('preserves engine options when src changes', () => {
      const { media } = setup();

      media.src = 'https://example.com/video.m3u8';

      expect(media.source).toEqual({
        src: 'https://example.com/video.m3u8',
        type: ContentTypes.M3U8,
        preferPlayback: 'native',
      });
    });

    it('derives src from source and fires sourcechange', () => {
      const media = new HlsJsMedia();
      const handler = vi.fn();
      media.addEventListener('sourcechange', handler);

      media.source = { src: 'https://example.com/video.m3u8' };

      expect(media.src).toBe('https://example.com/video.m3u8');
      expect(handler).toHaveBeenCalledOnce();

      media.source = null;

      expect(media.src).toBe('');
      expect(handler).toHaveBeenCalledTimes(2);
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

    it('replaces the source rather than merging it', () => {
      const { media } = setup();

      media.source = { engine: { hlsJs: { maxBufferLength: 60 } } };

      // A new source object signals a fresh start: options set in `setup()` are
      // dropped rather than merged.
      expect(media.source).toEqual({ engine: { hlsJs: { maxBufferLength: 60 } } });
    });
  });

  describe('drm', () => {
    const WIDEVINE_LICENSE = 'https://license.test/widevine';
    const FAIRPLAY_LICENSE = 'https://license.test/fairplay';

    function setupMse(source: HlsSource) {
      vi.spyOn(Hls, 'isSupported').mockReturnValue(true);

      const video = document.createElement('video');
      document.body.appendChild(video);

      const media = new HlsJsMedia();
      media.attach(video);
      media.source = { ...source, src: 'https://example.com/video.m3u8' };
      media.load();

      return { media, video };
    }

    const drmEngine = { emeEnabled: true, drmSystems: { 'com.widevine.alpha': { licenseUrl: WIDEVINE_LICENSE } } };
    const drm = {
      'com.apple.fps': { licenseUrl: FAIRPLAY_LICENSE, serverCertificateUrl: 'https://license.test/appcert' },
      'com.widevine.alpha': { licenseUrl: WIDEVINE_LICENSE },
    };

    it('licenses the hls.js engine from `source.drm`', () => {
      const { media } = setupMse({ drm });

      // hls.js takes the same shape, and only negotiates keys while EME is on.
      expect(media.engine!.config.emeEnabled).toBe(true);
      expect(media.engine!.config.drmSystems).toEqual(drm);
    });

    it('leaves EME alone when `source.drm` names nothing', () => {
      const { media } = setupMse({ drm: {} });
      expect(media.engine!.config.emeEnabled).toBe(false);
    });

    it('describes licensing without acting on it for an explicit `emeEnabled: false`', () => {
      const { media } = setupMse({ drm, engine: { hlsJs: { emeEnabled: false } } });

      expect(media.engine!.config.emeEnabled).toBe(false);
      expect(media.engine!.config.drmSystems).toEqual(drm);
    });

    it('lets `engine.hlsJs.drmSystems` replace `source.drm`', () => {
      const { media } = setupMse({ drm, engine: { hlsJs: { drmSystems: drmEngine.drmSystems } } });

      // An escape hatch replaces what it is an escape from, rather than merging:
      // the FairPlay server named in `drm` is gone.
      expect(media.engine!.config.drmSystems).toEqual({ 'com.widevine.alpha': { licenseUrl: WIDEVINE_LICENSE } });
      expect(media.engine!.config.emeEnabled).toBe(true);
    });

    it('recreates the engine when a `source.drm` license server changes', () => {
      const { media } = setupMse({ drm });
      const engine = media.engine;

      // Same license servers in a new object (e.g. an inline React prop).
      media.source = { src: media.src, drm: { ...drm } };
      media.load();
      expect(media.engine).toBe(engine);

      media.source = { src: media.src, drm: { 'com.widevine.alpha': { licenseUrl: 'https://other.test/widevine' } } };
      media.load();
      expect(media.engine).not.toBe(engine);
    });

    it('hands DRM options straight to the hls.js engine', () => {
      const { media } = setupMse({ engine: { hlsJs: drmEngine } });

      expect(media.engine!.config.emeEnabled).toBe(true);
      expect(media.engine!.config.drmSystems).toEqual({ 'com.widevine.alpha': { licenseUrl: WIDEVINE_LICENSE } });
    });

    it('leaves EME disabled for unprotected playback', () => {
      const { media } = setupMse({});
      expect(media.engine!.config.emeEnabled).toBe(false);
    });

    it('reuses the engine for an equivalent DRM config', () => {
      const { media } = setupMse({ engine: { hlsJs: drmEngine } });
      const engine = media.engine;

      // Same license servers in a new object (e.g. an inline React prop).
      media.source = {
        src: media.src,
        engine: {
          hlsJs: { emeEnabled: true, drmSystems: { 'com.widevine.alpha': { licenseUrl: WIDEVINE_LICENSE } } },
        },
      };
      media.load();

      expect(media.engine).toBe(engine);
    });

    it('recreates the engine when a license server changes', () => {
      const { media } = setupMse({ engine: { hlsJs: drmEngine } });
      const engine = media.engine;

      media.source = {
        src: media.src,
        engine: {
          hlsJs: {
            emeEnabled: true,
            drmSystems: { 'com.widevine.alpha': { licenseUrl: 'https://other.test/widevine' } },
          },
        },
      };
      media.load();

      expect(media.engine).not.toBe(engine);
      expect(media.engine!.config.drmSystems).toEqual({
        'com.widevine.alpha': { licenseUrl: 'https://other.test/widevine' },
      });
    });

    it('warns when native playback is taken and no FairPlay server is named', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { media } = setup();
      media.source = { ...media.source, engine: { hlsJs: drmEngine } };
      media.load();

      expect(media.engine).toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('`source.drm`'));
    });

    it('names the configuration it is licensing against when it warns', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { media } = setup();
      // `source.drm` names FairPlay, but the escape hatch replaces it and does
      // not — so the field to go and look at is the escape hatch.
      media.source = {
        ...media.source,
        drm,
        engine: { nativeHls: { drmSystems: { 'com.widevine.alpha': { licenseUrl: WIDEVINE_LICENSE } } } },
      };
      media.load();

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('`source.engine.nativeHls.drmSystems`'));
    });

    it('hands `source.drm` to the native delegate', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const requestMediaKeySystemAccess = vi.fn(() => new Promise<never>(() => {}));
      vi.stubGlobal('navigator', { ...navigator, requestMediaKeySystemAccess });

      const { media, video } = setup();
      // Every system named, as a source describing both paths would: the native
      // delegate takes the FairPlay entry and leaves the rest to an MSE engine.
      media.source = { ...media.source, drm };
      media.load();

      // jsdom has no `MediaEncryptedEvent`; only these two fields are read.
      video.dispatchEvent(Object.assign(new Event('encrypted'), { initDataType: 'skd', initData: new ArrayBuffer(8) }));
      await Promise.resolve();

      expect(media.engine).toBeNull();
      expect(warn).not.toHaveBeenCalled();
      expect(requestMediaKeySystemAccess).toHaveBeenCalledWith('com.apple.fps', expect.any(Array));
    });

    it('recreates the native delegate when `source.drm` changes', () => {
      const { media, video } = setup();
      media.source = { ...media.source, drm };
      media.load();

      fireDurationChange(video, Infinity);
      expect(media.streamType).toBe('live');

      const handler = vi.fn();
      media.addEventListener('streamtypechange', handler);

      media.source = { ...media.source, drm: { ...drm } };
      media.load();
      // Structurally equal, so the delegate playing it is left alone.
      expect(handler).not.toHaveBeenCalled();

      media.source = { ...media.source, drm: { 'com.apple.fps': { licenseUrl: 'https://other.test/fairplay' } } };
      media.load();

      // Teardown `live` → `unknown`, then the new delegate re-detects `live`.
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('hands `nativeHls` to the native delegate', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const requestMediaKeySystemAccess = vi.fn(() => new Promise<never>(() => {}));
      vi.stubGlobal('navigator', { ...navigator, requestMediaKeySystemAccess });

      const { media, video } = setup();
      media.source = {
        ...media.source,
        engine: {
          hlsJs: drmEngine,
          nativeHls: { drmSystems: { 'com.apple.fps': { licenseUrl: FAIRPLAY_LICENSE } } },
        },
      };
      media.load();

      // jsdom has no `MediaEncryptedEvent`; only these two fields are read.
      video.dispatchEvent(Object.assign(new Event('encrypted'), { initDataType: 'skd', initData: new ArrayBuffer(8) }));
      await Promise.resolve();

      expect(media.engine).toBeNull();
      expect(warn).not.toHaveBeenCalled();
      expect(requestMediaKeySystemAccess).toHaveBeenCalledWith('com.apple.fps', expect.any(Array));
    });

    it('recreates the native delegate when `nativeHls` changes', () => {
      const { media, video } = setup();
      media.source = {
        ...media.source,
        engine: { nativeHls: { drmSystems: { 'com.apple.fps': { licenseUrl: FAIRPLAY_LICENSE } } } },
      };
      media.load();

      fireDurationChange(video, Infinity);
      expect(media.streamType).toBe('live');

      const handler = vi.fn();
      media.addEventListener('streamtypechange', handler);

      media.source = {
        ...media.source,
        engine: { nativeHls: { drmSystems: { 'com.apple.fps': { licenseUrl: 'https://other.test/fairplay' } } } },
      };
      media.load();

      // Teardown `live` → `unknown`, then the new delegate re-detects `live`.
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('leaves the native delegate alone for a structurally equal `nativeHls`', () => {
      const { media, video } = setup();
      const nativeHls = { drmSystems: { 'com.apple.fps': { licenseUrl: FAIRPLAY_LICENSE } } };

      media.source = { ...media.source, engine: { nativeHls: { ...nativeHls } } };
      media.load();

      fireDurationChange(video, Infinity);
      const handler = vi.fn();
      media.addEventListener('streamtypechange', handler);

      media.source = { ...media.source, engine: { nativeHls: { ...nativeHls } } };
      media.load();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('remote playback load', () => {
    function setupConnected(load: () => Promise<void>) {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const media = new HlsJsMedia();
      media.attach(video);

      const component: MediaComponent = {
        get targetOverride() {
          return { remote: { state: 'connected' } as RemotePlaybackLike, load };
        },
      };
      addMediaComponent(media, component);

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
      // `engine.hlsJs.debug` is part of `HlsJsMedia`'s engine key — toggling it
      // recreates the native delegate without switching playback engines.
      media.source = { type: ContentTypes.M3U8, preferPlayback: 'native', engine: { hlsJs: { debug: true } } };
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
      media.source = { type: ContentTypes.M3U8, preferPlayback: 'native', engine: { hlsJs: { debug: true } } };
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

      media.source = { type: ContentTypes.M3U8, preferPlayback: 'mse' };
      media.load();

      expect(media.streamType).toBe('live');
    });

    it('stops preserving after the user override is cleared with `unknown`', () => {
      const { media } = setup();

      media.streamType = 'live';
      media.streamType = 'unknown';

      media.source = { type: ContentTypes.M3U8, preferPlayback: 'mse' };
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
