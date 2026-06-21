import type { NonNullableObject } from '@videojs/utils/types';

import type { SeekButtonState } from './seek-button-core';

export interface SeekButtonProps {
  /** Seconds to seek. Positive = forward, negative = backward. Default `30`. */
  seconds?: number | undefined;
  /** Custom label for the button. */
  label?: string | ((state: SeekButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export const SEEK_BUTTON_DEFAULT_PROPS: NonNullableObject<SeekButtonProps> = {
  seconds: 30,
  label: '',
  disabled: false,
};
