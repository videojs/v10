export interface UIEvent {
  preventDefault(): void;
}

export interface UIKeyboardEvent extends UIEvent {
  key: string;
  target: Node;
  currentTarget: Node;
}
