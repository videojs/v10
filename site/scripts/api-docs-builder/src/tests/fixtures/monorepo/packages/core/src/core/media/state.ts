/**
 * Feature state interface fixtures.
 *
 * Exercises: property extraction (state), method extraction (actions),
 * JSDoc description flow-through, type alias resolution (MediaFeatureAvailability),
 * method parameter types, method return types, Promise return types.
 */

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
   * Start playback.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play
   */
  play(): Promise<void>;
  /** Pause playback. */
  pause(): void;
}

/** Indicates whether a feature can be programmatically controlled on this platform. */
export type MediaFeatureAvailability = 'available' | 'unavailable' | 'unsupported';

/** Controls audio volume and mute state. */
export interface MediaVolumeState {
  /**
   * Volume level from 0 (silent) to 1 (max).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/volume
   */
  volume: number;
  /** Whether audio is muted. */
  muted: boolean;
  /** Whether volume can be programmatically set on this platform. */
  volumeAvailability: MediaFeatureAvailability;
  /**
   * Set volume (clamped 0-1). Returns the clamped value.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/volume
   */
  setVolume(volume: number): number;
  /** Toggle mute state. Returns the new muted value. */
  toggleMuted(): boolean;
}
