import type { NonNullableObject } from '@videojs/utils/types';

import type { PlayButtonState } from './play-button-core';

export interface PlayButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: PlayButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export const PLAY_BUTTON_DEFAULT_PROPS: NonNullableObject<PlayButtonProps> = {
  label: '',
  disabled: false,
};
