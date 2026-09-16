/** An object that can host Reactive Controllers and call their lifecycle callbacks. */
export interface ReactiveControllerHost {
  /**
   * Adds a controller to the host, which sets up the controller's lifecycle methods to be called with the host's
   * lifecycle.
   */
  addController(controller: ReactiveController): void;

  /** Removes a controller from the host. */
  removeController(controller: ReactiveController): void;

  /**
   * Requests a host update which is processed asynchronously. The update can be waited on via the `updateComplete`
   * property.
   */
  requestUpdate(): void;

  /**
   * Returns a Promise that resolves when the host has completed updating. The Promise value is a boolean that is `true`
   * if the element completed the update without triggering another update. The Promise result is `false` if a property
   * was set inside `updated()`. If the Promise is rejected, an exception was thrown during the update.
   */
  readonly updateComplete: Promise<boolean>;
}

/**
 * A Reactive Controller is an object that enables sub-component code organization and reuse by aggregating the state,
 * behavior, and lifecycle hooks related to a single feature.
 *
 * Controllers are added to a host component, or other object that implements the {@linkcode ReactiveControllerHost}
 * interface, via the `addController()` method. They can hook their host component's lifecycle by implementing one or
 * more of the lifecycle callbacks, or initiate an update of the host component by calling `requestUpdate()` on the
 * host.
 */
export interface ReactiveController {
  /**
   * Called when the host is connected to the component tree. For custom element hosts, this corresponds to the
   * `connectedCallback()` lifecycle, which is only called when the component is connected to the document.
   */
  hostConnected?(): void;

  /**
   * Called when the host is disconnected from the component tree. For custom element hosts, this corresponds to the
   * `disconnectedCallback()` lifecycle, which is called when the host or an ancestor component is disconnected from the
   * document.
   */
  hostDisconnected?(): void;

  /** Called during the client-side host update, just before the host calls its own update. */
  hostUpdate?(): void;

  /** Called after a host update, just before the host calls `firstUpdated` and `updated`. */
  hostUpdated?(): void;
}

/** A controller that can release permanent resources when used with `DestroyMixin`. */
export interface DestroyController extends ReactiveController {
  hostDestroyed?(): void;
}

/** Converts property values to and from attribute values. */
export interface ComplexAttributeConverter<Type = unknown, TypeHint = unknown> {
  fromAttribute?(value: string | null, type?: TypeHint): Type;
  toAttribute?(value: Type, type?: TypeHint): unknown;
}

type PropertyConverter<Type = unknown, TypeHint = unknown> =
  | ComplexAttributeConverter<Type>
  | ((value: string | null, type?: TypeHint) => Type);

/** Defines the supported Lit-compatible options for a reactive property. */
export interface PropertyDeclaration<Type = unknown, TypeHint = unknown> {
  readonly attribute?: boolean | string;
  readonly type?: TypeHint;
  readonly converter?: PropertyConverter<Type, TypeHint>;
  hasChanged?(value: Type, oldValue: Type): boolean;
  readonly noAccessor?: boolean;
}

/** Map of properties to {@linkcode PropertyDeclaration} options. */
export interface PropertyDeclarations {
  readonly [key: string]: PropertyDeclaration;
}

/** A strongly typed map of property keys to their previous values. */
export interface PropertyValueMap<T> extends Map<PropertyKey, unknown> {
  get<K extends keyof T>(key: K): T[K] | undefined;
  set<K extends keyof T>(key: K, value: T[K]): this;
  has<K extends keyof T>(key: K): boolean;
  delete<K extends keyof T>(key: K): boolean;
}

/** A map of property keys to previous values, provided to update lifecycle methods. */
export type PropertyValues<T = any> = T extends object ? PropertyValueMap<T> : Map<PropertyKey, unknown>;
