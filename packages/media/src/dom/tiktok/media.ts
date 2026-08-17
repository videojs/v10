// Adapted from `tiktok-video-element` in https://github.com/muxinc/media-elements (MIT),
// ported to TypeScript and reshaped as a media host (mirrors `dom/youtube`).

import { createPublicPromise, type PublicPromise, tryCall } from '@videojs/utils/function';
import { deepEqual } from '@videojs/utils/object';
import { isNumber, isUndefined } from '@videojs/utils/predicate';
import { EMPTY_TEXT_TRACKS, EMPTY_TIME_RANGES } from '../../core/constants';
import { MediaError } from '../../core/media-error';
import type { Video } from '../../core/types';
import { MediaPlayedRangesMixin } from '../media-played-ranges';
import { createTimeRange } from '../utils';
import {
  createTikTokPlayerCommand,
  ERROR_AUTOPLAY,
  ERROR_CATEGORY_END,
  ERROR_NETWORK_CATEGORY,
  ERROR_PLAYER_CATEGORY,
  isTikTokCurrentTime,
  isTikTokPlayerError,
  isTikTokPlayerMessage,
  PLAYER_TARGET_ORIGIN,
  STATE_BUFFERING,
  STATE_ENDED,
  STATE_INIT,
  STATE_PAUSED,
  STATE_PLAYING,
  type TikTokPlayerCommand,
  type TikTokPlayerError,
} from './player-api';
import { tiktokMediaDefaultProps } from './props';
import { buildTikTokIframeSrc, type TikTokSource } from './source';

const TikTokMediaBase = MediaPlayedRangesMixin(EventTarget);

/**
 * @fires sourcechange - Fired when `source` changes, either directly or by resolving a new `src`. Read `source` for the new value.
 */
export class TikTokMedia extends TikTokMediaBase implements Partial<Video> {
  #target: HTMLIFrameElement | null = null;
  #loadComplete = createPublicPromise<void>();
  // Cancels the `message` listener; it lives on `window`, so nothing removes it when the frame goes.
  #messages: AbortController | null = null;
  // Guards messages and deferred embeds across attach/detach cycles.
  #attachId = 0;

  #src = tiktokMediaDefaultProps.src;
  #autoplay = tiktokMediaDefaultProps.autoplay;
  #defaultMuted = tiktokMediaDefaultProps.defaultMuted;
  #loop = tiktokMediaDefaultProps.loop;
  #controls = tiktokMediaDefaultProps.controls;
  #playsInline = tiktokMediaDefaultProps.playsInline;
  #preload = tiktokMediaDefaultProps.preload;
  #poster = tiktokMediaDefaultProps.poster;
  #source: TikTokSource | null = tiktokMediaDefaultProps.source;

  #paused = true;
  #ended = false;
  #seeking = false;
  #loaded = false;
  // The current `src` names no TikTok video, so the embed still holds the last one.
  #srcUnsupported = false;
  // A play asked for before the embed could take one, replayed once it can.
  #playRequested = false;
  #playFired = false;
  #currentTime = 0;
  #duration = Number.NaN;
  #muted = false;
  #readyState = READY_STATE_HAVE_NOTHING;
  #error: MediaError | null = null;
  #isFullscreen = false;

  static PLAYER_SOFTWARE_NAME = 'tiktok-video';

  /** The embed's window. TikTok publishes no player object; commands are posted to the frame. Null until rendered. */
  get engine() {
    return this.#target?.contentWindow ?? null;
  }

  get target(): HTMLIFrameElement | null {
    return this.#target;
  }

  /** Bind the iframe hosting the embed. The embed follows once a `src` resolves, which may be after attach. */
  attach(target: HTMLIFrameElement | null): void {
    if (!target || this.#target === target) return;
    if (this.#target) this.detach();
    this.#target = target;
    this.#listen(target);
    this.#beginLoad();
    this.#createPlayer();
  }

  detach(): void {
    if (!this.#target) return;
    this.#attachId++;
    this.#messages?.abort();
    this.#messages = null;
    this.#target = null;
    // Left set, the next frame to report ready would start playing on its own.
    this.#playRequested = false;
    // Unblock callers awaiting load; they re-check `#target` (now null) and no-op.
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
  /** TikTok URL or id. Setting it re-derives `source`, carrying its player parameters over. */
  set src(value) {
    const { engine } = this.#source ?? {};
    const next: TikTokSource = { ...(engine && { engine }), ...(value && { src: value }) };

    // The `source` setter is the one path for storing it, deciding on a load, and dispatching `sourcechange`.
    this.source = Object.keys(next).length > 0 ? next : null;
  }

  get currentSrc() {
    // The `src` property resolves an empty attribute to the document URL, so only the attribute reports empty.
    return this.#target?.getAttribute('src') ?? '';
  }

  get readyState() {
    return this.#readyState;
  }

  /** Rebuild the embed for the current source; rewriting the iframe URL is the only load the protocol allows. */
  async load() {
    // Nothing to reload without a target, and no load to wait on either.
    if (!this.#target) return;
    const load = this.#beginLoad();
    // Wait a microtask so a framework's `src` and prop writes all land before the URL is built, once.
    await Promise.resolve();
    // A later load took over while waiting; building the embed is its job now.
    if (load !== this.#loadComplete) return;
    const target = this.#target;
    // Detached while waiting; `detach()` already settled this load.
    if (!target) return;

    const embedSrc = this.#src ? buildTikTokIframeSrc(this.#src, this.#snapshotProps()) : '';
    // Reloading the same embed would only discard its position; nothing is cleared, so no lifecycle event is due.
    if (embedSrc && target.getAttribute('src') === embedSrc) {
      // Still fetching means an `onPlayerReady` is coming to settle this load; already loaded means none is.
      if (this.#loaded) load.resolve();
      return;
    }

    // Reset before bailing on an empty src: nothing to load, but the old video's state still has to go.
    this.#resetState();
    // `emptied` announces that reset before the empty-src bail, the one case where the embed reports nothing further.
    this.dispatchEvent(new Event('emptied'));
    if (!this.#src) {
      // Drop the URL too; there is no unload command, and a frame left in place keeps playing and rewrites state.
      load.resolve();
      target.removeAttribute('src');
      return;
    }
    this.dispatchEvent(new Event('loadstart'));
    if (!embedSrc) {
      this.#srcUnsupported = true;
      this.#error = new MediaError(`Unrecognized TikTok source: ${this.#src}`, MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED);
      this.dispatchEvent(new Event('error'));
      // Unblock callers awaiting load so play()/fullscreen don't hang.
      load.resolve();
      // No video to swap to, so pause is all the protocol offers to stop the embed still playing the last one.
      this.#post('pause');
      return;
    }
    // The new frame reports `onPlayerReady`, which is what settles this load.
    target.src = embedSrc;
  }

  // Take over as the current load; settling the outgoing barrier releases its waiters.
  #beginLoad(): PublicPromise<void> {
    this.#loadComplete.resolve();
    this.#loadComplete = createPublicPromise<void>();
    return this.#loadComplete;
  }

  // Whether the embed plays the source the host reports; false once `src` is cleared or unrecognized.
  get #hasSource() {
    return !!this.#src && !this.#srcUnsupported;
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
    // The embed is gone or holds a video no longer reported, so there is nothing to resume.
    if (!this.#hasSource) return;
    // Not deferred: only the embed's own report settles the load, so whichever lands first wins, this or the replay.
    this.#playRequested = true;
    this.#post('play');
  }

  pause() {
    // A pause after a pending play is the later intent, so it cancels the replay rather than racing it.
    this.#playRequested = false;
    this.#post('pause');
  }

  get currentTime() {
    return this.#currentTime;
  }
  set currentTime(value) {
    if (this.#currentTime === value) return;
    this.#seeking = true;
    // Report the requested position now; the embed only reports one periodically, so the seek would look lost.
    this.#currentTime = value;
    this.dispatchEvent(new Event('seeking'));
    this.dispatchEvent(new Event('timeupdate'));
    this.#afterLoad(() => this.#post('seekTo', value));
  }

  get duration() {
    return this.#duration;
  }

  // No volume surface: the embed reports a level but takes no command to set one, and a read-only level would
  // render a slider that cannot move. Mute stays, since `mute` and `unMute` are commands the embed does take.

  get muted() {
    return this.#muted;
  }
  set muted(value) {
    if (this.#muted === value) return;
    this.#muted = value;
    this.#afterLoad(() => this.#post(value ? 'mute' : 'unMute'));
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
    // Seed `muted` until the embed reports its own, and have `onPlayerReady` assert it over the protocol.
    if (!this.#loaded) this.#muted = value;
  }

  get loop() {
    return this.#loop;
  }
  set loop(value) {
    // The embed reads `loop` from the URL it was built with, so a later change is honored by replaying on ENDED.
    this.#loop = value;
  }

  get controls() {
    return this.#controls;
  }
  set controls(value) {
    // Also read from the embed URL, and rebuilding the frame to toggle chrome would restart the video.
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

  /** TikTok URL or id in `src`, player params under `engine.tiktok`. Re-derives `src`; equal sources skip reload. */
  get source(): TikTokSource | null {
    return this.#source;
  }
  set source(value: TikTokSource | null) {
    const source = value ?? null;
    // Changing anything takes a new object, so handing the same one back costs nothing.
    if (source === this.#source) return;

    const src = source?.src ?? '';
    const srcChanged = this.#src !== src;
    // Player parameters are read when the embed is built, so a change needs its own reload even for the same video.
    const engineChanged = !deepEqual(this.#source?.engine?.tiktok ?? null, source?.engine?.tiktok ?? null);

    this.#source = source;
    this.#src = src;

    if (srcChanged || engineChanged) void this.load();

    // Assigning is always a source change, so it is always announced.
    this.dispatchEvent(new Event('sourcechange'));
  }

  get buffered() {
    // The embed reports no buffer state, only a position, so only what already played through is known available.
    return this.#currentTime > 0 ? createTimeRange(0, this.#currentTime) : EMPTY_TIME_RANGES;
  }

  get seekable() {
    return this.#duration > 0 && Number.isFinite(this.#duration)
      ? createTimeRange(0, this.#duration)
      : EMPTY_TIME_RANGES;
  }

  get error() {
    return this.#error;
  }

  /** Always empty: `closed_caption` is the embed's only say over captions. */
  get textTracks() {
    return EMPTY_TEXT_TRACKS;
  }

  get isFullscreen() {
    return this.#isFullscreen;
  }

  // The protocol has no fullscreen command, so fullscreen targets the iframe itself.
  async requestFullscreen() {
    // No element to request on means nothing entered fullscreen, so the flag must not claim otherwise.
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

  // Build the embed for the attached target. A server-rendered target already holds a URL, so it is left alone and
  // its `onPlayerReady` settles the load; a target that cannot resolve yet settles its load, and `load()` retries.
  #createPlayer(): boolean {
    const target = this.#target;
    if (!target) return false;

    // The `src` property resolves an empty attribute to the document URL; only the attribute tells embed from empty.
    if (target.getAttribute('src')) {
      // The frame is already fetching the embed and will report `onPlayerReady` like any other.
      this.dispatchEvent(new Event('loadstart'));
      return true;
    }

    const initialSrc = buildTikTokIframeSrc(this.#src, this.#snapshotProps());
    // No embed means no `onPlayerReady` is coming to settle this load.
    if (!initialSrc) {
      this.#loadComplete.resolve();
      return false;
    }

    target.src = initialSrc;
    this.dispatchEvent(new Event('loadstart'));
    return true;
  }

  // Listen for what the embed reports; messages arrive on `window`, so each is matched against this host's frame.
  #listen(target: HTMLIFrameElement) {
    const win = globalThis.window;
    if (isUndefined(win)) return;
    const attachId = this.#attachId;
    this.#messages = new AbortController();
    win.addEventListener('message', (event) => this.#onMessage(event, target, attachId), {
      signal: this.#messages.signal,
    });
  }

  #onMessage(event: MessageEvent, target: HTMLIFrameElement, attachId: number) {
    if (this.#isStale(attachId)) return;
    // A frame that is gone cannot have sent anything, so an absent window must not match.
    const frame = target.contentWindow;
    if (!frame || event.source !== frame) return;
    const message = event.data;
    if (!isTikTokPlayerMessage(message)) return;
    // An unrecognized source leaves the frame reporting the video it still holds; taking it would undo the reset.
    if (this.#srcUnsupported) return;
    // `onPlayerReady` is not reliably first, and the embed stays silent until ready, so anything it says is proof.
    if (this.#hasSource) this.#onLoaded();

    switch (message.type) {
      case 'onPlayerReady':
        break;
      case 'onStateChange':
        if (isNumber(message.value)) this.#onStateChange(message.value);
        break;
      case 'onCurrentTime':
        if (isTikTokCurrentTime(message.value)) {
          this.#onCurrentTime(message.value.currentTime, message.value.duration);
        }
        break;
      case 'onVolumeChange':
        // Nothing for a level to drive without a volume to write, and the reported mute comes through `onMute`.
        break;
      case 'onMute':
        // Muting leaves the volume alone, the way it does on a media element.
        this.#muted = !!message.value;
        this.dispatchEvent(new Event('volumechange'));
        break;
      case 'onPlayerError':
        if (isTikTokPlayerError(message.value)) this.#onPlayerError(message.value);
        break;
      case 'onError':
        // Deprecated by TikTok; the code it carries is a `MediaError` one rather than TikTok's, so it stands as is.
        this.#onError(
          'TikTok player error; visit https://developers.tiktok.com/doc/embed-player for what the embed supports.',
          isMediaErrorCode(message.value) ? message.value : MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        );
        break;
      default:
        if (__DEV__) console.warn(`Unhandled TikTok player message: ${message.type}`);
        break;
    }
  }

  // Whether a message belongs to a superseded attach; a dispatch in flight still reaches a listener removed mid-way.
  #isStale(attachId: number) {
    return attachId !== this.#attachId;
  }

  // Defer a command until `loadComplete` resolves; posting to a frame being torn down throws and is swallowed.
  #afterLoad(fn: () => void) {
    this.#loadComplete.then(
      () => {
        if (!this.#target) return;
        tryCall(fn);
      },
      () => {}
    );
  }

  #post(type: TikTokPlayerCommand, value?: number) {
    const frame = this.#target?.contentWindow;
    if (!frame) return;
    frame.postMessage(createTikTokPlayerCommand(type, value), PLAYER_TARGET_ORIGIN);
  }

  // The mute the next embed is built with; the URL is read once, so a rebuild carries a mute set since the last one.
  get #nextMuted() {
    return this.#defaultMuted || this.#muted;
  }

  #snapshotProps() {
    return {
      autoplay: this.#autoplay,
      defaultMuted: this.#nextMuted,
      loop: this.#loop,
      controls: this.#controls,
      source: this.#source,
    };
  }

  #resetState() {
    this.#currentTime = 0;
    this.#duration = Number.NaN;
    // The next embed comes back in whatever state it is built with.
    this.#muted = this.#nextMuted;
    this.#paused = !this.#autoplay;
    this.#ended = false;
    this.#readyState = READY_STATE_HAVE_NOTHING;
    this.#seeking = false;
    this.#loaded = false;
    this.#srcUnsupported = false;
    this.#playFired = false;
    this.#error = null;
    this.#isFullscreen = false;
  }

  #onLoaded() {
    if (this.#loaded) return;
    this.#loaded = true;
    this.#readyState = READY_STATE_HAVE_METADATA;
    // The frame's URL does not always mute the embed, so assert it over the protocol at the first moment it can.
    if (this.#muted) this.#post('mute');
    if (this.#playRequested) {
      this.#playRequested = false;
      this.#post('play');
    }
    // Duration arrives with the first progress report, which dispatches its own `durationchange`.
    for (const type of ['loadedmetadata', 'loadcomplete']) {
      this.dispatchEvent(new Event(type));
    }
    this.#loadComplete.resolve();
  }

  #onPlayerError({ errorCode, errorType }: TikTokPlayerError) {
    // A blocked play leaves a loaded, playable video, so recording `error` would put a permanent failure over a
    // working one; it is warned about instead, since silence from a cross-origin frame is the hardest thing to read.
    if (errorCode === ERROR_AUTOPLAY) {
      if (__DEV__) {
        console.warn(
          'The TikTok embed refused to play: the browser blocked it. A cross-origin embed needs its own user activation, or a muted video, before it will start.'
        );
      }
      return;
    }
    const named = errorType ? ` (${errorType})` : '';
    this.#onError(
      `TikTok player error ${errorCode}${named}; visit https://developers.tiktok.com/doc/embed-player for what the embed supports.`,
      toMediaErrorCode(errorCode)
    );
  }

  #onError(message: string, code: number) {
    this.#error = new MediaError(message, code);
    this.dispatchEvent(new Event('error'));
    // Unblock callers awaiting load so play()/fullscreen don't hang.
    this.#loadComplete.resolve();
  }

  #onStateChange(state: number) {
    const emit = (type: string) => this.dispatchEvent(new Event(type));

    if (state === STATE_PLAYING || state === STATE_BUFFERING) {
      if (!this.#playFired) {
        this.#playFired = true;
        this.#paused = false;
        this.#ended = false;
        emit('play');
      }
    }

    if (state === STATE_BUFFERING) {
      emit('waiting');
    } else if (state === STATE_PLAYING) {
      this.#readyState = READY_STATE_HAVE_FUTURE_DATA;
      this.#paused = false;
      emit('playing');
    } else if (state === STATE_PAUSED) {
      this.#playFired = false;
      this.#paused = true;
      emit('pause');
    } else if (state === STATE_ENDED) {
      this.#playFired = false;
      this.#paused = true;
      emit('pause');
      this.#ended = true;
      emit('ended');
      // An embed built with `loop` restarts itself; this covers a `loop` set after that, and replaying is free.
      if (this.#loop) void this.play();
    } else if (state === STATE_INIT) {
      // Reported for a video held but not started: a resource still loaded, so nothing to announce.
      this.#playFired = false;
      this.#paused = true;
    }
  }

  #onCurrentTime(currentTime: number, duration: number) {
    if (currentTime !== this.#currentTime) {
      this.#currentTime = currentTime;
      this.dispatchEvent(new Event('timeupdate'));
    }

    if (this.#seeking) {
      // The embed announces no seeks, so its next position report is the only sign one landed, change or not.
      this.#seeking = false;
      this.dispatchEvent(new Event('seeked'));
    }

    if (isNumber(duration) && duration > 0 && duration !== this.#duration) {
      this.#duration = duration;
      this.dispatchEvent(new Event('durationchange'));
    }
  }
}

/** Read a TikTok player error code as a `MediaError` one; TikTok groups codes by category, so the category is read. */
function toMediaErrorCode(errorCode: number) {
  if (errorCode >= ERROR_NETWORK_CATEGORY && errorCode < ERROR_PLAYER_CATEGORY) return MediaError.MEDIA_ERR_NETWORK;
  if (errorCode >= ERROR_PLAYER_CATEGORY && errorCode < ERROR_CATEGORY_END) return MediaError.MEDIA_ERR_DECODE;
  return MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED;
}

/** Whether a reported value is one of the codes a `MediaError` can carry. */
function isMediaErrorCode(value: unknown): value is number {
  return isNumber(value) && value >= MediaError.MEDIA_ERR_ABORTED && value <= MediaError.MEDIA_ERR_ENCRYPTED;
}

const READY_STATE_HAVE_NOTHING = 0;
const READY_STATE_HAVE_METADATA = 1;
const READY_STATE_HAVE_FUTURE_DATA = 3;
