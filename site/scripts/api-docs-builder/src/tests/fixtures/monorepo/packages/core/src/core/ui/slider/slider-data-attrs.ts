/**
 * Data attributes for slider base (used by re-exported sub-parts).
 *
 * Exercises: boolean type (omitted) + non-boolean type for re-exported parts.
 */

type StateAttrMap<State> = { [Key in keyof State]?: string };

interface SliderState {
  value: number;
  dragging: boolean;
}

export const SliderDataAttrs = {
  /** The current slider value. */
  value: 'data-value',
  /** Present when the user is dragging the slider. */
  dragging: 'data-dragging',
} as const satisfies StateAttrMap<SliderState>;
