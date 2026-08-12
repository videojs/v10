/**
 * Data attributes fixture for single-part component.
 *
 * Exercises: boolean type inference (omitted), satisfies StateAttrMap<State> pattern.
 */

type StateAttrMap<State> = { [Key in keyof State]?: string };

interface ToggleButtonState {
  pressed: boolean;
  disabled: boolean;
}

export const ToggleButtonDataAttrs = {
  /** Present when the toggle is pressed. */
  pressed: 'data-pressed',
  /** Present when the button is disabled. */
  disabled: 'data-disabled',
} as const satisfies StateAttrMap<ToggleButtonState>;
