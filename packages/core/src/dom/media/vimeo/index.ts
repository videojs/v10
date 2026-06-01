import { isNull, isString, isUndefined } from '@videojs/utils/predicate';
import VimeoPlayer, { type LoadVideoOptions, type VimeoEmbedParameters, type VimeoUrl } from '@vimeo/player';
import { MediaLayer } from '../../../core/media/media-layer';
import type { ErrorLike, TextTrackKind, TextTrackListLike, Video } from '../../../core/media/types';
import { EMPTY_TEXT_TRACKS, EMPTY_TIME_RANGES } from '../constants';
import { type MediaPlayedRangesMedia, mediaPlayedRanges } from '../media-played-ranges';

export type { default as VimeoPlayerApi } from '@vimeo/player';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type VimeoPreload = 'none' | 'metadata' | 'auto';

/** Public Vimeo embed configuration. Forwarded to `@vimeo/player`. */
export type VimeoConfig = VimeoEmbedParameters;

/** Parsed pieces of a Vimeo source URL. */
export interface VimeoSource {
  /** Numeric Vimeo id. */
  id: number;
  /** `'video'` for regular clips, `'event'` for live events. */
  kind: 'video' | 'event';
  /** Unlisted-video / event hash (the `h` parameter). */
  hash: string | null;
}

export interface VimeoMediaProps {
  /** Vimeo video id, vimeo.com URL, or player.vimeo.com embed URL. */
  src: string;
  autoplay: boolean;
  /** Reflects the `muted` attribute (initial state). Use `muted` for runtime mute. */
  defaultMuted: boolean;
  loop: boolean;
  controls: boolean;
  playsInline: boolean;
  preload: VimeoPreload;
  poster: string;
  /**
   * Arbitrary extra `@vimeo/player` embed parameters merged into the iframe
   * URL. Use this for Vimeo-specific knobs that aren't on the standard media
   * surface — e.g. `autopause`, `byline`, `dnt`, `quality`, `texttrack`.
   */
  config: VimeoConfig;
}

export const vimeoMediaDefaultProps: VimeoMediaProps = {
  src: '',
  autoplay: false,
  defaultMuted: false,
  loop: false,
  controls: false,
  playsInline: true,
  preload: 'metadata',
  poster: '',
  config: {},
};

/** {@link Video} surface for Vimeo — omits APIs with no meaningful embed behavior. */
export type VimeoVideoSurface = Omit<
  Video,
  | 'crossOrigin'
  | 'defaultPlaybackRate'
  | 'addTextTrack'
  | 'canPlayType'
  | 'streamType'
  | 'liveEdgeStart'
  | 'targetLiveWindow'
  | 'poster'
  | 'remote'
  | 'disableRemotePlayback'
>;

// ----------------------------------------------------------------------------
// VimeoMedia
// ----------------------------------------------------------------------------

/**
 * Media host for Vimeo embeds. Wraps an `<iframe>` and implements
 * {@link VimeoVideoSurface} against the underlying `@vimeo/player` instance,
 * with played-range tracking via {@link mediaPlayedRanges}. Embed-only props
 * (`autoplay`, `config`, …) live on the class but outside {@link Video}.
 *
 * Vimeo is a leaf layer: it has no `next` and drives state via the JS Player
 * API rather than the chain's terminal `<video>` target. The `target` here is
 * an `<iframe>` which doesn't satisfy the `Media` contract, so the overrides
 * below silence the variance mismatch with `MediaLayer.target`.
 */
export class VimeoMedia extends MediaLayer<VimeoVideoSurface> implements VimeoVideoSurface {
  #target: HTMLIFrameElement | null = null;
  #player: VimeoPlayer | null = null;
  #loadComplete = createPublicPromise<void>();

  #src = vimeoMediaDefaultProps.src;
  #autoplay = vimeoMediaDefaultProps.autoplay;
  #defaultMuted = vimeoMediaDefaultProps.defaultMuted;
  #loop = vimeoMediaDefaultProps.loop;
  #controls = vimeoMediaDefaultProps.controls;
  #playsInline = vimeoMediaDefaultProps.playsInline;
  #preload = vimeoMediaDefaultProps.preload;
  #config = vimeoMediaDefaultProps.config;

  #paused = true;
  #ended = false;
  #seeking = false;
  #currentTime = 0;
  #duration = Number.NaN;
  #volume = 1;
  #muted = false;
  #playbackRate = 1;
  #progress = 0;
  #videoWidth = Number.NaN;
  #videoHeight = Number.NaN;
  #readyState = READY_STATE_HAVE_NOTHING;
  #error: ErrorLike | null = null;
  #isFullscreen = false;
  #isPictureInPicture = false;
  #disablePictureInPicture = false;

  #textTracksHost: HTMLVideoElement | null = null;
  #textTracksDisconnect: AbortController | null = null;

  static PLAYER_SOFTWARE_NAME = 'vimeo-video';

  constructor() {
    super();
    mediaPlayedRanges().install(this as MediaPlayedRangesMedia);
  }

  // -- Engine + target --

  /** Underlying `@vimeo/player` instance (null before attach). */
  get engine() {
    return this.#player;
  }

  /** Iframe element this media is bound to. */
  // @ts-expect-error — see class-level note on the leaf-layer variance gap.
  override get target(): HTMLIFrameElement | null {
    return this.#target;
  }

  /**
   * Bind (or unbind with `null`) the iframe that hosts the Vimeo embed.
   * Creates a `@vimeo/player` instance on bind, destroys it on unbind, and
   * dispatches `loadstart`.
   */
  // @ts-expect-error — see class-level note on the leaf-layer variance gap.
  override set target(target: HTMLIFrameElement | null) {
    if (this.#target === target) return;

    // Tear down before rebinding — `super.target = …` isn't called because
    // Vimeo is a leaf layer and the iframe isn't a media-event source.
    if (this.#target) {
      this.#teardownTextTracks();
      this.#player?.destroy().catch(() => {});
      this.#player = null;
      this.#target = null;
      this.#resetState();
    }

    if (!target) return;

    this.#target = target;

    if (!target.src) {
      const initialSrc = buildVimeoIframeSrc(this.#src, this.#snapshotProps());
      if (initialSrc) target.src = initialSrc;
    }

    this.#loadComplete = createPublicPromise<void>();
    this.#player = new VimeoPlayer(target);
    this.#bindPlayerEvents(this.#player);
    this.#setupTextTracks(this.#player);

    this.dispatchEvent(new Event('loadstart'));
  }

  destroy() {
    this.target = null;
  }

  // -- Source --

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

  /**
   * Force a reload of the current source. Calls Vimeo's `loadVideo` API if
   * the player is connected; otherwise a no-op until `target` is bound.
   */
  async load() {
    if (!this.#player || !this.#src) return;

    this.#resetState();
    this.#loadComplete = createPublicPromise<void>();
    this.dispatchEvent(new Event('emptied'));
    this.dispatchEvent(new Event('loadstart'));

    const loadOptions = toLoadVideoOptions(this.#src, this.#config);
    if (!loadOptions) return;

    // Vimeo dispatches an `error` event separately on failure.
    await this.#player.loadVideo(loadOptions).catch(() => {});
  }

  // -- Playback --

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
    await this.#player?.play();
  }

  pause() {
    void this.#player?.pause().catch(() => {});
  }

  // -- Time --

  get currentTime() {
    return this.#currentTime;
  }

  set currentTime(value) {
    if (this.#currentTime === value) return;
    this.#currentTime = value;
    this.#afterLoad((p) => p.setCurrentTime(value));
  }

  get duration() {
    return this.#duration;
  }

  // -- Volume --

  get volume() {
    return this.#volume;
  }

  set volume(value) {
    if (this.#volume === value) return;
    this.#volume = value;
    this.#afterLoad((p) => p.setVolume(value));
  }

  get muted() {
    return this.#muted;
  }

  set muted(value) {
    if (this.#muted === value) return;
    this.#muted = value;
    this.#afterLoad((p) => p.setMuted(value));
  }

  // -- Playback rate --

  get playbackRate() {
    return this.#playbackRate;
  }

  set playbackRate(value) {
    if (this.#playbackRate === value) return;
    this.#playbackRate = value;
    this.#afterLoad((p) => p.setPlaybackRate(value));
  }

  // -- Playback options --

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
    this.#loop = value;
    this.#afterLoad((p) => p.setLoop(value));
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

  get config() {
    return this.#config as Record<string, unknown>;
  }

  set config(value) {
    this.#config = value as VimeoConfig;
  }

  // -- Buffer --

  get buffered() {
    return this.#progress > 0 ? createTimeRanges(0, this.#progress) : EMPTY_TIME_RANGES;
  }

  get seekable() {
    return this.#duration > 0 && Number.isFinite(this.#duration)
      ? createTimeRanges(0, this.#duration)
      : EMPTY_TIME_RANGES;
  }

  get played() {
    return this.next?.played ?? EMPTY_TIME_RANGES;
  }

  // -- Error --

  get error() {
    return this.#error;
  }

  // -- Text tracks --

  get textTracks() {
    if (!this.#textTracksHost) {
      this.#textTracksHost = globalThis.document?.createElement('video') ?? null;
    }
    return (this.#textTracksHost?.textTracks as TextTrackListLike) ?? EMPTY_TEXT_TRACKS;
  }

  // -- Dimensions --

  get videoWidth() {
    return this.#videoWidth;
  }

  get videoHeight() {
    return this.#videoHeight;
  }

  // -- Fullscreen / Picture-in-Picture --

  get isFullscreen() {
    return this.#isFullscreen;
  }

  async requestFullscreen() {
    await this.#loadComplete;
    await this.#player?.requestFullscreen?.();
    this.#isFullscreen = true;
  }

  async exitFullscreen() {
    await this.#loadComplete;
    await this.#player?.exitFullscreen?.();
    this.#isFullscreen = false;
  }

  get isPictureInPicture() {
    return this.#isPictureInPicture;
  }

  get disablePictureInPicture() {
    return this.#disablePictureInPicture;
  }

  set disablePictureInPicture(value) {
    this.#disablePictureInPicture = value;
  }

  async requestPictureInPicture() {
    await this.#loadComplete;
    try {
      await this.#player?.requestPictureInPicture?.();
      this.#isPictureInPicture = true;
    } catch (error) {
      console.error(error);
    }
  }

  async exitPictureInPicture() {
    await this.#loadComplete;
    try {
      await this.#player?.exitPictureInPicture?.();
      this.#isPictureInPicture = false;
    } catch (error) {
      console.error(error);
    }
  }

  // -- Internals --

  /** Defer a player call until `loadComplete` resolves, swallowing rejections. */
  #afterLoad(fn: (player: VimeoPlayer) => Promise<unknown>) {
    this.#loadComplete.then(
      () => {
        if (this.#player) fn(this.#player).catch(() => {});
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
      preload: (this.#preload || vimeoMediaDefaultProps.preload) as VimeoPreload,
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
    this.#volume = 1;
    this.#error = null;
    this.#videoWidth = Number.NaN;
    this.#videoHeight = Number.NaN;
    this.#isFullscreen = false;
    this.#isPictureInPicture = false;
  }

  async #onLoaded() {
    this.#readyState = READY_STATE_HAVE_METADATA;

    const player = this.#player;
    if (player) {
      // Pull initial state in parallel; each fall-back to the current value
      // so a single failure doesn't clobber the others.
      const [muted, volume, duration] = await Promise.all([
        player.getMuted().catch(() => this.#muted),
        player.getVolume().catch(() => this.#volume),
        player.getDuration().catch(() => this.#duration),
      ]);
      this.#muted = muted;
      this.#volume = volume;
      this.#duration = duration;
    }

    this.dispatchEvent(new Event('loadedmetadata'));
    this.dispatchEvent(new Event('durationchange'));
    this.dispatchEvent(new Event('volumechange'));
    this.dispatchEvent(new Event('loadcomplete'));
    this.#loadComplete.resolve();
  }

  #bindPlayerEvents(player: VimeoPlayer) {
    player.on('loaded', () => this.#onLoaded());
    player.on('bufferstart', () => this.dispatchEvent(new Event('waiting')));

    player.on('play', () => {
      this.#paused = false;
      this.dispatchEvent(new Event('play'));
    });

    player.on('playing', () => {
      this.#readyState = READY_STATE_HAVE_FUTURE_DATA;
      this.#paused = false;
      this.dispatchEvent(new Event('playing'));
    });

    player.on('seeking', () => {
      this.#seeking = true;
      this.dispatchEvent(new Event('seeking'));
    });

    player.on('seeked', () => {
      this.#seeking = false;
      this.dispatchEvent(new Event('seeked'));
    });

    player.on('pause', () => {
      this.#paused = true;
      this.dispatchEvent(new Event('pause'));
    });

    player.on('ended', () => {
      this.#paused = true;
      this.#ended = true;
      this.dispatchEvent(new Event('ended'));
    });

    player.on('playbackratechange', ({ playbackRate }) => {
      this.#playbackRate = playbackRate;
      this.dispatchEvent(new Event('ratechange'));
    });

    player.on('volumechange', ({ volume }) => {
      this.#volume = volume;
      this.dispatchEvent(new Event('volumechange'));
    });

    player.on('durationchange', ({ duration }) => {
      this.#duration = duration;
      this.dispatchEvent(new Event('durationchange'));
    });

    player.on('timeupdate', ({ seconds, duration }) => {
      this.#currentTime = seconds;
      if (Number.isFinite(duration) && duration !== this.#duration) this.#duration = duration;
      this.dispatchEvent(new Event('timeupdate'));
    });

    player.on('progress', ({ seconds }) => {
      this.#progress = seconds;
      this.dispatchEvent(new Event('progress'));
    });

    player.on('resize', ({ videoWidth, videoHeight }) => {
      this.#videoWidth = videoWidth;
      this.#videoHeight = videoHeight;
      this.dispatchEvent(new Event('resize'));
    });

    player.on('error', () => {
      this.#error = { code: 1, message: 'Vimeo playback error' };
      this.dispatchEvent(new Event('error'));
    });

    player.on('fullscreenchange', ({ fullscreen }) => {
      this.#isFullscreen = fullscreen;
    });

    player.on('enterpictureinpicture', () => {
      this.#isPictureInPicture = true;
      this.dispatchEvent(new Event('enterpictureinpicture'));
    });

    player.on('leavepictureinpicture', () => {
      this.#isPictureInPicture = false;
      this.dispatchEvent(new Event('leavepictureinpicture'));
    });
  }

  #setupTextTracks(player: VimeoPlayer) {
    const doc = globalThis.document;
    if (isUndefined(doc)) return;

    this.#teardownTextTracks();

    const host = doc.createElement('video');
    this.#textTracksHost = host;

    player
      .getTextTracks()
      .then((tracks) => {
        for (const track of tracks) {
          if (!isString(track.kind) || isNull(track.kind)) continue;
          try {
            host.addTextTrack?.(track.kind as TextTrackKind, track.label ?? '', track.language ?? '');
          } catch {
            // jsdom or unsupported environments.
          }
        }
      })
      .catch(() => {});

    this.#textTracksDisconnect = new AbortController();
    host.textTracks?.addEventListener?.(
      'change',
      () => {
        const showing = Array.from(host.textTracks).find((t) => t.mode === 'showing');
        if (showing) player.enableTextTrack(showing.language, showing.kind).catch(() => {});
        else player.disableTextTrack().catch(() => {});
      },
      { signal: this.#textTracksDisconnect.signal }
    );
  }

  #teardownTextTracks() {
    this.#textTracksDisconnect?.abort();
    this.#textTracksDisconnect = null;
    this.#textTracksHost = null;
  }
}

// ----------------------------------------------------------------------------
// Public utilities
// ----------------------------------------------------------------------------

/** Extract a Vimeo video id from a numeric id, vimeo.com URL, or player URL. */
export function parseVimeoVideoId(src: string) {
  return parseVimeoSource(src)?.id ?? null;
}

/**
 * Parse a Vimeo source string. Recognizes:
 * - numeric ids (`'76979871'`),
 * - `vimeo.com/<id>` and `vimeo.com/video/<id>` URLs,
 * - `player.vimeo.com/video/<id>` URLs,
 * - `vimeo.com/event/<id>` URLs (live events),
 * - unlisted/event hash via `?h=` or `/<hash>` path segment.
 */
export function parseVimeoSource(src: string) {
  if (!src) return null;

  if (/^\d+$/.test(src)) {
    return { id: Number(src), kind: 'video', hash: null };
  }

  const match = MATCH_SRC.exec(src);
  if (!match) return null;

  const kind = match[1] === 'event/' ? 'event' : 'video';
  const id = Number(match[2]);
  const pathHash = match[3] ?? null;

  let queryHash: string | null = null;
  try {
    queryHash = new URL(src).searchParams.get('h');
  } catch {
    // src isn't a valid URL — ignore.
  }

  return { id, kind, hash: queryHash ?? pathHash };
}

/** Build the iframe `src` URL for an initial Vimeo embed from the given props. */
export function buildVimeoIframeSrc(src: string, props: Partial<VimeoMediaProps> = {}) {
  const parsed = parseVimeoSource(src);
  if (!parsed) return '';

  const params: Record<string, unknown> = {
    // Hide Vimeo chrome by default; pass nothing only when controls is explicitly true.
    controls: props.controls === true ? null : 0,
    autoplay: props.autoplay,
    loop: props.loop,
    muted: props.defaultMuted,
    playsinline: props.playsInline ?? vimeoMediaDefaultProps.playsInline,
    preload: props.preload ?? vimeoMediaDefaultProps.preload,
    transparent: false,
    h: parsed.hash,
    // Vimeo-specific knobs (`autopause`, `byline`, `dnt`, …) flow through here.
    ...(props.config ?? undefined),
  };

  if (parsed.kind === 'event') {
    const hashPath = parsed.hash ? `/${parsed.hash}` : '';
    delete params.h;
    return `${EMBED_EVENT_BASE}/${parsed.id}/embed${hashPath}?${serialize(params)}`;
  }

  return `${EMBED_VIDEO_BASE}/${parsed.id}?${serialize(params)}`;
}

// ----------------------------------------------------------------------------
// Module internals
// ----------------------------------------------------------------------------

const EMBED_VIDEO_BASE = 'https://player.vimeo.com/video';
const EMBED_EVENT_BASE = 'https://vimeo.com/event';
const MATCH_SRC = /vimeo\.com\/(video\/|event\/)?(\d+)(?:\/([\w-]+))?/;

const READY_STATE_HAVE_NOTHING = 0;
const READY_STATE_HAVE_METADATA = 1;
const READY_STATE_HAVE_FUTURE_DATA = 3;

function createTimeRanges(start: number, end: number) {
  return {
    length: 1,
    start: () => start,
    end: () => end,
  };
}

function toLoadVideoOptions(src: string, config: VimeoConfig) {
  const parsed = parseVimeoSource(src);
  if (!parsed) return null;
  const baseUrl = parsed.kind === 'event' ? EMBED_EVENT_BASE : EMBED_VIDEO_BASE;
  const path = parsed.kind === 'event' ? `${baseUrl}/${parsed.id}/embed` : `${baseUrl}/${parsed.id}`;
  const url = `${path}${parsed.hash ? `?h=${parsed.hash}` : ''}` as VimeoUrl;
  return { url, ...config } as LoadVideoOptions;
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
