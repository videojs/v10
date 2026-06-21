import type { StringWithSuggestions } from '@videojs/utils/types';

import type { InputAction } from '../input-action';

export type GesturePointerType = 'mouse' | 'touch' | 'pen';
export type GestureRegion = 'left' | 'center' | 'right';
export type GestureType = 'tap' | 'doubletap';

export interface GestureProps {
  type: StringWithSuggestions<GestureType>;
  action: InputAction;
  value?: number | undefined;
  pointer?: GesturePointerType | undefined;
  region?: GestureRegion | undefined;
  disabled?: boolean | undefined;
}
