/**
 * React parts index for multi-part component.
 *
 * Exercises: multi-part detection, local exports for part discovery.
 * - Indicator: primary part (instantiates GaugeCore)
 * - Track: sub-part with HTML element
 * - Fill: sub-part with HTML element and stateAttrMap reference (gets shared data-attrs)
 * - Label: React-only part (no HTML element file)
 */

export { Fill, type FillProps } from './gauge-fill';
export { Indicator, type IndicatorProps } from './gauge-indicator';
export { Label, type LabelProps } from './gauge-label';
export { Track, type TrackProps } from './gauge-track';
