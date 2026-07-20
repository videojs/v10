import { describe, expect, it, vi } from 'vitest';
import { buildVimeoIframeSrc, parseVimeoSource, parseVimeoVideoId, VimeoMedia, vimeoMediaDefaultProps } from '..';

vi.mock('@vimeo/player', () => {
  class MockPlayer {
    static instances: MockPlayer[] = [];
    target: unknown;
    handlers = new Map<string, Set<(data: unknown) => void>>();
    destroyed = false;

    play = vi.fn(async () => {});
    pause = vi.fn(async () => {});
    setVolume = vi.fn(async (v: number) => v);
    setMuted = vi.fn(async (v: boolean) => v);
    setCurrentTime = vi.fn(async (s: number) => s);
    setPlaybackRate = vi.fn(async (r: number) => r);
    setLoop = vi.fn(async (v: boolean) => v);
    loadVideo = vi.fn(async () => {});
    unload = vi.fn(async () => {});
    requestFullscreen = vi.fn(async () => {});
    exitFullscreen = vi.fn(async () => {});
    requestPictureInPicture = vi.fn(async () => {});
    exitPictureInPicture = vi.fn(async () => {});
    enableTextTrack = vi.fn(async () => {});
    disableTextTrack = vi.fn(async () => {});
    getMuted = vi.fn(async () => false);
    getVolume = vi.fn(async () => 1);
    getDuration = vi.fn(async () => 60);
    getCurrentTime = vi.fn(async () => 0);
    getTextTracks = vi.fn(async () => [] as unknown[]);
    destroy = vi.fn(async () => {
      this.destroyed = true;
    });

    constructor(target: unknown) {
      this.target = target;
      MockPlayer.instances.push(this);
    }

    on(event: string, handler: (data: unknown) => void): void {
      let set = this.handlers.get(event);
      if (!set) {
        set = new Set();
        this.handlers.set(event, set);
      }
      set.add(handler);
    }

    off(event: string, handler?: (data: unknown) => void): void {
      const set = this.handlers.get(event);
      if (!set) return;
      if (handler) set.delete(handler);
      else set.clear();
    }

    emit(event: string, data: unknown = {}): void {
      this.handlers.get(event)?.forEach((handler) => handler(data));
    }
  }

  return { default: MockPlayer };
});

function createIframe(): HTMLIFrameElement {
  return document.createElement('iframe');
}

async function waitForVimeoLoaded(media: VimeoMedia): Promise<void> {
  if (media.readyState >= 1 && Number.isFinite(media.duration)) return;
  await new Promise<void>((resolve) => {
    media.addEventListener('loadcomplete', () => resolve(), { once: true });
  });
}

async function attachAndLoad(media: VimeoMedia): Promise<{ iframe: HTMLIFrameElement; player: MockPlayerLike }> {
  const iframe = createIframe();
  media.attach(iframe);
  const player = media.engine as unknown as MockPlayerLike;
  player.emit('loaded');
  await waitForVimeoLoaded(media);
  return { iframe, player };
}

interface MockPlayerLike {
  emit(event: string, data?: unknown): void;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  setVolume: ReturnType<typeof vi.fn>;
  setMuted: ReturnType<typeof vi.fn>;
  setCurrentTime: ReturnType<typeof vi.fn>;
  setPlaybackRate: ReturnType<typeof vi.fn>;
  setLoop: ReturnType<typeof vi.fn>;
  loadVideo: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

describe('parseVimeoVideoId', () => {
  it('extracts numeric id from numeric string', () => {
    expect(parseVimeoVideoId('76979871')).toBe(76979871);
  });

  it('extracts id from vimeo.com URL', () => {
    expect(parseVimeoVideoId('https://vimeo.com/76979871')).toBe(76979871);
  });

  it('extracts id from player.vimeo.com URL', () => {
    expect(parseVimeoVideoId('https://player.vimeo.com/video/76979871')).toBe(76979871);
  });

  it('extracts id from vimeo.com/video URL', () => {
    expect(parseVimeoVideoId('https://vimeo.com/video/76979871')).toBe(76979871);
  });

  it('returns null for empty input', () => {
    expect(parseVimeoVideoId('')).toBe(null);
  });

  it('returns null for non-Vimeo URLs', () => {
    expect(parseVimeoVideoId('https://example.com/video.mp4')).toBe(null);
  });
});

describe('parseVimeoSource', () => {
  it('detects events', () => {
    expect(parseVimeoSource('https://vimeo.com/event/12345')).toEqual({ id: 12345, kind: 'event', hash: null });
  });

  it('extracts h param from query string', () => {
    expect(parseVimeoSource('https://vimeo.com/12345?h=abc')).toEqual({ id: 12345, kind: 'video', hash: 'abc' });
  });

  it('extracts hash from event path', () => {
    expect(parseVimeoSource('https://vimeo.com/event/12345/abc')).toEqual({ id: 12345, kind: 'event', hash: 'abc' });
  });
});

describe('buildVimeoIframeSrc', () => {
  it('builds embed URL from id with default playsinline and hidden controls', () => {
    const src = buildVimeoIframeSrc('76979871');
    expect(src).toContain('https://player.vimeo.com/video/76979871');
    expect(src).toContain('playsinline=1');
    expect(src).toContain('preload=metadata');
    expect(src).toContain('controls=0');
  });

  it('encodes autoplay, defaultMuted, loop', () => {
    const src = buildVimeoIframeSrc('76979871', {
      autoplay: true,
      defaultMuted: true,
      loop: true,
    });
    expect(src).toContain('autoplay=1');
    expect(src).toContain('muted=1');
    expect(src).toContain('loop=1');
  });

  it('disables controls by default and when controls=false', () => {
    expect(buildVimeoIframeSrc('76979871', { controls: false })).toContain('controls=0');
  });

  it('shows Vimeo controls when controls=true', () => {
    const src = buildVimeoIframeSrc('76979871', { controls: true });
    expect(src).not.toContain('controls=0');
  });

  it('forwards preload and Vimeo-specific config knobs', () => {
    const src = buildVimeoIframeSrc('76979871', { preload: 'auto', config: { autopause: true } });
    expect(src).toContain('preload=auto');
    expect(src).toContain('autopause=1');
  });

  it('embeds h hash for unlisted videos', () => {
    expect(buildVimeoIframeSrc('https://vimeo.com/12345?h=secret')).toContain('h=secret');
  });

  it('builds event embed URL with hashPath', () => {
    const src = buildVimeoIframeSrc('https://vimeo.com/event/123/abc');
    expect(src).toContain('https://vimeo.com/event/123/embed/abc');
    expect(src).not.toContain('h=');
  });

  it('merges arbitrary config into params', () => {
    const src = buildVimeoIframeSrc('76979871', { config: { background: true, byline: false } });
    expect(src).toContain('background=1');
    expect(src).toContain('byline=0');
  });

  it('returns empty string for invalid src', () => {
    expect(buildVimeoIframeSrc('not-a-vimeo-url')).toBe('');
  });
});

describe('VimeoMedia', () => {
  it('has expected default state before attach', () => {
    const media = new VimeoMedia();
    expect(media.engine).toBe(null);
    expect(media.target).toBe(null);
    expect(media.paused).toBe(true);
    expect(media.ended).toBe(false);
    expect(media.currentTime).toBe(0);
    expect(media.duration).toBeNaN();
    expect(media.src).toBe(vimeoMediaDefaultProps.src);
    expect(media.buffered.length).toBe(0);
    expect(media.played.length).toBeGreaterThanOrEqual(1);
  });

  it('creates a Player when attached to an iframe', () => {
    const media = new VimeoMedia();
    const iframe = createIframe();
    media.attach(iframe);

    expect(media.target).toBe(iframe);
    expect(media.engine).not.toBe(null);
  });

  it('emits loadstart on attach and loadedmetadata/loadcomplete after loaded', async () => {
    const media = new VimeoMedia();
    const events: string[] = [];
    for (const type of ['loadstart', 'loadedmetadata', 'loadcomplete', 'durationchange'] as const) {
      media.addEventListener(type, () => events.push(type));
    }

    const { player } = await attachAndLoad(media);
    expect(events).toContain('loadstart');
    expect(events).toContain('loadedmetadata');
    expect(events).toContain('loadcomplete');
    expect(events).toContain('durationchange');
    expect(media.duration).toBe(60);

    // Re-emit doesn't re-fire load events:
    events.length = 0;
    player.emit('timeupdate', { seconds: 1, duration: 60 });
    expect(events).toEqual([]);
  });

  it('updates state from player events', async () => {
    const media = new VimeoMedia();
    const { player } = await attachAndLoad(media);

    const playSpy = vi.fn();
    media.addEventListener('play', playSpy);
    player.emit('play', { seconds: 0, duration: 60, percent: 0 });
    expect(media.paused).toBe(false);
    expect(playSpy).toHaveBeenCalled();

    player.emit('timeupdate', { seconds: 12.5, duration: 60, percent: 0.2 });
    expect(media.currentTime).toBe(12.5);
    expect(media.duration).toBe(60);

    player.emit('progress', { seconds: 30 });
    expect(media.buffered.length).toBe(1);
    expect(media.buffered.end(0)).toBe(30);

    player.emit('resize', { videoWidth: 1280, videoHeight: 720 });
    expect(media.videoWidth).toBe(1280);
    expect(media.videoHeight).toBe(720);

    player.emit('volumechange', { volume: 0.25 });
    expect(media.volume).toBe(0.25);

    player.emit('pause', { seconds: 12.5, duration: 60, percent: 0.2 });
    expect(media.paused).toBe(true);

    player.emit('ended', { seconds: 60, duration: 60, percent: 1 });
    expect(media.ended).toBe(true);
  });

  it('forwards play() and pause() to the player', async () => {
    const media = new VimeoMedia();
    const { player } = await attachAndLoad(media);

    await media.play();
    expect(player.play).toHaveBeenCalledTimes(1);

    media.pause();
    expect(player.pause).toHaveBeenCalledTimes(1);
  });

  it('forwards setters to the player after load', async () => {
    const media = new VimeoMedia();
    const { player } = await attachAndLoad(media);

    media.currentTime = 30;
    media.volume = 0.5;
    media.muted = true;
    media.playbackRate = 1.5;
    media.loop = true;

    // setters defer via loadComplete microtask — flush.
    await Promise.resolve();
    await Promise.resolve();

    expect(player.setCurrentTime).toHaveBeenCalledWith(30);
    expect(player.setVolume).toHaveBeenCalledWith(0.5);
    expect(player.setMuted).toHaveBeenCalledWith(true);
    expect(player.setPlaybackRate).toHaveBeenCalledWith(1.5);
    expect(player.setLoop).toHaveBeenCalledWith(true);
  });

  it('calls loadVideo when src changes after attach', async () => {
    const media = new VimeoMedia();
    const { player } = await attachAndLoad(media);
    player.loadVideo.mockClear();

    media.src = '76979871';
    await Promise.resolve();
    expect(player.loadVideo).toHaveBeenCalledWith({ url: 'https://player.vimeo.com/video/76979871' });
  });

  it('forwards fullscreen and pip requests', async () => {
    const media = new VimeoMedia();
    const { player } = await attachAndLoad(media);

    await media.requestFullscreen();
    await media.exitFullscreen();
    await media.requestPictureInPicture();
    await media.exitPictureInPicture();

    expect((player as unknown as { requestFullscreen: ReturnType<typeof vi.fn> }).requestFullscreen).toHaveBeenCalled();
    expect((player as unknown as { exitFullscreen: ReturnType<typeof vi.fn> }).exitFullscreen).toHaveBeenCalled();
    expect(
      (player as unknown as { requestPictureInPicture: ReturnType<typeof vi.fn> }).requestPictureInPicture
    ).toHaveBeenCalled();
    expect(
      (player as unknown as { exitPictureInPicture: ReturnType<typeof vi.fn> }).exitPictureInPicture
    ).toHaveBeenCalled();
  });

  it('tracks played ranges via the played-ranges mixin', async () => {
    const media = new VimeoMedia();
    const { player } = await attachAndLoad(media);

    player.emit('play', {});
    player.emit('timeupdate', { seconds: 1 });
    player.emit('timeupdate', { seconds: 2 });
    player.emit('timeupdate', { seconds: 3 });
    player.emit('pause', {});

    const played = media.played;
    expect(played.length).toBe(1);
    expect(played.start(0)).toBe(0);
    expect(played.end(0)).toBe(3);
  });

  it('destroys the player on detach', () => {
    const media = new VimeoMedia();
    const iframe = createIframe();
    media.attach(iframe);
    const player = media.engine as unknown as MockPlayerLike;

    media.detach();
    expect(player.destroy).toHaveBeenCalled();
    expect(media.target).toBe(null);
    expect(media.engine).toBe(null);
  });
});
