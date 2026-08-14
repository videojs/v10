// Adapted from `spotify-audio-element` from `muxinc/media-elements`,
// ported to TypeScript and reshaped as a media host to fit the v10
// media-host architecture (mirrors `dom/youtube`).
//
// Source: https://github.com/muxinc/media-elements
// License: MIT

import { createPublicPromise, type PublicPromise } from '@videojs/utils/function';
import { deepEqual } from '@videojs/utils/object';
import { isNumber } from '@videojs/utils/predicate';
import { EMPTY_TEXT_TRACKS, EMPTY_TIME_RANGES } from '../../core/constants';
import { MediaError } from '../../core/media-error';
import type { Video } from '../../core/types';
import { MediaPlayedRangesMixin } from '../media-played-ranges';
import { createTimeRange } from '../utils';
import {
  loadSpotifyIframeApi,
  type SpotifyControllerApi,
  type SpotifyIframeApi,
  type SpotifyPlaybackState,
} from './iframe-api';
import { spotifyMediaDefaultProps } from './props';
import { buildSpotifyIframeSrc, parseSpotifySource, type SpotifySource } from './source';

const SpotifyMediaBase = MediaPlayedRangesMixin(EventTarget);

/**
 * @fires sourcechange - Fired when `source` changes, either directly or by resolving a new `src`. Read `source` for the new value.
 */
export class SpotifyMedia extends SpotifyMediaBase implements Partial<Video> {
  #target: HTMLIFrameElement | null = null;
  /** The iframe `attach()` was handed, held while the controller's own stands in for it. */
  #controller: SpotifyControllerApi | null = null;
  /** The controller drops `loadUri` before it reports itself ready. */
  #controllerReady = false;
  /** A load was requested before the controller was ready; replay it on `ready`. */
  #pendingLoad = false;
  /** Controller creation is in flight; the API load makes it span more than a tick. */
  #creatingController = false;
  #loadComplete = createPublicPromise<void>();
  /** Guards async controller creation across attach/detach cycles. */
  #attachId = 0;

  #src = spotifyMediaDefaultProps.src;
  #autoplay = spotifyMediaDefaultProps.autoplay;

  #loop = spotifyMediaDefaultProps.loop;
  #controls = spotifyMediaDefaultProps.controls;
  #playsInline = spotifyMediaDefaultProps.playsInline;
  #preload = spotifyMediaDefaultProps.preload;
  #poster = spotifyMediaDefaultProps.poster;
  #source: SpotifySource | null = spotifyMediaDefaultProps.source;

  #paused = true;
  #ended = false;
  #seeking = false;
  #loaded = false;
  #currentTime = 0;
  #duration = Number.NaN;
  #readyState = READY_STATE_HAVE_NOTHING;
  #error: MediaError | null = null;
  /** Playback started but is stalled; the embed reports it as buffering-while-paused. */
  #waiting = false;
  /** A pause was asked for, so the paused update it produces is not a stall. */
  #pauseRequested = false;
  /** The entity ran out; kept so the end of playback is acted on exactly once. */
  #closeToEnded = false;

  static PLAYER_SOFTWARE_NAME = 'spotify-audio';

  /** Underlying Spotify iframe API controller (null until the API loads). */
  get engine() {
    return this.#controller;
  }

  /**
   * The iframe holding the embed, which is not always the one `attach()` was
   * given: the iframe API replaces it with one of its own, and that one is what
   * everything from the embed URL down is written to afterwards.
   */
  get target(): HTMLIFrameElement | null {
    return this.#target;
  }

  /**
   * Bind the iframe hosting the embed. The iframe API and its controller follow
   * as soon as an embed URL can be resolved, which is not always now: a framework
   * that creates the element before setting `src` attaches an iframe with
   * nothing to embed yet, and `load()` picks it up once a source arrives.
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
    try {
      if (this.#controller) {
        // `destroy()` removes whatever `iframeElement` points at, which is the embed
        // this host does not own — React renders it, and the custom element keeps it
        // in its shadow root. Pointing the controller at a throwaway first leaves it
        // with nothing to remove, so all `destroy()` does is unbind its listener.
        this.#controller.iframeElement = createControllerPlaceholderFrame();
        this.#controller.destroy();
      }
    } catch {
      // The iframe API throws if the iframe was already removed.
    }
    this.#controller = null;
    this.#controllerReady = false;
    this.#pendingLoad = false;
    this.#creatingController = false;
    this.#target = null;
    // Unblock callers awaiting load; they re-check `#controller` (now null) and no-op.
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
  /** Spotify URL or URI. Setting it re-derives `source`, carrying its embed options over. */
  set src(value) {
    const { engine } = this.#source ?? {};
    const next: SpotifySource = { ...(engine && { engine }), ...(value && { src: value }) };

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

  /** Reload the current source via the iframe API; deferred until the controller is ready. */
  async load() {
    if (!this.#controller || !this.#controllerReady) {
      // `loadUri` is dropped before the controller reports itself ready; replay
      // the load then. A cleared src replays too, so the barrier below always
      // gets settled.
      this.#pendingLoad = !!this.#target;
      // The target can be attached before it has anything to embed, in which case
      // this load is what finally builds it.
      if (this.#target && !this.#controller && !this.#creatingController) {
        // The barrier `attach()` opened was settled when there was nothing to
        // embed, so this load needs one of its own — otherwise `play()` runs
        // before the controller it is waiting for exists.
        const load = this.#beginLoad();
        // Wait a microtask: a framework sets `src` and the props that shape the
        // embed in whatever order it likes, and the embed URL is only built once,
        // so it has to see all of them.
        await Promise.resolve();
        // A later load took over while waiting; building the embed is its job now.
        if (load !== this.#loadComplete) return;
        this.#createPlayer();
      }
      return;
    }
    const load = this.#beginLoad();
    // Reset before bailing on an empty src: a cleared source has nothing to load,
    // but what we report about the old entity still has to go.
    this.#resetState();
    if (!this.#src) {
      // The embed has to stop too. Left running it keeps playing, and its updates
      // write the state just cleared straight back. Pausing is as far as the
      // controller goes; there is nothing that unloads the entity.
      load.resolve();
      try {
        this.#controller.pause();
      } catch {
        // The iframe API throws if the controller was destroyed mid-flight.
      }
      return;
    }
    this.dispatchEvent(new Event('emptied'));
    this.dispatchEvent(new Event('loadstart'));
    const parsed = parseSpotifySource(this.#src);
    if (!parsed) {
      this.#error = new MediaError(`Unrecognized Spotify source: ${this.#src}`, MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED);
      this.dispatchEvent(new Event('error'));
      // Unblock callers awaiting load so play() doesn't hang.
      load.resolve();
      return;
    }
    const target = this.#target;
    const embedSrc = buildSpotifyIframeSrc(this.#src, this.#snapshotProps());
    const embeddedSrc = target?.getAttribute('src') ?? '';
    // The theme, the video variant, and whatever else Spotify reads off the embed
    // URL exist nowhere the controller can be told about, so a reload that changes
    // any of them has to rebuild the embed. Swapping only the entity does not, and
    // rebuilding for that would reload the frame for nothing — except in the video
    // variant, which is a path and so belongs to the entity embedded at it, while
    // `loadUri` names an entity and nothing else and would leave the audio one.
    const rebuild =
      embedOptionsOf(embedSrc) !== embedOptionsOf(embeddedSrc) ||
      (isVideoEmbed(embedSrc) && embedPathOf(embedSrc) !== embedPathOf(embeddedSrc));
    if (target && embedSrc && rebuild) {
      target.src = embedSrc;
      return;
    }
    // The controller names entities by URI, whatever form `src` was written in.
    this.#controller.loadUri(`spotify:${parsed.type}:${parsed.id}`);
    // `loadUri` starts the entity from the top, so the start position — which only
    // the embed URL applies for itself — is seeked to. An engine option outranks
    // the `t` the src carries, the same way it does when the URL is built.
    const startTime = this.#source?.engine?.spotify?.t ?? parsed.startTime;
    if (isNumber(startTime)) this.currentTime = startTime;
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
    // The embed still holds the paused entity, so playing it would resume a
    // source that was cleared.
    if (!this.#src) return;
    // `resume()` picks playback up where it stopped; `play()` would restart the
    // entity, which is not what pressing play on a paused media does.
    this.#controller?.resume();
  }

  pause() {
    // A stall is reported as paused as well, so a pause that was asked for has to
    // be remembered — otherwise the update it produces reads as more buffering and
    // the pause is never reported.
    this.#pauseRequested = true;
    this.#controller?.pause();
  }

  get currentTime() {
    return this.#currentTime;
  }
  set currentTime(value) {
    if (this.#currentTime === value) return;
    this.#seeking = true;
    // Seeking starts a fresh run, so whatever ran out before it is behind us.
    this.#closeToEnded = false;
    this.#ended = false;
    // Report the requested position right away: the embed only reports one about
    // once a second, and until then the seek would look like it never happened.
    this.#currentTime = value;
    this.dispatchEvent(new Event('seeking'));
    this.dispatchEvent(new Event('timeupdate'));
    this.#afterLoad((controller) => controller.seek(value));
  }

  get duration() {
    return this.#duration;
  }

  // No volume or mute surface: the embed takes neither command and reports
  // neither value, so the members are absent rather than present and inert.
  // Declaring them would read as a capability the player could use, and it would
  // offer a volume slider and a mute button that do nothing.

  get autoplay() {
    return this.#autoplay;
  }
  set autoplay(value) {
    this.#autoplay = value;
  }

  get loop() {
    return this.#loop;
  }
  set loop(value) {
    // The embed has no loop of its own; the end of playback seeks back instead.
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

  /**
   * Structured source: the Spotify URL or URI in `src`, plus embed options under
   * `engine.spotify`. Replacing it re-derives `src`; assigning an equivalent
   * source is a no-op.
   */
  get source(): SpotifySource | null {
    return this.#source;
  }
  set source(value: SpotifySource | null) {
    const source = value ?? null;
    // Changing anything takes a new object, so handing the same one back costs
    // nothing.
    if (source === this.#source) return;

    const src = source?.src ?? '';
    const srcChanged = this.#src !== src;
    // Embed options are read when the embed is built, so a change to them needs a
    // reload of its own even though the URL is the same.
    const engineChanged = !deepEqual(this.#source?.engine?.spotify ?? null, source?.engine?.spotify ?? null);

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

  /** Always empty: the embed exposes no captions or other text tracks. */
  get textTracks() {
    return EMPTY_TEXT_TRACKS;
  }

  /**
   * Build the embed and start controller creation once a source can be resolved.
   * The iframe API only talks to an iframe that already holds a Spotify embed, so
   * a target that cannot be resolved yet leaves the controller null and settles
   * the load it was given; the next `load()` retries.
   *
   * @returns Whether controller creation started.
   */
  #createPlayer(): boolean {
    const target = this.#target;
    if (!target || this.#controller || this.#creatingController) return false;

    // The `src` property resolves an empty attribute to the document URL, so it
    // cannot tell an embed apart from a placeholder; the attribute can.
    if (!target.getAttribute('src')) {
      const initialSrc = buildSpotifyIframeSrc(this.#src, this.#snapshotProps());
      // No embed means no controller is coming to settle this load.
      if (!initialSrc) {
        this.#loadComplete.resolve();
        return false;
      }
      target.src = initialSrc;
    }

    this.#creatingController = true;
    this.dispatchEvent(new Event('loadstart'));
    void this.#createControllerApi(target);
    return true;
  }

  async #createControllerApi(target: HTMLIFrameElement) {
    const attachId = this.#attachId;
    let api: SpotifyIframeApi;
    try {
      api = await loadSpotifyIframeApi();
    } catch {
      // A failed API load belongs to the attach that started it; a newer one must
      // not be marked failed or have its load unblocked.
      if (this.#isStale(attachId)) return;
      this.#creatingController = false;
      this.#error = new MediaError('Failed to load the Spotify iframe API', MediaError.MEDIA_ERR_NETWORK);
      this.dispatchEvent(new Event('error'));
      // Unblock callers awaiting load so play() doesn't hang.
      this.#loadComplete.resolve();
      return;
    }
    if (this.#isStale(attachId) || this.#target !== target) return;
    // `referrerPolicy` configures the iframe rather than the embed, so it is the
    // one engine option Spotify has no use for.
    const { referrerPolicy: _referrerPolicy, ...options } = this.#source?.engine?.spotify ?? {};
    const controller = await new Promise<SpotifyControllerApi>((resolve) =>
      // Deliberately no entity: naming one here has the controller build an embed
      // URL of its own, which carries none of what this host put on the one it
      // built. Spotify's own keys go through either way.
      //
      // The placeholder is what keeps the embed ours. `createController` builds an
      // iframe of its own and runs `target.parentElement?.replaceChild(...)`, so a
      // target with an element parent — anything React renders — is swapped out and
      // left holding a discarded browsing context. Handing over a detached node
      // makes `parentElement` null, so the swap cannot fire and the controller is
      // simply pointed at the iframe this host already built.
      api.createController(createControllerPlaceholder(), options, resolve)
    );
    if (this.#isStale(attachId) || this.#target !== target) {
      try {
        controller.destroy();
      } catch {
        // The iframe API throws if the iframe was already removed.
      }
      return;
    }
    // Both directions of the protocol read this: commands post to its
    // `contentWindow`, and inbound messages are matched against it.
    controller.iframeElement = target;
    this.#controller = controller;
    this.#creatingController = false;
    this.#bindControllerEvents(controller, attachId);
  }

  /**
   * Whether a callback belongs to a superseded attach. `destroy()` does not stop
   * the iframe API from invoking callbacks it already scheduled, so anything a
   * controller reports has to be matched against the attach that created it
   * before it is allowed to touch state.
   */
  #isStale(attachId: number) {
    return attachId !== this.#attachId;
  }

  /** Defer a controller call until `loadComplete` resolves, swallowing failures. */
  #afterLoad(fn: (controller: SpotifyControllerApi) => void) {
    this.#loadComplete.then(
      () => {
        if (!this.#controller) return;
        try {
          fn(this.#controller);
        } catch {
          // The iframe API throws if the controller was destroyed mid-flight.
        }
      },
      () => {}
    );
  }

  #snapshotProps() {
    return {
      autoplay: this.#autoplay,
      loop: this.#loop,
      controls: this.#controls,
      playsInline: this.#playsInline,
      preload: this.#preload || spotifyMediaDefaultProps.preload,
      source: this.#source,
    };
  }

  #resetState() {
    this.#currentTime = 0;
    this.#duration = Number.NaN;
    this.#paused = !this.#autoplay;
    this.#ended = false;
    this.#readyState = READY_STATE_HAVE_NOTHING;
    this.#seeking = false;
    this.#loaded = false;
    this.#waiting = false;
    this.#pauseRequested = false;
    this.#closeToEnded = false;
    this.#error = null;
  }

  #onControllerReady() {
    this.#controllerReady = true;
    if (this.#pendingLoad) {
      // The embed was built from a stale src; skip its metadata and reload. The
      // first playback update after that completes the load (see `#onPlaybackUpdate`).
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
    // Duration arrives with the first playback update, which dispatches a
    // `durationchange` of its own once it does.
    // No `volumechange`: this host reports no volume for anything to read.
    for (const type of ['loadedmetadata', 'durationchange', 'loadcomplete']) {
      this.dispatchEvent(new Event(type));
    }
    this.#loadComplete.resolve();
    // The embed URL carries no autoplay parameter, so asking the controller to
    // play is the only way to honor the prop.
    if (this.#autoplay) void this.play();
  }

  #bindControllerEvents(controller: SpotifyControllerApi, attachId: number) {
    controller.addListener('ready', () => {
      if (this.#isStale(attachId)) return;
      this.#onControllerReady();
    });

    controller.addListener('playback_update', (event) => {
      if (this.#isStale(attachId)) return;
      this.#onPlaybackUpdate(event.data);
    });
  }

  /**
   * The embed reports playback as a state snapshot rather than as events, so
   * every event this host dispatches is a difference between two of them. At most
   * one transition is worth reporting per update, which is what the early returns
   * below are for.
   */
  #onPlaybackUpdate(data: SpotifyPlaybackState) {
    // Subsequent loads (`loadUri`) never re-fire `ready`, so the first update
    // after one completes the load. With no src there is no load to complete, and
    // the paused embed reports updates of its own — completing on one of those
    // would put the cleared state right back.
    if (this.#src && !this.#loaded) this.#onLoaded();

    if (this.#restartFromEnd(data)) return;

    this.#syncDuration(data.duration);
    this.#syncPosition(data.position);

    if (this.#syncPlayState(data)) return;

    this.#checkEnded();
  }

  /**
   * Whether playback is under way. The embed reports a stall as buffering while
   * still flagged paused, so either half of the pair means it is running.
   */
  #isStarting(data: SpotifyPlaybackState) {
    return data.isBuffering || !data.isPaused;
  }

  /**
   * Playing again once the entity has finished has to restart it: the embed
   * leaves the position at the end, where resuming has nothing left to play. The
   * seek turns this update into the start of a fresh run, so nothing else acts
   * on it.
   */
  #restartFromEnd(data: SpotifyPlaybackState): boolean {
    if (!this.#closeToEnded || !this.#paused || !this.#isStarting(data)) return false;
    this.#closeToEnded = false;
    this.currentTime = REPLAY_POSITION;
    return true;
  }

  #syncDuration(duration: number) {
    const seconds = duration / 1000;
    if (seconds === this.#duration) return;
    // A different duration is a different entity, so whatever ended before it is
    // no longer what is playing.
    this.#closeToEnded = false;
    this.#duration = seconds;
    this.dispatchEvent(new Event('durationchange'));
  }

  #syncPosition(position: number) {
    const seconds = position / 1000;
    if (this.#seeking) {
      // The embed announces no seeks and goes on reporting the position it was
      // playing until the new one takes, so only a snapshot at the position that
      // was asked for says the seek landed. `seek` truncates to whole seconds and
      // the snapshot after it can be a snapshot late, which is the window here;
      // anything outside it belongs to where playback was before the seek.
      if (seconds < Math.floor(this.#currentTime) || seconds > this.#currentTime + SNAPSHOT_INTERVAL) return;
      this.#seeking = false;
      this.dispatchEvent(new Event('seeked'));
    }
    if (seconds === this.#currentTime) return;
    // Only a position back inside the entity is a new run; one still at the end
    // belongs to the run that just finished there (see `#checkEnded`).
    if (Math.ceil(seconds) < this.#duration) {
      this.#closeToEnded = false;
      this.#ended = false;
    }
    this.#currentTime = seconds;
    this.dispatchEvent(new Event('timeupdate'));
  }

  /**
   * Translate the `isPaused`/`isBuffering` pair into play/pause/waiting/playing.
   *
   * @returns Whether the update was a transition, which nothing else may act on.
   */
  #syncPlayState(data: SpotifyPlaybackState): boolean {
    if (!this.#paused && data.isPaused) {
      // A stall is reported as paused as well, so a run that stopped while it was
      // buffering stopped for data rather than for the listener — unless the
      // listener is who asked, which the embed can report mid-buffer.
      if (data.isBuffering && !this.#pauseRequested) {
        // A run that is already waiting has nothing new to report.
        if (this.#waiting) return false;
        this.#waiting = true;
        this.dispatchEvent(new Event('waiting'));
        return true;
      }
      this.#pauseRequested = false;
      this.#waiting = false;
      this.#paused = true;
      this.dispatchEvent(new Event('pause'));
      return true;
    }

    if (this.#paused && this.#isStarting(data)) {
      this.#pauseRequested = false;
      this.#paused = false;
      this.#ended = false;
      this.dispatchEvent(new Event('play'));
      // Buffering at the start means the entity is still loading, so playback has
      // begun without playing yet.
      this.#waiting = data.isBuffering;
      if (!this.#waiting) this.#readyState = READY_STATE_HAVE_FUTURE_DATA;
      this.dispatchEvent(new Event(this.#waiting ? 'waiting' : 'playing'));
      return true;
    }

    if (this.#waiting && !data.isPaused) {
      this.#waiting = false;
      this.#readyState = READY_STATE_HAVE_FUTURE_DATA;
      this.dispatchEvent(new Event('playing'));
      return true;
    }

    return false;
  }

  /**
   * The embed never reports that it reached the end, so the end has to be
   * inferred from the position catching up with the duration. Positions arrive
   * about once a second, so the last one lands short of the end — hence rounding
   * it up before the comparison.
   */
  #checkEnded() {
    if (this.#paused || this.#seeking || this.#closeToEnded) return;
    // A duration the embed has not resolved yet — `NaN` when the update carried
    // none, `0` while it is still working the entity out — is nothing to end
    // against: every position is at or past it.
    if (!(this.#duration > 0) || !Number.isFinite(this.#duration)) return;
    if (Math.ceil(this.#currentTime) < this.#duration) return;
    // The position stops moving at the end, so every later update would report
    // the same thing; only the first one acts.
    this.#closeToEnded = true;

    if (this.#loop) {
      this.currentTime = REPLAY_POSITION;
      return;
    }

    this.#paused = true;
    this.#ended = true;
    // The embed rolls on into whatever follows the entity unless it is stopped.
    this.pause();
    this.dispatchEvent(new Event('pause'));
    this.dispatchEvent(new Event('ended'));
  }
}

/**
 * A node for `createController` to consume instead of the embed. It is never
 * inserted, so the swap the controller performs on its target cannot reach the
 * iframe this host owns.
 */
function createControllerPlaceholder(): HTMLElement {
  return globalThis.document.createElement('div');
}

/** The same idea for teardown, where the controller expects an iframe to remove. */
function createControllerPlaceholderFrame(): HTMLIFrameElement {
  return globalThis.document.createElement('iframe');
}

/**
 * What an embed URL says about how an entity is embedded rather than which one it
 * is or where it starts — the theme, the video variant, anything else Spotify
 * reads from the URL. The controller swaps entities and seeks on its own, so only
 * a difference here is worth rebuilding an embed for.
 */
function embedOptionsOf(src: string): string {
  const [, query] = src.split('?');
  const params = new URLSearchParams(query);
  params.delete('t');
  params.sort();
  return `${isVideoEmbed(src) ? 'video' : 'audio'}?${params}`;
}

/** The entity an embed URL points at, without the parameters that configure it. */
function embedPathOf(src: string): string {
  return src.split('?')[0] ?? '';
}

/** Whether an embed URL points at the video variant, which lives at its own path. */
function isVideoEmbed(src: string): boolean {
  return embedPathOf(src).endsWith('/video');
}

const READY_STATE_HAVE_NOTHING = 0;
const READY_STATE_HAVE_METADATA = 1;
const READY_STATE_HAVE_FUTURE_DATA = 3;

/**
 * Where a replay starts. A second in rather than zero, which the embed can drop
 * on a finished entity; inherited from `spotify-audio-element`.
 */
const REPLAY_POSITION = 1;

/** How far apart playback snapshots land, near enough: the embed reports about once a second. */
const SNAPSHOT_INTERVAL = 1;
