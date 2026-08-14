// Adapted from `cloudflare-video-element` from `muxinc/media-elements`,
// ported to TypeScript and reshaped as a media host to fit the v10
// media-host architecture (mirrors `dom/youtube`).
//
// Source: https://github.com/muxinc/media-elements
// License: MIT

import { createPublicPromise, type PublicPromise } from '@videojs/utils/function';
import { deepEqual } from '@videojs/utils/object';
import { EMPTY_TEXT_TRACKS, EMPTY_TIME_RANGES } from '../../core/constants';
import { MediaError } from '../../core/media-error';
import type { TextTrackListLike, Video } from '../../core/types';
import { MediaPlayedRangesMixin } from '../media-played-ranges';
import { createTimeRange } from '../utils';
import { cloudflareMediaDefaultProps } from './props';
import { buildCloudflareIframeSrc, type CloudflareSource, parseCloudflareSource } from './source';
import { type CloudflareStreamApi, type CloudflareStreamPlayerApi, loadCloudflareStreamApi } from './stream-api';

const CloudflareMediaBase = MediaPlayedRangesMixin(EventTarget);

/**
 * @fires sourcechange - Fired when `source` changes, either directly or by resolving a new `src`. Read `source` for the new value.
 */
export class CloudflareMedia extends CloudflareMediaBase implements Partial<Video> {
  #target: HTMLIFrameElement | null = null;
  #player: CloudflareStreamPlayerApi | null = null;
  /** Player creation is in flight; the SDK load makes it span more than a tick. */
  #creatingPlayer = false;
  /** A load was requested while the SDK was loading; replay it once the player exists. */
  #pendingLoad = false;
  /**
   * Barrier for the load in progress. Player calls wait on it, and its identity
   * doubles as the load's identity — a late response compares the barrier it
   * started with against this one to learn whether it still owns the load.
   */
  #loadComplete = createPublicPromise<void>();
  /** Guards async player creation across attach/detach cycles. */
  #attachId = 0;
  /** The SDK has no teardown, so its listeners are unbound one by one. */
  #playerListeners: [type: string, listener: () => void][] = [];

  #src = cloudflareMediaDefaultProps.src;
  #autoplay = cloudflareMediaDefaultProps.autoplay;
  #defaultMuted = cloudflareMediaDefaultProps.defaultMuted;
  #loop = cloudflareMediaDefaultProps.loop;
  #controls = cloudflareMediaDefaultProps.controls;
  #playsInline = cloudflareMediaDefaultProps.playsInline;
  #preload = cloudflareMediaDefaultProps.preload;
  #poster = cloudflareMediaDefaultProps.poster;
  #source: CloudflareSource | null = cloudflareMediaDefaultProps.source;

  #paused = true;
  #ended = false;
  #seeking = false;
  #loaded = false;
  /** The current `src` names no Cloudflare video, so the embed still holds the last one. */
  #srcUnsupported = false;
  #currentTime = 0;
  #duration = Number.NaN;
  #volume = 1;
  #muted = false;
  #playbackRate = 1;
  #progress = 0;
  #videoWidth = Number.NaN;
  #videoHeight = Number.NaN;
  #readyState = READY_STATE_HAVE_NOTHING;
  #error: MediaError | null = null;
  #isFullscreen = false;

  #textTracksHost: HTMLVideoElement | null = null;

  static PLAYER_SOFTWARE_NAME = 'cloudflare-video';

  /** Underlying Stream SDK player instance (null until the SDK loads). */
  get engine() {
    return this.#player;
  }

  get target(): HTMLIFrameElement | null {
    return this.#target;
  }

  /**
   * Bind the iframe hosting the embed. The SDK and its player follow as soon as
   * an embed URL can be resolved, which is not always now: a framework that
   * creates the element before setting `src` attaches an iframe with nothing to
   * embed yet, and `load()` picks it up once a source arrives.
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
    this.#unbindPlayerEvents();
    // The SDK offers no teardown, so pausing is all that keeps a detached embed
    // from playing on out of sight.
    this.#pauseEmbed();
    this.#player = null;
    this.#creatingPlayer = false;
    this.#pendingLoad = false;
    this.#textTracksHost = null;
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
  /** Cloudflare URL, video UID, or signed token. Setting it re-derives `source`, carrying its embed parameters over. */
  set src(value) {
    const { engine } = this.#source ?? {};
    const next: CloudflareSource = { ...(engine && { engine }), ...(value && { src: value }) };

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

  /** Reload the current source through the Stream player; no-op until `attach()`. */
  async load() {
    if (!this.#player) {
      // Nothing to reload without a target, and no load to wait on either.
      if (!this.#target) return;
      if (this.#creatingPlayer) {
        // The iframe is being built from a stale src. Replaying once the player
        // exists is the only way to reach the new one, and the barrier that
        // creation opened is still the one callers are waiting on.
        this.#pendingLoad = true;
        return;
      }
      // The target was attached before it had anything to embed, so this load is
      // what finally builds it. Wait a microtask first: a framework sets `src`
      // and the props that shape the embed in whatever order it likes, and the
      // embed URL is only built once, so it has to see all of them.
      const load = this.#beginLoad();
      this.#resetState();
      await Promise.resolve();
      // A later load took over while waiting; building the embed is its job now.
      if (load !== this.#loadComplete) return;
      this.#createPlayer();
      return;
    }
    const load = this.#beginLoad();
    // Reset before bailing on an empty src: a cleared source has nothing to load,
    // but what we report about the old video still has to go.
    this.#resetState();
    // `emptied` is what announces that reset, so it comes before the empty-src
    // bail rather than after it: clearing the source is the one case where the
    // embed reports nothing further, leaving anything listening on the last
    // video's duration and buffer forever.
    this.dispatchEvent(new Event('emptied'));
    if (!this.#src) {
      // The embed has to stop too. Left running it keeps playing, and its events
      // write the state just cleared straight back.
      load.resolve();
      this.#pauseEmbed();
      return;
    }
    this.dispatchEvent(new Event('loadstart'));
    const parsed = parseCloudflareSource(this.#src);
    if (!parsed) {
      this.#srcUnsupported = true;
      this.#error = new MediaError(
        `Unrecognized Cloudflare Stream source: ${this.#src}`,
        MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
      );
      this.dispatchEvent(new Event('error'));
      // Unblock callers awaiting load so play()/fullscreen don't hang.
      load.resolve();
      // There is no video to swap to, so the embed keeps playing the last one
      // under an error the host is already reporting.
      this.#pauseEmbed();
      return;
    }
    // Embed parameters live on the iframe URL and the embed reads them once, so
    // a change to them only lands by rebuilding it. The player swap below moves
    // the video and nothing else, and assigning the id it already holds may not
    // report metadata at all, which would leave this load unsettled.
    const target = this.#target;
    const nextSrc = buildCloudflareIframeSrc(this.#src, this.#snapshotProps());
    if (target && nextSrc && embedParamsOf(nextSrc) !== embedParamsOf(target.getAttribute('src') ?? '')) {
      // The rebuilt embed reports its own metadata, which settles this load.
      target.src = nextSrc;
      return;
    }
    // The Stream player mimics `HTMLVideoElement` down to a writable `src`, so a
    // new video is one assignment away; rebuilding the iframe would throw away a
    // working embed and the SDK connection with it.
    this.#player.src = parsed.id;
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
    await this.#loadComplete;
    // The embed still holds the paused video, so playing it would resume a
    // source that is no longer the one being reported.
    if (!this.#hasSource) return;
    await this.#player?.play();
  }

  pause() {
    this.#player?.pause();
  }

  get currentTime() {
    return this.#currentTime;
  }
  set currentTime(value) {
    if (this.#currentTime === value) return;
    this.#currentTime = value;
    this.#afterLoad((p) => {
      p.currentTime = value;
    });
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
    this.#afterLoad((p) => {
      p.volume = value;
    });
  }

  get muted() {
    return this.#muted;
  }
  set muted(value) {
    if (this.#muted === value) return;
    this.#muted = value;
    this.#afterLoad((p) => {
      p.muted = value;
    });
  }

  get playbackRate() {
    return this.#playbackRate;
  }
  set playbackRate(value) {
    if (this.#playbackRate === value) return;
    this.#playbackRate = value;
    this.#afterLoad((p) => {
      p.playbackRate = value;
    });
  }

  get autoplay() {
    return this.#autoplay;
  }
  set autoplay(value) {
    this.#autoplay = value;
    this.#afterLoad((p) => {
      p.autoplay = value;
    });
  }

  get defaultMuted() {
    return this.#defaultMuted;
  }
  set defaultMuted(value) {
    // The embed reads its initial muted state from the URL; afterwards `muted`
    // is the only way to reach the player.
    this.#defaultMuted = value;
    // Until the embed reports its own volume state there is nothing to report but
    // what it is being built with, the way a media element seeds `muted` from
    // `defaultMuted`. Waiting for the embed to say so would have a muted autoplay
    // read as unmuted for as long as the SDK takes to arrive.
    if (!this.#loaded) this.#muted = value;
  }

  get loop() {
    return this.#loop;
  }
  set loop(value) {
    this.#loop = value;
    this.#afterLoad((p) => {
      p.loop = value;
    });
  }

  get controls() {
    return this.#controls;
  }
  set controls(value) {
    this.#controls = value;
    this.#afterLoad((p) => {
      p.controls = value;
    });
  }

  get playsInline() {
    return this.#playsInline;
  }
  set playsInline(value) {
    // The Stream embed plays inline on its own and has no knob for it.
    this.#playsInline = value;
  }

  get preload() {
    return this.#preload;
  }
  set preload(value) {
    this.#preload = value;
    this.#afterLoad((p) => {
      p.preload = value;
    });
  }

  get poster() {
    return this.#poster;
  }
  set poster(value) {
    this.#poster = value;
    this.#afterLoad((p) => {
      p.poster = value;
    });
  }

  /**
   * Structured source: the Cloudflare URL, video UID, or signed token in `src`,
   * plus embed parameters under `engine.cloudflare`. Replacing it re-derives
   * `src`; assigning an equivalent source is a no-op.
   */
  get source(): CloudflareSource | null {
    return this.#source;
  }
  set source(value: CloudflareSource | null) {
    const source = value ?? null;
    // Changing anything takes a new object, so handing the same one back costs
    // nothing.
    if (source === this.#source) return;

    const src = source?.src ?? '';
    const srcChanged = this.#src !== src;
    // Embed parameters are read when the embed is built, so a change to them
    // needs a reload of its own even though the URL is the same.
    const engineChanged = !deepEqual(this.#source?.engine?.cloudflare ?? null, source?.engine?.cloudflare ?? null);

    this.#source = source;
    this.#src = src;

    if (srcChanged || engineChanged) void this.load();

    // Assigning is always a source change, so it is always announced.
    this.dispatchEvent(new Event('sourcechange'));
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

  /**
   * The SDK exposes no track API, so this list stays empty; the embed picks a
   * track from the `defaultTextTrack` parameter and owns it from there.
   */
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

  // The SDK exposes no fullscreen controls, so fullscreen targets the iframe itself.
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

  // No picture-in-picture surface: the Stream SDK exposes no request or exit
  // method and reports no enter or leave event, so there is nothing to drive or
  // to follow. Declaring the members anyway would have the player offer a control
  // that silently does nothing.

  /**
   * Build the embed and start player creation once a source can be resolved. The
   * SDK only talks to an iframe that already holds a Stream embed, so a target
   * that cannot be resolved yet leaves the player null and settles the load it
   * was given; the next `load()` retries.
   *
   * @returns Whether player creation started.
   */
  #createPlayer(): boolean {
    const target = this.#target;
    if (!target || this.#player || this.#creatingPlayer) return false;

    // Whether the embed came from the document rather than from here — server-
    // rendered markup, or a hydrated tree. The reload it needs happens once the
    // SDK is in hand, but the question has to be answered now: an iframe built
    // here navigates on its own while the SDK loads, and would look
    // server-rendered by the time it resolves.
    let serverRendered = false;
    // The `src` property resolves an empty attribute to the document URL, so it
    // cannot tell an embed apart from a placeholder; the attribute can.
    if (!target.getAttribute('src')) {
      const initialSrc = buildCloudflareIframeSrc(this.#src, this.#snapshotProps());
      // No embed means no player is coming to settle this load.
      if (!initialSrc) {
        this.#loadComplete.resolve();
        return false;
      }
      target.src = initialSrc;
    } else {
      serverRendered = hasEmbedNavigated(target);
    }

    this.#creatingPlayer = true;
    this.dispatchEvent(new Event('loadstart'));
    void this.#createPlayerApi(target, serverRendered);
    return true;
  }

  async #createPlayerApi(target: HTMLIFrameElement, serverRendered: boolean) {
    const attachId = this.#attachId;
    let api: CloudflareStreamApi;
    try {
      api = await loadCloudflareStreamApi();
    } catch {
      // A failed SDK load belongs to the attach that started it; a newer one must
      // not be marked failed or have its load unblocked.
      if (this.#isStale(attachId)) return;
      this.#creatingPlayer = false;
      this.#error = new MediaError('Failed to load the Cloudflare Stream SDK', MediaError.MEDIA_ERR_NETWORK);
      this.dispatchEvent(new Event('error'));
      // Unblock callers awaiting load so play()/fullscreen don't hang.
      this.#loadComplete.resolve();
      return;
    }
    if (this.#isStale(attachId) || this.#target !== target) return;
    if (serverRendered) {
      // A server-rendered embed finished loading long before the SDK was there to
      // hear it, and the `iframeReady` message it posts once on load went
      // nowhere. Reassigning the URL reloads the frame so that message is sent
      // again — which only helps if the SDK is already loaded, so this waits for
      // the script rather than happening when the frame is bound.
      const embedSrc = target.src;
      target.src = embedSrc;
    }
    const player = api(target);
    this.#player = player;
    this.#creatingPlayer = false;
    this.#bindPlayerEvents(player, attachId);
    if (this.#pendingLoad) {
      // A source arrived while the SDK was loading, so the embed points at the
      // previous one; only the player can be moved off it now.
      this.#pendingLoad = false;
      void this.load();
    }
  }

  /**
   * Whether a callback belongs to a superseded attach. An embed can keep
   * reporting after the reference to its player is gone, so anything a player
   * reports has to be matched against the attach that created it before it is
   * allowed to touch state.
   */
  #isStale(attachId: number) {
    return attachId !== this.#attachId;
  }

  /** Pause the embed, tolerating an iframe the SDK can no longer reach. */
  #pauseEmbed() {
    try {
      this.#player?.pause();
    } catch {
      // The SDK throws if the iframe was already removed.
    }
  }

  /** Defer a player call until `loadComplete` resolves, swallowing failures. */
  #afterLoad(fn: (player: CloudflareStreamPlayerApi) => void) {
    this.#loadComplete.then(
      () => {
        if (!this.#player) return;
        try {
          fn(this.#player);
        } catch {
          // The SDK throws if the iframe was already removed.
        }
      },
      () => {}
    );
  }

  /**
   * What the next embed has to be built muted with. Rebuilding throws the
   * player's own volume state away with the frame, so a video the user muted at
   * runtime would come back with sound unless the URL carries the mute forward.
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
      preload: this.#preload || cloudflareMediaDefaultProps.preload,
      poster: this.#poster,
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
    this.#playbackRate = 1;
    this.#progress = 0;
    this.#readyState = READY_STATE_HAVE_NOTHING;
    this.#seeking = false;
    this.#loaded = false;
    this.#srcUnsupported = false;
    this.#volume = 1;
    this.#error = null;
    this.#videoWidth = Number.NaN;
    this.#videoHeight = Number.NaN;
    this.#isFullscreen = false;
  }

  #onLoaded() {
    if (this.#loaded) return;
    this.#loaded = true;
    this.#readyState = READY_STATE_HAVE_METADATA;
    const player = this.#player;
    if (player) {
      this.#duration = toDuration(player.duration);
      this.#muted = player.muted;
      this.#volume = player.volume;
      this.#playbackRate = player.playbackRate;
      this.#videoWidth = player.videoWidth;
      this.#videoHeight = player.videoHeight;
    }
    for (const type of ['loadedmetadata', 'durationchange', 'volumechange', 'loadcomplete']) {
      this.dispatchEvent(new Event(type));
    }
    this.#loadComplete.resolve();
  }

  #onError() {
    // The embed reports the failure without a code or a message, so all that can
    // be said about it is that playback stopped.
    this.#error = new MediaError('Cloudflare Stream playback error', MediaError.MEDIA_ERR_CUSTOM, true);
    this.dispatchEvent(new Event('error'));
    // Unblock callers awaiting load so play()/fullscreen don't hang.
    this.#loadComplete.resolve();
  }

  #bindPlayerEvents(player: CloudflareStreamPlayerApi, attachId: number) {
    const listen = (type: string, handle: () => void) => {
      const listener = () => {
        // A source that is gone or unrecognized has nothing left to report, and
        // the embed keeps reporting the video it still holds — completing on that
        // would put the state just cleared right back.
        if (this.#isStale(attachId) || !this.#hasSource) return;
        handle();
      };
      player.addEventListener(type, listener);
      this.#playerListeners.push([type, listener]);
    };
    // The embed speaks the HTML media vocabulary, so most events are the state
    // they carry plus a re-dispatch under the same name.
    const on = (type: string, update?: () => void) =>
      listen(type, () => {
        update?.();
        this.dispatchEvent(new Event(type));
      });

    // `loadedmetadata` is what completes a load, and `#onLoaded` dispatches it.
    listen('loadedmetadata', () => this.#onLoaded());
    on('loadeddata', () => {
      this.#readyState = READY_STATE_HAVE_CURRENT_DATA;
    });
    on('play', () => {
      this.#paused = false;
      this.#ended = false;
    });
    on('playing', () => {
      this.#readyState = READY_STATE_HAVE_FUTURE_DATA;
      this.#paused = false;
    });
    on('pause', () => {
      this.#paused = true;
    });
    on('ended', () => {
      this.#paused = true;
      this.#ended = true;
    });
    on('timeupdate', () => {
      this.#currentTime = player.currentTime;
    });
    on('durationchange', () => {
      this.#duration = toDuration(player.duration);
    });
    on('volumechange', () => {
      this.#volume = player.volume;
      this.#muted = player.muted;
    });
    on('ratechange', () => {
      this.#playbackRate = player.playbackRate;
    });
    on('progress', () => {
      this.#progress = toBufferedEnd(player);
    });
    on('seeking', () => {
      this.#seeking = true;
    });
    on('seeked', () => {
      this.#seeking = false;
      this.#currentTime = player.currentTime;
    });
    on('resize', () => {
      this.#videoWidth = player.videoWidth;
      this.#videoHeight = player.videoHeight;
    });
    for (const type of PASSTHROUGH_EVENTS) on(type);
    listen('error', () => this.#onError());
  }

  #unbindPlayerEvents() {
    for (const [type, listener] of this.#playerListeners) {
      try {
        this.#player?.removeEventListener(type, listener);
      } catch {
        // The SDK throws if the iframe was already removed.
      }
    }
    this.#playerListeners.length = 0;
  }
}

/**
 * Events that carry no state of their own, including the encrypted-media pair
 * and Cloudflare's ad lifecycle.
 *
 * `emptied` and `loadstart` are deliberately not among them even though the
 * embed reports both: the host announces its own load lifecycle, and passing the
 * embed's copies through would double up on every source change.
 */
const PASSTHROUGH_EVENTS = [
  'waiting',
  'stalled',
  'suspend',
  'abort',
  'canplay',
  'canplaythrough',
  'encrypted',
  'waitingforkey',
  'stream-adstart',
  'stream-adend',
  'stream-adtimeout',
];

/** The embed reports `0` until it knows the duration; `HTMLMediaElement` reports `NaN`. */
function toDuration(duration: number) {
  return duration > 0 ? duration : Number.NaN;
}

function toBufferedEnd(player: CloudflareStreamPlayerApi) {
  const { buffered } = player;
  return buffered?.length ? buffered.end(buffered.length - 1) : 0;
}

/**
 * The part of an embed URL that does not name the video: its origin and query.
 * Two URLs differing only in the id can be swapped on the player, where a
 * difference here has to be rebuilt, because the embed reads its parameters when
 * it loads and never again.
 */
function embedParamsOf(src: string): string {
  try {
    const url = new URL(src);
    return `${url.origin}${url.search}`;
  } catch {
    // Not a URL yet, so nothing it holds can match what is being built.
    return '';
  }
}

/**
 * Whether the embed has already navigated to its URL. An iframe this host just
 * built has not: navigation starts after the current task, so it is still on
 * `about:blank`, which is same-origin and readable. One that came from the
 * document's own markup has long since navigated cross-origin, and reading its
 * location throws.
 */
function hasEmbedNavigated(target: HTMLIFrameElement): boolean {
  const frame = target.contentWindow;
  if (!frame) return false;
  try {
    return frame.location.href !== 'about:blank';
  } catch {
    // Cross-origin, so the embed is already there.
    return true;
  }
}

const READY_STATE_HAVE_NOTHING = 0;
const READY_STATE_HAVE_METADATA = 1;
const READY_STATE_HAVE_CURRENT_DATA = 2;
const READY_STATE_HAVE_FUTURE_DATA = 3;
