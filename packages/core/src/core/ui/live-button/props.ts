import type { NonNullableObject } from '@videojs/utils/types';

import type { LiveButtonState } from './live-button-core';

export interface LiveButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: LiveButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export const LIVE_BUTTON_DEFAULT_PROPS: NonNullableObject<LiveButtonProps> = {
  label: '',
  disabled: false,
};
