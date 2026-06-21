import type { NonNullableObject } from '@videojs/utils/types';

import type { SliderState } from './slider-core';

/** Configuration shared by all slider variants. */
export interface SliderProps {
  /** Custom label for the slider. */
  label?: string | ((state: SliderState) => string) | undefined;
  /** Step increment for value changes (arrow keys). */
  step?: number | undefined;
  /** Large step increment (Page Up/Down keys). */
  largeStep?: number | undefined;
  /** Axis of slider movement. */
  orientation?: 'horizontal' | 'vertical' | undefined;
  /** Whether the slider is non-interactive. */
  disabled?: boolean | undefined;
  /** How the thumb aligns at the track edges. `edge` constrains the thumb within track bounds. */
  thumbAlignment?: 'center' | 'edge' | undefined;
  /** Current slider value. */
  value?: number | undefined;
  /** Minimum value of the slider range. */
  min?: number | undefined;
  /** Maximum value of the slider range. */
  max?: number | undefined;
}

export interface SliderValueProps {
  /** Which slider value to display. */
  type?: 'current' | 'pointer' | undefined;
  /** Custom formatter for the displayed value. */
  format?: ((value: number) => string) | undefined;
}

export const SLIDER_DEFAULT_PROPS: NonNullableObject<SliderProps> = {
  label: '',
  step: 1,
  largeStep: 10,
  orientation: 'horizontal',
  disabled: false,
  thumbAlignment: 'center',
  value: 0,
  min: 0,
  max: 100,
};
