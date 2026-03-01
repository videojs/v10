import type { SliderState } from '@videojs/core';
import type { SliderThumbProps } from '@videojs/core/dom';
import { createContext } from '@videojs/element/context';

export interface SliderContextValue {
  /** Base slider state — children use this for data attributes and value display. */
  state: SliderState;
  /** Domain value at the current pointer position (e.g., seconds for time, percent for volume). */
  pointerValue: number;
  /** ARIA attributes for the thumb element (role, tabindex, aria-value*, etc.). */
  thumbAttrs: Record<string, string | number | boolean | undefined>;
  /** Keyboard and focus event handlers for the thumb element. */
  thumbProps: SliderThumbProps;
  /** Optional formatter for value display. Receives domain value and value type. */
  formatValue?: ((value: number, type: 'current' | 'pointer') => string) | undefined;
}

const SLIDER_CONTEXT_KEY = Symbol('@videojs/slider');

export const sliderContext = createContext<SliderContextValue>(SLIDER_CONTEXT_KEY);
