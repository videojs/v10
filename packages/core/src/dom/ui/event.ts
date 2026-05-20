/** Minimal `Event`-shaped object used by UI handlers. */
export interface UIEvent {
  /** Whether `preventDefault` has been called. */
  readonly defaultPrevented?: boolean;
  /** Cancel default behavior. */
  preventDefault(): void;
  /** Stop the event from bubbling. */
  stopPropagation(): void;
}

/** Minimal `KeyboardEvent`-shaped object used by UI handlers. */
export interface UIKeyboardEvent extends UIEvent {
  /** Key value of the event. */
  key: string;
  /** Whether the Shift modifier is active. */
  shiftKey: boolean;
  /** Whether the Control modifier is active. */
  ctrlKey: boolean;
  /** Whether the Alt modifier is active. */
  altKey: boolean;
  /** Whether the Meta modifier is active. */
  metaKey: boolean;
  /** Element the event originated from. */
  target: Node;
  /** Element the listener is attached to. */
  currentTarget: Node;
}

/** Minimal `PointerEvent`-shaped object used by UI handlers. */
export interface UIPointerEvent extends UIEvent {
  /** Viewport X coordinate of the pointer. */
  clientX: number;
  /** Viewport Y coordinate of the pointer. */
  clientY: number;
  /** Pointer identifier. */
  pointerId: number;
  /** Pointer type (`mouse`, `touch`, `pen`). */
  pointerType: string;
  /** Bitfield of currently pressed buttons. */
  buttons: number;
}

/** Minimal `WheelEvent`-shaped object used by UI handlers. */
export interface UIWheelEvent extends UIEvent {
  /** Vertical scroll delta. */
  deltaY: number;
}

/** Minimal `FocusEvent`-shaped object used by UI handlers. */
export interface UIFocusEvent extends UIEvent {
  /** Element focus is moving to or from. */
  relatedTarget: EventTarget | null;
}
