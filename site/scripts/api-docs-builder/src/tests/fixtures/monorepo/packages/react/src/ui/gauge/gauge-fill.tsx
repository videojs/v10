/**
 * Sub-part React component that references stateAttrMap.
 *
 * Exercises: sub-part inheriting shared data-attrs from the component's
 * data-attrs file. The builder uses a string search heuristic — if the React
 * source file contains "stateAttrMap", the sub-part gets the component's
 * shared data attributes.
 */

import type { GaugeDataAttrs } from '../../../../core/src/core/ui/gauge/gauge-data-attrs';

const stateAttrMap = {} as typeof GaugeDataAttrs;

/** The filled portion of the gauge. Renders a `<div>` element. */
export function Fill() {
  return null;
}

export type FillProps = {};
