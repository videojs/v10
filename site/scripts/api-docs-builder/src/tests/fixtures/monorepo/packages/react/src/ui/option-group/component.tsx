/**
 * Shared React source for every OptionGroup part.
 *
 * Exercises: part descriptions and sub-part props resolved by local export name inside one file. Nothing here
 * constructs `OptionGroupCore`, so primary detection falls back to `Root`.
 */

export interface OptionGroupRootProps {
  label?: string;
  children?: unknown;
}

/** Owns option state and shares it with an enclosing menu. Does not render a DOM element. */
export function OptionGroupRoot(_props: OptionGroupRootProps) {
  return null;
}

export interface OptionGroupOptionsProps {
  /** Render one consumer-owned item for every option. */
  renderItem: (value: string) => unknown;
}

/** Renders items for the available options. */
export function OptionGroupOptions(_props: OptionGroupOptionsProps) {
  return null;
}

export interface OptionGroupValueProps {
  /** Additional class name. */
  className?: string;
}

/** Displays the selected option label. */
export function OptionGroupValue(_props: OptionGroupValueProps) {
  return null;
}
