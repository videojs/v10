import type { NonNullableObject } from '@videojs/utils/types';

import { SLIDER_DEFAULT_PROPS, type SliderProps } from '../slider/props';

export interface VolumeSliderProps extends SliderProps {
  /** Step increment for wheel scrolling. */
  wheelStep?: number | undefined;
  /** @internal Derived from `volume` (0–100) — not user-settable. */
  value?: number | undefined;
  /** @internal Always 0 — not user-settable. */
  min?: number | undefined;
  /** @internal Always 100 — not user-settable. */
  max?: number | undefined;
}

export const VOLUME_SLIDER_DEFAULT_PROPS: NonNullableObject<VolumeSliderProps> = {
  ...SLIDER_DEFAULT_PROPS,
  label: 'Volume',
  wheelStep: 5,
};
