// Resolves to a directory with no index.ts — discovery must skip it, not crash.
export { useLegacyRate } from './legacy';
export {
  type RateOption,
  type RateOptionsProps,
  type RateOptionsResult,
  useRateOptions,
} from './use-rate-options';
