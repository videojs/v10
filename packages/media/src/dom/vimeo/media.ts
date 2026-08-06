import { createPublicPromise, type PublicPromise } from '@videojs/utils/function';
import { deepEqual } from '@videojs/utils/object';
import { isNull, isString, isUndefined } from '@videojs/utils/predicate';
import VimeoPlayer, { type LoadVideoOptions, type VimeoEmbedParameters, type VimeoUrl } from '@vimeo/player';
import { EMPTY_TEXT_TRACKS, EMPTY_TIME_RANGES } from '../../core/constants';

import type { ErrorLike, MediaPreloadType, TextTrackListLike, Video } from '../../core/types';
import { MediaPlayedRangesMixin } from '../media-played-ranges';
import { createTimeRange, serializeEmbedParams } from '../utils';

export type { default as VimeoPlayerApi } from '@vimeo/player';

/**
 * Vimeo engine options. Embed parameters are Vimeo's engine configuration, so
 * they are forwarded verbatim to `@vimeo/player` and to the embed URL.
 */
export interface VimeoEngineConfig extends VimeoEmbedParameters {
  referrerPolicy?: ReferrerPolicy;
}

/** Structured Vimeo source: which source to play, plus how to play it. */
export interface VimeoSource {
  /** Vimeo URL or id. Mirrors the host's `src` property. */
  src?: string | undefined;
  /** Vimeo's own embed parameters, passed through untouched. */
  engine?: VimeoEngineConfig | undefined;
}

/** Parsed pieces of a Vimeo source URL. */
export interface ParsedVimeoSource {
  id: number;
  /** `'video'` for regular clips, `'event'` for live events. */
  kind: 'video' | 'event';
  /** Unlisted-video / event hash (the `h` parameter). */
  hash: string | null;
}

export interface VimeoMediaProps {
  src: string;
  autoplay: boolean;
  defaultMuted: boolean;
  muted: boolean;
  loop: boolean;
  controls: boolean;
  playsInline: boolean;
  preload: MediaPreloadType;
  poster: string;
  source: VimeoSource | null;
}

export const vimeoMediaDefaultProps: VimeoMediaProps = {
  src: '',
  autoplay: false,
  defaultMuted: false,
  muted: false,
  loop: false,
  controls: false,
  playsInline: true,
  preload: 'metadata',
  poster: '',
  source: null,
};

const VimeoMediaBase = MediaPlayedRangesMixin(EventTarget);

/**
 * @fires sourcechange - Fired when `source` changes, either directly or by resolving a new `src`. Read `source` for the new value.
 */
export class VimeoMedia extends VimeoMediaBase implements Partial<Video> {
  #target: HTMLIFrameElement | null = null;
  #player: VimeoPlayer | null = null;
  /**
   * Barrier for the load in progress. Player calls wait on it, and its identity
   * doubles as the load's identity — a late response compares the barrier it
   * started with against this one to learn whether it still owns the load.
   */
  #loadComplete = createPublicPromise<void>();

  #src = vimeoMediaDefaultProps.src;
  #autoplay = vimeoMediaDefaultProps.autoplay;
  #defaultMuted = vimeoMediaDefaultProps.defaultMuted;
  #loop = vimeoMediaDefaultProps.loop;
  #controls = vimeoMediaDefaultProps.controls;
  #playsInline = vimeoMediaDefaultProps.playsInline;
  #preload = vimeoMediaDefaultProps.preload;
  #poster = vimeoMediaDefaultProps.poster;
  #source: VimeoSource | null = vimeoMediaDefaultProps.source;

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
  #title = '';
  #error: ErrorLike | null = null;
  #isFullscreen = false;
  #isPictureInPicture = false;
  #disablePictureInPicture = false;
  #textTracksHost: HTMLVideoElement | null = null;
  #textTracksDisconnect: AbortController | null = null;

  static PLAYER_SOFTWARE_NAME = 'vimeo-video';

  /** Underlying `@vimeo/player` instance (null before attach). */
  get engine() {
    return this.#player;
  }

  get target(): HTMLIFrameElement | null {
    return this.#target;
  }

  /** Bind the iframe hosting the embed, creating a `@vimeo/player` instance. */
  attach(target: HTMLIFrameElement | null): void {
    if (!target || this.#target === target) return;
    if (this.#target) this.detach();
    this.#target = target;
    if (!target.src) {
      const initialSrc = buildVimeoIframeSrc(this.#src, this.#snapshotProps());
      if (initialSrc) target.src = initialSrc;
    }
    this.#beginLoad();
    this.#player = new VimeoPlayer(target);
    this.#bindPlayerEvents(this.#player);
    this.#setupTextTracks(this.#player);
    this.dispatchEvent(new Event('loadstart'));
  }

  detach(): void {
    if (!this.#target) return;
    this.#teardownTextTracks();
    this.#player?.destroy().catch(() => {});
    this.#player = null;
    this.#target = null;
    // No player left to finish a load, so nothing should still be waiting on one.
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
  /** Vimeo URL or id. Setting it re-derives `source`, carrying its embed options over. */
  set src(value) {
    const { engine } = this.#source ?? {};
    const next: VimeoSource = { ...(engine && { engine }), ...(value && { src: value }) };

    // Everything happens in the `source` setter, so there is one path for storing
    // it, deciding on a load, and dispatching `sourcechange`.
    this.source = Object.keys(next).length > 0 ? next : null;
  }

  get currentSrc() {
    return this.#target?.src ?? '';
  }

  get readyState() {
    return this.#readyState;
  }

  /** Reload the current source via Vimeo's `loadVideo`; no-op until `attach()`. */
  async load() {
    if (!this.#player) return;
    const load = this.#beginLoad();
    // Reset before bailing on an empty src: a cleared source has nothing to load,
    // but what we report about the old video still has to go.
    this.#resetState();
    if (!this.#src) {
      // The embed has to stop too. Left running it keeps playing and writes the
      // state just cleared straight back through its own events.
      load.resolve();
      await this.#player.unload().catch(() => {});
      return;
    }
    this.dispatchEvent(new Event('emptied'));
    this.dispatchEvent(new Event('loadstart'));
    const loadOptions = toLoadVideoOptions(this.#src, this.#source?.engine);
    // An unparsable src never reaches the player, so no `loaded` will ever settle
    // this load.
    if (!loadOptions) {
      load.resolve();
      return;
    }
    // Vimeo dispatches an `error` event separately on failure.
    await this.#player.loadVideo(loadOptions).catch(() => {});
  }

  /**
   * Take over as the current load, returning its barrier. Settling the outgoing
   * one is what keeps a superseded load from stranding callers that are already
   * waiting; every exit from `load()` settles the barrier it was handed.
   */
  #beginLoad(): PublicPromise<void> {
    this.#loadComplete.resolve();
    this.#loadComplete = createPublicPromise<void>();
    return this.#loadComplete;
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
    await this.#player?.play();
  }

  pause() {
    void this.#player?.pause().catch(() => {});
  }

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

  get poster() {
    return this.#poster;
  }
  set poster(value) {
    this.#poster = value;
  }

  /**
   * Structured source: the Vimeo URL or ID in `src`, plus embed options under
   * `engine`. Replacing it re-derives `src`; assigning an equivalent source is
   * a no-op.
   */
  get source(): VimeoSource | null {
    return this.#source;
  }
  set source(value: VimeoSource | null) {
    const source = value ?? null;
    // Changing anything takes a new object, so handing the same one back costs
    // nothing.
    if (source === this.#source) return;

    const src = source?.src ?? '';
    const srcChanged = this.#src !== src;
    // Embed options are read when the video is loaded, so a change to them needs
    // a reload of its own even though the URL is the same.
    const engineChanged = !deepEqual(this.#source?.engine ?? null, source?.engine ?? null);

    this.#source = source;
    this.#src = src;

    if (srcChanged || engineChanged) void this.load();

    // Assigning is always a source change, so it is always announced.
    this.dispatchEvent(new Event('sourcechange'));
  }

  /**
   * Metadata Vimeo reports about the loaded video, keyed by what it is — `title`
   * for now. Unlike a Mux source, none of it can be derived from `src`; the embed
   * has to report it, so a key is absent until then. Read it again after
   * `loadedmetadata`, and expect it empty across a source change.
   */
  get contentData(): Record<string, string> {
    return { ...(this.#title && { title: this.#title }) };
  }

  get buffered() {
    return this.#progress > 0 ? createTimeRange(0, this.#progress) : EMPTY_TIME_RANGES;
  }

  get seekable() {
    return this.#duration > 0 && Number.isFinite(this.#duration)
      ? createTimeRange(0, this.#duration)
      : EMPTY_TIME_RANGES;
  }

  get error() {
    return this.#error;
  }

  get textTracks() {
    this.#textTracksHost ??= globalThis.document?.createElement('video') ?? null;
    return (this.#textTracksHost?.textTracks as TextTrackListLike) ?? EMPTY_TEXT_TRACKS;
  }

  get videoWidth() {
    return this.#videoWidth;
  }

  get videoHeight() {
    return this.#videoHeight;
  }

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
    await this.#player?.requestPictureInPicture?.().then(() => {
      this.#isPictureInPicture = true;
    }, console.error);
  }

  async exitPictureInPicture() {
    await this.#loadComplete;
    await this.#player?.exitPictureInPicture?.().then(() => {
      this.#isPictureInPicture = false;
    }, console.error);
  }

  /** Defer a player call until `loadComplete` resolves, swallowing rejections. */
  #afterLoad(fn: (player: VimeoPlayer) => Promise<unknown>) {
    this.#loadComplete.then(
      () => this.#player && void fn(this.#player).catch(() => {}),
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
      preload: this.#preload || vimeoMediaDefaultProps.preload,
      source: this.#source,
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
    this.#title = '';
    this.#volume = 1;
    this.#error = null;
    this.#videoWidth = Number.NaN;
    this.#videoHeight = Number.NaN;
    this.#isFullscreen = false;
    this.#isPictureInPicture = false;
  }

  async #onLoaded() {
    const load = this.#loadComplete;
    this.#readyState = READY_STATE_HAVE_METADATA;
    const player = this.#player;
    if (player) {
      // Each value falls back to the current one so a single failure isn't fatal.
      const [muted, volume, duration, title] = await Promise.all([
        player.getMuted().catch(() => this.#muted),
        player.getVolume().catch(() => this.#volume),
        player.getDuration().catch(() => this.#duration),
        player.getVideoTitle().catch(() => this.#title),
      ]);
      // A source change or clear during the reads means these describe a video
      // this media no longer has. `#beginLoad` settled this load on the way out,
      // and the load that replaced it settles on its own `loaded`.
      if (load !== this.#loadComplete) return;
      this.#muted = muted;
      this.#volume = volume;
      this.#duration = duration;
      this.#title = title;
    }
    for (const type of ['loadedmetadata', 'durationchange', 'volumechange', 'loadcomplete']) {
      this.dispatchEvent(new Event(type));
    }
    load.resolve();
  }

  #bindPlayerEvents(player: VimeoPlayer) {
    const emit = (type: string) => this.dispatchEvent(new Event(type));
    player.on('loaded', () => this.#onLoaded());
    player.on('bufferstart', () => emit('waiting'));
    player.on('play', () => {
      this.#paused = false;
      emit('play');
    });
    player.on('playing', () => {
      this.#readyState = READY_STATE_HAVE_FUTURE_DATA;
      this.#paused = false;
      emit('playing');
    });
    player.on('seeking', () => {
      this.#seeking = true;
      emit('seeking');
    });
    player.on('seeked', () => {
      this.#seeking = false;
      emit('seeked');
    });
    player.on('pause', () => {
      this.#paused = true;
      emit('pause');
    });
    player.on('ended', () => {
      this.#paused = true;
      this.#ended = true;
      emit('ended');
    });
    player.on('playbackratechange', ({ playbackRate }) => {
      this.#playbackRate = playbackRate;
      emit('ratechange');
    });
    player.on('volumechange', ({ volume }) => {
      this.#volume = volume;
      emit('volumechange');
    });
    player.on('durationchange', ({ duration }) => {
      this.#duration = duration;
      emit('durationchange');
    });
    player.on('timeupdate', ({ seconds, duration }) => {
      this.#currentTime = seconds;
      if (Number.isFinite(duration) && duration !== this.#duration) this.#duration = duration;
      emit('timeupdate');
    });
    player.on('progress', ({ seconds }) => {
      this.#progress = seconds;
      emit('progress');
    });
    player.on('resize', ({ videoWidth, videoHeight }) => {
      this.#videoWidth = videoWidth;
      this.#videoHeight = videoHeight;
      emit('resize');
    });
    player.on('fullscreenchange', ({ fullscreen }) => {
      this.#isFullscreen = fullscreen;
      emit('fullscreenchange');
    });
    player.on('enterpictureinpicture', () => {
      this.#isPictureInPicture = true;
      emit('enterpictureinpicture');
    });
    player.on('leavepictureinpicture', () => {
      this.#isPictureInPicture = false;
      emit('leavepictureinpicture');
    });
    player.on('error', () => {
      this.#error = { code: 1, message: 'Vimeo playback error' };
      emit('error');
      // Unblock callers awaiting load so play()/fullscreen/PiP don't hang.
      this.#loadComplete.resolve();
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

/** Extract a Vimeo video id from a numeric id, vimeo.com URL, or player URL. */
export function parseVimeoVideoId(src: string) {
  return parseVimeoSource(src)?.id ?? null;
}

/**
 * Parse a Vimeo source string. Recognizes numeric ids, `vimeo.com/<id>`,
 * `vimeo.com/video/<id>`, `player.vimeo.com/video/<id>`, `vimeo.com/event/<id>`
 * (live events), and unlisted/event hashes via `?h=` or a `/<hash>` segment.
 */
export function parseVimeoSource(src: string): ParsedVimeoSource | null {
  if (!src) return null;
  if (/^\d+$/.test(src)) return { id: Number(src), kind: 'video', hash: null };
  const match = MATCH_SRC.exec(src);
  if (!match) return null;
  const kind = match[1] === 'event/' ? 'event' : 'video';
  let queryHash: string | null = null;
  try {
    queryHash = new URL(src).searchParams.get('h');
  } catch {
    // src isn't a valid URL — ignore.
  }
  return { id: Number(match[2]), kind, hash: queryHash ?? match[3] ?? null };
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
    ...(props.source?.engine ?? undefined),
  };
  if (parsed.kind === 'event') {
    const hashPath = parsed.hash ? `/${parsed.hash}` : '';
    delete params.h;
    return `${EMBED_EVENT_BASE}/${parsed.id}/embed${hashPath}?${serializeEmbedParams(params)}`;
  }
  return `${EMBED_VIDEO_BASE}/${parsed.id}?${serializeEmbedParams(params)}`;
}

const EMBED_VIDEO_BASE = 'https://player.vimeo.com/video';
const EMBED_EVENT_BASE = 'https://vimeo.com/event';
const MATCH_SRC = /vimeo\.com\/(video\/|event\/)?(\d+)(?:\/([\w-]+))?/;

const READY_STATE_HAVE_NOTHING = 0;
const READY_STATE_HAVE_METADATA = 1;
const READY_STATE_HAVE_FUTURE_DATA = 3;

function toLoadVideoOptions(src: string, engine?: VimeoEngineConfig) {
  const parsed = parseVimeoSource(src);
  if (!parsed) return null;
  const base = parsed.kind === 'event' ? `${EMBED_EVENT_BASE}/${parsed.id}/embed` : `${EMBED_VIDEO_BASE}/${parsed.id}`;
  const url = `${base}${parsed.hash ? `?h=${parsed.hash}` : ''}` as VimeoUrl;
  return { url, ...engine } as LoadVideoOptions;
}
