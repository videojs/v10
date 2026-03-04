import type { SliderState } from '../../core/ui/slider/slider-core';
import { SliderCSSVars } from '../../core/ui/slider/slider-css-vars';
import type { TimeSliderState } from '../../core/ui/time-slider/time-slider-core';

/**
 * Adjust slider state percents for edge thumb alignment using DOM measurements.
 *
 * When `thumbAlignment` is `'edge'`, maps `fillPercent` and `pointerPercent` into
 * a constrained range so the thumb stays within track bounds.
 */
export function adjustStateForEdgeAlignment<State extends SliderState>(
  state: State,
  rootEl: HTMLElement | null,
  thumbEl: HTMLElement | null,
  adjustPercent: (rawPercent: number, thumbSize: number, trackSize: number) => number
): State {
  if (state.thumbAlignment !== 'edge' || !rootEl || !thumbEl) return state;

  const isHorizontal = state.orientation === 'horizontal';
  const thumbSize = isHorizontal ? thumbEl.offsetWidth : thumbEl.offsetHeight;
  const trackSize = isHorizontal ? rootEl.offsetWidth : rootEl.offsetHeight;

  return {
    ...state,
    fillPercent: adjustPercent(state.fillPercent, thumbSize, trackSize),
    pointerPercent: adjustPercent(state.pointerPercent, thumbSize, trackSize),
  };
}

export function getSliderCSSVars(state: SliderState): Record<string, string> {
  return {
    [SliderCSSVars.fill]: `${state.fillPercent.toFixed(3)}%`,
    [SliderCSSVars.pointer]: `${state.pointerPercent.toFixed(3)}%`,
  };
}

export function getTimeSliderCSSVars(state: TimeSliderState): Record<string, string> {
  return {
    ...getSliderCSSVars(state),
    [SliderCSSVars.buffer]: `${state.bufferPercent.toFixed(3)}%`,
  };
}
