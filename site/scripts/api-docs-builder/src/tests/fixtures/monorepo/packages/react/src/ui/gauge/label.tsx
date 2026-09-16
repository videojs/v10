/**
 * React-only sub-part (no HTML element counterpart).
 *
 * Exercises: framework-divergent parts. Parts discovered from index.parts.ts
 * always get platforms.react. Parts WITHOUT a matching HTML element file do NOT
 * get platforms.html. This part has no gauge-label-element.ts in the HTML dir.
 */

/** An accessible label for the gauge value. Renders a `<span>` element. */
export function Label() {
  return null;
}

export type LabelProps = {};
