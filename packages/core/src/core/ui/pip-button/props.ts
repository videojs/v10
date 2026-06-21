import type { NonNullableObject } from '@videojs/utils/types';

import type { PiPButtonState } from './pip-button-core';

export interface PiPButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: PiPButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export const PIP_BUTTON_DEFAULT_PROPS: NonNullableObject<PiPButtonProps> = {
  label: '',
  disabled: false,
};
