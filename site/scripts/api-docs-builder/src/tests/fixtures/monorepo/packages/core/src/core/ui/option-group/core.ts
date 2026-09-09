/**
 * Multi-part component fixture whose React parts share one source file (core).
 *
 * Exercises: core Props/State for a component whose React parts never construct the core themselves.
 */

export interface OptionGroupProps {
  /** Accessible label for the group. */
  label: string;
  /** Formats an option value for display. */
  formatOption: (value: string) => string;
}

export interface OptionGroupState {
  /** The selected option value. */
  value: string;
  /** Whether the group is disabled. */
  disabled: boolean;
}

export class OptionGroupCore {
  static readonly defaultProps = {
    label: '',
    formatOption: (value: string) => value,
  };
}
