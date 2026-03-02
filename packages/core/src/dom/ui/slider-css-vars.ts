import type { SliderState } from '../../core/ui/slider/slider-core';
import { SliderCSSVars } from '../../core/ui/slider/slider-css-vars';
import type { TimeSliderState } from '../../core/ui/time-slider/time-slider-core';

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
