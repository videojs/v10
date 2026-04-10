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

export interface GestureRecognizer {
  /** Handle a confirmed quick pointer-up and decide when to fire matched bindings. */
  handleUp(matches: GestureMatchResult, event: PointerEvent): void;
  reset(): void;
}

export interface GestureMatchResult {
  /** Resolve current matches for a gesture type (reads fresh rect, re-filters bindings). */
  resolve(type: GestureType): GestureBinding[];
}
