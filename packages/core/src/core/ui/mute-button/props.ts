import type { NonNullableObject } from '@videojs/utils/types';

import type { MuteButtonState } from './mute-button-core';

export interface MuteButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: MuteButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export const MUTE_BUTTON_DEFAULT_PROPS: NonNullableObject<MuteButtonProps> = {
  label: '',
  disabled: false,
};
