import type { NonNullableObject } from '@videojs/utils/types';

import type { CastButtonState } from './cast-button-core';

export interface CastButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: CastButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export const CAST_BUTTON_DEFAULT_PROPS: NonNullableObject<CastButtonProps> = {
  label: '',
  disabled: false,
};
