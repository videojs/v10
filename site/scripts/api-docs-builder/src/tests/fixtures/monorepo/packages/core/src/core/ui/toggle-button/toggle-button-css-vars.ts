/**
 * CSS vars fixture for single-part component.
 *
 * Exercises: CSS custom property extraction with JSDoc descriptions.
 */

export const ToggleButtonCSSVars = {
  /** Background color when pressed. */
  pressed: '--media-toggle-pressed-bg',
  /** Transition duration for the toggle animation. */
  transition: '--media-toggle-transition',
} as const;
