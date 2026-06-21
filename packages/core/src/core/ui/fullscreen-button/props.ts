import type { NonNullableObject } from '@videojs/utils/types';

import type { FullscreenButtonState } from './fullscreen-button-core';

export interface FullscreenButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: FullscreenButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export const FULLSCREEN_BUTTON_DEFAULT_PROPS: NonNullableObject<FullscreenButtonProps> = {
  label: '',
  disabled: false,
};
