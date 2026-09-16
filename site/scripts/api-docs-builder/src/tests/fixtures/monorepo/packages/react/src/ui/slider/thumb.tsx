/**
 * Slider sub-part that references stateAttrMap.
 *
 * When volume-slider re-exports this part, data-attrs come from
 * the ORIGIN component (slider), not the consuming component (volume-slider).
 */

const stateAttrMap = {};

/** The draggable thumb of the slider. Renders a `<div>` element. */
export function Thumb() {
  return null;
}

export type ThumbProps = {};
