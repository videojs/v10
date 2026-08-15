// Adapted from `twitch-video-element` from `muxinc/media-elements`,
// ported to TypeScript and reshaped as a media host to fit the v10
// media-host architecture (mirrors `dom/youtube`).
//
// Source: https://github.com/muxinc/media-elements
// License: MIT

import { createPublicPromise, type PublicPromise } from '@videojs/utils/function';
import { deepEqual } from '@videojs/utils/object';
import { isNumber, isUndefined } from '@videojs/utils/predicate';
import { EMPTY_TEXT_TRACKS, EMPTY_TIME_RANGES } from '../../core/constants';
import { MediaError } from '../../core/media-error';
import type { Video } from '../../core/types';
import { MediaPlayedRangesMixin } from '../media-played-ranges';
import { createTimeRange } from '../utils';
import {
  COMMAND_PAUSE,
  COMMAND_PLAY,
  COMMAND_SEEK,
  COMMAND_SET_CHANNEL,
  COMMAND_SET_MUTED,
  COMMAND_SET_VIDEO,
  COMMAND_SET_VOLUME,
  EMBED_NAMESPACE,
  isTwitchMessage,
  PLAYBACK_BUFFERING,
  PLAYBACK_ENDED,
  PLAYBACK_PLAYING,
  PLAYER_PROXY_NAMESPACE,
  TWITCH_PLAYER_ORIGIN,
  type TwitchCommandMessage,
  type TwitchPlaybackState,
  type TwitchPlayerState,
} from './player-api';
import { twitchMediaDefaultProps } from './props';
import { buildTwitchIframeSrc, parseTwitchSource, type TwitchSource } from './source';

const TwitchMediaBase = MediaPlayedRangesMixin(EventTarget);

/**
 * @fires sourcechange - Fired when `source` changes, either directly or by resolving a new `src`. Read `source` for the new value.
 */
export class TwitchMedia extends TwitchMediaBase implements Partial<Video> {
  #target: HTMLIFrameElement | null = null;
  /**
   * Listening for the embed's messages is what "having a player" amounts to
   * here, so this doubles as the marker that one exists; aborting it is the
   * whole teardown.
   */
  #messages: AbortController | null = null;
  /** The embed drops every command until it has posted `ready`. */
  #playerReady = false;
  /** A load was requested before the embed was ready; replay it on `ready`. */
  #pendingLoad = false;
  /** A rebuilt embed is on its way; the one being replaced can still be talking. */
  #rebuilding = false;
  #loadComplete = createPublicPromise<void>();
  /** Guards deferred work across attach/detach cycles. */
  #attachId = 0;
  /** The embed URL currently in the iframe, or `''` when the iframe brought its own. */
  #embedSrc = '';

  #src = twitchMediaDefaultProps.src;
  #autoplay = twitchMediaDefaultProps.autoplay;
  #defaultMuted = twitchMediaDefaultProps.defaultMuted;
  #loop = twitchMediaDefaultProps.loop;
  #controls = twitchMediaDefaultProps.controls;
  #playsInline = twitchMediaDefaultProps.playsInline;
  #preload = twitchMediaDefaultProps.preload;
  #poster = twitchMediaDefaultProps.poster;
  #source: TwitchSource | null = twitchMediaDefaultProps.source;

  /** Which kind of thing is loaded; a live channel behaves unlike a VOD. */
  #kind: 'video' | 'channel' | null = null;
  /** Last playback state the embed reported; null until it reports one. */
  #playback: TwitchPlaybackState | null = null;
  #paused = true;
  #seeking = false;
  #loaded = false;
  #currentTime = 0;
  #duration = Number.NaN;
  #volume = 1;
  #muted = false;
  #playbackRate = 1;
  #progress = 0;
  #readyState = READY_STATE_HAVE_NOTHING;
  #error: MediaError | null = null;
  #isFullscreen = false;

  static PLAYER_SOFTWARE_NAME = 'twitch-video';

  /**
   * The embed's own window. Twitch ships no SDK — every command is a message
   * posted to this window — so it is the closest thing to a player object there
   * is, and the only handle worth exposing. Null until an embed is bound and the
   * iframe is in a document.
   */
  get engine(): Window | null {
    return this.#messages ? (this.#target?.contentWindow ?? null) : null;
  }

  get target(): HTMLIFrameElement | null {
    return this.#target;
  }

  /**
   * Bind the iframe hosting the embed. The embed follows as soon an embed URL
   * can be resolved, which is not always now: a framework that creates the
   * element before setting `src` attaches an iframe with nothing to embed yet,
   * and `load()` picks it up once a source arrives.
   */
  attach(target: HTMLIFrameElement | null): void {
    if (!target || this.#target === target) return;
    if (this.#target) this.detach();
    this.#target = target;
    this.#beginLoad();
    this.#createPlayer();
  }

  detach(): void {
    if (!this.#target) return;
    this.#attachId++;
    // The `message` listener is on the host window, which outlives the iframe,
    // so dropping it here is what keeps a detached embed from driving state.
    this.#messages?.abort();
    this.#messages = null;
    this.#playerReady = false;
    this.#pendingLoad = false;
    this.#rebuilding = false;
    this.#embedSrc = '';
    this.#target = null;
    // Unblock callers awaiting load; they re-check the embed (now gone) and no-op.
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
  /** Twitch VOD or channel URL. Setting it re-derives `source`, carrying its embed parameters over. */
  set src(value) {
    const { engine } = this.#source ?? {};
    const next: TwitchSource = { ...(engine && { engine }), ...(value && { src: value }) };

    // Everything happens in the `source` setter, so there is one path for storing
    // it, deciding on a load, and dispatching `sourcechange`.
    this.source = Object.keys(next).length > 0 ? next : null;
  }

  get currentSrc() {
    // The `src` property resolves an empty attribute to the document URL, so only
    // the attribute can report an embed that hasn't been built yet as empty.
    return this.#target?.getAttribute('src') ?? '';
  }

  get readyState() {
    return this.#readyState;
  }

  /** Reload the current source, swapping it into the running embed where possible. */
  async load() {
    if (!this.#messages || !this.#playerReady) {
      // Commands are dropped before the embed posts `ready`; replay the load
      // then. A cleared src replays too, so the barrier below always gets settled.
      this.#pendingLoad = !!this.#target;
      // The target can be attached before it has anything to embed, in which case
      // this load is what finally builds it.
      if (this.#target && !this.#messages) {
        // The barrier `attach()` opened was settled when there was nothing to
        // embed, so this load needs one of its own — otherwise `play()` runs
        // before the embed it is waiting for exists.
        const load = this.#beginLoad();
        // Wait a microtask: a framework sets `src` and the props that shape the
        // embed in whatever order it likes, and the embed URL is only built once,
        // so it has to see all of them.
        await Promise.resolve();
        // A later load took over while waiting; building the embed is its job now.
        if (load !== this.#loadComplete) return;
        // The embed is built from the current source, so `ready` has nothing to replay.
        this.#pendingLoad = false;
        this.#createPlayer();
      }
      return;
    }
    const load = this.#beginLoad();
    // Reset before bailing on an empty src: a cleared source has nothing to load,
    // but what we report about the old video still has to go.
    this.#resetState();
    if (!this.#src) {
      // The embed has to stop too. Left running it keeps playing, and its state
      // messages write what was just cleared straight back.
      load.resolve();
      this.#sendCommand(COMMAND_PAUSE);
      return;
    }
    this.dispatchEvent(new Event('emptied'));
    this.dispatchEvent(new Event('loadstart'));
    const parsed = parseTwitchSource(this.#src);
    if (!parsed) {
      this.#error = new MediaError(`Unrecognized Twitch source: ${this.#src}`, MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED);
      this.dispatchEvent(new Event('error'));
      // Unblock callers awaiting load so play()/fullscreen don't hang.
      load.resolve();
      return;
    }
    this.#kind = parsed.kind;
    const nextEmbedSrc = buildTwitchIframeSrc(this.#src, this.#snapshotProps());

    // `SET_VIDEO`/`SET_CHANNEL` swap the content without tearing the embed (and
    // its session) down, so they are preferred. Everything except *which* video
    // or channel is playing rides on the embed URL, though, so only a change
    // that is nothing but the content can be commanded; anything else — a
    // changed embed parameter, or an iframe whose URL we never built and so
    // cannot compare — has to rebuild the iframe.
    if (isContentOnlyChange(this.#embedSrc, nextEmbedSrc)) {
      this.#embedSrc = nextEmbedSrc;
      if (parsed.kind === 'video') this.#sendCommand(COMMAND_SET_VIDEO, `v${parsed.id}`);
      else this.#sendCommand(COMMAND_SET_CHANNEL, parsed.channel);
      return;
    }

    this.#embedSrc = nextEmbedSrc;
    // A rebuilt embed posts `ready` again, which is what completes this load.
    this.#playerReady = false;
    this.#rebuilding = true;
    if (this.#target) this.#target.src = nextEmbedSrc;
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
    // Until the embed describes itself, our own play()/pause() calls are the
    // only answer there is.
    if (!this.#playback) return this.#paused;
    // Buffering is playing that is waiting; everything else the embed can be —
    // loaded but not started, stopped, finished — is paused.
    return this.#playback !== PLAYBACK_PLAYING && this.#playback !== PLAYBACK_BUFFERING;
  }

  get ended() {
    // A live channel never ends. Twitch reports the stream going away as
    // `offline`, which is re-dispatched under its own name rather than dressed
    // up as the end of a video that has no end.
    if (this.#kind === 'channel') return false;
    return this.#playback === PLAYBACK_ENDED;
  }

  get seeking() {
    return this.#seeking;
  }

  async play() {
    await this.#loadComplete;
    // The embed still holds the paused video, so playing it would resume a
    // source that was cleared.
    if (!this.#src) return;
    this.#paused = false;
    this.#sendCommand(COMMAND_PLAY);
  }

  pause() {
    this.#paused = true;
    this.#sendCommand(COMMAND_PAUSE);
  }

  get currentTime() {
    return this.#currentTime;
  }
  set currentTime(value) {
    if (this.#currentTime === value) return;
    this.#currentTime = value;
    this.#afterLoad(() => this.#sendCommand(COMMAND_SEEK, value));
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
    // Nothing else will announce this. A snapshot is read as a patch against
    // what is already reported, so the embed echoing the level it was just told
    // to take reads as unchanged and says nothing; the write is the change, and
    // it is announced here the way a media element announces its own.
    this.dispatchEvent(new Event('volumechange'));
    // The embed takes the same 0–1 range `HTMLMediaElement` does.
    this.#afterLoad(() => this.#sendCommand(COMMAND_SET_VOLUME, value));
  }

  get muted() {
    return this.#muted;
  }
  set muted(value) {
    if (this.#muted === value) return;
    this.#muted = value;
    // Announced here for the same reason the level is: the embed's echo of a
    // mute it was told to take is not a change.
    this.dispatchEvent(new Event('volumechange'));
    this.#afterLoad(() => this.#sendCommand(COMMAND_SET_MUTED, value));
  }

  get playbackRate() {
    return this.#playbackRate;
  }
  set playbackRate(value) {
    // The embed has no rate command, so this is reported back but never applied.
    this.#playbackRate = value;
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
    // The embed has no loop parameter; the end of a VOD restarts it instead.
    this.#loop = value;
  }

  get controls() {
    return this.#controls;
  }
  set controls(value) {
    // Which chrome the embed draws is fixed in its URL, so upstream rebuilds the
    // iframe to change it. Not here: the player draws its own controls over the
    // embed, and losing the session — playback restarts from zero — to hide a set
    // of controls that were already covered is the worse trade. The next load
    // picks the new value up.
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
   * Structured source: the Twitch VOD or channel URL in `src`, plus embed
   * parameters under `engine.twitch`. Replacing it re-derives `src`; assigning
   * an equivalent source is a no-op.
   */
  get source(): TwitchSource | null {
    return this.#source;
  }
  set source(value: TwitchSource | null) {
    const source = value ?? null;
    // Changing anything takes a new object, so handing the same one back costs
    // nothing.
    if (source === this.#source) return;

    const src = source?.src ?? '';
    const srcChanged = this.#src !== src;
    // Embed parameters are read when the embed URL is built, so a change to them
    // needs a reload of its own even though the source is the same.
    const engineChanged = !deepEqual(this.#source?.engine?.twitch ?? null, source?.engine?.twitch ?? null);

    this.#source = source;
    this.#src = src;

    if (srcChanged || engineChanged) void this.load();

    // Assigning is always a source change, so it is always announced.
    this.dispatchEvent(new Event('sourcechange'));
  }

  get buffered() {
    // `bufferSize` counts the seconds buffered *ahead* of the playhead rather
    // than naming a position, so the range is anchored to `currentTime`.
    return this.#progress > 0
      ? createTimeRange(this.#currentTime, this.#currentTime + this.#progress)
      : EMPTY_TIME_RANGES;
  }

  get seekable() {
    // A live channel reports an infinite duration, which leaves no range to
    // report: the embed exposes no DVR window to seek within.
    return this.#duration > 0 && Number.isFinite(this.#duration)
      ? createTimeRange(0, this.#duration)
      : EMPTY_TIME_RANGES;
  }

  get error() {
    return this.#error;
  }

  get textTracks() {
    // The embed can only be told to turn captions on or off; it never says which
    // tracks exist, so there is nothing to enumerate.
    return EMPTY_TEXT_TRACKS;
  }

  get isFullscreen() {
    return this.#isFullscreen;
  }

  // The embed exposes no fullscreen command, so fullscreen targets the iframe itself.
  async requestFullscreen() {
    // Nothing entered fullscreen if there is no element to request it on, so the
    // flag must not claim otherwise.
    if (!this.#target?.requestFullscreen) return;
    await this.#target.requestFullscreen();
    this.#isFullscreen = true;
  }

  async exitFullscreen() {
    const doc = globalThis.document;
    if (doc?.fullscreenElement && doc.fullscreenElement === this.#target) {
      await doc.exitFullscreen();
    }
    this.#isFullscreen = false;
  }

  /**
   * Build the embed and start listening to it once a source can be resolved. A
   * target that cannot be resolved yet stays unbound and settles the load it was
   * given; the next `load()` retries.
   *
   * @returns Whether the embed was bound.
   */
  #createPlayer(): boolean {
    const target = this.#target;
    if (!target || this.#messages) return false;

    // The `src` property resolves an empty attribute to the document URL, so it
    // cannot tell an embed apart from a placeholder; the attribute can.
    const existingSrc = target.getAttribute('src');
    if (!existingSrc) {
      const initialSrc = buildTwitchIframeSrc(this.#src, this.#snapshotProps());
      // No embed means no `ready` is coming to settle this load.
      if (!initialSrc) {
        this.#loadComplete.resolve();
        return false;
      }
      target.src = initialSrc;
    } else {
      // A URL built where there was no `location` — server rendering — names only
      // the hostnames that were configured, and Twitch refuses to play in a page
      // its URL never named. Nothing else about a URL we did not build is ours to
      // second-guess.
      const withParent = withPageParent(existingSrc);
      if (withParent !== existingSrc) target.src = withParent;
    }
    this.#kind = parseTwitchSource(this.#src)?.kind ?? null;
    // An iframe that arrived with its own URL is still worth remembering: a
    // later source change compares against it to decide whether it can be
    // swapped in place.
    this.#embedSrc = target.getAttribute('src') ?? '';

    const attachId = this.#attachId;
    this.#messages = new AbortController();
    globalThis.addEventListener('message', (event) => void this.#onMessage(event, attachId), {
      signal: this.#messages.signal,
    });

    this.dispatchEvent(new Event('loadstart'));
    return true;
  }

  /**
   * Whether deferred work belongs to a superseded attach. The settle delay below
   * outlives a `detach()`, so anything the embed reports has to be matched
   * against the attach that bound it before it is allowed to touch state.
   */
  #isStale(attachId: number) {
    return attachId !== this.#attachId;
  }

  /** Defer a command until `loadComplete` resolves, dropping it if the embed is gone. */
  #afterLoad(fn: () => void) {
    this.#loadComplete.then(
      () => {
        if (!this.#messages) return;
        fn();
      },
      () => {}
    );
  }

  #sendCommand(command: number, params?: unknown) {
    const embedWindow = this.#target?.contentWindow;
    if (!embedWindow) return;
    const message: TwitchCommandMessage = { namespace: PLAYER_PROXY_NAMESPACE, eventName: command, params };
    embedWindow.postMessage(message, TWITCH_PLAYER_ORIGIN);
  }

  #snapshotProps() {
    return {
      autoplay: this.#autoplay,
      defaultMuted: this.#defaultMuted,
      loop: this.#loop,
      controls: this.#controls,
      playsInline: this.#playsInline,
      preload: this.#preload || twitchMediaDefaultProps.preload,
      source: this.#source,
    };
  }

  #resetState() {
    this.#kind = null;
    this.#playback = null;
    this.#currentTime = 0;
    this.#duration = Number.NaN;
    this.#muted = false;
    this.#paused = !this.#autoplay;
    this.#playbackRate = 1;
    this.#progress = 0;
    this.#readyState = READY_STATE_HAVE_NOTHING;
    this.#seeking = false;
    this.#loaded = false;
    this.#volume = 1;
    this.#error = null;
    this.#isFullscreen = false;
  }

  async #onMessage(event: MessageEvent, attachId: number) {
    if (this.#isStale(attachId)) return;
    const embedWindow = this.#target?.contentWindow;
    // Any frame on the page can post to this window, so only the embed we bound
    // is allowed to drive state.
    if (!embedWindow || event.source !== embedWindow) return;
    const { data } = event;
    if (!isTwitchMessage(data)) return;

    if (data.namespace === EMBED_NAMESPACE) {
      // The lifecycle event lands before the state snapshot that explains it, so
      // give the snapshot a moment to arrive before acting on the event.
      await new Promise((resolve) => setTimeout(resolve, STATE_SETTLE_MS));
      // The wait outlives a detach, and the embed it belonged to may be gone.
      if (this.#isStale(attachId)) return;
      this.#onEmbedEvent(data.eventName);
      return;
    }
    if (data.eventName === 'UPDATE_STATE') this.#onUpdateState(data.params ?? {});
  }

  #onEmbedEvent(eventName: string) {
    // Nothing is loaded, so nothing the embed reports is about this media.
    // Upstream stops listening outright when the source is cleared; the iframe is
    // not ours to remove, so the stopped embed is ignored here instead. `ready`
    // is the exception: a load that arrived before the embed could hear it is
    // replayed on `ready`, and clearing the source is such a load.
    if (eventName !== 'ready' && !this.#src) return;

    switch (eventName) {
      case 'ready': {
        this.#playerReady = true;
        this.#rebuilding = false;
        if (this.#pendingLoad) {
          // The embed was built from a stale src; skip its metadata and reload.
          this.#pendingLoad = false;
          void this.load();
          return;
        }
        this.#onLoaded();
        return;
      }
      case 'seek': {
        this.#seeking = true;
        this.dispatchEvent(new Event('seeking'));
        return;
      }
      case 'playing': {
        if (this.#seeking) {
          this.#seeking = false;
          this.dispatchEvent(new Event('seeked'));
        }
        this.#readyState = READY_STATE_HAVE_FUTURE_DATA;
        this.dispatchEvent(new Event('playing'));
        return;
      }
      case 'ended': {
        // Dispatched for a live channel too, the way a native element ends when a
        // live resource runs out; only `ended` the *state* refuses to latch, so
        // that a channel between streams does not read as a finished video.
        this.dispatchEvent(new Event('ended'));
        // No loop parameter and no repeat command, so a repeat is a seek back to
        // the start followed by a play.
        if (this.#loop) {
          this.currentTime = 0;
          void this.play();
        }
        return;
      }
      default: {
        // `play`, `pause`, `offline`, `online`, … all read as media events under
        // the names the embed already gives them.
        this.dispatchEvent(new Event(eventName));
      }
    }
  }

  /**
   * Apply a player state snapshot. The embed sends only what changed, so an
   * absent field means "unchanged", not "unset".
   */
  #onUpdateState(state: TwitchPlayerState) {
    // An iframe keeps its window across a `src` change, so the document on its way
    // out still passes for the embed. What it reports describes the content being
    // replaced, and completing this load on it would hand callers a player that
    // is not there yet; the rebuilt embed's `ready` is what completes it.
    if (this.#rebuilding) return;
    // With no source loaded there is nothing for a snapshot to describe, and
    // applying one would write the cleared video's time and duration straight
    // back — the stopped embed keeps reporting them.
    if (!this.#src) return;

    // A rebuilt embed reports `ready`, but a swapped one reports nothing at all —
    // it simply starts describing the new content — so the first snapshot after
    // a load is what completes it. Only once the embed has reported `ready`,
    // though: snapshots start arriving before it does, and completing the load on
    // one of those would release the commands waiting on it into an embed that
    // drops them.
    if (this.#playerReady && !this.#loaded) this.#onLoaded();

    if (state.playback && state.playback !== this.#playback) {
      // A stall reaches us only as a playback state — no lifecycle event says the
      // embed ran dry — so entering that state is the whole of `waiting`.
      if (state.playback === PLAYBACK_BUFFERING) this.dispatchEvent(new Event('waiting'));
      this.#playback = state.playback;
    }

    // A live channel has no length to report, and the seconds-since-live Twitch
    // sends in its place is not one, so `#onLoaded` fixed it at Infinity.
    if (this.#kind !== 'channel' && isNumber(state.duration) && state.duration !== this.#duration) {
      this.#duration = state.duration;
      this.dispatchEvent(new Event('durationchange'));
    }

    if (isNumber(state.currentTime) && state.currentTime !== this.#currentTime) {
      this.#currentTime = state.currentTime;
      this.dispatchEvent(new Event('timeupdate'));
    }

    // Only a level or mute that differs from what is already reported is a
    // change: the rest is the embed echoing a command back, which the setter
    // that sent it has announced already.
    const volumeChanged = isNumber(state.volume) && state.volume !== this.#volume;
    const mutedChanged = !isUndefined(state.muted) && state.muted !== this.#muted;
    if (volumeChanged || mutedChanged) {
      if (isNumber(state.volume)) this.#volume = state.volume;
      if (!isUndefined(state.muted)) this.#muted = state.muted;
      this.dispatchEvent(new Event('volumechange'));
    }

    const bufferSize = state.stats?.videoStats?.bufferSize;
    if (isNumber(bufferSize) && bufferSize !== this.#progress) {
      this.#progress = bufferSize;
      // Buffered media ahead of a playing head is as far as the embed lets us
      // see; it never says the whole thing has arrived.
      if (this.#readyState >= READY_STATE_HAVE_FUTURE_DATA && bufferSize > 0) {
        this.#readyState = READY_STATE_HAVE_ENOUGH_DATA;
      }
      this.dispatchEvent(new Event('progress'));
    }
  }

  #onLoaded() {
    if (this.#loaded) return;
    this.#loaded = true;
    this.#readyState = READY_STATE_HAVE_METADATA;
    this.dispatchEvent(new Event('loadedmetadata'));
    if (this.#kind === 'channel') {
      // Live: there is no end to seek to, so report it the way a live
      // `HTMLMediaElement` does instead of waiting for a duration that is never
      // coming.
      this.#duration = Number.POSITIVE_INFINITY;
      this.dispatchEvent(new Event('durationchange'));
    }
    this.dispatchEvent(new Event('loadcomplete'));
    this.#loadComplete.resolve();
  }
}

/**
 * Whether two embed URLs differ only in which video or channel they name, which
 * is the one difference the embed can be commanded through. An unbuilt or
 * unparsable URL is no comparison at all, so it answers no.
 */
function isContentOnlyChange(current: string, next: string): boolean {
  const currentBase = withoutContent(current);
  const nextBase = withoutContent(next);
  return currentBase !== null && currentBase === nextBase;
}

/**
 * Name the page as one of the embed's parents when the URL does not already. The
 * embed checks its frame's ancestors against `parent` and refuses to play when
 * the page is missing from it, which is what a URL built without a `location` —
 * server rendering — leaves behind.
 */
function withPageParent(embedSrc: string): string {
  const hostname = globalThis.location?.hostname;
  if (!hostname) return embedSrc;
  let url: URL;
  try {
    url = new URL(embedSrc);
  } catch {
    return embedSrc;
  }
  // Only the embed reads `parent`; an iframe pointed anywhere else is not ours.
  if (url.origin !== TWITCH_PLAYER_ORIGIN) return embedSrc;
  if (url.searchParams.getAll('parent').includes(hostname)) return embedSrc;
  url.searchParams.append('parent', hostname);
  return url.toString();
}

function withoutContent(embedSrc: string): string | null {
  if (!embedSrc) return null;
  try {
    const url = new URL(embedSrc);
    url.searchParams.delete('video');
    url.searchParams.delete('channel');
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * The embed posts its lifecycle events and the player state behind them
 * separately, in that order, so acting on an event means waiting out this gap
 * first. Ten milliseconds is what `twitch-video-element` settled on.
 */
const STATE_SETTLE_MS = 10;

const READY_STATE_HAVE_NOTHING = 0;
const READY_STATE_HAVE_METADATA = 1;
const READY_STATE_HAVE_FUTURE_DATA = 3;
const READY_STATE_HAVE_ENOUGH_DATA = 4;
