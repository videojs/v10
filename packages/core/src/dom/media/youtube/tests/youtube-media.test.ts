import { afterEach, describe, expect, it, vi } from 'vitest';
import type { YTCaptionTrack, YTNamespace, YTPlayer, YTPlayerConfig } from '../api';

// -- Mock YT player factory --

let mockPlayerInstance: ReturnType<typeof makeMockPlayer>;
let capturedConfig: YTPlayerConfig;

function makeMockPlayer() {
  const handlers: Record<string, (e: { data: number; target: unknown }) => void> = {};
  const player = {
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
    seekTo: vi.fn(),
    setVolume: vi.fn(),
    mute: vi.fn(),
    unMute: vi.fn(),
    isMuted: vi.fn(() => false),
    getVolume: vi.fn(() => 100),
    setPlaybackRate: vi.fn(),
    getPlaybackRate: vi.fn(() => 1),
    getPlayerState: vi.fn(() => -1),
    getDuration: vi.fn(() => NaN),
    getCurrentTime: vi.fn(() => 0),
    getVideoLoadedFraction: vi.fn(() => 0),
    setOption: vi.fn(),
    getOption: vi.fn((_mod: string, opt: string) => {
      if (opt === 'tracklist') return [] as YTCaptionTrack[];
      return null;
    }),
    addEventListener: vi.fn((event: string, handler: (e: { data: number; target: unknown }) => void) => {
      handlers[event] = handler;
    }),
    destroy: vi.fn(),
    _emit(event: string, data = 0) {
      handlers[event]?.({ data, target: player });
    },
  };
  return player;
}

const mockYT: YTNamespace = {
  // biome-ignore lint/complexity/useArrowFunction: must be a regular function so `new YT.Player()` works
  Player: vi.fn(function (_iframe: unknown, config: YTPlayerConfig) {
    capturedConfig = config;
    mockPlayerInstance = makeMockPlayer();
    return mockPlayerInstance;
  }) as unknown as YTNamespace['Player'],
  PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
};

// Mock loadYouTubeApi so tests never hit the network.
vi.mock('../api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api')>();
  return {
    ...original,
    loadYouTubeApi: vi.fn(() => Promise.resolve(mockYT)),
  };
});

// jsdom video element lacks a real TextTrackList; provide a minimal mock.
const _origCreate = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tag, ...args) => {
  if (tag !== 'video') return _origCreate(tag, ...args);
  const textTracks = Object.assign(new EventTarget(), {
    length: 0,
    [Symbol.iterator]: function* () {},
  }) as unknown as TextTrackList;
  return {
    textTracks,
    addTextTrack: vi.fn(
      (kind: TextTrackKind, label = '', language = '') =>
        ({ kind, label, language, mode: 'disabled' as TextTrackMode }) as TextTrack
    ),
  } as unknown as HTMLVideoElement;
});

import { YouTubeMedia, youTubeMediaDefaultProps } from '../index';

// Fire the onReady callback for the most-recently created player.
// Pass `beforeReady` to configure mocks after the player is constructed
// but before onReady fires (useful for seeding getDuration, getVolume, etc.).
async function fireReady(beforeReady?: () => void) {
  await Promise.resolve(); // allow #mountAsync to construct the YT.Player
  beforeReady?.();
  capturedConfig.events?.onReady?.({ data: 1, target: mockPlayerInstance as unknown as YTPlayer });
}

function makeContainer() {
  return document.createElement('div');
}

function setup(src = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ') {
  const media = new YouTubeMedia();
  media.src = src;
  const container = makeContainer();
  media.attach(container);
  return { media, container };
}

afterEach(() => {
  vi.clearAllMocks();
  capturedConfig = undefined as unknown as YTPlayerConfig;
});

describe('YouTubeMedia', () => {
  describe('defaults', () => {
    it('starts paused', () => {
      const { media } = setup();
      expect(media.paused).toBe(true);
    });

    it('starts with NaN duration', () => {
      const { media } = setup();
      expect(media.duration).toBeNaN();
    });

    it('starts with readyState 0', () => {
      const { media } = setup();
      expect(media.readyState).toBe(0);
    });

    it('nocookie is false by default', () => {
      expect(youTubeMediaDefaultProps.nocookie).toBe(false);
    });
  });

  describe('attach', () => {
    it('creates an iframe in the container', () => {
      const { container } = setup();
      const iframe = container.querySelector('iframe');
      expect(iframe).not.toBeNull();
    });

    it('embed URL contains enablejsapi=1', () => {
      const { container } = setup();
      const iframe = container.querySelector('iframe')!;
      expect(iframe.src).toContain('enablejsapi=1');
    });

    it('embed URL parses video ID from watch URL', () => {
      const { container } = setup('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      const iframe = container.querySelector('iframe')!;
      expect(iframe.src).toContain('/dQw4w9WgXcQ?');
    });

    it('embed URL parses video ID from youtu.be short URL', () => {
      const { container } = setup('https://youtu.be/dQw4w9WgXcQ');
      const iframe = container.querySelector('iframe')!;
      expect(iframe.src).toContain('/dQw4w9WgXcQ?');
    });

    it('embed URL uses nocookie domain when nocookie=true', () => {
      const media = new YouTubeMedia();
      media.nocookie = true;
      media.src = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const container = makeContainer();
      media.attach(container);
      expect(container.querySelector('iframe')!.src).toContain('youtube-nocookie.com');
    });

    it('does not create a player when src is empty', async () => {
      const MockPlayer = vi.mocked(mockYT.Player);
      MockPlayer.mockClear();
      const media = new YouTubeMedia();
      media.attach(makeContainer());
      await Promise.resolve();
      expect(MockPlayer).not.toHaveBeenCalled();
    });

    it('exposes the player via engine after onReady', async () => {
      const { media } = setup();
      await fireReady();
      expect(media.engine).toBe(mockPlayerInstance);
    });

    it('exposes the container via target', () => {
      const { media, container } = setup();
      expect(media.target).toBe(container);
    });

    it('dispatches loadstart after player is wired', async () => {
      const media = new YouTubeMedia();
      media.src = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const container = makeContainer();
      const handler = vi.fn();
      media.addEventListener('loadstart', handler);
      media.attach(container);
      await Promise.resolve(); // allow #mountAsync
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('onReady', () => {
    it('updates readyState to 1 and dispatches loadedmetadata/durationchange/volumechange', async () => {
      const { media } = setup();

      const dispatched: string[] = [];
      for (const type of ['loadedmetadata', 'durationchange', 'volumechange'] as const) {
        media.addEventListener(type, () => dispatched.push(type));
      }

      // Configure mocks inside beforeReady so they apply to the newly constructed player.
      await fireReady(() => {
        mockPlayerInstance.getDuration.mockReturnValue(120);
        mockPlayerInstance.getVolume.mockReturnValue(80);
      });

      expect(media.readyState).toBe(1);
      expect(media.duration).toBe(120);
      expect(media.volume).toBeCloseTo(0.8);
      expect(dispatched).toContain('loadedmetadata');
      expect(dispatched).toContain('durationchange');
      expect(dispatched).toContain('volumechange');
    });
  });

  describe('detach', () => {
    it('destroys the player', async () => {
      const { media } = setup();
      await fireReady();
      const player = mockPlayerInstance;
      media.detach();
      expect(player.destroy).toHaveBeenCalledOnce();
    });

    it('removes the iframe from the container', async () => {
      const { media, container } = setup();
      await fireReady();
      media.detach();
      expect(container.querySelector('iframe')).toBeNull();
    });

    it('nullifies engine and target', async () => {
      const { media } = setup();
      await fireReady();
      media.detach();
      expect(media.engine).toBeNull();
      expect(media.target).toBeNull();
    });

    it('dispatches emptied', async () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('emptied', handler);
      media.detach();
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('destroy', () => {
    it('is idempotent', async () => {
      const { media } = setup();
      await fireReady();
      const player = mockPlayerInstance;
      media.destroy();
      media.destroy();
      expect(player.destroy).toHaveBeenCalledOnce();
    });
  });

  describe('src setter', () => {
    it('remounts with the new URL', async () => {
      const { media } = setup('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      await fireReady();
      const MockPlayer = vi.mocked(mockYT.Player);
      const callsBefore = MockPlayer.mock.calls.length;

      media.src = 'https://www.youtube.com/watch?v=9bZkp7q19f0';
      await Promise.resolve();

      expect(MockPlayer.mock.calls.length).toBe(callsBefore + 1);
    });

    it('destroys the previous player on src change', async () => {
      const { media } = setup();
      await fireReady();
      const first = mockPlayerInstance;
      media.src = 'https://www.youtube.com/watch?v=9bZkp7q19f0';
      expect(first.destroy).toHaveBeenCalledOnce();
    });

    it('unmounts without remounting when src set to empty', async () => {
      const { media } = setup();
      await fireReady();
      const first = mockPlayerInstance;
      const MockPlayer = vi.mocked(mockYT.Player);
      MockPlayer.mockClear();

      media.src = '';

      expect(first.destroy).toHaveBeenCalledOnce();
      await Promise.resolve();
      expect(MockPlayer).not.toHaveBeenCalled();
    });
  });

  describe('state changes — onStateChange', () => {
    it('PLAYING fires play + playing, sets paused=false', async () => {
      const { media } = setup();
      await fireReady();
      const play = vi.fn();
      const playing = vi.fn();
      media.addEventListener('play', play);
      media.addEventListener('playing', playing);

      mockPlayerInstance._emit('onStateChange', 1); // PLAYING

      expect(play).toHaveBeenCalledOnce();
      expect(playing).toHaveBeenCalledOnce();
      expect(media.paused).toBe(false);
    });

    it('BUFFERING fires play before PLAYING (first buffer), then waiting on rebuffer', async () => {
      const { media } = setup();
      await fireReady();
      const play = vi.fn();
      const waiting = vi.fn();
      media.addEventListener('play', play);
      media.addEventListener('waiting', waiting);

      // First time: BUFFERING should fire play (not yet playing).
      mockPlayerInstance._emit('onStateChange', 3); // BUFFERING
      expect(play).toHaveBeenCalledOnce();
      expect(waiting).not.toHaveBeenCalled();

      // Then PLAYING fires playing and starts interval.
      mockPlayerInstance._emit('onStateChange', 1); // PLAYING

      // Rebuffer: BUFFERING again should fire waiting.
      mockPlayerInstance._emit('onStateChange', 3); // BUFFERING
      expect(waiting).toHaveBeenCalledOnce();
    });

    it('PAUSED fires pause, sets paused=true, resets playFired', async () => {
      const { media } = setup();
      await fireReady();
      const handler = vi.fn();
      media.addEventListener('pause', handler);

      mockPlayerInstance._emit('onStateChange', 1); // PLAYING
      mockPlayerInstance._emit('onStateChange', 2); // PAUSED

      expect(handler).toHaveBeenCalledOnce();
      expect(media.paused).toBe(true);
    });

    it('ENDED fires pause + ended, sets ended=true', async () => {
      const { media } = setup();
      await fireReady();
      const pause = vi.fn();
      const ended = vi.fn();
      media.addEventListener('pause', pause);
      media.addEventListener('ended', ended);

      mockPlayerInstance._emit('onStateChange', 0); // ENDED

      expect(pause).toHaveBeenCalledOnce();
      expect(ended).toHaveBeenCalledOnce();
      expect(media.ended).toBe(true);
    });

    it('CUED sets readyState to 1', async () => {
      const { media } = setup();
      await fireReady();
      mockPlayerInstance._emit('onStateChange', 5); // CUED
      expect(media.readyState).toBe(1);
    });

    it('play event fires only once across BUFFERING → PLAYING', async () => {
      const { media } = setup();
      await fireReady();
      const play = vi.fn();
      media.addEventListener('play', play);

      mockPlayerInstance._emit('onStateChange', 3); // BUFFERING
      mockPlayerInstance._emit('onStateChange', 1); // PLAYING

      expect(play).toHaveBeenCalledOnce();
    });
  });

  describe('playback controls', () => {
    it('play() calls player.playVideo()', async () => {
      const { media } = setup();
      await fireReady();
      media.play();
      expect(mockPlayerInstance.playVideo).toHaveBeenCalledOnce();
    });

    it('pause() calls player.pauseVideo()', async () => {
      const { media } = setup();
      await fireReady();
      media.pause();
      expect(mockPlayerInstance.pauseVideo).toHaveBeenCalledOnce();
    });

    it('currentTime setter calls player.seekTo()', async () => {
      const { media } = setup();
      await fireReady();
      media.currentTime = 42;
      expect(mockPlayerInstance.seekTo).toHaveBeenCalledWith(42, true);
    });

    it('currentTime setter dispatches seeking', async () => {
      const { media } = setup();
      await fireReady();
      const handler = vi.fn();
      media.addEventListener('seeking', handler);
      media.currentTime = 10;
      expect(handler).toHaveBeenCalledOnce();
      expect(media.seeking).toBe(true);
    });

    it('seeking resolves to seeked on PAUSED state change', async () => {
      const { media } = setup();
      await fireReady();
      const seeked = vi.fn();
      media.addEventListener('seeked', seeked);

      media.currentTime = 30;
      expect(media.seeking).toBe(true);

      mockPlayerInstance._emit('onStateChange', 2); // PAUSED

      expect(seeked).toHaveBeenCalledOnce();
      expect(media.seeking).toBe(false);
    });

    it('seeking resolves to seeked on PLAYING state change', async () => {
      const { media } = setup();
      await fireReady();
      mockPlayerInstance._emit('onStateChange', 1); // first PLAYING → not seeking
      const seeked = vi.fn();
      media.addEventListener('seeked', seeked);

      media.currentTime = 30;
      mockPlayerInstance._emit('onStateChange', 1); // PLAYING after seek

      expect(seeked).toHaveBeenCalledOnce();
    });

    it('seeking resolves via timeout fallback', async () => {
      vi.useFakeTimers();
      const { media } = setup();
      await fireReady();
      const seeked = vi.fn();
      media.addEventListener('seeked', seeked);

      media.currentTime = 30;
      expect(seeked).not.toHaveBeenCalled();

      vi.advanceTimersByTime(600);
      expect(seeked).toHaveBeenCalledOnce();
      expect(media.seeking).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('volume / muted / playbackRate', () => {
    it('volume setter calls player.setVolume() with 0–100 scale', async () => {
      const { media } = setup();
      await fireReady();
      media.volume = 0.5;
      expect(mockPlayerInstance.setVolume).toHaveBeenCalledWith(50);
    });

    it('muted=true calls player.mute()', async () => {
      const { media } = setup();
      await fireReady();
      media.muted = true;
      expect(mockPlayerInstance.mute).toHaveBeenCalledOnce();
    });

    it('muted=false calls player.unMute()', async () => {
      const { media } = setup();
      await fireReady();
      media.muted = false;
      expect(mockPlayerInstance.unMute).toHaveBeenCalledOnce();
    });

    it('playbackRate setter calls player.setPlaybackRate()', async () => {
      const { media } = setup();
      await fireReady();
      media.playbackRate = 1.5;
      expect(mockPlayerInstance.setPlaybackRate).toHaveBeenCalledWith(1.5);
    });

    it('muted=true before attach is passed via embed URL mute param', () => {
      const media = new YouTubeMedia();
      media.muted = true;
      media.src = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const container = makeContainer();
      media.attach(container);
      expect(container.querySelector('iframe')!.src).toContain('mute=1');
    });

    it('onVolumeChange event updates cached volume', async () => {
      const { media } = setup();
      await fireReady();
      mockPlayerInstance.getVolume.mockReturnValue(60);
      mockPlayerInstance.isMuted.mockReturnValue(true);

      const handler = vi.fn();
      media.addEventListener('volumechange', handler);
      mockPlayerInstance._emit('onVolumeChange', 0);

      expect(media.volume).toBeCloseTo(0.6);
      expect(media.muted).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('playback rate event', () => {
    it('onPlaybackRateChange updates cached playbackRate and dispatches ratechange', async () => {
      const { media } = setup();
      await fireReady();
      mockPlayerInstance.getPlaybackRate.mockReturnValue(2);
      const handler = vi.fn();
      media.addEventListener('ratechange', handler);

      mockPlayerInstance._emit('onPlaybackRateChange', 0);

      expect(media.playbackRate).toBe(2);
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('error handling', () => {
    it('onError with code 100 sets error code 4 and dispatches error', async () => {
      const { media } = setup();
      await fireReady();
      const handler = vi.fn();
      media.addEventListener('error', handler);

      capturedConfig.events?.onError?.({ data: 100, target: mockPlayerInstance as unknown as YTPlayer });

      expect(media.error?.code).toBe(4);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('onError with code 5 sets error code 3', async () => {
      const { media } = setup();
      await fireReady();
      capturedConfig.events?.onError?.({ data: 5, target: mockPlayerInstance as unknown as YTPlayer });
      expect(media.error?.code).toBe(3);
    });

    it('API load failure sets error and dispatches error event', async () => {
      const { loadYouTubeApi } = await import('../api');
      vi.mocked(loadYouTubeApi).mockRejectedValueOnce(new Error('network'));

      const media = new YouTubeMedia();
      const handler = vi.fn();
      media.addEventListener('error', handler);
      media.src = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      media.attach(makeContainer());

      await new Promise<void>((r) => setTimeout(r, 0));

      expect(handler).toHaveBeenCalledOnce();
      expect(media.error?.code).toBe(4);
    });
  });

  describe('embed props that trigger remount', () => {
    it.each([
      ['controls', true],
      ['loop', true],
      ['playsinline', false],
      ['nocookie', true],
      ['autoplay', true],
    ] as const)('%s setter remounts the player', async (prop, newValue) => {
      const { media } = setup();
      await fireReady();
      const MockPlayer = vi.mocked(mockYT.Player);
      const callsBefore = MockPlayer.mock.calls.length;

      (media as unknown as Record<string, unknown>)[prop] = newValue;
      await Promise.resolve();

      expect(MockPlayer.mock.calls.length).toBe(callsBefore + 1);
    });

    it('setting a prop to its current value does not remount', async () => {
      const { media } = setup();
      await fireReady();
      const MockPlayer = vi.mocked(mockYT.Player);
      const callsBefore = MockPlayer.mock.calls.length;

      media.controls = youTubeMediaDefaultProps.controls;

      expect(MockPlayer.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('embed URL building', () => {
    it('includes exactly the required params (no deprecated ones)', () => {
      const { container } = setup();
      const src = container.querySelector('iframe')!.src;
      expect(src).toContain('enablejsapi=1');
      expect(src).toContain('rel=0');
      expect(src).toContain('iv_load_policy=3');
      expect(src).toContain('controls=0');
      expect(src).toContain('playsinline=1');
      // Deprecated params must be absent.
      expect(src).not.toContain('modestbranding');
      expect(src).not.toContain('showinfo');
      expect(src).not.toContain('cc_load_policy');
    });

    it('loop=true adds playlist=VIDEO_ID for single-video loop', () => {
      const media = new YouTubeMedia();
      media.loop = true;
      media.src = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      media.attach(makeContainer());
      const iframe = media.target!.querySelector('iframe')!;
      expect(iframe.src).toContain('loop=1');
      expect(iframe.src).toContain('playlist=dQw4w9WgXcQ');
    });

    it('controls=false adds controls=0', () => {
      const { container } = setup();
      expect(container.querySelector('iframe')!.src).toContain('controls=0');
    });

    it('extracts start time from t= param in URL', () => {
      const { container } = setup('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=2m51s');
      expect(container.querySelector('iframe')!.src).toContain('start=171');
    });

    it('playlist URL uses listType=playlist', () => {
      // A URL with only list= (no v=) hits the playlist branch.
      const { container } = setup('https://www.youtube.com/playlist?list=PLtest123');
      const iframeSrc = container.querySelector('iframe')!.src;
      expect(iframeSrc).toContain('listType=playlist');
      expect(iframeSrc).toContain('list=PLtest123');
    });
  });

  describe('CSS crop trick', () => {
    it('applies crop styles to iframe and overflow:hidden to container when controls=false', () => {
      const { container } = setup();
      const iframe = container.querySelector('iframe')!;
      expect(container.style.overflow).toBe('hidden');
      expect(iframe.style.position).toBe('absolute');
      expect(iframe.style.top).toBe('-60px');
      expect(iframe.style.left).toBe('0px');
      expect(iframe.style.width).toBe('100%');
      expect(iframe.style.height).toBe('calc(100% + 120px)');
    });

    it('does not crop and does not set overflow:hidden when controls=true', () => {
      const media = new YouTubeMedia();
      media.controls = true;
      media.src = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const container = makeContainer();
      media.attach(container);
      const iframe = container.querySelector('iframe')!;
      expect(container.style.overflow).not.toBe('hidden');
      expect(iframe.style.position).not.toBe('absolute');
      expect(iframe.style.top).not.toBe('-60px');
    });

    it('resets overflow when detaching', () => {
      const { media, container } = setup();
      expect(container.style.overflow).toBe('hidden');
      media.detach();
      expect(container.style.overflow).toBe('');
    });

    it('resets and reapplies overflow on remount', () => {
      const { media, container } = setup();
      expect(container.style.overflow).toBe('hidden');
      media.src = 'https://www.youtube.com/watch?v=9bZkp7q19f0';
      // After remount with controls still false, overflow is hidden again.
      expect(container.style.overflow).toBe('hidden');
    });
  });

  describe('picture-in-picture', () => {
    it('starts with isPictureInPicture=false', () => {
      const { media } = setup();
      expect(media.isPictureInPicture).toBe(false);
    });
  });
});
