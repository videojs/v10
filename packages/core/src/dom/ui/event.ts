export interface UIEvent {
  preventDefault(): void;
}

export interface UIKeyboardEvent extends UIEvent {
  key: string;
  shiftKey: boolean;
  metaKey: boolean;
  target: Node;
  currentTarget: Node;
}

export interface UIPointerEvent extends UIEvent {
  clientX: number;
  clientY: number;
  pointerId: number;
  pointerType: string;
  buttons: number;
}
