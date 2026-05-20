import type { SliderState } from '../../core/ui/slider/slider-core';
import { SliderCSSVars } from '../../core/ui/slider/slider-css-vars';
import type { TimeSliderState } from '../../core/ui/time-slider/time-slider-core';

/**
 * Build CSS variable values for a slider from its state.
 *
 * @param state - Current slider state.
 */
export function getSliderCSSVars(state: SliderState): Record<string, string> {
  return {
    [SliderCSSVars.fill]: `${state.fillPercent.toFixed(3)}%`,
    [SliderCSSVars.pointer]: `${state.pointerPercent.toFixed(3)}%`,
  };
}

/**
 * Build CSS variable values for a time slider from its state.
 *
 * @param state - Current time slider state.
 */
export function getTimeSliderCSSVars(state: TimeSliderState): Record<string, string> {
  return {
    ...getSliderCSSVars(state),
    [SliderCSSVars.buffer]: `${state.bufferPercent.toFixed(3)}%`,
  };
}

// ---------------------------------------------------------------------------
// Slider Preview
// ---------------------------------------------------------------------------

/** Overflow strategy for a slider preview element. */
export type SliderPreviewOverflow = 'clamp' | 'visible';

/**
 * Compute structural positioning styles for a slider preview element.
 *
 * @param width - Preview element width in pixels.
 * @param overflow - Whether to clamp inside the track or allow overflow.
 */
export function getSliderPreviewStyle(width: number, overflow: SliderPreviewOverflow) {
  const halfWidth = width / 2;

  return {
    position: 'absolute',
    left:
      overflow === 'visible'
        ? `calc(var(${SliderCSSVars.pointer}) - ${halfWidth}px)`
        : `min(max(0px, calc(var(${SliderCSSVars.pointer}) - ${halfWidth}px)), calc(100% - ${width}px))`,
    width: 'max-content',
    pointerEvents: 'none',
  };
}
