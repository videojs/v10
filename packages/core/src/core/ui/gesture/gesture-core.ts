import type { InputAction } from '../input-action/input-action';

export type GestureType = 'tap' | 'doubletap' | (string & {});
export type GesturePointer = 'mouse' | 'touch' | 'pen';
export type GestureRegion = 'left' | 'center' | 'right';

export interface GestureProps {
  type: GestureType;
  action: InputAction;
  value?: number | undefined;
  pointer?: GesturePointer | undefined;
  region?: GestureRegion | undefined;
  disabled?: boolean | undefined;
}
