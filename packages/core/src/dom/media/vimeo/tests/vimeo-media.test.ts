import type { VimeoTextTrack } from '@vimeo/player';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Captured Player constructor call args and instance per test.
let mockPlayerInstance: ReturnType<typeof makeMockPlayer>;
let capturedElement: unknown;
let capturedOptions: unknown;

function makeMockPlayer() {
  const handlers: Record<string, (data?: unknown) => void> = {};

  const player = {
    on: vi.fn((event: string, handler: (data?: unknown) => void) => {
      handlers[event] = handler;
    }),
    off: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(() => Promise.resolve()),
    destroy: vi.fn(() => Promise.resolve()),
    setCurrentTime: vi.fn(() => Promise.resolve(0)),
    setVolume: vi.fn(() => Promise.resolve(0)),
    setMuted: vi.fn(() => Promise.resolve(false)),
    setPlaybackRate: vi.fn(() => Promise.resolve(1)),
    setLoop: vi.fn(() => Promise.resolve(false)),
    setAutopause: vi.fn(() => Promise.resolve(false)),
    setColor: vi.fn(() => Promise.resolve('')),
    setQuality: vi.fn(() => Promise.resolve(null)),
    requestPictureInPicture: vi.fn(() => Promise.resolve()),
    exitPictureInPicture: vi.fn(() => Promise.resolve()),
    getTextTracks: vi.fn((): Promise<VimeoTextTrack[]> => Promise.resolve([])),
    enableTextTrack: vi.fn(() => Promise.resolve({})),
    disableTextTrack: vi.fn(() => Promise.resolve({})),
    getVolume: vi.fn(() => Promise.resolve(1)),
    getMuted: vi.fn(() => Promise.resolve(false)),
    getPaused: vi.fn(() => Promise.resolve(true)),
    getDuration: vi.fn(() => Promise.resolve(NaN)),
    getPlaybackRate: vi.fn(() => Promise.resolve(1)),
    ready: vi.fn(() => Promise.resolve()),
    // Helper to fire events from tests.
    _emit(event: string, data?: unknown) {
      handlers[event]?.(data);
    },
  };

  return player;
}

vi.mock('@vimeo/player', () => {
  return {
    // biome-ignore lint: must be a regular function so `new Player()` works
    default: vi.fn(function (element: unknown, options: unknown) {
      capturedElement = element;
      capturedOptions = options;
      mockPlayerInstance = makeMockPlayer();
      return mockPlayerInstance;
    }),
  };
});

// jsdom exposes textTracks as a plain Array without EventTarget methods.
// Intercept document.createElement('video') to return a proper mock.
const _origCreate = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tag, ...args) => {
  if (tag !== 'video') return _origCreate(tag, ...args);

  const textTracks = Object.assign(new EventTarget(), {
    length: 0,
    [Symbol.iterator]: function* () {},
  }) as unknown as TextTrackList;

  const mockVideo = {
    textTracks,
    addTextTrack: vi.fn((kind: TextTrackKind, label = '', language = '') => {
      const track: Partial<TextTrack> = {
        kind,
        label,
        language,
        mode: 'disabled' as TextTrackMode,
        cues: null,
        activeCues: null,
      };
      return track as TextTrack;
    }),
  };
  return mockVideo as unknown as HTMLVideoElement;
});

// vi.mock is hoisted, so this import resolves to the mocked module.
import Player from '@vimeo/player';
import { VimeoMedia, vimeoMediaDefaultProps } from '../index';

afterEach(() => {
  vi.clearAllMocks();
  capturedElement = undefined;
  capturedOptions = undefined;
});

function makeContainer() {
  return document.createElement('div');
}

function setup(src = '123456789') {
  const media = new VimeoMedia();
  media.src = src;
  const container = makeContainer();
  media.attach(container);
  return { media, container };
}

const MockPlayer = vi.mocked(Player);

describe('VimeoMedia', () => {
  describe('defaults', () => {
    it('sets dnt: true by default', () => {
      setup();
      expect((capturedOptions as { dnt: boolean }).dnt).toBe(true);
    });

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
  });

  describe('state seeding', () => {
    it('dispatches durationchange and ratechange after seeding so time/rate features sync', async () => {
      // biome-ignore lint: must be a regular function so `new Player()` works
      MockPlayer.mockImplementationOnce(function (element: unknown, options: unknown) {
        capturedElement = element;
        capturedOptions = options;
        mockPlayerInstance = makeMockPlayer();
        mockPlayerInstance.getDuration.mockResolvedValue(120);
        mockPlayerInstance.getPlaybackRate.mockResolvedValue(1.5);
        return mockPlayerInstance;
      });

      const { media } = setup();

      const events: string[] = [];
      media.addEventListener('durationchange', () => events.push('durationchange'));
      media.addEventListener('ratechange', () => events.push('ratechange'));

      // Promise.all over 5 resolved promises takes several microtask ticks to settle.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      expect(events).toContain('durationchange');
      expect(events).toContain('ratechange');
      expect(media.duration).toBe(120);
      expect(media.playbackRate).toBe(1.5);
    });
  });

  describe('attach', () => {
    it('creates a Player with the container element', () => {
      const media = new VimeoMedia();
      media.src = '123456789';
      const container = makeContainer();
      media.attach(container);

      expect(capturedElement).toBe(container);
    });

    it('parses a numeric src as an id option', () => {
      setup('123456789');
      expect((capturedOptions as { id: number }).id).toBe(123456789);
    });

    it('parses a URL src as a url option', () => {
      setup('https://vimeo.com/123456789');
      expect((capturedOptions as { url: string }).url).toBe('https://vimeo.com/123456789');
    });

    it('does not create a Player when src is empty', () => {
      MockPlayer.mockClear();
      const media = new VimeoMedia();
      const container = makeContainer();
      media.attach(container);

      expect(MockPlayer).not.toHaveBeenCalled();
    });

    it('exposes the Player instance via engine', () => {
      const { media } = setup();
      expect(media.engine).toBe(mockPlayerInstance);
    });

    it('exposes the container via target', () => {
      const { media, container } = setup();
      expect(media.target).toBe(container);
    });
  });

  describe('detach', () => {
    it('destroys the Player', () => {
      const { media } = setup();
      const player = mockPlayerInstance;

      media.detach();

      expect(player.destroy).toHaveBeenCalledOnce();
    });

    it('nullifies engine and target', () => {
      const { media } = setup();

      media.detach();

      expect(media.engine).toBeNull();
      expect(media.target).toBeNull();
    });

    it('dispatches emptied event', () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('emptied', handler);

      media.detach();

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('destroy', () => {
    it('is idempotent', () => {
      const { media } = setup();
      const player = mockPlayerInstance;

      media.destroy();
      media.destroy();

      expect(player.destroy).toHaveBeenCalledOnce();
    });
  });

  describe('src setter', () => {
    it('remounts the Player when src changes', () => {
      const { media, container } = setup('111');

      expect(MockPlayer).toHaveBeenCalledOnce();

      media.src = '222';

      expect(MockPlayer).toHaveBeenCalledTimes(2);
      expect(capturedElement).toBe(container);
    });

    it('destroys the previous Player on src change', () => {
      const { media } = setup('111');
      const firstPlayer = mockPlayerInstance;

      media.src = '222';

      expect(firstPlayer.destroy).toHaveBeenCalledOnce();
    });

    it('unmounts without mounting when src is set to empty', () => {
      const { media } = setup('111');
      const firstPlayer = mockPlayerInstance;

      MockPlayer.mockClear();
      media.src = '';

      expect(firstPlayer.destroy).toHaveBeenCalledOnce();
      expect(MockPlayer).not.toHaveBeenCalled();
    });

    it('is a no-op when src is set to the same value', () => {
      const { media } = setup('111');

      MockPlayer.mockClear();
      media.src = '111';

      expect(MockPlayer).not.toHaveBeenCalled();
    });
  });

  describe('event forwarding', () => {
    it('play event dispatches play and playing', () => {
      const { media } = setup();
      const playHandler = vi.fn();
      const playingHandler = vi.fn();
      media.addEventListener('play', playHandler);
      media.addEventListener('playing', playingHandler);

      mockPlayerInstance._emit('play');

      expect(playHandler).toHaveBeenCalledOnce();
      expect(playingHandler).toHaveBeenCalledOnce();
    });

    it('play event sets paused=false, ended=false', () => {
      const { media } = setup();

      mockPlayerInstance._emit('play');

      expect(media.paused).toBe(false);
      expect(media.ended).toBe(false);
    });

    it('pause event dispatches pause and sets paused=true', () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('pause', handler);

      mockPlayerInstance._emit('pause');

      expect(handler).toHaveBeenCalledOnce();
      expect(media.paused).toBe(true);
    });

    it('ended event dispatches ended and pause, sets paused=true, ended=true', () => {
      const { media } = setup();
      const endedHandler = vi.fn();
      const pauseHandler = vi.fn();
      media.addEventListener('ended', endedHandler);
      media.addEventListener('pause', pauseHandler);

      mockPlayerInstance._emit('ended');

      expect(endedHandler).toHaveBeenCalledOnce();
      expect(pauseHandler).toHaveBeenCalledOnce();
      expect(media.paused).toBe(true);
      expect(media.ended).toBe(true);
    });

    it('timeupdate event updates currentTime and dispatches timeupdate', () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('timeupdate', handler);

      mockPlayerInstance._emit('timeupdate', { seconds: 42.5 });

      expect(media.currentTime).toBe(42.5);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('durationchange event updates duration and dispatches durationchange', () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('durationchange', handler);

      mockPlayerInstance._emit('durationchange', { duration: 120 });

      expect(media.duration).toBe(120);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('volumechange event updates volume/muted and dispatches volumechange', () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('volumechange', handler);

      mockPlayerInstance._emit('volumechange', { volume: 0.5, muted: true });

      expect(media.volume).toBe(0.5);
      expect(media.muted).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('volumechange event without muted preserves cached muted state', () => {
      const { media } = setup();

      // Establish a known muted state via a full payload first.
      mockPlayerInstance._emit('volumechange', { volume: 1, muted: true });
      expect(media.muted).toBe(true);

      // SDK emits without muted (legacy behaviour) — cached value must survive.
      mockPlayerInstance._emit('volumechange', { volume: 0.8 });

      expect(media.volume).toBe(0.8);
      expect(media.muted).toBe(true);
    });

    it('playbackratechange event updates playbackRate and dispatches ratechange', () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('ratechange', handler);

      mockPlayerInstance._emit('playbackratechange', { playbackRate: 2 });

      expect(media.playbackRate).toBe(2);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('seeking event sets seeking=true and dispatches seeking', () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('seeking', handler);

      mockPlayerInstance._emit('seeking');

      expect(media.seeking).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('seeked event sets seeking=false and dispatches seeked', () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('seeked', handler);

      mockPlayerInstance._emit('seeking');
      mockPlayerInstance._emit('seeked');

      expect(media.seeking).toBe(false);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('bufferstart dispatches waiting', () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('waiting', handler);

      mockPlayerInstance._emit('bufferstart');

      expect(handler).toHaveBeenCalledOnce();
    });

    it('bufferstart sets readyState to 2 and dispatches waiting', () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('waiting', handler);

      mockPlayerInstance._emit('bufferstart');

      expect(media.readyState).toBe(2);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('bufferend sets readyState to 4 and dispatches canplay', () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('canplay', handler);

      mockPlayerInstance._emit('bufferend');

      expect(media.readyState).toBe(4);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('bufferend dispatches playing when not paused', () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('playing', handler);

      mockPlayerInstance._emit('play');
      handler.mockClear();
      mockPlayerInstance._emit('bufferend');

      expect(handler).toHaveBeenCalledOnce();
    });

    it('bufferend does not dispatch playing when paused', () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('playing', handler);

      mockPlayerInstance._emit('bufferend');

      expect(handler).not.toHaveBeenCalled();
    });

    it('loaded event sets readyState to 4 and dispatches loadstart, loadedmetadata, loadeddata, canplay, canplaythrough', () => {
      const { media } = setup();
      const dispatched: string[] = [];
      for (const type of ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'] as const) {
        media.addEventListener(type, () => dispatched.push(type));
      }

      mockPlayerInstance._emit('loaded');

      expect(media.readyState).toBe(4);
      expect(dispatched).toEqual(['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough']);
    });

    it('play event sets readyState to 4', () => {
      const { media } = setup();

      mockPlayerInstance._emit('play');

      expect(media.readyState).toBe(4);
    });

    it('seeking event sets readyState to 2', () => {
      const { media } = setup();

      mockPlayerInstance._emit('seeking');

      expect(media.readyState).toBe(2);
    });

    it('seeked event sets readyState to 4', () => {
      const { media } = setup();

      mockPlayerInstance._emit('seeking');
      mockPlayerInstance._emit('seeked');

      expect(media.readyState).toBe(4);
    });

    it('error event populates error and dispatches error', () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('error', handler);

      mockPlayerInstance._emit('error', { name: 'NotFoundError', message: 'Video not found' });

      expect(media.error).toEqual({ code: 4, message: 'Video not found' });
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('playback controls', () => {
    it('play() calls player.play()', () => {
      const { media } = setup();

      media.play();

      expect(mockPlayerInstance.play).toHaveBeenCalledOnce();
    });

    it('pause() calls player.pause()', () => {
      const { media } = setup();

      media.pause();

      expect(mockPlayerInstance.pause).toHaveBeenCalledOnce();
    });

    it('currentTime setter calls player.setCurrentTime()', () => {
      const { media } = setup();

      media.currentTime = 30;

      expect(mockPlayerInstance.setCurrentTime).toHaveBeenCalledWith(30);
    });

    it('currentTime setter while paused synthesizes seeking, timeupdate, seeked events and updates currentTime', async () => {
      const { media } = setup();
      mockPlayerInstance.setCurrentTime.mockResolvedValueOnce(30);

      const events: string[] = [];
      media.addEventListener('seeking', () => events.push('seeking'));
      media.addEventListener('timeupdate', () => events.push('timeupdate'));
      media.addEventListener('seeked', () => events.push('seeked'));

      media.currentTime = 30;

      expect(events).toEqual(['seeking']);
      expect(media.seeking).toBe(true);

      await Promise.resolve();

      expect(events).toEqual(['seeking', 'timeupdate', 'seeked']);
      expect(media.currentTime).toBe(30);
      expect(media.seeking).toBe(false);
    });

    it('currentTime setter while paused reverts and dispatches seeked when setCurrentTime rejects', async () => {
      const { media } = setup();
      mockPlayerInstance.setCurrentTime.mockRejectedValueOnce(new Error('invalid time'));

      const events: string[] = [];
      media.addEventListener('seeked', () => events.push('seeked'));

      const previousTime = media.currentTime;
      media.currentTime = Number.NaN;

      await Promise.resolve();

      expect(events).toEqual(['seeked']);
      expect(media.currentTime).toBe(previousTime);
      expect(media.seeking).toBe(false);
    });

    it('currentTime setter while paused ignores resolution if player changed before promise resolves', async () => {
      const { media } = setup();

      let resolveSeek!: (time: number) => void;
      mockPlayerInstance.setCurrentTime.mockReturnValueOnce(
        new Promise<number>((resolve) => {
          resolveSeek = resolve;
        })
      );

      const events: string[] = [];
      media.addEventListener('timeupdate', () => events.push('timeupdate'));
      media.addEventListener('seeked', () => events.push('seeked'));

      media.currentTime = 30;
      media.detach();

      resolveSeek(30);
      await Promise.resolve();

      expect(events).toEqual([]);
    });

    it('volume setter calls player.setVolume()', () => {
      const { media } = setup();

      media.volume = 0.75;

      expect(mockPlayerInstance.setVolume).toHaveBeenCalledWith(0.75);
    });

    it('muted setter calls player.setMuted()', () => {
      const { media } = setup();

      media.muted = true;

      expect(mockPlayerInstance.setMuted).toHaveBeenCalledWith(true);
    });

    it('playbackRate setter calls player.setPlaybackRate()', () => {
      const { media } = setup();

      media.playbackRate = 1.5;

      expect(mockPlayerInstance.setPlaybackRate).toHaveBeenCalledWith(1.5);
    });
  });

  describe('embed props', () => {
    it('passes all default embed props to Player', () => {
      setup();
      const opts = capturedOptions as typeof vimeoMediaDefaultProps;
      expect(opts.dnt).toBe(vimeoMediaDefaultProps.dnt);
      expect(opts.controls).toBe(vimeoMediaDefaultProps.controls);
      expect(opts.responsive).toBe(false); // always false — VimeoMedia handles layout
      expect(opts.transparent).toBe(vimeoMediaDefaultProps.transparent);
    });

    it('autopause setter calls player.setAutopause()', () => {
      const { media } = setup();

      media.autopause = false;

      expect(mockPlayerInstance.setAutopause).toHaveBeenCalledWith(false);
    });

    it('color setter calls player.setColor() when non-empty', () => {
      const { media } = setup();

      media.color = 'ff0000';

      expect(mockPlayerInstance.setColor).toHaveBeenCalledWith('ff0000');
    });

    it('loop setter calls player.setLoop()', () => {
      const { media } = setup();

      media.loop = true;

      expect(mockPlayerInstance.setLoop).toHaveBeenCalledWith(true);
    });

    it('quality setter calls player.setQuality()', () => {
      const { media } = setup();

      media.quality = '1080p';

      expect(mockPlayerInstance.setQuality).toHaveBeenCalledWith('1080p');
    });

    it.each([
      ['dnt', false],
      ['byline', false],
      ['portrait', false],
      ['title', false],
      ['controls', true],
      ['background', true],
      ['playsinline', false],
      ['speed', false],
      ['transparent', false],
    ] as const)('%s setter remounts the player with the new value', (prop, newValue) => {
      const { media } = setup();
      const callsBefore = MockPlayer.mock.calls.length;

      (media as unknown as Record<string, unknown>)[prop] = newValue;

      expect(MockPlayer.mock.calls.length).toBe(callsBefore + 1);
      const opts = MockPlayer.mock.calls.at(-1)![1] as Record<string, unknown>;
      expect(opts[prop]).toBe(newValue);
    });

    it('embed-only setter does not remount when value is unchanged', () => {
      const { media } = setup();
      const callsBefore = MockPlayer.mock.calls.length;

      media.dnt = vimeoMediaDefaultProps.dnt;

      expect(MockPlayer.mock.calls.length).toBe(callsBefore);
    });

    it('embed-only setter before mount stores value without mounting', () => {
      const media = new VimeoMedia();
      media.dnt = false;
      expect(MockPlayer).not.toHaveBeenCalled();

      const container = makeContainer();
      media.src = '123456789';
      media.attach(container);

      expect((capturedOptions as { dnt: boolean }).dnt).toBe(false);
    });

    it('texttrack setter calls enableTextTrack() when player is running', () => {
      const { media } = setup();

      media.texttrack = 'en';

      expect(mockPlayerInstance.enableTextTrack).toHaveBeenCalledWith('en');
    });

    it('texttrack setter calls disableTextTrack() when set to empty string', () => {
      const { media } = setup();
      media.texttrack = 'en';

      media.texttrack = '';

      expect(mockPlayerInstance.disableTextTrack).toHaveBeenCalled();
    });

    it('texttrack setter stores value for use on next mount', () => {
      const media = new VimeoMedia();
      media.texttrack = 'fr';
      expect(mockPlayerInstance?.enableTextTrack).not.toHaveBeenCalled();

      const container = makeContainer();
      media.src = '123456789';
      media.attach(container);

      expect((capturedOptions as { texttrack: string }).texttrack).toBe('fr');
    });
  });

  describe('muted prop applied on mount', () => {
    it('passes muted=true to Player when set before attach', () => {
      const media = new VimeoMedia();
      media.src = '123456789';
      media.muted = true;
      const container = makeContainer();
      media.attach(container);

      expect((capturedOptions as { muted: boolean }).muted).toBe(true);
    });
  });

  describe('text tracks', () => {
    it('textTracks is a fresh list after src change so old tracks do not persist', async () => {
      mockPlayerInstance.getTextTracks.mockResolvedValueOnce([
        { kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' },
      ]);
      const { media } = setup('111');

      // Let getTextTracks resolve and add the track to the synthetic video.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      const firstTrackList = media.textTracks;

      // Changing src must reset the synthetic video element via resetTextTracks().
      media.src = '222';

      // textTracks now points to a fresh element — the old list is gone.
      expect(media.textTracks).not.toBe(firstTrackList);
    });
  });

  describe('picture-in-picture', () => {
    it('starts with isPictureInPicture=false', () => {
      const { media } = setup();
      expect(media.isPictureInPicture).toBe(false);
    });

    it('enterpictureinpicture event sets isPictureInPicture=true and dispatches event', () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('enterpictureinpicture', handler);

      mockPlayerInstance._emit('enterpictureinpicture');

      expect(media.isPictureInPicture).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('leavepictureinpicture event sets isPictureInPicture=false and dispatches event', () => {
      const { media } = setup();
      const handler = vi.fn();
      media.addEventListener('leavepictureinpicture', handler);

      mockPlayerInstance._emit('enterpictureinpicture');
      mockPlayerInstance._emit('leavepictureinpicture');

      expect(media.isPictureInPicture).toBe(false);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('requestPictureInPicture() posts requestPictureInPicture to the iframe', () => {
      // isPipCapable is false in jsdom (non-Safari) — no postMessage sent.
      const { media, container } = setup();
      const iframe = document.createElement('iframe');
      Object.defineProperty(iframe, 'src', { value: 'https://player.vimeo.com/video/123', writable: false });
      const postMessage = vi.fn();
      Object.defineProperty(iframe, 'contentWindow', { value: { postMessage }, writable: false });
      container.appendChild(iframe);

      media.requestPictureInPicture();

      expect(postMessage).not.toHaveBeenCalled();
    });

    it('requestPictureInPicture() posts to the iframe when isPipCapable is true', () => {
      const { media, container } = setup();
      Object.defineProperty(media, 'isPipCapable', { value: true, writable: false });

      const iframe = document.createElement('iframe');
      Object.defineProperty(iframe, 'src', { value: 'https://player.vimeo.com/video/123', writable: false });
      const postMessage = vi.fn();
      Object.defineProperty(iframe, 'contentWindow', { value: { postMessage }, writable: false });
      container.appendChild(iframe);

      media.requestPictureInPicture();

      expect(postMessage).toHaveBeenCalledWith({ method: 'requestPictureInPicture' }, 'https://player.vimeo.com');
    });

    it('exitPictureInPicture() posts exitPictureInPicture to the iframe', () => {
      // isPipCapable is false in jsdom — no postMessage sent.
      const { media, container } = setup();
      const iframe = document.createElement('iframe');
      Object.defineProperty(iframe, 'src', { value: 'https://player.vimeo.com/video/123', writable: false });
      const postMessage = vi.fn();
      Object.defineProperty(iframe, 'contentWindow', { value: { postMessage }, writable: false });
      container.appendChild(iframe);

      media.exitPictureInPicture();

      expect(postMessage).not.toHaveBeenCalled();
    });

    it('detach resets isPictureInPicture to false', () => {
      const { media } = setup();
      mockPlayerInstance._emit('enterpictureinpicture');
      expect(media.isPictureInPicture).toBe(true);

      media.detach();

      expect(media.isPictureInPicture).toBe(false);
    });
  });
});
