import { createAttributeBindings, valueFromAttribute, type AttributeBindings } from './attributes';
import type { PropertyDeclaration, PropertyDeclarations, PropertyValues, ReactiveController } from './types';

declare const __DEV__: boolean;

interface ResolvedMeta {
  props: Map<PropertyKey, PropertyDeclaration>;
  bindings: AttributeBindings<PropertyDeclaration>;
  wrapped: Set<PropertyKey>;
}

const cache = new WeakMap<typeof ReactiveElement, ResolvedMeta>();
const HTMLElementBase = globalThis.HTMLElement ?? class {};
const defaultPropertyDeclaration: PropertyDeclaration = { attribute: true, type: String };
const notEqual = (value: unknown, oldValue: unknown) => !Object.is(value, oldValue);

/**
 * Lightweight reactive custom element base class.
 *
 * Drop-in subset of Lit's `ReactiveElement` — supports `static properties`, attribute conversion, batched async
 * updates, and reactive controllers. No Shadow DOM, no `static styles`, no decorators.
 *
 * Updates are batched using the same Promise-based scheduling as Lit: property changes enqueue a microtask, and the
 * update is gated behind `connectedCallback` so the first update only runs once the element is in the document.
 *
 * @example
 *   ```ts
 *   class MyButton extends ReactiveElement {
 *     static override properties = {
 *       label: { type: String },
 *       disabled: { type: Boolean },
 *     };
 *
 *     label = 'Click me';
 *     disabled = false;
 *
 *     protected override update(changed: PropertyValues): void {
 *       super.update(changed);
 *       this.textContent = this.label;
 *     }
 *   }
 *   ```;
 */
export class ReactiveElement extends HTMLElementBase {
  /**
   * User-supplied object that maps property names to {@linkcode PropertyDeclaration} objects containing options for
   * configuring reactive properties. When a reactive property is set the element will update and render.
   */
  static properties: PropertyDeclarations = {};

  /** Returns a list of attributes corresponding to the registered properties. */
  static get observedAttributes(): string[] {
    return [...resolve(this).bindings.observedAttributes];
  }

  // --- Instance state ---

  #controllers: Set<ReactiveController> = new Set();
  #changedProperties: PropertyValues = new Map();
  #instanceProperties: Map<PropertyKey, unknown> | undefined;
  #controllersConnected = false;

  /**
   * Promise that gates the first update until `connectedCallback`. Also used to serialize updates — each
   * `#enqueueUpdate` awaits the previous `#updatePromise`, so property changes are batched and updates never overlap.
   * Matches Lit's scheduling model.
   */
  #updatePromise: Promise<boolean>;

  /** True if there is a pending update as a result of calling `requestUpdate()`. Should only be read. */
  isUpdatePending = false;

  /**
   * Is set to `true` after the first update. The element code cannot assume that the DOM is fully initialized before
   * the element `hasUpdated`.
   */
  hasUpdated = false;

  constructor() {
    super();

    // Initialize to an unresolved Promise so we can make sure the element
    // has connected before the first update. The resolver is assigned to
    // `this.enableUpdating`, overriding the no-op prototype method.
    this.#updatePromise = new Promise<boolean>(
      (res) => (this.enableUpdating = res as (requestedUpdate: boolean) => void)
    );

    const { props } = resolve(this.constructor as typeof ReactiveElement);

    this.#instanceProperties = takeInstanceProperties(this, props.keys());

    // Enqueue the first update. It won't run until connectedCallback calls
    // `this.enableUpdating(true)` which resolves the #updatePromise gate.
    this.requestUpdate();
  }

  /**
   * Note, this method should be considered final and not overridden. It is overridden on the element instance with a
   * function that triggers the first update.
   */
  protected enableUpdating(_requestedUpdate: boolean): void {}

  /**
   * Registers a {@linkcode ReactiveController} to participate in the element's reactive update cycle. The element
   * automatically calls into any registered controllers during its lifecycle callbacks.
   *
   * If the element is connected when `addController()` is called, the controller's `hostConnected()` callback will be
   * immediately called.
   */
  addController(controller: ReactiveController): void {
    this.#controllers.add(controller);

    if (this.#controllersConnected && this.isConnected) {
      controller.hostConnected?.();
    }
  }

  /** Removes a {@linkcode ReactiveController} from the element. */
  removeController(controller: ReactiveController): void {
    this.#controllers.delete(controller);
  }

  /** On first connection, enables updating and notifies controllers. */
  connectedCallback(): void {
    this.enableUpdating(true);
    this.#controllersConnected = true;

    for (const c of this.#controllers) {
      c.hostConnected?.();
    }
  }

  disconnectedCallback(): void {
    this.#controllersConnected = false;

    for (const c of this.#controllers) {
      c.hostDisconnected?.();
    }
  }

  /**
   * Synchronizes property values when attributes change.
   *
   * Specifically, when an attribute is set, the corresponding property is set. You should rarely need to implement this
   * callback. If this method is overridden, `super.attributeChangedCallback(name, _old, value)` must be called.
   */
  attributeChangedCallback(attr: string, _oldValue: string | null, newValue: string | null): void {
    const binding = resolve(this.constructor as typeof ReactiveElement).bindings.byAttribute.get(attr);
    if (!binding) return;

    (this as Record<string, unknown>)[binding.property] = valueFromAttribute(newValue, binding.declaration);
  }

  /**
   * Requests an update which is processed asynchronously. This should be called when an element should update based on
   * some state not triggered by setting a reactive property. In this case, pass no arguments. It should also be called
   * when manually implementing a property setter. In this case, pass the property `name` and `oldValue` to ensure that
   * any configured property options are honored.
   */
  requestUpdate(
    name?: PropertyKey,
    oldValue?: unknown,
    options?: PropertyDeclaration,
    useNewValue = false,
    newValue?: unknown
  ): void {
    if (name !== undefined) {
      const declaration =
        options ?? resolve(this.constructor as typeof ReactiveElement).props.get(name) ?? defaultPropertyDeclaration;

      if (!useNewValue) newValue = Reflect.get(this, name);

      if (!(declaration.hasChanged ?? notEqual)(newValue, oldValue)) return;

      if (!this.#changedProperties.has(name)) {
        this.#changedProperties.set(name, this.hasUpdated ? oldValue : undefined);
      }
    }

    if (this.isUpdatePending) return;

    this.#updatePromise = this.#enqueueUpdate();
  }

  /**
   * Sets up the element to asynchronously update. Awaits the previous `#updatePromise` which both serializes updates
   * and (on first update) waits for `connectedCallback` to resolve the gate.
   */
  async #enqueueUpdate(): Promise<boolean> {
    this.isUpdatePending = true;

    try {
      // Ensure any previous update has resolved before updating.
      // This `await` also ensures that property changes are batched.
      await this.#updatePromise;
    } catch (e: unknown) {
      // Refire any previous errors async so they do not disrupt the
      // update cycle.
      Promise.reject(e);
    }

    const result = this.scheduleUpdate();

    // If `scheduleUpdate` returns a Promise, we await it. This is done to
    // enable coordinating updates with a scheduler.
    if (result != null) {
      await result;
    }

    return !this.isUpdatePending;
  }

  /**
   * Schedules an element update. You can override this method to change the timing of updates by returning a Promise.
   * The update will await the returned Promise, and you should resolve the Promise to allow the update to proceed. If
   * this method is overridden, `super.scheduleUpdate()` must be called.
   *
   * For instance, to schedule updates to occur just before the next frame:
   *
   * ```ts
   * override protected async scheduleUpdate(): Promise<unknown> {
   *   await new Promise((resolve) => requestAnimationFrame(() => resolve()));
   *   super.scheduleUpdate();
   * }
   * ```
   */
  protected scheduleUpdate(): void | Promise<unknown> {
    this.performUpdate();
  }

  /**
   * Performs an element update. Note, if an exception is thrown during the update, `firstUpdated` and `updated` will
   * not be called.
   *
   * Call `performUpdate()` to immediately process a pending update. This should generally not be needed, but it can be
   * done in rare cases when you need to update synchronously.
   */
  protected performUpdate(): void {
    // Abort any update if one is not pending when this is called.
    // This can happen if `performUpdate` is called early to "flush"
    // the update.
    if (!this.isUpdatePending) return;

    const changed = this.#changedProperties;

    try {
      if (!this.hasUpdated) {
        if (typeof __DEV__ === 'undefined' || __DEV__) {
          const properties = resolve(this.constructor as typeof ReactiveElement).props;
          const shadowed = [...properties.keys()].filter(
            (property) => Object.hasOwn(this, property) && property in Object.getPrototypeOf(this)
          );

          if (shadowed.length > 0) {
            throw new Error(
              `Reactive properties on ${this.localName} are shadowed by class fields: ${shadowed.map(String).join(', ')}.`
            );
          }
        }

        if (this.#instanceProperties) {
          for (const [property, value] of this.#instanceProperties) Reflect.set(this, property, value);

          this.#instanceProperties = undefined;
        }

        const { wrapped } = resolve(this.constructor as typeof ReactiveElement);

        for (const property of wrapped) {
          const value = Reflect.get(this, property);

          if (!this.#changedProperties.has(property) && value !== undefined) {
            this.#changedProperties.set(property, undefined);
          }
        }
      }

      this.willUpdate(changed);

      for (const c of this.#controllers) {
        c.hostUpdate?.();
      }

      this.update(changed);
    } catch (error) {
      this.#markUpdated();
      throw error;
    }

    this.#markUpdated();

    for (const c of this.#controllers) {
      c.hostUpdated?.();
    }

    if (!this.hasUpdated) {
      this.hasUpdated = true;
      this.firstUpdated(changed);
    }

    this.updated(changed);
  }

  #markUpdated(): void {
    this.#changedProperties = new Map();
    this.isUpdatePending = false;
  }

  /**
   * Invoked before `update()` to compute values needed during the update.
   *
   * Implement `willUpdate` to compute property values that depend on other properties and are used in the rest of the
   * update process.
   *
   * ```ts
   * willUpdate(changed) {
   *   if (changed.has('firstName') || changed.has('lastName')) {
   *     this.sha = computeSHA(`${this.firstName} ${this.lastName}`);
   *   }
   * }
   * ```
   */
  protected willUpdate(_changed: PropertyValues): void {}

  /**
   * Updates the element. This method can be overridden to render and keep element DOM updated. Setting properties
   * inside this method will _not_ trigger another update.
   */
  protected update(_changed: PropertyValues): void {}

  /**
   * Invoked when the element is first updated. Implement to perform one time work on the element after update.
   *
   * Setting properties inside this method will trigger the element to update again after this update cycle completes.
   */
  protected firstUpdated(_changed: PropertyValues): void {}

  /**
   * Invoked whenever the element is updated. Implement to perform post-updating tasks via DOM APIs, for example,
   * focusing an element.
   *
   * Setting properties inside this method will trigger the element to update again after this update cycle completes.
   */
  protected updated(_changed: PropertyValues): void {}

  /**
   * Returns a Promise that resolves when the element has completed updating. The Promise value is a boolean that is
   * `true` if the element completed the update without triggering another update. The Promise result is `false` if a
   * property was set inside `updated()`.
   */
  get updateComplete(): Promise<boolean> {
    return this.#updatePromise;
  }
}

/**
 * Resolve `ctor.properties` into lookup Maps and install reactive accessors on the prototype. Runs once per class,
 * result is cached.
 *
 * Property declarations are inherited in the same way as Lit's `ReactiveElement` declarations.
 */
function resolve(ctor: typeof ReactiveElement): ResolvedMeta {
  const existing = cache.get(ctor);
  if (existing) return existing;

  const parent = Object.getPrototypeOf(ctor) as typeof ReactiveElement;
  const parentMeta = ctor === ReactiveElement ? undefined : resolve(parent);
  const props = new Map<PropertyKey, PropertyDeclaration>(parentMeta?.props);
  const wrapped = new Set<PropertyKey>(parentMeta?.wrapped);
  const declarations = Object.hasOwn(ctor, 'properties') ? ctor.properties : {};

  for (const [name, decl] of Object.entries(declarations)) {
    props.set(name, decl);

    if (Object.hasOwn(ctor.prototype, name)) wrapped.add(name);
    else wrapped.delete(name);

    if (!decl.noAccessor) defineReactiveProperty(ctor, name, decl);
  }

  const bindings = createAttributeBindings(Object.fromEntries(props) as PropertyDeclarations);
  const meta: ResolvedMeta = { props, bindings, wrapped };

  cache.set(ctor, meta);
  return meta;
}

function defineReactiveProperty(ctor: typeof ReactiveElement, name: string, declaration: PropertyDeclaration): void {
  const own = Object.getOwnPropertyDescriptor(ctor.prototype, name);
  const key = Symbol(name);
  const get =
    own?.get ??
    function (this: ReactiveElement) {
      return (this as unknown as Record<symbol, unknown>)[key];
    };
  const set =
    own?.set ??
    function (this: ReactiveElement, value: unknown) {
      (this as unknown as Record<symbol, unknown>)[key] = value;
    };

  if (own && 'value' in own) {
    throw new TypeError(
      `Reactive property \`${name}\` must be declared as a field or accessor, not a prototype value.`
    );
  }

  Object.defineProperty(ctor.prototype, name, {
    get,
    set(this: ReactiveElement, value: unknown) {
      const oldValue = get.call(this);

      set.call(this, value);
      this.requestUpdate(name, oldValue, declaration);
    },
    configurable: true,
    enumerable: true,
  });
}

function takeInstanceProperties(
  element: ReactiveElement,
  properties: Iterable<PropertyKey>
): Map<PropertyKey, unknown> | undefined {
  const captured = new Map<PropertyKey, unknown>();

  for (const property of properties) {
    if (!Object.hasOwn(element, property)) continue;

    captured.set(property, Reflect.get(element, property));
    Reflect.deleteProperty(element, property);
  }

  return captured.size > 0 ? captured : undefined;
}
