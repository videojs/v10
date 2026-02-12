export interface ReactiveController {
  hostConnected?(): void;
  hostDisconnected?(): void;
}

export interface ReactiveControllerHost {
  addController(controller: ReactiveController): void;
  removeController(controller: ReactiveController): void;
  requestUpdate(): void;
  readonly updateComplete: Promise<boolean>;
}

export type PropertyValues = Map<string, unknown>;

export interface PropertyDeclaration {
  readonly type?: typeof String | typeof Boolean | typeof Number;
  readonly attribute?: string;
}

export type PropertyDeclarationMap<K extends string = string> = Record<K, PropertyDeclaration>;
