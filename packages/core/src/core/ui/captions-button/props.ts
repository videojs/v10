import type { NonNullableObject } from '@videojs/utils/types';

import type { CaptionsButtonState } from './captions-button-core';

export interface CaptionsButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: CaptionsButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
  /** When true with multiple tracks, pointer activation opens a menu instead of toggling. React sets this automatically inside `Menu.Trigger`. */
  menuTrigger?: boolean | undefined;
}

export const CAPTIONS_BUTTON_DEFAULT_PROPS: NonNullableObject<CaptionsButtonProps> = {
  label: '',
  disabled: false,
  menuTrigger: false,
};
