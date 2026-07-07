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
  const formatRate = props?.formatRate ?? ((rate: number) => `${rate}×`);
  const disabled = props?.disabled ?? false;

  if (disabled) return null;

  return {
    rate: 1,
    options: [{ rate: 1, label: formatRate(1), disabled }],
    setRate: () => {},
  };
}

export namespace useRateOptions {
  export type Props = RateOptionsProps;
  export type Result = RateOptionsResult;
  export type Option = RateOption;
}
