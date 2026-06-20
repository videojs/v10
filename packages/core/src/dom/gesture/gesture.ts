import type { GesturePointerType, GestureRegion, GestureType } from '../../core/ui/gesture/gesture-core';

export type { GesturePointerType, GestureRegion, GestureType } from '../../core/ui/gesture/gesture-core';

export interface GestureOptions {
  pointer?: GesturePointerType | undefined;
  region?: GestureRegion | undefined;
  disabled?: boolean | undefined;
  action?: string | undefined;
  value?: number | undefined;
}

export interface GestureBinding {
  type: GestureType;
  recognizer: GestureRecognizer;
  onActivate: (event: PointerEvent) => void;
  pointer?: GesturePointerType | undefined;
  region?: GestureRegion | undefined;
  disabled?: boolean | undefined;
  action?: string | undefined;
  value?: number | undefined;
}

export interface GestureActivateEvent {
  type: GestureType;
  source: 'gesture';
  action?: string | undefined;
  value?: number | undefined;
  region?: GestureRegion | undefined;
  pointer?: GesturePointerType | undefined;
  event: PointerEvent;
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
