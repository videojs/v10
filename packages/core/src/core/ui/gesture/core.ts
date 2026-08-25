import type { InputAction } from '../input-action/input-action';

export type GestureType = 'tap' | 'doubletap';
export type GesturePointerType = 'mouse' | 'touch' | 'pen';
export type GestureRegion = 'left' | 'center' | 'right';

export interface GestureProps {
  /** Gesture to recognize. */
  type: GestureType;
  /**
   * Player action to run when the gesture is recognized. Built-in actions are `togglePaused`, `toggleMuted`,
   * `toggleFullscreen`, `toggleSubtitles`, `togglePictureInPicture`, `toggleControls`, `seekStep`, `volumeStep`,
   * `speedUp`, and `speedDown`.
   */
  action: InputAction;
  /** Numeric value passed to actions such as `seekStep` and `volumeStep`. */
  value?: number | undefined;
  /** Pointer type that may activate the gesture. All pointer types are accepted when omitted. */
  pointer?: GesturePointerType | undefined;
  /** Optional horizontal part of the container that may activate the gesture. */
  region?: GestureRegion | undefined;
  /** Whether the gesture is disabled. */
  disabled?: boolean | undefined;
}
