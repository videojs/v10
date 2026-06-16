/**
 * Mock media contract types — mirrors packages/core/src/core/media/types.ts.
 *
 * Exercises: event extraction from capability event interfaces.
 * VideoEvents extends all capability events (including TextTrackListEvents).
 * AudioEvents extends a subset (no text track events).
 */

// Mirrors the real MediaStreamTypes const object. Exercises default-value
// resolution of property-access expressions (e.g. MediaStreamTypes.UNKNOWN)
// through an import to a `... as const` object literal.
export const MediaStreamTypes = {
  ON_DEMAND: 'on-demand',
  LIVE: 'live',
  UNKNOWN: 'unknown',
} as const;

export interface EventLike<Detail = void> {
  readonly type: string;
  readonly timeStamp: number;
  readonly detail?: Detail;
}

export interface MediaPlaybackEvents {
  play: EventLike;
  playing: EventLike;
  waiting: EventLike;
}

export interface MediaPauseEvents {
  pause: EventLike;
  ended: EventLike;
}

export interface MediaSeekEvents {
  timeupdate: EventLike;
  durationchange: EventLike;
  seeking: EventLike;
  seeked: EventLike;
  loadedmetadata: EventLike;
}

export interface MediaSourceEvents {
  loadstart: EventLike;
  emptied: EventLike;
  canplay: EventLike;
  canplaythrough: EventLike;
  loadeddata: EventLike;
}

export interface MediaVolumeEvents {
  volumechange: EventLike;
}

export interface MediaPlaybackRateEvents {
  ratechange: EventLike;
}

export interface MediaBufferEvents {
  progress: EventLike;
}

export interface MediaErrorEvents {
  error: EventLike;
}

export interface TextTrackListEvents {
  addtrack: EventLike;
  removetrack: EventLike;
  changetrack: EventLike;
  trackmodechange: EventLike;
}

// Video.js-specific event promoted into the typed contract — mirrors the real
// MediaStreamTypeEvents. The host that fires it also carries an `@fires` tag, so
// it appears in BOTH the native list and the described element-specific list.
export interface MediaStreamTypeEvents {
  streamtypechange: EventLike;
}

export interface VideoEvents
  extends MediaPlaybackEvents,
    MediaPauseEvents,
    MediaSeekEvents,
    MediaSourceEvents,
    MediaVolumeEvents,
    MediaPlaybackRateEvents,
    MediaBufferEvents,
    MediaErrorEvents,
    TextTrackListEvents,
    MediaStreamTypeEvents {}

export interface AudioEvents
  extends MediaPlaybackEvents,
    MediaPauseEvents,
    MediaSeekEvents,
    MediaSourceEvents,
    MediaVolumeEvents,
    MediaPlaybackRateEvents,
    MediaBufferEvents,
    MediaErrorEvents {}
