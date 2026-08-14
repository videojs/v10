/**
 * Domain variant component (core).
 *
 * Exercises: domain variant components that share base logic (slider/)
 * but have their own directory under core/ui/. The builder discovers
 * components by directory — this file must exist for volume-slider to be found.
 */

export interface VolumeSliderProps {
  /** The orientation of the slider. */
  orientation: 'horizontal' | 'vertical';
}

export interface VolumeSliderState {
  /** Current volume (0–1). */
  volume: number;
}

export class VolumeSliderCore {
  static readonly defaultProps = {
    orientation: 'horizontal',
  };
}
