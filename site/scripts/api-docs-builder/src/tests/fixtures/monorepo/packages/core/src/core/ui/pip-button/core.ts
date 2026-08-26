/**
 * NAME_OVERRIDES fixture.
 *
 * Exercises: The NAME_OVERRIDES map in pipeline.ts. The directory name is
 * "pip-button", which kebabToPascal would convert to "PipButton". But the
 * override maps it to "PiPButton" (capital P at position 2).
 *
 * This covers cases where standard kebab-to-PascalCase conversion produces
 * the wrong name. The builder uses NAME_OVERRIDES[dirName] ?? kebabToPascal(dirName).
 */

export interface PiPButtonProps {
  /** Whether the button is disabled. */
  disabled: boolean;
}

export interface PiPButtonState {
  /** Whether picture-in-picture is active. */
  active: boolean;
}

export class PiPButtonCore {}
