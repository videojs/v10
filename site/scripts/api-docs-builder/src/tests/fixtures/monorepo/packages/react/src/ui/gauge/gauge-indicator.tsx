/**
 * Primary part React component.
 *
 * Exercises: primary part detection via `new GaugeCore` instantiation.
 * The builder checks React source files for `new {ComponentName}Core\b`.
 */

class GaugeCore {}

/** A visual indicator for the current value. Renders a `<span>` element. */
export function Indicator() {
  const core = new GaugeCore();
  return null;
}

export type IndicatorProps = {};
