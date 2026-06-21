import type { NonNullableObject } from '@videojs/utils/types';

import type { PlaybackRateButtonState } from './playback-rate-button-core';

export interface PlaybackRateButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: PlaybackRateButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
  /** When true, pointer activation opens a menu instead of cycling. React sets this automatically inside `Menu.Trigger`. */
  menuTrigger?: boolean | undefined;
}

export const PLAYBACK_RATE_BUTTON_DEFAULT_PROPS: NonNullableObject<PlaybackRateButtonProps> = {
  label: '',
  disabled: false,
  menuTrigger: false,
};
