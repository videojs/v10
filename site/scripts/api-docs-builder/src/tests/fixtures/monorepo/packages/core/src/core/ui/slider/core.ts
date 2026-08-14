/**
 * Base slider component (core).
 *
 * Exercises: base component whose parts get re-exported by domain variants
 * (volume-slider). This component is also discovered on its own.
 */

export interface SliderProps {
  /** Minimum slider value. */
  min: number;
  /** Maximum slider value. */
  max: number;
}

export interface SliderState {
  /** Current slider value (0–1). */
  value: number;
  /** Whether the user is dragging. */
  dragging: boolean;
}

export class SliderCore {
  static readonly defaultProps = {
    min: 0,
    max: 100,
  };
}
