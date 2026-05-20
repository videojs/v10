/** Minimal `Event`-shaped object — name, timestamp, and optional detail payload. */
export interface EventLike<Detail = void> {
  /** Event type name. */
  readonly type: string;
  /** When the event was dispatched, in milliseconds since the epoch. */
  readonly timeStamp: number;
  /** Optional payload carried by the event. */
  readonly detail?: Detail;
}

/** Strongly typed subset of `EventTarget` keyed by an `Events` map. */
export interface EventTargetLike<Events extends { [K in keyof Events]: EventLike }> {
  /** Subscribe to a typed event. */
  addEventListener<K extends keyof Events & string>(
    type: K,
    listener: (event: Events[K]) => void,
    options?: { signal?: AbortSignal }
  ): void;
  /** Remove a previously added typed event listener. */
  removeEventListener<K extends keyof Events & string>(type: K, listener: (event: Events[K]) => void): void;
  /** Dispatch an event to listeners. */
  dispatchEvent(event: EventLike): boolean;
}

/** Structural type for the platform's `RemotePlayback` interface. */
export interface RemotePlaybackLike extends EventTarget {
  /** Current connection state (`disconnected`, `connecting`, or `connected`). */
  readonly state: string;
  /** Prompt the user to pick a receiver and connect. */
  prompt(): Promise<void>;
  /** Subscribe to availability changes; returns a watcher ID. */
  watchAvailability(callback: (available: boolean) => void): Promise<number>;
  /** Cancel a prior `watchAvailability` registration. */
  cancelWatchAvailability(id?: number): Promise<void>;
}

/**
 * Type-cast helper that returns `EventTarget` as a constructor for `EventTargetLike<Events>`.
 *
 * Useful when extending `EventTarget` with a strongly typed event map.
 */
export function TypedEventTarget<Events extends { [K in keyof Events]: EventLike }>() {
  return EventTarget as unknown as { new (): EventTargetLike<Events> };
}

/** Events emitted by playback-capable media. */
export interface MediaPlaybackEvents {
  /** Fired when playback is requested. */
  play: EventLike;
  /** Fired when playback actually starts producing audio/video. */
  playing: EventLike;
  /** Fired when playback stalls waiting for data. */
  waiting: EventLike;
}

/** Minimal capability for media that can be played. */
export interface MediaPlaybackCapability {
  /** Start playback. */
  play(): Promise<void>;
}

/** Events emitted by pausable media. */
export interface MediaPauseEvents {
  /** Fired when playback is paused. */
  pause: EventLike;
  /** Fired when playback reaches the end. */
  ended: EventLike;
}

/** Minimal capability for media that can be paused. */
export interface MediaPauseCapability {
  /** Pause playback. */
  pause(): void;
  /** Whether playback is currently paused. */
  readonly paused: boolean;
  /** Whether playback has ended. */
  readonly ended: boolean;
}

/** Events emitted by seekable media. */
export interface MediaSeekEvents {
  /** Fired when the playhead advances. */
  timeupdate: EventLike;
  /** Fired when `duration` changes. */
  durationchange: EventLike;
  /** Fired when a seek starts. */
  seeking: EventLike;
  /** Fired when a seek completes. */
  seeked: EventLike;
  /** Fired when metadata (including duration) is loaded. */
  loadedmetadata: EventLike;
}

/** Minimal capability for media that supports seeking. */
export interface MediaSeekCapability {
  /** Current playhead position in seconds (writable). */
  currentTime: number;
  /** Total duration in seconds (`Infinity` for live, `NaN` if unknown). */
  readonly duration: number;
  /** Whether a seek is in progress. */
  readonly seeking: boolean;
}

/** Events emitted as a media source loads. */
export interface MediaSourceEvents {
  /** Fired when load starts. */
  loadstart: EventLike;
  /** Fired when the source is cleared. */
  emptied: EventLike;
  /** Fired when enough data is available to start playback. */
  canplay: EventLike;
  /** Fired when enough data is available to play to the end without buffering. */
  canplaythrough: EventLike;
  /** Fired when data is loaded. */
  loadeddata: EventLike;
}

/** Minimal capability for setting and loading a media source. */
export interface MediaSourceCapability {
  /** Source URL (writable). */
  src: string;
  /** Resolved source URL currently in use. */
  readonly currentSrc: string;
  /** Loading state (mirrors `HTMLMediaElement.readyState`). */
  readonly readyState: MediaReadyStateValue | number;
  /** Begin loading the current source. */
  load(): void;
}

const MediaReadyState = {
  HAVE_NOTHING: 0,
  HAVE_METADATA: 1,
  HAVE_CURRENT_DATA: 2,
  HAVE_FUTURE_DATA: 3,
  HAVE_ENOUGH_DATA: 4,
} as const;

/** Numeric ready-state value mirroring `HTMLMediaElement.readyState`. */
export type MediaReadyStateValue = (typeof MediaReadyState)[keyof typeof MediaReadyState];

/** Feature capability availability. */
export type MediaFeatureAvailability = 'available' | 'unavailable' | 'unsupported';

/** Events emitted when volume or mute changes. */
export interface MediaVolumeEvents {
  /** Fired when `volume` or `muted` changes. */
  volumechange: EventLike;
}

/** Minimal capability for volume and mute control. */
export interface MediaVolumeCapability {
  /** Volume level in `[0, 1]`. */
  volume: number;
  /** Whether audio is muted. */
  muted: boolean;
}

/** Events emitted when playback rate changes. */
export interface MediaPlaybackRateEvents {
  /** Fired when `playbackRate` changes. */
  ratechange: EventLike;
}

/** Minimal capability for playback rate control. */
export interface MediaPlaybackRateCapability {
  /** Current playback rate. */
  playbackRate: number;
}

/** Events emitted as buffered data changes. */
export interface MediaBufferEvents {
  /** Fired periodically as new data is buffered. */
  progress: EventLike;
}

/** Structural type for `TimeRanges`-shaped objects. */
export interface TimeRangeLike {
  /** Number of disjoint ranges. */
  readonly length: number;
  /** Start of the range at `index`. */
  start(index: number): number;
  /** End of the range at `index`. */
  end(index: number): number;
}

/** Minimal capability for inspecting buffered and seekable ranges. */
export interface MediaBufferCapability {
  /** Buffered time ranges. */
  readonly buffered: TimeRangeLike;
  /** Seekable time ranges. */
  readonly seekable: TimeRangeLike;
}

/** Events emitted when an error occurs. */
export interface MediaErrorEvents {
  /** Fired when a media error occurs. */
  error: EventLike;
}

/** Structural type for `MediaError`-shaped objects. */
export interface ErrorLike {
  /** Error code (mirrors `MediaError.code`). */
  readonly code: number;
  /** Human-readable error message. */
  readonly message: string;
}

/** Minimal capability for inspecting the current media error. */
export interface MediaErrorCapability {
  /** Current error, or `null` when none. */
  readonly error: ErrorLike | null;
}

/** Structural type for `VTTCue`-shaped objects. */
export interface TextCueLike {
  /** Cue start time in seconds. */
  readonly startTime: number;
  /** Cue end time in seconds. */
  readonly endTime: number;
  /** Cue text payload. */
  readonly text?: string;
}

/** Structural type for `TextTrackCueList`-shaped objects. */
export interface TextCueListLike {
  /** Number of cues. */
  readonly length: number;
  /** Iterator over the cues. */
  [Symbol.iterator](): Iterator<TextCueLike>;
  /** Optional ID lookup. */
  getCueById?(id: string): TextCueLike | null;
}

/** Structural type for `TextTrack`-shaped objects. */
export interface TextTrackLike {
  /** Track kind (e.g. `subtitles`, `captions`). */
  readonly kind: string;
  /** Human-readable label. */
  readonly label: string;
  /** BCP 47 language tag. */
  readonly language: string;
  /** Track ID. */
  readonly id: string;
  /** Optional source URL when the track was added via `<track>`. */
  readonly src?: string;
  /** Display mode (writable). */
  mode: 'showing' | 'disabled' | 'hidden';
  /** Cue list, or `null` until loaded. */
  readonly cues: TextCueListLike | null;
  /** Optional cue insertion. */
  addCue?(cue: TextCueLike): void;
}

/** Events emitted by `TextTrackList` and individual tracks. */
export interface TextTrackListEvents {
  /** Fired when a track is added. */
  addtrack: EventLike;
  /** Fired when a track is removed. */
  removetrack: EventLike;
  /** Fired when a track's content changes. */
  changetrack: EventLike;
  /** Fired when a track's `mode` changes. */
  trackmodechange: EventLike;
}

/** Structural type for `TextTrackList`-shaped objects. */
export interface TextTrackListLike {
  /** Number of tracks. */
  readonly length: number;
  /** Indexed access to tracks. */
  readonly [index: number]: TextTrackLike;
  /** Iterator over the tracks. */
  [Symbol.iterator](): Iterator<TextTrackLike>;
  /** Optional ID lookup. */
  getTrackById?(id: string): TextTrackLike | null;
}

/** Minimal capability for inspecting text tracks. */
export interface MediaTextTrackCapability {
  /** List of text tracks. */
  readonly textTracks: TextTrackListLike;
}

/** Minimal capability for entering and exiting fullscreen. */
export interface MediaFullscreenCapability {
  /** Whether fullscreen is currently active. */
  readonly isFullscreen: boolean;
  /** Enter fullscreen. */
  requestFullscreen(): Promise<unknown>;
  /** Exit fullscreen. */
  exitFullscreen(): Promise<unknown>;
}

/** Minimal capability for entering and exiting picture-in-picture. */
export interface MediaPictureInPictureCapability {
  /** Whether picture-in-picture is currently active. */
  readonly isPictureInPicture: boolean;
  /** Enter picture-in-picture. */
  requestPictureInPicture(): Promise<unknown>;
  /** Exit picture-in-picture. */
  exitPictureInPicture(): Promise<unknown>;
}

/** Minimal capability for remote playback (cast). */
export interface MediaRemotePlaybackCapability {
  /** The platform's `RemotePlayback` instance. */
  readonly remote: RemotePlaybackLike;
}

/** Events emitted when the stream type changes. */
export interface MediaStreamTypeEvents {
  /** Fired when `streamType` changes. */
  streamtypechange: EventLike;
}

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

/** Stream type as classified by {@link MediaStreamTypes}. */
export type MediaStreamType = (typeof MediaStreamTypes)[keyof typeof MediaStreamTypes];

/** Minimal capability exposing the current stream type. */
export interface MediaStreamTypeCapability {
  /** Current stream type. */
  readonly streamType: MediaStreamType;
}

/** Events emitted when live timing changes. */
export interface MediaLiveEvents {
  /** Fired when `targetLiveWindow` changes. */
  targetlivewindowchange: EventLike;
}

/** Minimal capability exposing live-edge and live-window timing. */
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

interface MediaEvents extends MediaPlaybackEvents {}

/** Minimal media contract — only requires play capability and an event target. */
export interface Media extends MediaPlaybackCapability, EventTargetLike<MediaEvents> {
  /** Optional engine instance (e.g. hls.js, dash.js). */
  readonly engine?: unknown;
  /** Optional render target (typically the `<video>` element). */
  readonly target?: unknown;
}

/** Union of all events emitted by a {@link Video}. */
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

/** Structural contract for a full video media element. */
export interface Video
  extends MediaPlaybackCapability,
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
    EventTargetLike<VideoEvents> {
  /** Optional engine instance (e.g. hls.js, dash.js). */
  readonly engine?: unknown;
  /** Optional render target (typically the `<video>` element). */
  readonly target?: unknown;
}

/** Union of all events emitted by an {@link Audio}. */
export interface AudioEvents
  extends MediaPlaybackEvents,
    MediaPauseEvents,
    MediaSeekEvents,
    MediaSourceEvents,
    MediaVolumeEvents,
    MediaPlaybackRateEvents,
    MediaBufferEvents,
    MediaErrorEvents {}

/** Structural contract for a full audio media element. */
export interface Audio
  extends MediaPlaybackCapability,
    MediaPauseCapability,
    MediaSeekCapability,
    MediaSourceCapability,
    MediaVolumeCapability,
    MediaPlaybackRateCapability,
    MediaBufferCapability,
    MediaErrorCapability,
    EventTargetLike<AudioEvents> {
  /** Optional engine instance (e.g. hls.js, dash.js). */
  readonly engine?: unknown;
  /** Optional render target (typically the `<audio>` element). */
  readonly target?: unknown;
}

/** Host that owns a playback engine and the element it renders into. */
export interface MediaEngineHost<Engine = unknown, Target = unknown> {
  /** Current engine instance, or `null` when not attached. */
  readonly engine: Engine | null;
  /** Current render target, or `null` when not attached. */
  readonly target: Target | null;
  /** Attach to a new render target. */
  attach?(target: Target): void;
  /** Detach from the current render target. */
  detach?(): void;
  /** Tear down the engine and release resources. */
  destroy(): void;
}
