import { parseGIF } from 'gifuct-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaError } from '../../../core/media-error';
import { isMediaVolumeCapable } from '../../../core/predicate';
import { GifMedia, gifMediaDefaultProps } from '..';

// The decoder is gifuct-js's job; these tests drive the media's state machine
// against a synthetic frame table instead of real GIF bytes.
const { decodeState } = vi.hoisted(() => ({
  decodeState: {
    gif: null as unknown,
    frames: [] as unknown[],
    parseError: null as Error | null,
  },
}));

vi.mock('gifuct-js', () => ({
  parseGIF: vi.fn(() => {
    if (decodeState.parseError) throw decodeState.parseError;
    return decodeState.gif;
  }),
  decompressFrames: vi.fn(() => decodeState.frames),
}));

const FRAME_COUNT = 4;
const FRAME_DELAY_MS = 100;

function makeFrames(count = FRAME_COUNT, delay = FRAME_DELAY_MS) {
  return Array.from({ length: count }, () => ({
    dims: { top: 0, left: 0, width: 2, height: 2 },
    delay,
    disposalType: 1,
    patch: new Uint8ClampedArray(2 * 2 * 4),
  }));
}

function stubFetch(impl?: () => Promise<unknown>) {
  const fetchMock = vi.fn(
    impl ??
      (async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      }))
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/**
 * Flush the microtasks a load's fetch/decode chain awaits, including the
 * dynamic import that pulls in the gifuct-js polyfill backend.
 */
async function flush(): Promise<void> {
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < 10; i++) await Promise.resolve();
    await vi.dynamicImportSettled();
  }
}

async function createLoadedMedia(): Promise<GifMedia> {
  const media = new GifMedia();
  media.src = 'https://example.com/animated.gif';
  await flush();
  return media;
}

function recordEvents(media: GifMedia, types: string[]): string[] {
  const seen: string[] = [];
  for (const type of types) {
    media.addEventListener(type as never, () => seen.push(type));
  }
  return seen;
}

beforeEach(() => {
  vi.useFakeTimers();
  decodeState.gif = { lsd: { width: 2, height: 2 } };
  decodeState.frames = makeFrames();
  decodeState.parseError = null;
  stubFetch();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('GifMedia', () => {
  it('starts with default props and no metadata', () => {
    const media = new GifMedia();
    expect(media.src).toBe(gifMediaDefaultProps.src);
    expect(media.paused).toBe(true);
    expect(media.duration).toBeNaN();
    expect(media.readyState).toBe(0);
    expect(media.videoWidth).toBe(0);
    expect(media.videoHeight).toBe(0);
    expect(media.buffered.length).toBe(0);
  });

  it('has no volume surface, so volume UI reads it as unavailable', () => {
    expect(isMediaVolumeCapable(new GifMedia())).toBe(false);
  });

  it('reports GIF sources as playable via canPlayType', () => {
    const media = new GifMedia();
    expect(media.canPlayType('image/gif')).toBe('probably');
    expect(media.canPlayType('image/GIF; something')).toBe('probably');
    expect(media.canPlayType('video/mp4')).toBe('');
    expect(media.canPlayType('image/gifv')).toBe('');
  });

  it('loads metadata when a source is set', async () => {
    const media = new GifMedia();
    const seen = recordEvents(media, [
      'loadstart',
      'durationchange',
      'loadedmetadata',
      'loadeddata',
      'canplay',
      'canplaythrough',
    ]);

    media.src = 'https://example.com/animated.gif';
    await flush();

    expect(seen).toEqual(['loadstart', 'durationchange', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough']);
    expect(media.duration).toBeCloseTo((FRAME_COUNT * FRAME_DELAY_MS) / 1000);
    expect(media.readyState).toBe(4);
    expect(media.videoWidth).toBe(2);
    expect(media.videoHeight).toBe(2);
    expect(media.currentSrc).toBe('https://example.com/animated.gif');
  });

  it('reports the full range as buffered and seekable once loaded', async () => {
    const media = await createLoadedMedia();
    expect(media.buffered.length).toBe(1);
    expect(media.buffered.start(0)).toBe(0);
    expect(media.buffered.end(0)).toBeCloseTo(0.4);
    expect(media.seekable.end(0)).toBeCloseTo(0.4);
  });

  it('does not fetch until playback with preload none', async () => {
    const fetchMock = stubFetch();
    const media = new GifMedia();
    media.preload = 'none';
    media.src = 'https://example.com/animated.gif';
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();

    const playing = media.play();
    await flush();
    await playing;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(media.paused).toBe(false);
  });

  it('plays through frames and ends without loop', async () => {
    const media = await createLoadedMedia();
    const seen = recordEvents(media, ['play', 'playing', 'ended']);

    await media.play();
    expect(seen).toEqual(['play', 'playing']);
    expect(media.paused).toBe(false);

    vi.advanceTimersByTime(FRAME_COUNT * FRAME_DELAY_MS + 10);

    expect(seen).toEqual(['play', 'playing', 'ended']);
    expect(media.ended).toBe(true);
    // Natural end pauses without a `pause` event, like native media.
    expect(media.paused).toBe(true);
    expect(media.currentTime).toBeCloseTo(media.duration);
  });

  it('wraps around instead of ending when loop is on', async () => {
    const media = await createLoadedMedia();
    media.loop = true;
    await media.play();

    vi.advanceTimersByTime(FRAME_COUNT * FRAME_DELAY_MS + FRAME_DELAY_MS / 2);

    expect(media.ended).toBe(false);
    expect(media.paused).toBe(false);
    expect(media.currentTime).toBeLessThan(media.duration);
  });

  it('restarts from the beginning when played after ending', async () => {
    const media = await createLoadedMedia();
    await media.play();
    vi.advanceTimersByTime(FRAME_COUNT * FRAME_DELAY_MS + 10);
    expect(media.ended).toBe(true);

    await media.play();
    expect(media.ended).toBe(false);
    expect(media.currentTime).toBeLessThan(media.duration);
  });

  it('pauses and resumes at the same position', async () => {
    const media = await createLoadedMedia();
    const seen = recordEvents(media, ['pause']);
    await media.play();

    vi.advanceTimersByTime(FRAME_DELAY_MS * 2);
    media.pause();

    expect(seen).toEqual(['pause']);
    expect(media.paused).toBe(true);
    const pausedAt = media.currentTime;
    expect(pausedAt).toBeCloseTo(0.2, 1);

    vi.advanceTimersByTime(FRAME_DELAY_MS * 2);
    expect(media.currentTime).toBe(pausedAt);
  });

  it('seeks to a time and dispatches seeking and seeked', async () => {
    const media = await createLoadedMedia();
    const seen = recordEvents(media, ['seeking', 'seeked', 'timeupdate']);

    media.currentTime = 0.25;

    expect(seen).toEqual(['seeking', 'seeked', 'timeupdate']);
    expect(media.currentTime).toBeCloseTo(0.25);
    expect(media.seeking).toBe(false);
  });

  it('clamps seeks to the seekable range', async () => {
    const media = await createLoadedMedia();
    media.currentTime = 99;
    expect(media.currentTime).toBeCloseTo(media.duration);
    media.currentTime = -5;
    expect(media.currentTime).toBe(0);
  });

  it('applies a seek set before metadata once frames arrive', async () => {
    const media = new GifMedia();
    media.currentTime = 0.25;
    expect(media.currentTime).toBe(0.25);

    media.src = 'https://example.com/animated.gif';
    await flush();

    expect(media.currentTime).toBeCloseTo(0.25);
  });

  it('scales frame timing by playbackRate', async () => {
    const media = await createLoadedMedia();
    const seen = recordEvents(media, ['ratechange']);
    media.playbackRate = 2;
    expect(seen).toEqual(['ratechange']);

    await media.play();
    // At 2x, the 400ms of frames elapse in 200ms of wall clock.
    vi.advanceTimersByTime(FRAME_COUNT * (FRAME_DELAY_MS / 2) + 10);
    expect(media.ended).toBe(true);
  });

  it('rejects play() without a source', async () => {
    const media = new GifMedia();
    await expect(media.play()).rejects.toMatchObject({ name: 'NotSupportedError' });
  });

  it('reports a network MediaError when the fetch fails', async () => {
    stubFetch(async () => {
      throw new Error('offline');
    });
    const media = new GifMedia();
    const seen = recordEvents(media, ['error']);

    media.src = 'https://example.com/animated.gif';
    await flush();

    expect(seen).toEqual(['error']);
    expect(media.error).toMatchObject({ code: MediaError.MEDIA_ERR_NETWORK });
    expect(media.readyState).toBe(0);
  });

  it('reports a decode MediaError when parsing fails', async () => {
    decodeState.parseError = new Error('not a gif');
    const media = new GifMedia();
    const seen = recordEvents(media, ['error']);

    media.src = 'https://example.com/animated.gif';
    await flush();

    expect(seen).toEqual(['error']);
    expect(media.error).toMatchObject({ code: MediaError.MEDIA_ERR_DECODE });
  });

  it('rejects play() when loading fails', async () => {
    stubFetch(async () => {
      throw new Error('offline');
    });
    const media = new GifMedia();
    media.preload = 'none';
    media.src = 'https://example.com/animated.gif';
    await flush();

    const playing = media.play();
    playing.catch(() => {});
    await flush();
    await expect(playing).rejects.toMatchObject({ name: 'NotSupportedError' });
  });

  it('empties state when the source is replaced', async () => {
    const media = await createLoadedMedia();
    const seen = recordEvents(media, ['emptied']);
    await media.play();
    vi.advanceTimersByTime(FRAME_DELAY_MS);

    media.src = '';
    await flush();

    expect(seen).toEqual(['emptied']);
    expect(media.duration).toBeNaN();
    expect(media.currentTime).toBe(0);
    expect(media.paused).toBe(true);
    expect(media.readyState).toBe(0);
    expect(media.currentSrc).toBe('');
  });

  it('starts playback once loaded when autoplay is set', async () => {
    const media = new GifMedia();
    media.autoplay = true;
    media.src = 'https://example.com/animated.gif';
    await flush();

    expect(media.paused).toBe(false);
  });

  it('sizes an attached canvas to the GIF dimensions', async () => {
    const media = await createLoadedMedia();
    const canvas = document.createElement('canvas');
    // jsdom has no 2D context; rendering is skipped while sizing still applies.
    canvas.getContext = () => null;
    media.attach(canvas);
    expect(canvas.width).toBe(2);
    expect(canvas.height).toBe(2);
    expect(media.target).toBe(canvas);

    media.detach();
    expect(media.target).toBeNull();
  });

  it('normalizes near-zero frame delays the way browsers do', async () => {
    decodeState.frames = makeFrames(2, 0);
    const media = await createLoadedMedia();
    // Two zero-delay frames snap to 100ms each.
    expect(media.duration).toBeCloseTo(0.2);
  });

  it('tracks played ranges while playing', async () => {
    const media = await createLoadedMedia();
    await media.play();
    vi.advanceTimersByTime(FRAME_DELAY_MS * 3);
    media.pause();

    const played = media.played;
    expect(played.length).toBe(1);
    expect(played.start(0)).toBe(0);
    expect(played.end(0)).toBeGreaterThan(0);
  });

  describe('with WebCodecs ImageDecoder available', () => {
    function makeVideoFrame(durationUs: number) {
      return {
        displayWidth: 2,
        displayHeight: 2,
        duration: durationUs,
        close: vi.fn(),
      };
    }

    beforeEach(() => {
      class FakeImageDecoder {
        static isTypeSupported = vi.fn(async (type: string) => type === 'image/gif');
        tracks = { ready: Promise.resolve(), selectedTrack: { frameCount: FRAME_COUNT } };
        completed = Promise.resolve();
        decode = vi.fn(async () => ({ image: makeVideoFrame(FRAME_DELAY_MS * 1000) }));
        close = vi.fn();
      }
      vi.stubGlobal('ImageDecoder', FakeImageDecoder);
    });

    it('prefers the native decoder over the gifuct-js polyfill', async () => {
      const media = await createLoadedMedia();

      expect(media.duration).toBeCloseTo((FRAME_COUNT * FRAME_DELAY_MS) / 1000);
      expect(media.videoWidth).toBe(2);
      expect(media.videoHeight).toBe(2);
      expect(vi.mocked(parseGIF)).not.toHaveBeenCalled();
    });

    it('plays through frames and ends on the native path', async () => {
      const media = await createLoadedMedia();
      const seen = recordEvents(media, ['ended']);

      await media.play();
      vi.advanceTimersByTime(FRAME_COUNT * FRAME_DELAY_MS + 10);

      expect(seen).toEqual(['ended']);
      expect(media.ended).toBe(true);
    });

    it('paints decoded frames onto the attached canvas', async () => {
      const media = await createLoadedMedia();
      const ctx = { clearRect: vi.fn(), drawImage: vi.fn() };
      const canvas = document.createElement('canvas');
      canvas.getContext = (() => ctx) as unknown as typeof canvas.getContext;

      media.attach(canvas);
      await flush();

      expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    });
  });
});
