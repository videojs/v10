import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaError } from '../../../../core/media/media-error';
import { NativeHlsMedia } from '../../native-hls';
import { ContentTypes, HlsMedia } from '../index';

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

async function setupCastFramework() {
  const loadMedia = vi.fn(async () => {});

  class MediaInfo {
    customData: object | null = null;
    metadata?: unknown;
    streamType?: string;
    tracks?: unknown[];

    constructor(
      public contentId: string,
      public contentType: string
    ) {}
  }

  class LoadRequest {
    currentTime = 0;
    autoplay = false;
    activeTrackIds: number[] = [];

    constructor(public media: MediaInfo) {}
  }

  class RemotePlayer {
    controller?: {
      addEventListener: ReturnType<typeof vi.fn>;
      removeEventListener: ReturnType<typeof vi.fn>;
      muteOrUnmute: ReturnType<typeof vi.fn>;
      setVolumeLevel: ReturnType<typeof vi.fn>;
      seek: ReturnType<typeof vi.fn>;
    };
    isMediaLoaded = false;
    isPaused = true;
    isMuted = false;
    volumeLevel = 1;
    playerState = 'IDLE';
    currentTime = 0;
    duration = Number.NaN;
  }

  class RemotePlayerController {
    constructor(remote: RemotePlayer) {
      remote.controller = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        muteOrUnmute: vi.fn(),
        setVolumeLevel: vi.fn(),
        seek: vi.fn(),
      };
    }
  }

  const castContext = {
    addEventListener: vi.fn(),
    setOptions: vi.fn(),
    getCastState: vi.fn(() => 'CONNECTED'),
    getSessionState: vi.fn(() => 'SESSION_STARTED'),
    requestSession: vi.fn(async () => {}),
    getCurrentSession: vi.fn(() => ({
      loadMedia,
      getSessionObj: () => ({ media: [] }),
      sendMessage: vi.fn(),
    })),
  };

  vi.stubGlobal('chrome', {
    cast: {
      isAvailable: true,
      AutoJoinPolicy: { ORIGIN_SCOPED: 'origin_scoped' },
      Image: class {
        constructor(public url: string) {}
      },
      media: {
        MediaInfo,
        LoadRequest,
        GenericMediaMetadata: class {
          title = '';
          images: unknown[] = [];
        },
        Track: class {
          trackContentId = '';
          trackContentType = '';
          subtype = '';
          name = '';
          language = '';

          constructor(
            public trackId: number,
            public type: string
          ) {}
        },
        TrackType: { TEXT: 'TEXT' },
        TextTrackType: { CAPTIONS: 'CAPTIONS', SUBTITLES: 'SUBTITLES' },
        StreamType: { LIVE: 'LIVE', BUFFERED: 'BUFFERED' },
        HlsSegmentFormat: { FMP4: 'FMP4', TS: 'TS' },
        HlsVideoSegmentFormat: { FMP4: 'FMP4', TS: 'TS' },
        PlayerState: { IDLE: 'IDLE', BUFFERING: 'BUFFERING', PAUSED: 'PAUSED', PLAYING: 'PLAYING' },
        IdleReason: { FINISHED: 'FINISHED' },
      },
    },
  });

  vi.stubGlobal('cast', {
    framework: {
      CastContext: { getInstance: () => castContext },
      CastContextEventType: {
        CAST_STATE_CHANGED: 'CAST_STATE_CHANGED',
        SESSION_STATE_CHANGED: 'SESSION_STATE_CHANGED',
      },
      CastState: { NO_DEVICES_AVAILABLE: 'NO_DEVICES_AVAILABLE', CONNECTING: 'CONNECTING' },
      SessionState: { SESSION_RESUMED: 'SESSION_RESUMED' },
      RemotePlayerEventType: {
        IS_CONNECTED_CHANGED: 'IS_CONNECTED_CHANGED',
        DURATION_CHANGED: 'DURATION_CHANGED',
        VOLUME_LEVEL_CHANGED: 'VOLUME_LEVEL_CHANGED',
        IS_MUTED_CHANGED: 'IS_MUTED_CHANGED',
        CURRENT_TIME_CHANGED: 'CURRENT_TIME_CHANGED',
        VIDEO_INFO_CHANGED: 'VIDEO_INFO_CHANGED',
        IS_PAUSED_CHANGED: 'IS_PAUSED_CHANGED',
        PLAYER_STATE_CHANGED: 'PLAYER_STATE_CHANGED',
        IS_MEDIA_LOADED_CHANGED: 'IS_MEDIA_LOADED_CHANGED',
      },
      RemotePlayer,
      RemotePlayerController,
    },
  });

  if (!customElements.get('google-cast-button')) {
    customElements.define('google-cast-button', class extends HTMLElement {});
  }

  (globalThis as { __onGCastApiAvailable?: () => void }).__onGCastApiAvailable?.();
  await customElements.whenDefined('google-cast-button');
  await Promise.resolve();

  return { loadMedia };
}

function setup() {
  const video = document.createElement('video');
  document.body.appendChild(video);

  const media = new HlsMedia();
  media.attach(video);

  const handler = vi.fn();
  media.addEventListener('error', handler);

  media.config = { preferPlayback: 'native', contentType: ContentTypes.M3U8 };
  media.load();

  return { media, video, handler };
}

describe('HlsMedia', () => {
  describe('load', () => {
    it('routes through Google Cast while casting', async () => {
      const { loadMedia } = await setupCastFramework();
      const video = document.createElement('video');
      vi.spyOn(video, 'pause').mockImplementation(() => {});
      Object.defineProperty(video, 'textTracks', {
        value: {
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          [Symbol.iterator]: function* () {},
        },
        configurable: true,
      });
      document.body.appendChild(video);

      const media = new HlsMedia();
      media.attach(video);
      media.castSrc = 'https://example.com/cast.mp4';

      const remote = media.remote;
      expect(remote).toBeDefined();
      await remote!.prompt();

      expect(loadMedia).toHaveBeenCalledOnce();

      await media.load();

      expect(loadMedia).toHaveBeenCalledTimes(2);
    });
  });

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

      media.config = { preferPlayback: 'native', contentType: ContentTypes.M3U8 };
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
      // `config.hlsJs.debug` is part of `HlsMedia`'s engine props — toggling it
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
      const media = new HlsMedia();
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
