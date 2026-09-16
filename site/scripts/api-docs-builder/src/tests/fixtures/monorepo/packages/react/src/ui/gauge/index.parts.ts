/**
 * React parts index for multi-part component.
 *
 * Exercises: multi-part detection, local exports for part discovery.
 * - Indicator: primary part (instantiates GaugeCore)
 * - Track: sub-part with HTML element
 * - Fill: sub-part with HTML element and stateAttrMap reference (gets shared data-attrs)
 * - Label: React-only part (no HTML element file)
 * - Marker: nested sub-part with an HTML element
 */

export { Fill, type FillProps } from './fill';
export { Indicator, type IndicatorProps } from './indicator';
export { Label, type LabelProps } from './label';
export { Marker, type MarkerProps } from './gauge-parts/marker';
export { Track, type TrackProps } from './track';
