export interface RateOptionsProps {
  /** Custom formatter for visible rate labels. */
  formatRate?: ((rate: number) => string) | undefined;
  /** Whether rate selection is disabled. */
  disabled?: boolean | undefined;
}

export interface RateOption {
  rate: number;
  label: string;
  disabled: boolean;
}

export interface RateOptionsResult {
  rate: number;
  options: RateOption[];
  setRate: (rate: number) => void;
}

/**
 * Create rate menu options from the player rate state. Returns `null` when
 * the rate feature is not configured.
 *
 * @param props - Optional `formatRate` and `disabled` overrides.
 */
export function useRateOptions(props?: RateOptionsProps): RateOptionsResult | null {
  return props?.disabled ? null : { rate: 1, options: [], setRate: () => {} };
}

export namespace useRateOptions {
  export type Props = RateOptionsProps;
  export type Result = RateOptionsResult;
  export type Option = RateOption;
}

/** Internal helper — matches the use* convention but is never re-exported to the entry point. */
export function useRateInternals(): number {
  return 1;
}
