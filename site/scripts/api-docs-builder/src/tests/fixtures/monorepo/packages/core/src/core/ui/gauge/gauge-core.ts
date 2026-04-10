/**
 * Multi-part component fixture (core).
 *
 * Exercises: multi-part Props/State extraction, defaultProps merging,
 * non-boolean data-attr type inference (string union, number).
 */

export type FillLevel = 'empty' | 'partial' | 'full';

export interface GaugeProps {
  /** Minimum value. */
  min: number;
  /** Maximum value. */
  max: number;
  /** Custom label for accessibility. */
  label: string | ((state: GaugeState) => string);
}

export interface GaugeState {
  /** Current value as a percentage (0–1). */
  percentage: number;
  /** The fill level. */
  fillLevel: FillLevel;
}

export class GaugeCore {
  static readonly defaultProps = {
    min: 0,
    max: 100,
    label: '',
  };
}
