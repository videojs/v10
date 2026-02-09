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
  changeVolume(volume: number): number;
  /**
   * Toggle mute state. Returns the new muted value.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/muted
   */
  toggleMute(): boolean;
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
  requestPiP(): Promise<void>;
  /**
   * Exit picture-in-picture mode.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/exitPictureInPicture
   */
  exitPiP(): Promise<void>;
}
