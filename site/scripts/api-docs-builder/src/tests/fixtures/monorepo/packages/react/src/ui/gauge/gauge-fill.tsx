/**
 * Sub-part React component that references stateAttrMap.
 *
 * Exercises:
 *   1. Sub-part inheriting shared data-attrs from the component's data-attrs
 *      file. The builder uses a string search heuristic — if the React source
 *      contains "stateAttrMap", the sub-part gets shared data attributes.
 *   2. Sub-part custom React props. The builder extracts own members from the
 *      `{LocalName}Props` interface (must be `interface`, not `type`).
 *      `children` and React DOM attributes are excluded.
 */

import type { GaugeDataAttrs } from '../../../../core/src/core/ui/gauge/gauge-data-attrs';

const stateAttrMap = {} as typeof GaugeDataAttrs;

/** The filled portion of the gauge. Renders a `<div>` element. */
export function Fill() {
  return null;
}

// Must be `interface` (not `type`) for extractSubPartProps to detect it.
// `children` is auto-excluded by the builder.
export interface FillProps {
  /** The color of the fill bar. */
  color: string;
  children: unknown;
}
