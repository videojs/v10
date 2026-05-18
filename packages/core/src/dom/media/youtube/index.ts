import { IframeMediaHost } from '../iframe-host';
import { loadYouTubeApi, type YTCaptionTrack, type YTNamespace, type YTPlayer } from './api';

// -- Embed URL helpers --

const EMBED_BASE = 'https://www.youtube.com/embed';
const EMBED_BASE_NOCOOKIE = 'https://www.youtube-nocookie.com/embed';

const VIDEO_RE =
  /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))((\w|-){11})/;
const PLAYLIST_RE = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/.*?[?&]list=)([\w_-]+)/;

// YouTube player state values (mirrors YT.PlayerState).
const YTState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

function parseStartTime(src: string): number | undefined {
  const match = src.match(/[?&]t=([\dms]+)/i);
  if (!match?.[1]) return undefined;
  const val = match[1].toLowerCase();
  let total = 0;
  let found = false;
  const m = val.match(/(\d+)m/);
  if (m?.[1]) {
    total += parseInt(m[1], 10) * 60;
    found = true;
  }
  const s = val.match(/(\d+)s?$/);
  if (s?.[1]) {
    total += parseInt(s[1], 10);
    found = true;
  }
  return found ? total : undefined;
}

interface EmbedOptions {
  autoplay: boolean;
  controls: boolean;
  loop: boolean;
  muted: boolean;
  playsinline: boolean;
  start: number;
}

function buildEmbedUrl(src: string, nocookie: boolean, opts: EmbedOptions): string {
  const base = nocookie ? EMBED_BASE_NOCOOKIE : EMBED_BASE;
  const startTime = parseStartTime(src) ?? (opts.start > 0 ? opts.start : undefined);

  const params: Record<string, number | string | undefined> = {
    enablejsapi: 1,
    rel: 0,
    iv_load_policy: 3,
    controls: opts.controls ? 1 : 0,
    playsinline: opts.playsinline ? 1 : 0,
    autoplay: opts.autoplay ? 1 : undefined,
    loop: opts.loop ? 1 : undefined,
    mute: opts.muted ? 1 : undefined,
    start: startTime,
  };

  const videoMatch = src.match(VIDEO_RE);
  if (videoMatch) {
    const videoId = videoMatch[1];
    // YouTube requires playlist=VIDEO_ID alongside loop=1 for single videos.
    if (opts.loop) params.playlist = videoId;
    return `${base}/${videoId}?${serializeParams(params)}`;
  }

  const listMatch = src.match(PLAYLIST_RE);
  if (listMatch) {
    params.listType = 'playlist';
    params.list = listMatch[1];
    return `${base}?${serializeParams(params)}`;
  }

  // Fallback: treat src as a raw video ID or embed path.
  return `${base}/${src}?${serializeParams(params)}`;
}

function serializeParams(params: Record<string, number | string | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

function youTubeErrorMessage(code: number): string {
  switch (code) {
    case 2:
      return 'Invalid parameter value';
    case 5:
      return 'HTML5 player error';
    case 100:
      return 'Video not found (private or deleted)';
    case 101:
    case 150:
      return 'Embedding not allowed by video owner';
    default:
      return 'Unknown error';
  }
}

// -- YouTubeMedia --

export interface YouTubeMediaProps {
  /** YouTube video URL, video ID, playlist URL, shorts URL, or live URL. */
  src: string;
  autoplay: boolean;
  /** Show the YouTube native controls. Defaults to `false` (use Video.js controls). */
  controls: boolean;
  loop: boolean;
  muted: boolean;
  playsinline: boolean;
  /**
   * Use `youtube-nocookie.com` for the embed domain to reduce tracking cookies.
   * Defaults to `false` (opt-in).
   */
  nocookie: boolean;
  /** Start playback at this offset in seconds. Overridden by a `t=` parameter in the URL. */
  start: number;
}

export const youTubeMediaDefaultProps: YouTubeMediaProps = {
  src: '',
  autoplay: false,
  controls: false,
  loop: false,
  muted: false,
  playsinline: true,
  nocookie: false,
  start: 0,
};

export class YouTubeMedia extends IframeMediaHost<YTPlayer> implements YouTubeMediaProps {
  // Local typed reference — kept in sync with base `engine` via `updateEngine`.
  #player: YTPlayer | null = null;
  #iframe: HTMLIFrameElement | null = null;
  // Aborts the in-progress async mount when unmount/remount is triggered.
  #mountAbort: AbortController | null = null;
  // Polls currentTime and buffered while playing (YouTube has no native timeupdate event).
  #timeupdateInterval: ReturnType<typeof setInterval> | null = null;
  // Seek synthesis state.
  #seekPending = false;
  #seekTimeoutId: ReturnType<typeof setTimeout> | null = null;
  // Tracks whether play() has been dispatched for the current play session.
  #playFired = false;

  // Embed props
  #src = youTubeMediaDefaultProps.src;
  #autoplay = youTubeMediaDefaultProps.autoplay;
  #controls = youTubeMediaDefaultProps.controls;
  #loop = youTubeMediaDefaultProps.loop;
  #playsinline = youTubeMediaDefaultProps.playsinline;
  #nocookie = youTubeMediaDefaultProps.nocookie;
  #start = youTubeMediaDefaultProps.start;

  // -- Source --

  // Overrides `protected abstract get src()` with public access, satisfying
  // both the base class contract and YouTubeMediaProps.
  get src(): string {
    return this.#src;
  }

  set src(value: string) {
    if (this.#src === value) return;
    this.#src = value;
    const container = this.target;
    if (!container) return;
    if (value) this.mount(container);
    else this.unmount();
  }

  get currentSrc() {
    return this.#src;
  }

  // -- Playback --

  play() {
    this.#player?.playVideo();
    return Promise.resolve();
  }

  pause() {
    this.#player?.pauseVideo();
    return Promise.resolve();
  }

  // -- Seek --

  get currentTime() {
    return super.currentTime;
  }

  set currentTime(value: number) {
    if (!this.#player) return;
    // Cancel any pending seek timeout before starting a new one.
    if (this.#seekTimeoutId !== null) {
      clearTimeout(this.#seekTimeoutId);
      this.#seekTimeoutId = null;
    }
    this.#seekPending = true;
    this.updateState({ currentTime: value, seeking: true });
    this.dispatchEvent(new Event('seeking'));
    this.#player.seekTo(value, true);
    // Fallback: if no state change fires within 600 ms (e.g. seek to already-buffered
    // position while paused), dispatch seeked to avoid the consumer hanging.
    const player = this.#player;
    this.#seekTimeoutId = setTimeout(() => {
      this.#seekTimeoutId = null;
      if (!this.#seekPending || this.#player !== player) return;
      this.#resolveSeeked();
    }, 600);
  }

  // -- Volume / playback rate delegates --

  protected onSetVolume(value: number) {
    // YouTube volume is 0–100; our API is 0–1.
    this.#player?.setVolume(value * 100);
  }

  protected onSetMuted(value: boolean) {
    if (value) this.#player?.mute();
    else this.#player?.unMute();
  }

  protected onSetPlaybackRate(value: number) {
    this.#player?.setPlaybackRate(value);
  }

  // -- Embed props --

  get autoplay() {
    return this.#autoplay;
  }
  set autoplay(value: boolean) {
    if (this.#autoplay === value) return;
    this.#autoplay = value;
    if (this.#player) this.mount(this.target!);
  }

  get controls() {
    return this.#controls;
  }
  set controls(value: boolean) {
    if (this.#controls === value) return;
    this.#controls = value;
    if (this.#player) this.mount(this.target!);
  }

  get loop() {
    return this.#loop;
  }
  set loop(value: boolean) {
    if (this.#loop === value) return;
    this.#loop = value;
    if (this.#player) this.mount(this.target!);
  }

  get playsinline() {
    return this.#playsinline;
  }
  set playsinline(value: boolean) {
    if (this.#playsinline === value) return;
    this.#playsinline = value;
    if (this.#player) this.mount(this.target!);
  }

  get nocookie() {
    return this.#nocookie;
  }
  set nocookie(value: boolean) {
    if (this.#nocookie === value) return;
    this.#nocookie = value;
    if (this.#player) this.mount(this.target!);
  }

  get start() {
    return this.#start;
  }
  set start(value: number) {
    this.#start = value;
    // start is embed-only; no runtime API to update without remounting.
  }

  // -- Protected lifecycle --

  protected mount(container: HTMLElement) {
    this.unmount();
    if (!this.#src) return;

    const abort = new AbortController();
    this.#mountAbort = abort;

    // Create the iframe immediately so the browser begins fetching the embed
    // before the YT IFrame API script finishes loading.
    const iframe = document.createElement('iframe');
    iframe.src = buildEmbedUrl(this.#src, this.#nocookie, {
      autoplay: this.#autoplay,
      controls: this.#controls,
      loop: this.#loop,
      muted: this.muted,
      playsinline: this.#playsinline,
      start: this.#start,
    });
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.setAttribute('allowfullscreen', '');
    iframe.style.border = 'none';

    if (!this.#controls) {
      // CSS crop trick — hides the YouTube title bar (top) and branding bar (bottom)
      // that appear even without native controls. Extend the iframe 60 px beyond each
      // edge and clip it with overflow:hidden so the visible area stays 16:9.
      container.style.overflow = 'hidden';
      iframe.style.position = 'absolute';
      iframe.style.top = '-60px';
      iframe.style.left = '0';
      iframe.style.width = '100%';
      iframe.style.height = 'calc(100% + 120px)';
    } else {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.display = 'block';
    }

    container.appendChild(iframe);
    this.#iframe = iframe;

    this.#mountAsync(iframe, abort.signal).catch(() => {});
  }

  protected unmount() {
    this.#mountAbort?.abort();
    this.#mountAbort = null;

    // Reset crop styles applied in mount() so a remount with controls=true works cleanly.
    const container = this.target;
    if (container) container.style.overflow = '';

    this.#stopTimeupdateInterval();
    this.#cancelSeek();

    this.#playFired = false;

    if (this.#player) {
      this.resetTextTracks();
      this.#player.destroy();
      this.#player = null;
      this.updateEngine(null);
    }

    this.#iframe?.remove();
    this.#iframe = null;

    this.resetState();
  }

  // -- Private --

  async #mountAsync(iframe: HTMLIFrameElement, signal: AbortSignal): Promise<void> {
    let yt: YTNamespace;
    try {
      yt = await loadYouTubeApi();
    } catch {
      if (signal.aborted) return;
      this.updateState({
        error: { code: 4, message: 'Failed to load YouTube IFrame API' },
      });
      this.dispatchEvent(new Event('error'));
      return;
    }

    if (signal.aborted) return;

    this.#player = new yt.Player(iframe, {
      events: {
        onReady: () => {
          const p = this.#player;
          if (signal.aborted || !p) return;
          this.#onPlayerReady(p);
        },
        onError: (e) => {
          if (signal.aborted || !this.#player) return;
          this.#onPlayerError(e.data);
        },
      },
    });

    const mountedPlayer = this.#player;
    this.updateEngine(mountedPlayer);
    this.#subscribePlayer(mountedPlayer, yt, signal);

    // Dispatch loadstart now that the iframe is in the DOM and the player is wired up.
    this.dispatchEvent(new Event('loadstart'));
  }

  #onPlayerReady(player: YTPlayer) {
    const volume = player.getVolume() / 100;
    const muted = player.isMuted();
    const duration = player.getDuration();
    const playbackRate = player.getPlaybackRate();

    this.updateState({ volume, muted, duration, playbackRate, readyState: 1 });
    this.dispatchEvent(new Event('loadedmetadata'));
    this.dispatchEvent(new Event('durationchange'));
    this.dispatchEvent(new Event('volumechange'));

    // Re-apply volume if the caller set it before the player was ready.
    if (this.volume !== volume) player.setVolume(this.volume * 100);

    this.#refreshCaptionTracks(player);
    this.#setupTextTrackListener(player);
  }

  #onPlayerError(code: number) {
    // Map YouTube error codes to MediaError codes.
    // 2 (invalid param), 5 (HTML5 error) → MEDIA_ERR_DECODE = 3
    // 100 (not found), 101/150 (embed disallowed) → MEDIA_ERR_SRC_NOT_SUPPORTED = 4
    const mediaCode = code === 2 || code === 5 ? 3 : 4;
    this.updateState({
      error: {
        code: mediaCode,
        message: `YouTube error ${code}: ${youTubeErrorMessage(code)}`,
      },
    });
    this.dispatchEvent(new Event('error'));
  }

  #subscribePlayer(player: YTPlayer, yt: YTNamespace, signal: AbortSignal) {
    player.addEventListener('onStateChange', (e) => {
      if (signal.aborted || this.#player !== player) return;
      this.#onStateChange(e.data, player, yt);
    });

    player.addEventListener('onPlaybackRateChange', () => {
      if (signal.aborted || this.#player !== player) return;
      this.updateState({ playbackRate: player.getPlaybackRate() });
      this.dispatchEvent(new Event('ratechange'));
    });

    // onVolumeChange is widely supported but undocumented in the official API.
    player.addEventListener('onVolumeChange', () => {
      if (signal.aborted || this.#player !== player) return;
      this.updateState({ volume: player.getVolume() / 100, muted: player.isMuted() });
      this.dispatchEvent(new Event('volumechange'));
    });
  }

  #onStateChange(state: number, player: YTPlayer, yt: YTNamespace) {
    // Capture before the combined play/buffer check mutates #playFired so the
    // BUFFERING branch can distinguish "first buffer" from "rebuffering".
    const wasAlreadyPlaying = this.#playFired;

    if (state === YTState.PLAYING || state === yt.PlayerState.BUFFERING) {
      if (!this.#playFired && !this.#seekPending) {
        this.#playFired = true;
        this.updateState({ paused: false, ended: false });
        this.dispatchEvent(new Event('play'));
      }
    }

    if (state === YTState.PLAYING) {
      this.#refreshCaptionTracks(player);

      if (this.#seekPending) {
        this.updateState({
          currentTime: player.getCurrentTime(),
          readyState: 4,
        });
        this.#resolveSeeked();
        this.dispatchEvent(new Event('timeupdate'));
        if (!this.paused) this.dispatchEvent(new Event('playing'));
      } else {
        this.updateState({ readyState: 4 });
        this.dispatchEvent(new Event('playing'));
      }
      this.#startTimeupdateInterval(player);
    } else if (state === YTState.BUFFERING) {
      if (!this.#seekPending) {
        this.updateState({ readyState: 2 });
        if (wasAlreadyPlaying) this.dispatchEvent(new Event('waiting'));
      }
    } else if (state === YTState.PAUSED) {
      this.#stopTimeupdateInterval();
      this.updateState({ currentTime: player.getCurrentTime() });
      this.dispatchEvent(new Event('timeupdate'));

      if (this.#seekPending) {
        this.#resolveSeeked();
      }

      this.#playFired = false;
      this.updateState({ paused: true });
      this.dispatchEvent(new Event('pause'));
    } else if (state === YTState.ENDED) {
      this.#stopTimeupdateInterval();
      if (this.#seekPending) this.#resolveSeeked();
      this.#playFired = false;
      this.updateState({ paused: true, ended: true, readyState: 4, seeking: false });
      this.dispatchEvent(new Event('pause'));
      this.dispatchEvent(new Event('ended'));
    } else if (state === YTState.CUED) {
      this.updateState({ readyState: 1 });
    }
  }

  #resolveSeeked() {
    if (this.#seekTimeoutId !== null) {
      clearTimeout(this.#seekTimeoutId);
      this.#seekTimeoutId = null;
    }
    this.#seekPending = false;
    this.updateState({ seeking: false });
    this.dispatchEvent(new Event('seeked'));
  }

  #cancelSeek() {
    if (this.#seekTimeoutId !== null) {
      clearTimeout(this.#seekTimeoutId);
      this.#seekTimeoutId = null;
    }
    this.#seekPending = false;
  }

  #refreshCaptionTracks(player: YTPlayer) {
    const tracklist = player.getOption('captions', 'tracklist') as YTCaptionTrack[] | null;
    if (!tracklist?.length) return;
    const video = this.syntheticTextTracksVideo;
    for (const t of tracklist) {
      const exists = Array.from(video.textTracks).some((tt) => tt.language === t.languageCode);
      if (!exists) {
        const track = video.addTextTrack('subtitles', t.displayName, t.languageCode);
        this.addMountedTrack(track);
      }
    }
  }

  #setupTextTrackListener(player: YTPlayer) {
    const abort = this.startTextTrackAbort();
    this.syntheticTextTracksVideo.textTracks.addEventListener(
      'change',
      () => {
        const active = Array.from(this.syntheticTextTracksVideo.textTracks).find(
          (t) => t.mode === 'showing' && this.isMountedTrack(t as TextTrack)
        );
        player.setOption('captions', 'track', active ? { languageCode: active.language } : {});
      },
      { signal: abort.signal }
    );
  }

  #startTimeupdateInterval(player: YTPlayer) {
    this.#stopTimeupdateInterval();
    let lastBuffered = -1;
    this.#timeupdateInterval = setInterval(() => {
      if (!this.#player || this.#player !== player) {
        this.#stopTimeupdateInterval();
        return;
      }
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      this.updateState({ currentTime, duration });
      this.dispatchEvent(new Event('timeupdate'));

      if (duration > 0) {
        const buffered = player.getVideoLoadedFraction() * duration;
        this.updateState({ buffered });
        if (Math.abs(buffered - lastBuffered) > 0.1) {
          lastBuffered = buffered;
          this.dispatchEvent(new Event('progress'));
        }
      }
    }, 250);
  }

  #stopTimeupdateInterval() {
    if (this.#timeupdateInterval !== null) {
      clearInterval(this.#timeupdateInterval);
      this.#timeupdateInterval = null;
    }
  }
}
