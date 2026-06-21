import type { NonNullableObject } from '@videojs/utils/types';

import type { AirPlayButtonState } from './airplay-button-core';

export interface AirPlayButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: AirPlayButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export const AIRPLAY_BUTTON_DEFAULT_PROPS: NonNullableObject<AirPlayButtonProps> = {
  label: '',
  disabled: false,
};
