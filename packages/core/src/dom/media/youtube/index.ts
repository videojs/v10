// Adapted from `youtube-video-element` from `muxinc/media-elements`,
// ported to TypeScript and reshaped as a media host to fit the v10
// media-host architecture (mirrors `dom/media/vimeo`).
//
// Source: https://github.com/muxinc/media-elements
// License: MIT

import { loadScript } from '@videojs/utils/dom';
import { isNumber, isUndefined } from '@videojs/utils/predicate';
import { EMPTY_TEXT_TRACKS, EMPTY_TIME_RANGES } from '../../../core/media/constants';
import { MediaError } from '../../../core/media/media-error';
import type { MediaPreloadType, TextTrackListLike, Video } from '../../../core/media/types';
import { MediaPlayedRangesMixin } from '../media-played-ranges';

/**
 * Public YouTube embed configuration. Serialized onto the iframe URL as
 * player parameters (https://developers.google.com/youtube/player_parameters).
 */
export interface YouTubeConfig extends Record<string, unknown> {
  referrerPolicy?: ReferrerPolicy;
}

/** Parsed pieces of a YouTube source URL. */
export interface YouTubeSource {
  /** 11-character video id (null for playlist-only sources). */
  id: string | null;
  /** `'video'` for single videos, `'playlist'` for playlist sources. */
  kind: 'video' | 'playlist';
  /** Playlist id (the `list` parameter). */
  listId: string | null;
  /** Start time in seconds parsed from the `t` parameter. */
  startTime: number | null;
  /** Whether the source uses the youtube-nocookie.com privacy-enhanced host. */
  noCookie: boolean;
}

export interface YouTubeMediaProps {
  src: string;
  autoplay: boolean;
  defaultMuted: boolean;
  muted: boolean;
  loop: boolean;
  controls: boolean;
  playsInline: boolean;
  preload: MediaPreloadType;
  poster: string;
  config: YouTubeConfig;
}

export const youtubeMediaDefaultProps: YouTubeMediaProps = {
  src: '',
  autoplay: false,
  defaultMuted: false,
  muted: false,
  loop: false,
  controls: false,
  playsInline: true,
  preload: 'metadata',
  poster: '',
  config: {},
};

/**
 * Minimal typings for the YouTube iframe API
 * (https://developers.google.com/youtube/iframe_api_reference).
 * The API is loaded from a script tag, so there is no npm SDK to type against.
 */
export interface YouTubePlayerApi {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setVolume(volume: number): void;
  getVolume(): number;
  getDuration(): number;
  getCurrentTime(): number;
  getPlaybackRate(): number;
  setPlaybackRate(rate: number): void;
  getVideoLoadedFraction(): number;
  getPlayerState(): number;
  loadVideoById(options: { videoId: string; startSeconds?: number }): void;
  cueVideoById(options: { videoId: string; startSeconds?: number }): void;
  loadPlaylist(options: { list: string; listType?: string }): void;
  cuePlaylist(options: { list: string; listType?: string }): void;
  getOption(module: string, option: string): unknown;
  setOption(module: string, option: string, value: unknown): void;
  addEventListener(type: string, listener: (event: { data: number }) => void): void;
  destroy(): void;
}

interface YouTubePlayerEvents {
  onReady?: () => void;
  onError?: (event: { data: number }) => void;
}

export interface YouTubeApi {
  Player: new (target: HTMLIFrameElement, options: { events?: YouTubePlayerEvents }) => YouTubePlayerApi;
  ready(callback: () => void): void;
}

interface YouTubeCaptionTrack {
  languageCode?: string;
  displayName?: string;
}

const YouTubeMediaBase = MediaPlayedRangesMixin(EventTarget);

export class YouTubeMedia extends YouTubeMediaBase implements Partial<Video> {
  #target: HTMLIFrameElement | null = null;
  #player: YouTubePlayerApi | null = null;
  /** The iframe API rejects `cueVideoById`/`loadVideoById` before `onReady`. */
  #playerReady = false;
  /** A load was requested before the player was ready; replay it on `onReady`. */
  #pendingLoad = false;
  #loadComplete = createPublicPromise<void>();
  /** Guards async player creation across attach/detach cycles. */
  #attachId = 0;

  #src = youtubeMediaDefaultProps.src;
  #autoplay = youtubeMediaDefaultProps.autoplay;
  #defaultMuted = youtubeMediaDefaultProps.defaultMuted;
  #loop = youtubeMediaDefaultProps.loop;
  #controls = youtubeMediaDefaultProps.controls;
  #playsInline = youtubeMediaDefaultProps.playsInline;
  #preload = youtubeMediaDefaultProps.preload;
  #poster = youtubeMediaDefaultProps.poster;
  #config = youtubeMediaDefaultProps.config;

  #paused = true;
  #ended = false;
  #seeking = false;
  #loaded = false;
  #playFired = false;
  #currentTime = 0;
  #duration = Number.NaN;
  #volume = 1;
  #muted = false;
  #playbackRate = 1;
  #progress = 0;
  #readyState = READY_STATE_HAVE_NOTHING;
  #error: MediaError | null = null;
  #isFullscreen = false;
  #pollInterval: ReturnType<typeof setInterval> | null = null;
  #textTracksHost: HTMLVideoElement | null = null;
  #textTracksDisconnect: AbortController | null = null;

  static PLAYER_SOFTWARE_NAME = 'youtube-video';

  /** Underlying YouTube iframe API player instance (null until the API loads). */
  get engine() {
    return this.#player;
  }

  get target(): HTMLIFrameElement | null {
    return this.#target;
  }

  /** Bind the iframe hosting the embed, loading the iframe API and creating a player. */
  attach(target: HTMLIFrameElement | null): void {
    if (!target || this.#target === target) return;
    if (this.#target) this.detach();
    this.#target = target;
    if (!target.src) {
      const initialSrc = buildYouTubeIframeSrc(this.#src, this.#snapshotProps());
      if (initialSrc) target.src = initialSrc;
    }
    this.#loadComplete = createPublicPromise<void>();
    this.dispatchEvent(new Event('loadstart'));
    void this.#createPlayer(target);
  }

  detach(): void {
    if (!this.#target) return;
    this.#attachId++;
    this.#stopPolling();
    this.#teardownTextTracks();
    try {
      this.#player?.destroy();
    } catch {
      // The iframe API throws if the iframe was already removed.
    }
    this.#player = null;
    this.#playerReady = false;
    this.#pendingLoad = false;
    this.#target = null;
    // Unblock callers awaiting load; they re-check `#player` (now null) and no-op.
    this.#loadComplete.resolve();
    this.#resetState();
  }

  override destroy() {
    this.detach();
    super.destroy();
  }

  get src() {
    return this.#src;
  }
  set src(value) {
    if (this.#src === value) return;
    this.#src = value;
    void this.load();
  }

  get currentSrc() {
    return this.#target?.src ?? '';
  }

  get readyState() {
    return this.#readyState;
  }

  /** Reload the current source via the iframe API; deferred until the player is ready. */
  async load() {
    if (!this.#src) return;
    if (!this.#player || !this.#playerReady) {
      // `cueVideoById`/`loadVideoById` fail before `onReady`; replay the load then.
      this.#pendingLoad = !!this.#target;
      return;
    }
    this.#resetState();
    this.#loadComplete = createPublicPromise<void>();
    this.dispatchEvent(new Event('emptied'));
    this.dispatchEvent(new Event('loadstart'));
    const parsed = parseYouTubeSource(this.#src);
    if (!parsed) {
      this.#error = new MediaError(`Unrecognized YouTube source: ${this.#src}`, MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED);
      this.dispatchEvent(new Event('error'));
      // Unblock callers awaiting load so play()/fullscreen don't hang.
      this.#loadComplete.resolve();
      return;
    }
    if (parsed.kind === 'playlist' && parsed.listId) {
      const options = { list: parsed.listId, listType: 'playlist' };
      if (this.#autoplay) this.#player.loadPlaylist(options);
      else this.#player.cuePlaylist(options);
    } else if (parsed.id) {
      const options: { videoId: string; startSeconds?: number } = { videoId: parsed.id };
      if (parsed.startTime != null) options.startSeconds = parsed.startTime;
      if (this.#autoplay) this.#player.loadVideoById(options);
      else this.#player.cueVideoById(options);
    }
  }

  get paused() {
    return this.#paused;
  }

  get ended() {
    return this.#ended;
  }

  get seeking() {
    return this.#seeking;
  }

  async play() {
    await this.#loadComplete;
    this.#player?.playVideo();
  }

  pause() {
    this.#player?.pauseVideo();
  }

  get currentTime() {
    return this.#currentTime;
  }
  set currentTime(value) {
    if (this.#currentTime === value) return;
    this.#currentTime = value;
    // `seekTo` keeps the player paused when called from a paused state.
    this.#afterLoad((p) => p.seekTo(value, true));
  }

  get duration() {
    return this.#duration;
  }

  get volume() {
    return this.#volume;
  }
  set volume(value) {
    if (this.#volume === value) return;
    this.#volume = value;
    this.#afterLoad((p) => p.setVolume(value * 100));
  }

  get muted() {
    return this.#muted;
  }
  set muted(value) {
    if (this.#muted === value) return;
    this.#muted = value;
    this.#afterLoad((p) => (value ? p.mute() : p.unMute()));
  }

  get playbackRate() {
    return this.#playbackRate;
  }
  set playbackRate(value) {
    if (this.#playbackRate === value) return;
    this.#playbackRate = value;
    this.#afterLoad((p) => p.setPlaybackRate(value));
  }

  get autoplay() {
    return this.#autoplay;
  }
  set autoplay(value) {
    this.#autoplay = value;
  }

  get defaultMuted() {
    return this.#defaultMuted;
  }
  set defaultMuted(value) {
    this.#defaultMuted = value;
  }

  get loop() {
    return this.#loop;
  }
  set loop(value) {
    // The iframe API has no single-video loop; ENDED restarts playback instead.
    this.#loop = value;
  }

  get controls() {
    return this.#controls;
  }
  set controls(value) {
    this.#controls = value;
  }

  get playsInline() {
    return this.#playsInline;
  }
  set playsInline(value) {
    this.#playsInline = value;
  }

  get preload() {
    return this.#preload;
  }
  set preload(value) {
    this.#preload = value;
  }

  get poster() {
    return this.#poster;
  }
  set poster(value) {
    this.#poster = value;
  }

  get config() {
    return this.#config as Record<string, unknown>;
  }
  set config(value) {
    this.#config = value as YouTubeConfig;
  }

  get buffered() {
    return this.#progress > 0 ? createTimeRanges(0, this.#progress) : EMPTY_TIME_RANGES;
  }

  get seekable() {
    return this.#duration > 0 && Number.isFinite(this.#duration)
      ? createTimeRanges(0, this.#duration)
      : EMPTY_TIME_RANGES;
  }

  get error() {
    return this.#error;
  }

  get textTracks() {
    this.#textTracksHost ??= globalThis.document?.createElement('video') ?? null;
    return (this.#textTracksHost?.textTracks as TextTrackListLike) ?? EMPTY_TEXT_TRACKS;
  }

  get isFullscreen() {
    return this.#isFullscreen;
  }

  // The iframe API exposes no fullscreen controls, so fullscreen targets the iframe itself.
  async requestFullscreen() {
    await this.#target?.requestFullscreen?.();
    this.#isFullscreen = true;
  }

  async exitFullscreen() {
    const doc = globalThis.document;
    if (doc?.fullscreenElement && doc.fullscreenElement === this.#target) {
      await doc.exitFullscreen();
    }
    this.#isFullscreen = false;
  }

  async #createPlayer(target: HTMLIFrameElement) {
    const attachId = this.#attachId;
    let api: YouTubeApi;
    try {
      api = await loadYouTubeApi();
    } catch {
      this.#error = new MediaError('Failed to load the YouTube iframe API', MediaError.MEDIA_ERR_NETWORK);
      this.dispatchEvent(new Event('error'));
      // Unblock callers awaiting load so play()/fullscreen don't hang.
      this.#loadComplete.resolve();
      return;
    }
    if (attachId !== this.#attachId || this.#target !== target) return;
    const player = new api.Player(target, {
      events: {
        onReady: () => this.#onPlayerReady(),
        onError: (event) => this.#onError(event.data),
      },
    });
    this.#player = player;
    this.#bindPlayerEvents(player);
    this.#setupTextTracks(player);
  }

  /** Defer a player call until `loadComplete` resolves, swallowing failures. */
  #afterLoad(fn: (player: YouTubePlayerApi) => void) {
    this.#loadComplete.then(
      () => {
        if (!this.#player) return;
        try {
          fn(this.#player);
        } catch {
          // The iframe API throws if the player was destroyed mid-flight.
        }
      },
      () => {}
    );
  }

  #snapshotProps() {
    return {
      autoplay: this.#autoplay,
      defaultMuted: this.#defaultMuted,
      loop: this.#loop,
      controls: this.#controls,
      playsInline: this.#playsInline,
      preload: this.#preload || youtubeMediaDefaultProps.preload,
      config: this.#config,
    };
  }

  #resetState() {
    this.#currentTime = 0;
    this.#duration = Number.NaN;
    this.#muted = false;
    this.#paused = !this.#autoplay;
    this.#ended = false;
    this.#playbackRate = 1;
    this.#progress = 0;
    this.#readyState = READY_STATE_HAVE_NOTHING;
    this.#seeking = false;
    this.#loaded = false;
    this.#playFired = false;
    this.#volume = 1;
    this.#error = null;
    this.#isFullscreen = false;
  }

  #onPlayerReady() {
    this.#playerReady = true;
    if (this.#pendingLoad) {
      // The iframe was built from a stale src; skip its metadata and reload.
      // The post-cue state change completes the load (see `#bindPlayerEvents`).
      this.#pendingLoad = false;
      void this.load();
      return;
    }
    this.#onLoaded();
  }

  #onLoaded() {
    if (this.#loaded) return;
    this.#loaded = true;
    this.#readyState = READY_STATE_HAVE_METADATA;
    const player = this.#player;
    if (player) {
      this.#duration = player.getDuration() || Number.NaN;
      this.#muted = player.isMuted();
      this.#volume = player.getVolume() / 100;
      this.#playbackRate = player.getPlaybackRate();
    }
    for (const type of ['loadedmetadata', 'durationchange', 'volumechange', 'loadcomplete']) {
      this.dispatchEvent(new Event(type));
    }
    this.#loadComplete.resolve();
    this.#startPolling();
  }

  #onError(code: number) {
    const error = new MediaError(
      `YouTube iframe player error #${code}; visit https://developers.google.com/youtube/iframe_api_reference#onError for the full error message.`,
      youtubeErrorCodeToMediaErrorCode[code] ?? MediaError.MEDIA_ERR_CUSTOM,
      true
    );
    error.data = { youtubeErrorCode: code };
    this.#error = error;
    this.dispatchEvent(new Event('error'));
    // Unblock callers awaiting load so play()/fullscreen don't hang.
    this.#loadComplete.resolve();
  }

  #bindPlayerEvents(player: YouTubePlayerApi) {
    const emit = (type: string) => this.dispatchEvent(new Event(type));

    player.addEventListener('onStateChange', ({ data: state }) => {
      // Subsequent loads (`cueVideoById`/`loadVideoById`) never re-fire
      // `onReady`, so any post-load state transition completes the load.
      if (!this.#loaded && state !== STATE_UNSTARTED) this.#onLoaded();

      if (state === STATE_PLAYING || state === STATE_BUFFERING) {
        if (!this.#playFired) {
          this.#playFired = true;
          this.#paused = false;
          this.#ended = false;
          emit('play');
        }
        this.#syncTextTracks(player);
      }

      if (state === STATE_BUFFERING) {
        emit('waiting');
      } else if (state === STATE_PLAYING) {
        if (this.#seeking) {
          this.#seeking = false;
          emit('seeked');
        }
        this.#readyState = READY_STATE_HAVE_FUTURE_DATA;
        this.#paused = false;
        emit('playing');
      } else if (state === STATE_PAUSED) {
        const diff = Math.abs(player.getCurrentTime() - this.#currentTime);
        if (!this.#seeking && diff > 0.1) {
          this.#seeking = true;
          emit('seeking');
        }
        this.#playFired = false;
        this.#paused = true;
        emit('pause');
      } else if (state === STATE_ENDED) {
        this.#playFired = false;
        this.#paused = true;
        emit('pause');
        this.#ended = true;
        emit('ended');
        if (this.#loop) void this.play();
      }
    });

    player.addEventListener('onPlaybackRateChange', () => {
      this.#playbackRate = player.getPlaybackRate();
      emit('ratechange');
    });

    player.addEventListener('onVolumeChange', () => {
      this.#volume = player.getVolume() / 100;
      this.#muted = player.isMuted();
      emit('volumechange');
    });
  }

  // The iframe API pushes no timeupdate/progress/seek events, so poll like the
  // original `youtube-video-element` does.
  #startPolling() {
    this.#stopPolling();
    this.#pollInterval = setInterval(() => this.#poll(), 50);
  }

  #stopPolling() {
    if (this.#pollInterval !== null) {
      clearInterval(this.#pollInterval);
      this.#pollInterval = null;
    }
  }

  #poll() {
    const player = this.#player;
    if (!player) return;

    const time = player.getCurrentTime();
    const duration = player.getDuration();
    const bufferedEnd = player.getVideoLoadedFraction() * duration;

    if (this.#seeking && bufferedEnd > 0.1) {
      this.#seeking = false;
      this.dispatchEvent(new Event('seeked'));
    } else if (!this.#seeking && Math.abs(time - this.#currentTime) > 0.1) {
      this.#seeking = true;
      this.dispatchEvent(new Event('seeking'));
    }

    if (time !== this.#currentTime) {
      this.#currentTime = time;
      this.dispatchEvent(new Event('timeupdate'));
    }

    if (isNumber(duration) && duration > 0 && duration !== this.#duration) {
      this.#duration = duration;
      this.dispatchEvent(new Event('durationchange'));
    }

    if (bufferedEnd !== this.#progress) {
      this.#progress = bufferedEnd;
      if (duration > 0 && bufferedEnd >= duration) {
        this.#readyState = READY_STATE_HAVE_ENOUGH_DATA;
      }
      this.dispatchEvent(new Event('progress'));
    }
  }

  #setupTextTracks(player: YouTubePlayerApi) {
    const doc = globalThis.document;
    if (isUndefined(doc)) return;
    this.#teardownTextTracks();
    const host = doc.createElement('video');
    this.#textTracksHost = host;
    this.#textTracksDisconnect = new AbortController();
    host.textTracks?.addEventListener?.(
      'change',
      () => {
        const showing = Array.from(host.textTracks).find((t) => t.mode === 'showing');
        try {
          player.setOption('captions', 'track', showing ? { languageCode: showing.language } : {});
        } catch {
          // The iframe API throws if the player was destroyed mid-flight.
        }
      },
      { signal: this.#textTracksDisconnect.signal }
    );
  }

  /** Caption metadata is only available once playback starts. */
  #syncTextTracks(player: YouTubePlayerApi) {
    const host = this.#textTracksHost;
    if (!host) return;
    const trackList = (player.getOption('captions', 'tracklist') ?? []) as YouTubeCaptionTrack[];
    for (const track of trackList) {
      if (!track.languageCode) continue;
      if (Array.from(host.textTracks).some((t) => t.language === track.languageCode)) continue;
      try {
        host.addTextTrack?.('subtitles', track.displayName ?? '', track.languageCode);
      } catch {
        // jsdom or unsupported environments.
      }
    }
  }

  #teardownTextTracks() {
    this.#textTracksDisconnect?.abort();
    this.#textTracksDisconnect = null;
    this.#textTracksHost = null;
  }
}

/** Extract a YouTube video id from a raw 11-character id or any recognized URL. */
export function parseYouTubeVideoId(src: string) {
  return parseYouTubeSource(src)?.id ?? null;
}

/**
 * Parse a YouTube source string. Recognizes raw 11-character ids, `youtu.be`
 * short links, `watch?v=`, `embed/`, `v/`, `shorts/` and `live/` URLs (with or
 * without the `-nocookie` host), playlist URLs via the `list` parameter, and
 * start times via the `t` parameter.
 */
export function parseYouTubeSource(src: string): YouTubeSource | null {
  if (!src) return null;
  if (/^[\w-]{11}$/.test(src)) {
    return { id: src, kind: 'video', listId: null, startTime: null, noCookie: false };
  }
  const noCookie = src.includes('-nocookie');
  const videoMatch = VIDEO_MATCH_SRC.exec(src);
  const listMatch = PLAYLIST_MATCH_SRC.exec(src);
  // Playlist embed URLs use the `videoseries` placeholder in the video id slot.
  const videoId = videoMatch?.[1] ?? null;
  const id = videoId === 'videoseries' ? null : videoId;
  if (!id && !listMatch) return null;
  return {
    id,
    kind: id ? 'video' : 'playlist',
    listId: listMatch?.[1] ?? null,
    startTime: parseStartTime(src),
    noCookie,
  };
}

/** Build the iframe `src` URL for an initial YouTube embed from the given props. */
export function buildYouTubeIframeSrc(src: string, props: Partial<YouTubeMediaProps> = {}) {
  const parsed = parseYouTubeSource(src);
  if (!parsed) return '';
  const embedBase = parsed.noCookie ? EMBED_BASE_NOCOOKIE : EMBED_BASE;
  const params: Record<string, unknown> = {
    // Hide YouTube chrome by default; pass nothing only when controls is explicitly true.
    controls: props.controls === true ? null : 0,
    autoplay: props.autoplay,
    loop: props.loop,
    mute: props.defaultMuted,
    playsinline: props.playsInline ?? youtubeMediaDefaultProps.playsInline,
    preload: props.preload ?? youtubeMediaDefaultProps.preload,
    // https://developers.google.com/youtube/player_parameters#Parameters
    enablejsapi: 1,
    showinfo: 0,
    rel: 0,
    iv_load_policy: 3,
    modestbranding: 1,
    start: parsed.startTime,
    // YouTube-specific knobs (`cc_load_policy`, `hl`, `color`, …) flow through here.
    ...(props.config ?? undefined),
  };
  if (parsed.kind === 'playlist' && parsed.listId) {
    return `${embedBase}?${serialize({ listType: 'playlist', list: parsed.listId, ...params })}`;
  }
  return `${embedBase}/${parsed.id}?${serialize(params)}`;
}

const API_URL = 'https://www.youtube.com/iframe_api';
const EMBED_BASE = 'https://www.youtube.com/embed';
const EMBED_BASE_NOCOOKIE = 'https://www.youtube-nocookie.com/embed';
const VIDEO_MATCH_SRC =
  /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))((?:\w|-){11})/;
const PLAYLIST_MATCH_SRC = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/.*?[?&]list=)([\w-]+)/;

// https://developers.google.com/youtube/iframe_api_reference#onError
const youtubeErrorCodeToMediaErrorCode: Record<number, number> = {
  2: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, // invalid parameter (e.g. malformed video id)
  5: MediaError.MEDIA_ERR_DECODE, // HTML5 player error
  100: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, // video not found, removed, or private
  101: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, // embedding not allowed
  150: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, // embedding not allowed (alias of 101)
};

// https://developers.google.com/youtube/iframe_api_reference#onStateChange
const STATE_UNSTARTED = -1;
const STATE_ENDED = 0;
const STATE_PLAYING = 1;
const STATE_PAUSED = 2;
const STATE_BUFFERING = 3;

const READY_STATE_HAVE_NOTHING = 0;
const READY_STATE_HAVE_METADATA = 1;
const READY_STATE_HAVE_FUTURE_DATA = 3;
const READY_STATE_HAVE_ENOUGH_DATA = 4;

async function loadYouTubeApi(): Promise<YouTubeApi> {
  const existing = (globalThis as { YT?: YouTubeApi }).YT;
  if (existing?.Player) return existing;
  await loadScript(API_URL);
  const api = (globalThis as { YT?: YouTubeApi }).YT;
  if (!api) throw new Error('YouTube iframe API failed to load');
  // The loader stub exposes `YT.ready` before `YT.Player` is defined.
  await new Promise<void>((resolve) => api.ready(resolve));
  return api;
}

/**
 * Parse the `t` parameter from a YouTube URL and convert it to seconds.
 * Supports formats like: `t=171`, `t=171s`, `t=2m51s`, `t=2m`, `t=1h30m15s`.
 */
function parseStartTime(url: string): number | null {
  const tValue = /[?&]t=([\dhms]+)/i.exec(url)?.[1]?.toLowerCase();
  if (!tValue) return null;
  let totalSeconds = 0;
  let hasValue = false;
  const hours = /(\d+)h/.exec(tValue)?.[1];
  if (hours) {
    totalSeconds += Number.parseInt(hours, 10) * 3600;
    hasValue = true;
  }
  const minutes = /(\d+)m/.exec(tValue)?.[1];
  if (minutes) {
    totalSeconds += Number.parseInt(minutes, 10) * 60;
    hasValue = true;
  }
  const seconds = /(\d+)s?$/.exec(tValue)?.[1];
  if (seconds) {
    totalSeconds += Number.parseInt(seconds, 10);
    hasValue = true;
  }
  return hasValue ? totalSeconds : null;
}

function createTimeRanges(start: number, end: number) {
  return { length: 1, start: () => start, end: () => end };
}

function serialize(props: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const key in props) {
    const val = props[key];
    if (val === true || val === '') params.set(key, '1');
    else if (val === false) params.set(key, '0');
    else if (val != null) params.set(key, String(val));
  }
  return params.toString();
}

interface PublicPromise<T> extends Promise<T> {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function createPublicPromise<T>(): PublicPromise<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  }) as PublicPromise<T>;
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
}
