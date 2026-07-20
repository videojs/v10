import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildYouTubeIframeSrc,
  parseYouTubeSource,
  parseYouTubeVideoId,
  YouTubeMedia,
  youtubeMediaDefaultProps,
} from '..';

vi.mock(import('@videojs/utils/dom'), async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, loadScript: vi.fn(async () => {}) };
});

interface StateChangeEvent {
  data: number;
}

interface MockPlayerEvents {
  onReady?: () => void;
  onError?: (event: StateChangeEvent) => void;
}

class MockPlayer {
  static instances: MockPlayer[] = [];
  target: unknown;
  events: MockPlayerEvents | undefined;
  listeners = new Map<string, Set<(event: StateChangeEvent) => void>>();

  playVideo = vi.fn();
  pauseVideo = vi.fn();
  seekTo = vi.fn();
  mute = vi.fn();
  unMute = vi.fn();
  isMuted = vi.fn(() => false);
  setVolume = vi.fn();
  getVolume = vi.fn(() => 100);
  getDuration = vi.fn(() => 60);
  getCurrentTime = vi.fn(() => 0);
  getPlaybackRate = vi.fn(() => 1);
  setPlaybackRate = vi.fn();
  getVideoLoadedFraction = vi.fn(() => 0);
  getPlayerState = vi.fn(() => -1);
  loadVideoById = vi.fn();
  cueVideoById = vi.fn();
  loadPlaylist = vi.fn();
  cuePlaylist = vi.fn();
  getOption = vi.fn(() => []);
  setOption = vi.fn();
  destroy = vi.fn();

  constructor(target: unknown, options?: { events?: MockPlayerEvents }) {
    this.target = target;
    this.events = options?.events;
    MockPlayer.instances.push(this);
  }

  addEventListener(type: string, listener: (event: StateChangeEvent) => void): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  emit(type: string, data = 0): void {
    this.listeners.get(type)?.forEach((listener) => listener({ data }));
  }

  ready(): void {
    this.events?.onReady?.();
  }
}

// https://developers.google.com/youtube/iframe_api_reference#onStateChange
const STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

beforeEach(() => {
  MockPlayer.instances.length = 0;
  vi.stubGlobal('YT', {
    Player: MockPlayer,
    ready: (callback: () => void) => callback(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function createIframe(): HTMLIFrameElement {
  return document.createElement('iframe');
}

async function waitForEngine(media: YouTubeMedia): Promise<MockPlayer> {
  await vi.waitFor(() => {
    if (!media.engine) throw new Error('player not created yet');
  });
  return media.engine as unknown as MockPlayer;
}

async function attachAndLoad(media: YouTubeMedia): Promise<{ iframe: HTMLIFrameElement; player: MockPlayer }> {
  const iframe = createIframe();
  media.attach(iframe);
  const player = await waitForEngine(media);
  player.ready();
  return { iframe, player };
}

describe('parseYouTubeVideoId', () => {
  it('extracts id from a raw 11-character id', () => {
    expect(parseYouTubeVideoId('aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');
  });

  it('extracts id from watch URL', () => {
    expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');
  });

  it('extracts id from youtu.be short link', () => {
    expect(parseYouTubeVideoId('https://youtu.be/aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');
  });

  it('extracts id from embed, shorts, and live URLs', () => {
    expect(parseYouTubeVideoId('https://www.youtube.com/embed/aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');
    expect(parseYouTubeVideoId('https://www.youtube.com/shorts/aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');
    expect(parseYouTubeVideoId('https://www.youtube.com/live/aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');
  });

  it('extracts id from nocookie host', () => {
    expect(parseYouTubeVideoId('https://www.youtube-nocookie.com/watch?v=aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');
  });

  it('returns null for empty input', () => {
    expect(parseYouTubeVideoId('')).toBe(null);
  });

  it('returns null for non-YouTube URLs', () => {
    expect(parseYouTubeVideoId('https://example.com/video.mp4')).toBe(null);
  });
});

describe('parseYouTubeSource', () => {
  it('detects playlists', () => {
    expect(parseYouTubeSource('https://www.youtube.com/playlist?list=PLv3TTBr1W_9tppikBxAE_G6qjWdBljBHJ')).toEqual({
      id: null,
      kind: 'playlist',
      listId: 'PLv3TTBr1W_9tppikBxAE_G6qjWdBljBHJ',
      startTime: null,
      noCookie: false,
    });
  });

  it('keeps the video id when a watch URL also has a list param', () => {
    const parsed = parseYouTubeSource('https://www.youtube.com/watch?v=aqz-KE-bpKQ&list=PLv3TTBr1W_9tppikBxAE');
    expect(parsed?.kind).toBe('video');
    expect(parsed?.id).toBe('aqz-KE-bpKQ');
    expect(parsed?.listId).toBe('PLv3TTBr1W_9tppikBxAE');
  });

  it('parses start times in t param formats', () => {
    expect(parseYouTubeSource('https://youtu.be/aqz-KE-bpKQ?t=171')?.startTime).toBe(171);
    expect(parseYouTubeSource('https://youtu.be/aqz-KE-bpKQ?t=171s')?.startTime).toBe(171);
    expect(parseYouTubeSource('https://youtu.be/aqz-KE-bpKQ?t=2m51s')?.startTime).toBe(171);
    expect(parseYouTubeSource('https://youtu.be/aqz-KE-bpKQ?t=2m')?.startTime).toBe(120);
  });

  it('detects the nocookie host', () => {
    expect(parseYouTubeSource('https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ')?.noCookie).toBe(true);
  });
});

describe('buildYouTubeIframeSrc', () => {
  it('builds embed URL with default playsinline, hidden controls, and jsapi enabled', () => {
    const src = buildYouTubeIframeSrc('https://www.youtube.com/watch?v=aqz-KE-bpKQ');
    expect(src).toContain('https://www.youtube.com/embed/aqz-KE-bpKQ');
    expect(src).toContain('playsinline=1');
    expect(src).toContain('preload=metadata');
    expect(src).toContain('controls=0');
    expect(src).toContain('enablejsapi=1');
  });

  it('encodes autoplay, defaultMuted, loop', () => {
    const src = buildYouTubeIframeSrc('aqz-KE-bpKQ', {
      autoplay: true,
      defaultMuted: true,
      loop: true,
    });
    expect(src).toContain('autoplay=1');
    expect(src).toContain('mute=1');
    expect(src).toContain('loop=1');
  });

  it('shows YouTube controls when controls=true', () => {
    const src = buildYouTubeIframeSrc('aqz-KE-bpKQ', { controls: true });
    expect(src).not.toContain('controls=0');
  });

  it('forwards preload and YouTube-specific config knobs', () => {
    const src = buildYouTubeIframeSrc('aqz-KE-bpKQ', { preload: 'auto', config: { cc_load_policy: 1 } });
    expect(src).toContain('preload=auto');
    expect(src).toContain('cc_load_policy=1');
  });

  it('embeds start time from the t param', () => {
    expect(buildYouTubeIframeSrc('https://youtu.be/aqz-KE-bpKQ?t=2m51s')).toContain('start=171');
  });

  it('uses the nocookie embed base for nocookie sources', () => {
    expect(buildYouTubeIframeSrc('https://www.youtube-nocookie.com/watch?v=aqz-KE-bpKQ')).toContain(
      'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ'
    );
  });

  it('builds playlist embed URL', () => {
    const src = buildYouTubeIframeSrc('https://www.youtube.com/playlist?list=PLv3TTBr1W_9tppikBxAE');
    expect(src).toContain('https://www.youtube.com/embed?');
    expect(src).toContain('listType=playlist');
    expect(src).toContain('list=PLv3TTBr1W_9tppikBxAE');
  });

  it('returns empty string for invalid src', () => {
    expect(buildYouTubeIframeSrc('not-a-youtube-url')).toBe('');
  });
});

describe('YouTubeMedia', () => {
  it('has expected default state before attach', () => {
    const media = new YouTubeMedia();
    expect(media.engine).toBe(null);
    expect(media.target).toBe(null);
    expect(media.paused).toBe(true);
    expect(media.ended).toBe(false);
    expect(media.currentTime).toBe(0);
    expect(media.duration).toBeNaN();
    expect(media.src).toBe(youtubeMediaDefaultProps.src);
    expect(media.buffered.length).toBe(0);
    expect(media.played.length).toBeGreaterThanOrEqual(1);
  });

  it('sets the initial iframe src and creates a player when attached', async () => {
    const media = new YouTubeMedia();
    media.src = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
    const iframe = createIframe();
    media.attach(iframe);

    expect(iframe.src).toContain('https://www.youtube.com/embed/aqz-KE-bpKQ');
    expect(media.target).toBe(iframe);

    await waitForEngine(media);
    expect(media.engine).not.toBe(null);
    media.detach();
  });

  it('emits loadstart on attach and loadedmetadata/loadcomplete after ready', async () => {
    const media = new YouTubeMedia();
    const events: string[] = [];
    for (const type of ['loadstart', 'loadedmetadata', 'loadcomplete', 'durationchange'] as const) {
      media.addEventListener(type, () => events.push(type));
    }

    await attachAndLoad(media);
    expect(events).toContain('loadstart');
    expect(events).toContain('loadedmetadata');
    expect(events).toContain('loadcomplete');
    expect(events).toContain('durationchange');
    expect(media.duration).toBe(60);
    expect(media.readyState).toBeGreaterThanOrEqual(1);
    media.detach();
  });

  it('updates state from player state changes', async () => {
    const media = new YouTubeMedia();
    const { player } = await attachAndLoad(media);

    const playSpy = vi.fn();
    const waitingSpy = vi.fn();
    media.addEventListener('play', playSpy);
    media.addEventListener('waiting', waitingSpy);

    player.emit('onStateChange', STATE.BUFFERING);
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(waitingSpy).toHaveBeenCalledTimes(1);
    expect(media.paused).toBe(false);

    player.emit('onStateChange', STATE.PLAYING);
    expect(media.paused).toBe(false);
    expect(media.readyState).toBe(3);
    // play only fires once per playback start
    expect(playSpy).toHaveBeenCalledTimes(1);

    player.getVolume.mockReturnValue(25);
    player.emit('onVolumeChange');
    expect(media.volume).toBe(0.25);

    player.getPlaybackRate.mockReturnValue(1.5);
    player.emit('onPlaybackRateChange');
    expect(media.playbackRate).toBe(1.5);

    player.emit('onStateChange', STATE.PAUSED);
    expect(media.paused).toBe(true);

    player.emit('onStateChange', STATE.ENDED);
    expect(media.ended).toBe(true);
    expect(media.paused).toBe(true);
    media.detach();
  });

  it('forwards play() and pause() to the player', async () => {
    const media = new YouTubeMedia();
    const { player } = await attachAndLoad(media);

    await media.play();
    expect(player.playVideo).toHaveBeenCalledTimes(1);

    media.pause();
    expect(player.pauseVideo).toHaveBeenCalledTimes(1);
    media.detach();
  });

  it('replays on ended when loop is set', async () => {
    const media = new YouTubeMedia();
    media.loop = true;
    const { player } = await attachAndLoad(media);

    player.emit('onStateChange', STATE.ENDED);
    await Promise.resolve();
    await Promise.resolve();
    expect(player.playVideo).toHaveBeenCalled();
    media.detach();
  });

  it('forwards setters to the player after load', async () => {
    const media = new YouTubeMedia();
    const { player } = await attachAndLoad(media);

    media.currentTime = 30;
    media.volume = 0.5;
    media.muted = true;
    media.playbackRate = 1.5;

    // setters defer via loadComplete microtask — flush.
    await Promise.resolve();
    await Promise.resolve();

    expect(player.seekTo).toHaveBeenCalledWith(30, true);
    expect(player.setVolume).toHaveBeenCalledWith(50);
    expect(player.mute).toHaveBeenCalled();
    expect(player.setPlaybackRate).toHaveBeenCalledWith(1.5);
    media.detach();
  });

  it('cues the new video when src changes after attach', async () => {
    const media = new YouTubeMedia();
    media.src = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
    const iframe = createIframe();
    media.attach(iframe);
    const player = await waitForEngine(media);
    player.ready();

    media.src = 'https://youtu.be/dQw4w9WgXcQ?t=10';
    await Promise.resolve();
    expect(player.cueVideoById).toHaveBeenCalledWith({ videoId: 'dQw4w9WgXcQ', startSeconds: 10 });

    // A post-load state change completes the reload.
    const loadCompleteSpy = vi.fn();
    media.addEventListener('loadcomplete', loadCompleteSpy);
    player.emit('onStateChange', STATE.CUED);
    expect(loadCompleteSpy).toHaveBeenCalledTimes(1);
    media.detach();
  });

  it('loads (instead of cueing) the new video when autoplay is set', async () => {
    const media = new YouTubeMedia();
    media.autoplay = true;
    media.src = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
    const iframe = createIframe();
    media.attach(iframe);
    const player = await waitForEngine(media);
    player.ready();

    media.src = 'https://youtu.be/dQw4w9WgXcQ';
    await Promise.resolve();
    expect(player.loadVideoById).toHaveBeenCalledWith({ videoId: 'dQw4w9WgXcQ' });
    media.detach();
  });

  it('surfaces player errors', async () => {
    const media = new YouTubeMedia();
    const iframe = createIframe();
    media.attach(iframe);
    const player = await waitForEngine(media);

    const errorSpy = vi.fn();
    media.addEventListener('error', errorSpy);
    player.events?.onError?.({ data: 150 });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(media.error).toMatchObject({ code: 150 });
    media.detach();
  });

  it('tracks played ranges via the played-ranges mixin', async () => {
    const media = new YouTubeMedia();
    const { player } = await attachAndLoad(media);

    player.emit('onStateChange', STATE.PLAYING);
    // Advance time in sub-0.1s steps so polling reports timeupdate, not a seek.
    player.getCurrentTime.mockReturnValue(0.08);
    await vi.waitFor(() => {
      if (media.currentTime !== 0.08) throw new Error('time not polled yet');
    });
    player.getCurrentTime.mockReturnValue(0.16);
    await vi.waitFor(() => {
      if (media.currentTime !== 0.16) throw new Error('time not polled yet');
    });
    player.emit('onStateChange', STATE.PAUSED);

    const played = media.played;
    expect(played.length).toBe(1);
    expect(played.start(0)).toBe(0);
    expect(played.end(0)).toBe(0.16);
    media.detach();
  });

  it('destroys the player on detach', async () => {
    const media = new YouTubeMedia();
    const { player } = await attachAndLoad(media);

    media.detach();
    expect(player.destroy).toHaveBeenCalled();
    expect(media.target).toBe(null);
    expect(media.engine).toBe(null);
  });

  it('does not create a player when detached before the API resolves', async () => {
    const media = new YouTubeMedia();
    const iframe = createIframe();
    media.attach(iframe);
    media.detach();

    // Flush the async player creation path.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(media.engine).toBe(null);
  });
});
