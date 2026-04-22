/**
 * Data attributes fixture for multi-part component.
 *
 * Exercises: non-boolean type inference through satisfies StateAttrMap<State>.
 * - percentage → number type (shown in output)
 * - fillLevel → string literal union (shown in output, expanded from FillLevel alias)
 */

type StateAttrMap<State> = { [Key in keyof State]?: string };

type FillLevel = 'empty' | 'partial' | 'full';

interface GaugeState {
  percentage: number;
  fillLevel: FillLevel;
}

export const GaugeDataAttrs = {
  /** Current percentage as a string. */
  percentage: 'data-percentage',
  /** The fill level. */
  fillLevel: 'data-fill-level',
} as const satisfies StateAttrMap<GaugeState>;
