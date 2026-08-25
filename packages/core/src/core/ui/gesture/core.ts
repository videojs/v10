import type { InputAction } from '../input-action/input-action';

export type GestureType = 'tap' | 'doubletap';
export type GesturePointerType = 'mouse' | 'touch' | 'pen';
export type GestureRegion = 'left' | 'center' | 'right';

export interface GestureProps {
  type: GestureType;
  action: InputAction;
  value?: number | undefined;
  pointer?: GesturePointerType | undefined;
  region?: GestureRegion | undefined;
  disabled?: boolean | undefined;
}
