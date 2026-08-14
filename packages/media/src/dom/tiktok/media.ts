// Adapted from `tiktok-video-element` from `muxinc/media-elements`,
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
  /**
   * Cancels the `message` listener. It lives on `window` rather than on the
   * iframe, so nothing removes it when the frame goes; the signal is what keeps
   * it from outliving the attach that added it.
   */
  #messages: AbortController | null = null;
  /** Guards messages and deferred embeds across attach/detach cycles. */
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
  /** The current `src` names no TikTok video, so the embed still holds the last one. */
  #srcUnsupported = false;
  /** A play asked for before the embed could take one, replayed once it can. */
  #playRequested = false;
  #playFired = false;
  #currentTime = 0;
  #duration = Number.NaN;
  #muted = false;
  #readyState = READY_STATE_HAVE_NOTHING;
  #error: MediaError | null = null;
  #isFullscreen = false;

  static PLAYER_SOFTWARE_NAME = 'tiktok-video';

  /**
   * The embed's window. TikTok publishes no player object — commands are posted
   * to the frame — so the window the protocol is spoken to is the closest thing
   * to one, and it is what a caller needs to speak it directly. Null until the
   * iframe is in a document, since a frame that is not rendered has no window.
   */
  get engine() {
    return this.#target?.contentWindow ?? null;
  }

  get target(): HTMLIFrameElement | null {
    return this.#target;
  }

  /**
   * Bind the iframe hosting the embed. The embed follows as soon as an URL can
   * be resolved, which is not always now: a framework that creates the element
   * before setting `src` attaches an iframe with nothing to embed yet, and
   * `load()` picks it up once a source arrives.
   */
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
    // A play still waiting on an embed this host no longer has. Left set, the
    // next frame to report ready would start playing on its own.
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

  /**
   * Rebuild the embed for the current source. The protocol has play, pause,
   * seek, and mute and nothing that swaps the video, and the parameters shaping
   * the player are read once when the frame loads — so writing the iframe URL
   * again is the only way to load anything.
   */
  async load() {
    // Nothing to reload without a target, and no load to wait on either.
    if (!this.#target) return;
    const load = this.#beginLoad();
    // Wait a microtask: a framework sets `src` and the props that shape the embed
    // in whatever order it likes, and the embed URL is only built once, so it has
    // to see all of them.
    await Promise.resolve();
    // A later load took over while waiting; building the embed is its job now.
    if (load !== this.#loadComplete) return;
    const target = this.#target;
    // Detached while waiting; `detach()` already settled this load.
    if (!target) return;

    const embedSrc = this.#src ? buildTikTokIframeSrc(this.#src, this.#snapshotProps()) : '';
    // A frame already showing this embed has nothing to reload, and reloading it
    // anyway would throw away the position it is playing from. Nothing is being
    // discarded either, so the state stands and no lifecycle event is due.
    if (embedSrc && target.getAttribute('src') === embedSrc) {
      // The frame is either ready already or still fetching that URL, and only in
      // the first case is there no `onPlayerReady` left to settle this load.
      if (this.#loaded) load.resolve();
      return;
    }

    // Reset before bailing on an empty src: a cleared source has nothing to load,
    // but what we report about the old video still has to go.
    this.#resetState();
    if (!this.#src) {
      // The embed has to go too. Left in place it keeps playing, and its progress
      // reports write the state just cleared straight back. There is no unload
      // command, so dropping the URL is what stops it.
      load.resolve();
      target.removeAttribute('src');
      return;
    }
    this.dispatchEvent(new Event('emptied'));
    this.dispatchEvent(new Event('loadstart'));
    if (!embedSrc) {
      this.#srcUnsupported = true;
      this.#error = new MediaError(`Unrecognized TikTok source: ${this.#src}`, MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED);
      this.dispatchEvent(new Event('error'));
      // Unblock callers awaiting load so play()/fullscreen don't hang.
      load.resolve();
      // There is no video to swap the frame to, so the embed keeps playing the
      // last one under an error the host is already reporting; pausing is all
      // the protocol offers to stop it.
      this.#post('pause');
      return;
    }
    // The new frame reports `onPlayerReady`, which is what settles this load.
    target.src = embedSrc;
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

  /**
   * Whether the embed is playing the source the host reports. It is not once the
   * source is cleared or unrecognized: the embed holds the previous video either
   * way, so what it reports and what `play()` would resume are no longer ours.
   */
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
    // The embed went with the source it was built for, or still holds one that is
    // no longer being reported, so there is nothing left here to resume.
    if (!this.#hasSource) return;
    // Posted without waiting on the load barrier. The embed reports nothing at
    // all before it is ready, so a barrier only its own report can settle is
    // exactly what leaves a press of play doing nothing — and the command is
    // cheap enough to send at a frame that may not be listening yet. Whichever
    // happens first wins: the embed takes this one, or takes the replay below.
    this.#playRequested = true;
    this.#post('play');
  }

  pause() {
    // A pause between asking to play and the embed being ready is the later
    // intent, so it cancels the replay rather than racing it.
    this.#playRequested = false;
    this.#post('pause');
  }

  get currentTime() {
    return this.#currentTime;
  }
  set currentTime(value) {
    if (this.#currentTime === value) return;
    this.#seeking = true;
    // Report the requested position right away: the embed only reports one every
    // so often, and until then the seek would look like it never happened.
    this.#currentTime = value;
    this.dispatchEvent(new Event('seeking'));
    this.dispatchEvent(new Event('timeupdate'));
    this.#afterLoad(() => this.#post('seekTo', value));
  }

  get duration() {
    return this.#duration;
  }

  // No volume surface: the embed reports a level but takes no command to set
  // one, so there is nothing to write. Reporting it read-only would have the
  // player render a slider that cannot move; mute is a separate capability and
  // stays, because `mute` and `unMute` are commands the embed does take.

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
    // Until the embed reports its own mute there is nothing to report but what it
    // is being built with, the way a media element seeds `muted` from the `muted`
    // attribute. It is also what has `onPlayerReady` assert the mute over the
    // protocol, which the URL parameter alone does not always achieve.
    if (!this.#loaded) this.#muted = value;
  }

  get loop() {
    return this.#loop;
  }
  set loop(value) {
    // The embed reads `loop` from the URL it was built with, so a change after
    // that is honored by replaying on ENDED instead.
    this.#loop = value;
  }

  get controls() {
    return this.#controls;
  }
  set controls(value) {
    // Like `loop`, this is read from the URL the embed was built with, and the
    // protocol has no command for it. Rebuilding the frame to show or hide TikTok
    // chrome would restart the video, so it lands on the next load instead.
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
   * Structured source: the TikTok URL or id in `src`, plus player parameters
   * under `engine.tiktok`. Replacing it re-derives `src`; assigning an equivalent
   * source is a no-op.
   */
  get source(): TikTokSource | null {
    return this.#source;
  }
  set source(value: TikTokSource | null) {
    const source = value ?? null;
    // Changing anything takes a new object, so handing the same one back costs
    // nothing.
    if (source === this.#source) return;

    const src = source?.src ?? '';
    const srcChanged = this.#src !== src;
    // Player parameters are read when the embed is built, so a change to them
    // needs a reload of its own even though the video is the same.
    const engineChanged = !deepEqual(this.#source?.engine?.tiktok ?? null, source?.engine?.tiktok ?? null);

    this.#source = source;
    this.#src = src;

    if (srcChanged || engineChanged) void this.load();

    // Assigning is always a source change, so it is always announced.
    this.dispatchEvent(new Event('sourcechange'));
  }

  get buffered() {
    // The embed reports no buffer state, only a position, so the only stretch
    // known to be available is the one already played through.
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
   * Build the embed for the attached target. A target that arrived with a URL
   * already holds one — a server-rendered iframe does — so it is left alone and
   * its `onPlayerReady` settles the load. A target that cannot be resolved yet
   * settles the load it was given; the next `load()` retries.
   *
   * @returns Whether the target holds an embed.
   */
  #createPlayer(): boolean {
    const target = this.#target;
    if (!target) return false;

    // The `src` property resolves an empty attribute to the document URL, so it
    // cannot tell an embed apart from a placeholder; the attribute can.
    if (target.getAttribute('src')) {
      // The frame is already fetching the embed and will report `onPlayerReady`
      // for it like any other, so this load has begun just the same.
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

  /**
   * Listen for what the embed reports. The messages arrive on `window` rather
   * than on the frame that sent them, so every one has to be matched against the
   * frame this host owns before it is allowed to touch state.
   */
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
    // A frame that is gone cannot have sent anything, so matching its absent
    // window would let every foreign message through.
    const frame = target.contentWindow;
    if (!frame || event.source !== frame) return;
    const message = event.data;
    if (!isTikTokPlayerMessage(message)) return;
    // An unrecognized source left the frame holding the video it was already
    // playing, and it keeps reporting it — taking that would put the state just
    // cleared right back, under an error the host is reporting.
    if (this.#srcUnsupported) return;
    // The embed stays silent until it is ready, so anything it says is proof
    // enough that it is — `onPlayerReady` is not reliably the first thing it
    // sends, and waiting only for that leaves the load open forever.
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
        // Reported but not carried: with no volume to write there is nothing for
        // a level to drive, and the mute the embed reports comes through `onMute`.
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
        // Deprecated by TikTok in favor of `onPlayerError`, and the code it
        // carries is a `MediaError` one rather than one of TikTok's, so it is
        // taken as it stands when it is one.
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

  /**
   * Whether a message belongs to a superseded attach. A `message` event already
   * being dispatched still reaches a listener removed during the dispatch, so
   * what a frame reports has to be matched against the attach that bound it.
   */
  #isStale(attachId: number) {
    return attachId !== this.#attachId;
  }

  /** Defer a command until `loadComplete` resolves, swallowing failures. */
  #afterLoad(fn: () => void) {
    this.#loadComplete.then(
      () => {
        if (!this.#target) return;
        try {
          fn();
        } catch {
          // Posting to a frame that is being torn down throws.
        }
      },
      () => {}
    );
  }

  /** Send a command to the embed, if there is a frame to send it to. */
  #post(type: TikTokPlayerCommand, value?: number) {
    const frame = this.#target?.contentWindow;
    if (!frame) return;
    frame.postMessage(createTikTokPlayerCommand(type, value), PLAYER_TARGET_ORIGIN);
  }

  /**
   * The mute the next embed is built with. The frame reads it once from the URL,
   * so a rebuild has to carry a mute set since the last one too; dropping it
   * would bring the video back with sound.
   */
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
    // Whatever the next embed is built with is the state the video it holds comes
    // back in.
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
    // The URL the frame was built from does not always mute the embed, so the
    // mute is asserted again over the protocol, which does, at the first moment
    // the embed can take a command.
    if (this.#muted) this.#post('mute');
    // A play asked for before the embed could take one. This is that moment.
    if (this.#playRequested) {
      this.#playRequested = false;
      this.#post('play');
    }
    // Duration arrives with the first progress report, which dispatches a
    // `durationchange` of its own once it does.
    for (const type of ['loadedmetadata', 'loadcomplete']) {
      this.dispatchEvent(new Event(type));
    }
    this.#loadComplete.resolve();
  }

  #onPlayerError({ errorCode, errorType }: TikTokPlayerError) {
    // A blocked play leaves a video that is loaded and still playable, which is
    // not something a media element reports as an error — the browser rejects the
    // play request instead. Setting `error` would put a permanent failure over a
    // working video, so it is only ever reported, never recorded: silence here
    // reads as "the embed ignored us", which is the hardest thing to diagnose
    // about a player driven entirely through a cross-origin frame.
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
      // An embed built with `loop` restarts on its own; this is for a `loop` set
      // after that, and playing an embed that already restarted costs nothing.
      if (this.#loop) void this.play();
    } else if (state === STATE_INIT) {
      // The embed reports this for a video it holds but has not started, which is
      // a resource still loaded and so nothing a media element announces.
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
      // The embed announces no seeks, so the next position it reports is the only
      // sign one landed — including when it lands on exactly the position asked
      // for and there is no change to report.
      this.#seeking = false;
      this.dispatchEvent(new Event('seeked'));
    }

    if (isNumber(duration) && duration > 0 && duration !== this.#duration) {
      this.#duration = duration;
      this.dispatchEvent(new Event('durationchange'));
    }
  }
}

/**
 * Read a TikTok player error code as a `MediaError` one. TikTok groups its codes
 * by category rather than listing every one it may report, so the category is
 * what is read; anything outside the ones it documents describes a video that
 * cannot be played at all.
 */
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
