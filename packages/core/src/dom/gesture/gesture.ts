/** Pointer device that originated a gesture. */
export type GesturePointerType = 'mouse' | 'touch' | 'pen';

/** Gesture kinds the recognizer can match. */
export type GestureType = 'tap' | 'doubletap';

/** Coarse region of the player a gesture must occur in to match. */
export type GestureRegion = 'left' | 'center' | 'right';

/** Filters narrowing a gesture binding to specific pointers, regions, or actions. */
export interface GestureOptions {
  /** Required pointer type. */
  pointer?: GesturePointerType | undefined;
  /** Required player region. */
  region?: GestureRegion | undefined;
  /** Whether the binding is currently disabled. */
  disabled?: boolean | undefined;
  /** Input action name to dispatch on activation. */
  action?: string | undefined;
  /** Optional numeric argument for the action. */
  value?: number | undefined;
}

/** Single registration: a gesture type, its recognizer, and the activation callback. */
export interface GestureBinding {
  /** Gesture kind. */
  type: GestureType;
  /** Recognizer that fires the binding. */
  recognizer: GestureRecognizer;
  /** Callback invoked when the gesture activates. */
  onActivate: (event: PointerEvent) => void;
  /** Pointer filter. */
  pointer?: GesturePointerType | undefined;
  /** Region filter. */
  region?: GestureRegion | undefined;
  /** Whether the binding is currently disabled. */
  disabled?: boolean | undefined;
  /** Input action name. */
  action?: string | undefined;
  /** Optional numeric argument for the action. */
  value?: number | undefined;
}

/** Event delivered to gesture observers when a gesture activates. */
export interface GestureActivateEvent {
  /** Gesture kind. */
  type: GestureType;
  /** Always `'gesture'`. */
  source: 'gesture';
  /** Resolved input action name. */
  action?: string | undefined;
  /** Resolved numeric argument. */
  value?: number | undefined;
  /** Region the gesture occurred in. */
  region?: GestureRegion | undefined;
  /** Pointer that produced the gesture. */
  pointer?: GesturePointerType | undefined;
  /** Underlying pointer event. */
  event: PointerEvent;
}

/** State machine for a specific gesture kind. */
export interface GestureRecognizer {
  /** Handle a confirmed quick pointer-up and decide when to fire matched bindings. */
  handleUp(matches: GestureMatchResult, event: PointerEvent): void;
  /** Reset internal state. */
  reset(): void;
}

/** Snapshot of bindings that match the current pointer event. */
export interface GestureMatchResult {
  /** Resolve current matches for a gesture type (reads fresh rect, re-filters bindings). */
  resolve(type: GestureType): GestureBinding[];
}
