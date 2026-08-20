/*
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

/** A media-owned content value. `undefined` means the key is absent; `null` means it has no current value. */
export type MediaContentValue = string | null | undefined;

/** Resolved content metadata exposed by the player store. */
export interface MediaMetadataState {
  /** The resolved content title. Set it through the player, not through the store. */
  title: string;
  /** The resolved poster URL. Set it through the player, not through the store. */
  poster: string;
}

/**
 * Caption styling exposed by the player store.
 *
 * `setFontFamily` accepts `string | null | undefined` because a config input the
 * author omits arrives as `undefined`, which is what makes it addressable from a
 * feature's `config` by name. Public setters are optional and the metadata
 * feature has none, so the caption-style fixture is the one that covers this
 * path.
 */
export interface MediaCaptionStyleState {
  /** The font family in use. */
  fontFamily: string;
  /** Set or clear the user font family override. */
  setFontFamily(value: MediaContentValue): void;
}
