/**
 * Mock media contract types — mirrors packages/core/src/core/media/types.ts.
 *
 * Exercises: event extraction from capability event interfaces.
 * VideoEvents extends all capability events (including TextTrackListEvents).
 * AudioEvents extends a subset (no text track events).
 */

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

export interface VideoEvents
  extends MediaPlaybackEvents,
    MediaPauseEvents,
    MediaSeekEvents,
    MediaSourceEvents,
    MediaVolumeEvents,
    MediaPlaybackRateEvents,
    MediaBufferEvents,
    MediaErrorEvents,
    TextTrackListEvents {}

export interface AudioEvents
  extends MediaPlaybackEvents,
    MediaPauseEvents,
    MediaSeekEvents,
    MediaSourceEvents,
    MediaVolumeEvents,
    MediaPlaybackRateEvents,
    MediaBufferEvents,
    MediaErrorEvents {}
