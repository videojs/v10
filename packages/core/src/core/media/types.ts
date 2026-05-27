// ----------------------------------------
// Event primitives
// ----------------------------------------

export interface EventLike<Detail = void> {
  readonly type: string;
  readonly timeStamp: number;
  readonly detail?: Detail;
}

export interface EventTargetLike<Events extends { [K in keyof Events]: EventLike }> {
  addEventListener<K extends keyof Events & string>(
    type: K,
    listener: (event: Events[K]) => void,
    options?: { signal?: AbortSignal }
  ): void;
  removeEventListener<K extends keyof Events & string>(type: K, listener: (event: Events[K]) => void): void;
  dispatchEvent(event: EventLike): boolean;
}

export function TypedEventTarget<Events extends { [K in keyof Events]: EventLike }>() {
  return EventTarget as unknown as { new (): EventTargetLike<Events> };
}

// ----------------------------------------
// Shared value types
// ----------------------------------------

export type MediaFeatureAvailability = 'available' | 'unavailable' | 'unsupported';

// ----------------------------------------
// Playback
// ----------------------------------------

export interface MediaPlaybackEvents {
  play: EventLike;
  playing: EventLike;
  waiting: EventLike;
}

export interface MediaPlaybackCapability {
  play(): Promise<void>;
}

// ----------------------------------------
// Pause
// ----------------------------------------

export interface MediaPauseEvents {
  pause: EventLike;
  ended: EventLike;
}

export interface MediaPauseCapability {
  pause(): void;
  readonly paused: boolean;
  readonly ended: boolean;
}

// ----------------------------------------
// Seek
// ----------------------------------------

export interface MediaSeekEvents {
  timeupdate: EventLike;
  durationchange: EventLike;
  seeking: EventLike;
  seeked: EventLike;
  loadedmetadata: EventLike;
}

export interface MediaSeekCapability {
  currentTime: number;
  loop: boolean;
  readonly duration: number;
  readonly seeking: boolean;
}

// ----------------------------------------
// Source
// ----------------------------------------

export type MediaPreloadType = '' | 'none' | 'metadata' | 'auto';

const MediaReadyState = {
  HAVE_NOTHING: 0,
  HAVE_METADATA: 1,
  HAVE_CURRENT_DATA: 2,
  HAVE_FUTURE_DATA: 3,
  HAVE_ENOUGH_DATA: 4,
} as const;

export type MediaReadyStateValue = (typeof MediaReadyState)[keyof typeof MediaReadyState];

export interface MediaSourceEvents {
  loadstart: EventLike;
  emptied: EventLike;
  canplay: EventLike;
  canplaythrough: EventLike;
  loadeddata: EventLike;
}

export interface MediaSourceCapability {
  src: string;
  readonly currentSrc: string;
  readonly readyState: MediaReadyStateValue | number;
  preload: MediaPreloadType;
  load(): Promise<void> | void;
}

// ----------------------------------------
// Volume
// ----------------------------------------

export interface MediaVolumeEvents {
  volumechange: EventLike;
}

export interface MediaVolumeCapability {
  volume: number;
  muted: boolean;
}

// ----------------------------------------
// Playback rate
// ----------------------------------------

export interface MediaPlaybackRateEvents {
  ratechange: EventLike;
}

export interface MediaPlaybackRateCapability {
  playbackRate: number;
}

// ----------------------------------------
// Buffer
// ----------------------------------------

export interface TimeRangeLike {
  readonly length: number;
  start(index: number): number;
  end(index: number): number;
}

export interface MediaBufferEvents {
  progress: EventLike;
}

export interface MediaBufferCapability {
  readonly buffered: TimeRangeLike;
  readonly seekable: TimeRangeLike;
}

// ----------------------------------------
// Error
// ----------------------------------------

export interface ErrorLike {
  readonly code: number;
  readonly message: string;
}

export interface MediaErrorEvents {
  error: EventLike;
}

export interface MediaErrorCapability {
  readonly error: ErrorLike | null;
}

// ----------------------------------------
// Text tracks
// ----------------------------------------

export interface TextCueLike {
  readonly startTime: number;
  readonly endTime: number;
  readonly text?: string;
}

export interface TextCueListLike {
  readonly length: number;
  [Symbol.iterator](): Iterator<TextCueLike>;
  getCueById?(id: string): TextCueLike | null;
}

export interface TextTrackLike {
  readonly kind: string;
  readonly label: string;
  readonly language: string;
  readonly id: string;
  readonly src?: string;
  mode: 'showing' | 'disabled' | 'hidden';
  readonly cues: TextCueListLike | null;
  addCue?(cue: TextCueLike): void;
}

export interface TextTrackListEvents {
  addtrack: EventLike;
  removetrack: EventLike;
  change: EventLike;
}

export interface TextTrackListLike extends EventTargetLike<TextTrackListEvents> {
  readonly length: number;
  readonly [index: number]: TextTrackLike;
  [Symbol.iterator](): Iterator<TextTrackLike>;
  getTrackById?(id: string): TextTrackLike | null;
}

export interface MediaTextTrackCapability {
  readonly textTracks: TextTrackListLike;
}

// ----------------------------------------
// Fullscreen
// ----------------------------------------

export interface MediaFullscreenCapability {
  readonly isFullscreen: boolean;
  requestFullscreen(): Promise<unknown>;
  exitFullscreen(): Promise<unknown>;
}

// ----------------------------------------
// Picture-in-picture
// ----------------------------------------

export interface MediaPictureInPictureCapability {
  readonly isPictureInPicture: boolean;
  requestPictureInPicture(): Promise<unknown>;
  exitPictureInPicture(): Promise<unknown>;
}

// ----------------------------------------
// Stream type
// ----------------------------------------

/**
 * Canonical values for {@link MediaStreamType}.
 *
 * - `ON_DEMAND` — a finite-duration asset (VOD). Scrubbing is generally
 *   supported across the full timeline.
 * - `LIVE` — a live or DVR stream. The seekable window may slide as new
 *   segments are published, and `duration` is typically `Infinity`.
 * - `UNKNOWN` — the stream type has not been determined yet (no source,
 *   or metadata has not loaded).
 */
export const MediaStreamTypes = {
  ON_DEMAND: 'on-demand',
  LIVE: 'live',
  UNKNOWN: 'unknown',
} as const;

export type MediaStreamType = (typeof MediaStreamTypes)[keyof typeof MediaStreamTypes];

export interface MediaStreamTypeEvents {
  streamtypechange: EventLike;
}

export interface MediaStreamTypeCapability {
  streamType: MediaStreamType;
}

export interface MediaLiveEvents {
  targetlivewindowchange: EventLike;
}

export interface MediaLiveCapability {
  /**
   * Presentation time marking the start of the Live Edge Window. Playing at
   * the live edge when `currentTime >= liveEdgeStart`. `NaN` when the stream
   * isn't live or the value is unknown.
   *
   * Derived — no dedicated change event; re-read when `seekable`,
   * `targetLiveWindow`, or `streamType` change.
   *
   * @see https://github.com/video-dev/media-ui-extensions/blob/main/proposals/0007-live-edge.md
   */
  readonly liveEdgeStart: number;
  /**
   * Offset representing the seekable range size for live content. `0` for
   * standard latency live, `Infinity` for DVR, `NaN` for on-demand or
   * unknown. Fires `targetlivewindowchange` when the value changes.
   */
  readonly targetLiveWindow: number;
}

// ----------------------------------------
// Remote playback
// ----------------------------------------

export interface RemotePlaybackEvents {
  connecting: EventLike;
  connect: EventLike;
  disconnect: EventLike;
}

export interface RemotePlaybackLike extends EventTargetLike<RemotePlaybackEvents> {
  readonly state: string;
  prompt(): Promise<void>;
  watchAvailability(callback: (available: boolean) => void): Promise<number>;
  cancelWatchAvailability(id?: number): Promise<void>;
}

export interface MediaRemotePlaybackCapability {
  readonly remote: RemotePlaybackLike;
  disableRemotePlayback: boolean;
}

// ----------------------------------------
// Playback options
// ----------------------------------------

export interface MediaPlaybackOptionsCapability {
  autoplay: boolean;
  defaultMuted: boolean;
  controls: boolean;
}

// ----------------------------------------
// Plays inline (video-only)
// ----------------------------------------

export interface MediaPlaysInlineCapability {
  playsInline: boolean;
}

// ----------------------------------------
// Config
// ----------------------------------------

export interface MediaConfigCapability {
  config: Record<string, unknown>;
}

// ----------------------------------------
// Base Media
// ----------------------------------------

export interface MediaEvents extends MediaPlaybackEvents {}

export interface Media<Events extends { [K in keyof Events]: EventLike } = MediaEvents>
  extends MediaPlaybackCapability,
    EventTargetLike<Events> {
  readonly engine?: unknown;
  readonly target?: unknown;
  readonly next?: Media | null;
  readonly root?: Media | null;
  destroy?(): Promise<void> | void;
}

// ----------------------------------------
// Composed shapes
// ----------------------------------------

export interface MediaFullEvents
  extends MediaPlaybackEvents,
    MediaPauseEvents,
    MediaSeekEvents,
    MediaSourceEvents,
    MediaVolumeEvents,
    MediaPlaybackRateEvents,
    MediaBufferEvents,
    MediaErrorEvents,
    TextTrackListEvents,
    MediaStreamTypeEvents,
    MediaLiveEvents {}

export interface MediaFull
  extends Media<MediaFullEvents>,
    MediaPauseCapability,
    MediaSeekCapability,
    MediaSourceCapability,
    MediaVolumeCapability,
    MediaPlaybackRateCapability,
    MediaBufferCapability,
    MediaErrorCapability,
    MediaTextTrackCapability,
    MediaStreamTypeCapability,
    MediaLiveCapability,
    MediaRemotePlaybackCapability,
    MediaPlaybackOptionsCapability,
    MediaConfigCapability {}

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

export interface Video
  extends Media<VideoEvents>,
    MediaPauseCapability,
    MediaSeekCapability,
    MediaSourceCapability,
    MediaVolumeCapability,
    MediaPlaybackRateCapability,
    MediaBufferCapability,
    MediaErrorCapability,
    MediaTextTrackCapability,
    MediaFullscreenCapability,
    MediaPictureInPictureCapability,
    MediaPlaysInlineCapability {}

export interface AudioEvents
  extends MediaPlaybackEvents,
    MediaPauseEvents,
    MediaSeekEvents,
    MediaSourceEvents,
    MediaVolumeEvents,
    MediaPlaybackRateEvents,
    MediaBufferEvents,
    MediaErrorEvents {}

export interface Audio
  extends Media<AudioEvents>,
    MediaPauseCapability,
    MediaSeekCapability,
    MediaSourceCapability,
    MediaVolumeCapability,
    MediaPlaybackRateCapability,
    MediaBufferCapability,
    MediaErrorCapability {}
