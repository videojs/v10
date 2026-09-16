/**
 * Data attributes fixture for the shared-source multi-part component.
 */

type StateAttrMap<State> = { [Key in keyof State]?: string };

interface OptionGroupState {
  value: string;
  disabled: boolean;
}

export const OptionGroupDataAttrs = {
  /** The selected option value. */
  value: 'data-value',
  /** Present when the group is disabled. */
  disabled: 'data-disabled',
} as const satisfies StateAttrMap<OptionGroupState>;
