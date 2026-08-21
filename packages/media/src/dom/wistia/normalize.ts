import { EMPTY_REMOTE, EMPTY_TEXT_TRACKS } from '../../core/constants';
import type { MediaContentData, TimeRangeLike } from '../../core/types';
import { createTimeRange } from '../utils';
import { parseWistiaMediaId, parseWistiaStartTime, type WistiaSource } from './source';

/**
 * The members of Wistia's `<wistia-player>` that {@link normalizeWistiaPlayer} reads.
 *
 * Described structurally rather than imported, so `@videojs/media` carries the contract without carrying a
 * dependency on the player only its platform packages embed. It is the argument type of the normalizer for
 * that reason: the platforms pass Wistia's own class, so a member it renames or drops fails to compile
 * there instead of quietly disabling a store feature at runtime.
 */
export interface WistiaPlayerMembers {
  mediaId: string;
  readyState: number;
  duration: number;
  state: 'beforeplay' | 'ended' | 'paused' | 'playing' | undefined;
  name: string | undefined;
  muted: boolean;
  endVideoBehavior: string;
  playBarControl: boolean;
  inFullscreen: boolean;
  cancelFullscreen(): Promise<void>;
}

/** A player as this module works on it: Wistia's members, plus everything it defines onto them. */
export interface WistiaPlayerLike extends HTMLElement, WistiaPlayerMembers {
  [key: string]: any;
}

/**
 * Wistia's spellings for the media events it renames, against the ones a media element uses.
 *
 * Some carry an event Wistia has none of. It announces no `progress`, so the only news that `buffered` may
 * have moved is that the playhead did; and no `playing`, since its `play` already means playback has begun.
 *
 * `durationchange` is the awkward one, because Wistia has no single moment where a duration appears.
 * `duration` reads `0` until `api-ready`, its media data lands on `loaded-media-data`, and `loaded-metadata`
 * is documented as possibly delayed until the viewer interacts with the player — so a media that is never
 * clicked may never see it. All three therefore announce a duration that may have changed, which is what
 * `durationchange` is for; `loadedmetadata` is held to once per source below, since that one is not.
 *
 * `timeupdate` comes from two of them. Wistia documents `second-change` as a subset of `time-update` — the
 * same news, once a second rather than continuously — so taking both means the clock still runs if only one
 * turns up, at whatever resolution is on offer. A repeated `timeupdate` costs nothing: every listener for it
 * is a sync that reads the playhead back off the player.
 *
 * `play`, `pause`, `ended`, `seeking`, and `seeked` are absent because Wistia already spells them the way a
 * media element does.
 */
export const WISTIA_EVENT_ALIASES: Readonly<Record<string, readonly string[]>> = {
  'api-ready': ['loadedmetadata', 'durationchange'],
  'can-play': ['canplay'],
  'can-play-through': ['canplaythrough'],
  'loaded-data': ['loadeddata'],
  'loaded-media-data': ['durationchange', 'contentdatachange'],
  'loaded-metadata': ['loadedmetadata', 'durationchange'],
  'load-start': ['loadstart'],
  play: ['playing'],
  'rate-change': ['ratechange'],
  'second-change': ['timeupdate', 'progress'],
  'time-update': ['timeupdate', 'progress'],
  'volume-change': ['volumechange'],
};

/**
 * Give a `<wistia-player>` the surface the rest of Video.js expects of a media: the members
 * `HTMLMediaElement` has that Wistia names differently or not at all, and the events it spells its own way.
 *
 * Applied to the element itself rather than wrapped around it, so the player a consumer holds and the media
 * the player store drives are one object. Both platform packages call this — the custom element on itself,
 * the React component on the element its wrapper renders — which is what keeps the two in step.
 *
 * `controls` is deliberately not among the members it defines. Wistia already has a `controls` of its own,
 * and it means something else entirely: the player's defined control instances, which its internals read.
 * Turning chrome on and off is `wistiaControlProps` instead, which each platform applies from the
 * `controls` prop it accepts.
 *
 * Idempotent: normalizing an element twice is a no-op.
 */
export function normalizeWistiaPlayer<T extends HTMLElement & WistiaPlayerMembers>(player: T): T {
  // Strict on the way in, loose inside: the members installed below do not exist on the argument yet.
  const target = player as unknown as WistiaPlayerLike;
  if (normalized.has(target)) return player;
  normalized.add(target);

  // Wistia reports no `seeking` property, only events, and it does not reliably follow a `seeking` with a
  // `seeked`. Tracking one without the other wedges the flag on: the store stops syncing the playhead while
  // a seek is in flight, so a seek that never ends is a clock that never runs again. The first playhead
  // report after a seek therefore closes it — and says so, because the store waits on `seeked` to settle a
  // seek of its own and to re-read the flag.
  const endSeek = () => {
    const state = stateOf(target);
    if (!state.seeking) return;
    state.seeking = false;
    target.dispatchEvent(new Event('seeked'));
  };

  target.addEventListener('seeking', () => {
    stateOf(target).seeking = true;
  });
  target.addEventListener('seeked', () => {
    // A real one leaves nothing for the fallback below to announce.
    stateOf(target).seeking = false;
  });
  for (const type of ['second-change', 'time-update']) target.addEventListener(type, endSeek);

  for (const [from, to] of Object.entries(WISTIA_EVENT_ALIASES)) {
    target.addEventListener(from, () => {
      for (const type of to) {
        // A media element announces metadata once per resource, where more than one Wistia event can be the
        // moment it arrives. The first to say so wins until the source changes.
        if (type === 'loadedmetadata') {
          const state = stateOf(target);
          if (state.announcedMetadata) continue;
          state.announcedMetadata = true;
        }
        target.dispatchEvent(new Event(type));
      }
    });
  }

  Object.defineProperties(target, WISTIA_MEDIA_DESCRIPTORS);
  return player;
}

const normalized = new WeakSet<WistiaPlayerLike>();
/** The source last assigned to a player, which is the record of what a consumer asked for. */
const sources = new WeakMap<WistiaPlayerLike, WistiaSource | null>();
/** Values with no home on the player, held per element rather than on it. */
const shadowState = new WeakMap<
  WistiaPlayerLike,
  { announcedMetadata: boolean; defaultMuted: boolean; playsInline: boolean; seeking: boolean }
>();

function stateOf(player: WistiaPlayerLike) {
  let state = shadowState.get(player);
  if (!state) {
    const initial = { announcedMetadata: false, defaultMuted: false, playsInline: true, seeking: false };
    shadowState.set(player, (state = initial));
  }
  return state;
}

/**
 * An empty range that is not the shared `EMPTY_TIME_RANGES`.
 *
 * `isMediaBufferCapable` reads that exact object as "this media has no buffer surface at all" and the store
 * skips its buffer feature for good — where a Wistia player has one, and merely has nothing in it until a
 * duration arrives.
 */
const NO_RANGE: TimeRangeLike = Object.freeze({ length: 0, start: () => 0, end: () => 0 });

function accessor(
  get: (this: WistiaPlayerLike) => any,
  set?: (this: WistiaPlayerLike, value: any) => void
): PropertyDescriptor {
  return { configurable: true, enumerable: true, get, ...(set && { set }) };
}

const WISTIA_MEDIA_DESCRIPTORS: PropertyDescriptorMap = {
  /** The media's hashed id. Accepts any Wistia URL too, and reports the id it resolved to. */
  src: accessor(
    function () {
      return this.mediaId ?? '';
    },
    function (value: string) {
      this.source = { ...this.source, mediaId: parseWistiaMediaId(value) ?? '' };
      // A `wtime` in the URL is the one thing the id does not carry over.
      const startTime = parseWistiaStartTime(value);
      if (startTime != null) this.currentTime = startTime;
    }
  ),

  currentSrc: accessor(function () {
    return this.mediaId ?? '';
  }),

  /** Wistia's own options, `mediaId` among them. Assigning applies every one of them to the player. */
  source: accessor(
    function (): WistiaSource | null {
      return sources.get(this) ?? (this.mediaId ? { mediaId: this.mediaId } : null);
    },
    function (value: WistiaSource | null) {
      sources.set(this, value);
      // Replacing what the player holds drops the last media's duration and buffer with it, and the next
      // media gets to announce its metadata in turn.
      stateOf(this).announcedMetadata = false;
      this.dispatchEvent(new Event('emptied'));
      if (value) Object.assign(this, value);
      else this.mediaId = '';
      this.dispatchEvent(new Event('sourcechange'));
    }
  ),

  /**
   * True unless the media is playing.
   *
   * Wistia answers `state === 'paused'`, which is `false` in the `beforeplay` state a player opens in — and
   * `false` again before its API is ready — where a media element reports `true`. A play/pause toggle reads
   * this to decide which of the two to call, so left alone, the first click on an untouched player pauses
   * something that was never playing.
   */
  paused: accessor(function () {
    return this.state !== 'playing';
  }),

  /** Wistia spells looping as an end-of-video behavior. */
  loop: accessor(
    function () {
      return this.endVideoBehavior === 'loop';
    },
    function (value: boolean) {
      this.endVideoBehavior = value ? 'loop' : 'default';
    }
  ),

  /**
   * The player is live from the moment it exists, so it keeps no default to apply later: setting this mutes
   * it now, and `muted` is what changes it afterwards.
   */
  defaultMuted: accessor(
    function () {
      return stateOf(this).defaultMuted;
    },
    function (value: boolean) {
      stateOf(this).defaultMuted = value;
      this.muted = value;
    }
  ),

  /** Stored and reported, but never passed on: Wistia has no inline-playback knob and plays inline. */
  playsInline: accessor(
    function () {
      return stateOf(this).playsInline;
    },
    function (value: boolean) {
      stateOf(this).playsInline = value;
    }
  ),

  /**
   * Whether a seek is in flight. Wistia has no property for it, so it is tracked from its events — and it
   * has to exist at all, because the store reads it to decide the media can seek.
   */
  seeking: accessor(function () {
    return stateOf(this).seeking;
  }),

  /** Wistia reports no seekable range of its own, and every Wistia media is seekable end to end. */
  seekable: accessor(function () {
    const duration = this.duration;
    return duration > 0 && Number.isFinite(duration) ? createTimeRange(0, duration) : NO_RANGE;
  }),

  /** The media's own metadata. Wistia knows its name once `loaded-media-data` has fired, and nothing else. */
  contentData: accessor(function (): MediaContentData {
    return { title: this.name ?? null };
  }),

  // Nothing behind these, but whether they exist still matters: the store gates each of its features on a
  // predicate that asks only whether the members are defined, so a missing one skips the feature outright
  // rather than degrading it. These are defined because an empty answer is the honest one and the features
  // reading them cope with it. `textTracks` is the opposite case — the shared `EMPTY_TEXT_TRACKS` is the
  // sentinel that tells the store to skip text tracks, which is what should happen.
  played: accessor(() => NO_RANGE),
  textTracks: accessor(() => EMPTY_TEXT_TRACKS),
  videoWidth: accessor(() => 0),
  videoHeight: accessor(() => 0),
  error: accessor(() => null),
  crossOrigin: accessor(
    () => null,
    () => {}
  ),

  // Remote playback and picture-in-picture belong to the `<video>` inside Wistia's shadow root, which is
  // not ours to reach. Reported as unavailable rather than left undefined.
  remote: accessor(() => EMPTY_REMOTE),
  disableRemotePlayback: accessor(
    () => true,
    () => {}
  ),
  disablePictureInPicture: accessor(
    () => true,
    () => {}
  ),
  isPictureInPicture: accessor(() => false),

  /** Wistia serves on-demand media only. */
  streamType: accessor(
    () => 'on-demand',
    () => {}
  ),

  isFullscreen: accessor(function () {
    return this.inFullscreen === true;
  }),

  exitFullscreen: {
    configurable: true,
    value: function (this: WistiaPlayerLike) {
      return this.cancelFullscreen();
    },
  },

  /** Re-apply the current source, which is all a Wistia player can be asked to reload. */
  load: {
    configurable: true,
    value: function (this: WistiaPlayerLike) {
      const source = this.source;
      this.source = source;
    },
  },

  canPlayType: {
    configurable: true,
    value: () => '',
  },

  addTextTrack: {
    configurable: true,
    value: () => undefined,
  },
};
