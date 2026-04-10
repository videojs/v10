export type GesturePointerType = 'mouse' | 'touch' | 'pen';

export type GestureType = 'tap' | 'doubletap';

export type GestureRegion = 'left' | 'center' | 'right';

export interface GestureOptions {
  pointer?: GesturePointerType | undefined;
  region?: GestureRegion | undefined;
  disabled?: boolean | undefined;
}

export interface GestureBinding {
  type: GestureType;
  onActivate: (event: PointerEvent) => void;
  pointer?: GesturePointerType | undefined;
  region?: GestureRegion | undefined;
  disabled?: boolean | undefined;
}
