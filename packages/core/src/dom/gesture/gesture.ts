import type { GestureProps, GestureType } from '../../core/ui/gesture/core';

export type { GesturePointerType, GestureRegion, GestureType } from '../../core/ui/gesture/core';

export interface GestureOptions extends Pick<GestureProps, 'pointer' | 'region' | 'disabled' | 'value'> {
  action?: GestureProps['action'] | undefined;
}

export interface GestureBinding extends GestureOptions {
  type: GestureType;
  recognizer: GestureRecognizer;
  onActivate: (event: PointerEvent) => void;
}

export interface GestureActivateEvent extends Pick<GestureProps, 'value' | 'region' | 'pointer'> {
  type: GestureType;
  source: 'gesture';
  action?: GestureProps['action'] | undefined;
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
