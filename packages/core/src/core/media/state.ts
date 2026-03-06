export interface MediaPlaybackState {
  /**
   * Whether playback is paused.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/paused
   */
  paused: boolean;
  /**
   * Whether playback has reached the end.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/ended
   */
  ended: boolean;
  /**
   * Whether playback has started (played or seeked).
   */
  started: boolean;
  /**
   * Whether playback is stalled waiting for data.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/waiting_event
   */
  waiting: boolean;
  /**
   * Start playback.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play
   */
  play(): Promise<void>;
  /**
   * Pause playback.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/pause
   */
  pause(): void;
}

/** Indicates whether a feature can be programmatically controlled on this platform. */
export type MediaFeatureAvailability = 'available' | 'unavailable' | 'unsupported';

export interface MediaVolumeState {
  /**
   * Volume level from 0 (silent) to 1 (max).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/volume
   */
  volume: number;
  /**
   * Whether audio is muted.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/muted
   */
  muted: boolean;
  /**
   * Whether volume can be programmatically set on this platform.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/volume
   */
  volumeAvailability: MediaFeatureAvailability;
  /**
   * Set volume (clamped 0-1). Returns the clamped value.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/volume
   */
  setVolume(volume: number): number;
  /**
   * Toggle mute state. Returns the new muted value.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/muted
   */
  toggleMuted(): boolean;
}

export interface MediaTimeState {
  /**
   * Current playback position in seconds.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime
   */
  currentTime: number;
  /**
   * Total duration in seconds (0 if unknown).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/duration
   */
  duration: number;
  /**
   * Whether a seek operation is in progress.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/seeking
   */
  seeking: boolean;
  /**
   * Seek to a time in seconds. Returns the actual position after seek.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime
   */
  seek(time: number): Promise<number>;
}

export interface MediaSourceState {
  /**
   * Current media source URL (null if none).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentSrc
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/src
   */
  source: string | null;
  /**
   * Whether enough data is loaded to begin playback.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
   */
  canPlay: boolean;
  /**
   * Load a new media source. Returns the new source URL.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/src
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/load
   */
  loadSource(src: string): string;
}

export interface MediaBufferState {
  /**
   * Buffered time ranges as [start, end] tuples.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/buffered
   */
  buffered: [number, number][];
  /**
   * Seekable time ranges as [start, end] tuples.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/seekable
   */
  seekable: [number, number][];
}

export interface MediaFullscreenState {
  /**
   * Whether fullscreen mode is currently active.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
   */
  fullscreen: boolean;
  /**
   * Whether fullscreen can be requested on this platform.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/fullscreenEnabled
   */
  fullscreenAvailability: MediaFeatureAvailability;
  /**
   * Enter fullscreen mode. Tries container first, falls back to media element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen
   */
  requestFullscreen(): Promise<void>;
  /**
   * Exit fullscreen mode.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/exitFullscreen
   */
  exitFullscreen(): Promise<void>;
}

export interface MediaControlsState {
  /** Whether the user has recently interacted with the player. */
  userActive: boolean;
  /** Whether controls should be visible (userActive || paused). */
  controlsVisible: boolean;
}

export interface MediaPlaybackRateState {
  /**
   * Available playback rates.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playbackRate
   */
  readonly playbackRates: readonly number[];
  /**
   * Current playback rate.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playbackRate
   */
  playbackRate: number;
  /**
   * Set the playback rate.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playbackRate
   */
  setPlaybackRate(rate: number): void;
}

/**
 * A text cue.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/VTTCue
 */
export interface MediaTextCue {
  startTime: number;
  endTime: number;
  text: string;
}

/**
 * The kind of text track.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/TextTrack/kind
 */
export type TextTrackKind = 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';

/**
 * The mode of a text track.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/TextTrack/mode
 */
export type TextTrackMode = 'showing' | 'disabled' | 'hidden';

/**
 * A text track.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/TextTrack
 */
export interface MediaTextTrack<Kind extends TextTrackKind> {
  kind: Kind;
  label: string;
  language: string;
  mode: TextTrackMode;
}

export interface MediaTextTrackState {
  /** Cues from the first `kind="chapters"` track. */
  chaptersCues: MediaTextCue[];
  /** Cues from the first `kind="metadata" label="thumbnails"` track. */
  thumbnailCues: MediaTextCue[];
  /** The `<track>` element's `src` for resolving relative cue text URLs. */
  thumbnailTrackSrc: string | null;
  /** Caption/subtitle tracks that can be selected or toggled. */
  subtitlesList: MediaTextTrack<'subtitles' | 'captions'>[];
  /** Whether captions/subtitles are currently enabled. */
  subtitlesShowing: boolean;
  /** Toggle captions/subtitles visibility. Returns the new enabled value. */
  toggleSubtitles(forceShow?: boolean): boolean;
}

export interface MediaError {
  /**
   * The error code (mirrors MediaError.code constants).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaError/code
   */
  code: number;
  /**
   * A human-readable error message.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaError/message
   */
  message: string;
}

export interface MediaErrorState {
  /**
   * The current media error, or null if none.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/error
   */
  error: MediaError | null;
  /** Dismiss the current error by clearing it. */
  dismissError(): void;
}

export interface MediaPictureInPictureState {
  /**
   * Whether picture-in-picture mode is currently active.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Picture-in-Picture_API
   */
  pip: boolean;
  /**
   * Whether picture-in-picture can be requested on this platform.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/pictureInPictureEnabled
   */
  pipAvailability: MediaFeatureAvailability;
  /**
   * Enter picture-in-picture mode.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestPictureInPicture
   */
  requestPictureInPicture(): Promise<void>;
  /**
   * Exit picture-in-picture mode.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/exitPictureInPicture
   */
  exitPictureInPicture(): Promise<void>;
}
