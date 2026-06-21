import type { NonNullableObject } from '@videojs/utils/types';

import { SLIDER_DEFAULT_PROPS, type SliderProps } from '../slider/props';

export interface TimeSliderProps extends SliderProps {
  /** @internal Derived from `currentTime` — not user-settable. */
  value?: number | undefined;
  /** @internal Always 0 — not user-settable. */
  min?: number | undefined;
  /** @internal Derived from `duration` — not user-settable. */
  max?: number | undefined;
  /** Leading+trailing throttle (ms) for `onValueChange` during drag. */
  changeThrottle?: number | undefined;
}

export const TIME_SLIDER_DEFAULT_PROPS: NonNullableObject<TimeSliderProps> = {
  ...SLIDER_DEFAULT_PROPS,
  label: 'Seek',
  changeThrottle: 100,
};
