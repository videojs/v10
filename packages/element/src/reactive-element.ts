import type { PropertyDeclaration, PropertyDeclarationMap, PropertyValues, ReactiveController } from './types';

// --- Module-level property resolution ---

interface ResolvedMeta {
  props: Map<string, PropertyDeclaration>;
  attrToProp: Map<string, string>;
}

const cache = new WeakMap<typeof ReactiveElement, ResolvedMeta>();
const propertyKeys = new Map<string, symbol>();

/**
 * Resolve `ctor.properties` into lookup Maps and install reactive accessors
 * on the prototype. Runs once per class, result is cached.
 *
 * Subclasses that need parent properties must spread them:
 * `static override properties = { ...Parent.properties, ... }`.
 */
function resolve(ctor: typeof ReactiveElement): ResolvedMeta {
  const existing = cache.get(ctor);
  if (existing) return existing;

  const props = new Map<string, PropertyDeclaration>();
  const attrToProp = new Map<string, string>();

  for (const [name, decl] of Object.entries(ctor.properties)) {
    props.set(name, decl);
    attrToProp.set(decl.attribute ?? name, name);

    // Install reactive accessor on the prototype
    if (!Object.getOwnPropertyDescriptor(ctor.prototype, name)?.get) {
      let key = propertyKeys.get(name);
      if (!key) {
        key = Symbol(name);
        propertyKeys.set(name, key);
      }

      Object.defineProperty(ctor.prototype, name, {
        get(this: ReactiveElement) {
          return (this as unknown as Record<symbol, unknown>)[key];
        },
        set(this: ReactiveElement, value: unknown) {
          const old = (this as unknown as Record<symbol, unknown>)[key];
          (this as unknown as Record<symbol, unknown>)[key] = value;

          if (!Object.is(old, value)) {
            this.requestUpdate(name, old);
          }
        },
        configurable: true,
        enumerable: true,
      });
    }
  }

  const meta: ResolvedMeta = { props, attrToProp };
  cache.set(ctor, meta);
  return meta;
}

/**
 * Lightweight reactive custom element base.
 *
 * Drop-in subset of Lit's ReactiveElement — supports `static properties`,
 * attribute reflection, batched updates (`willUpdate` / `update`), and
 * reactive controllers. No Shadow DOM, no `static styles`, no decorators.
 *
 * Subclasses that extend another element with properties must spread them:
 *
 * @example
 * ```ts
 * class MyButton extends ReactiveElement {
 *   static override properties = {
 *     label: { type: String },
 *     disabled: { type: Boolean },
 *   };
 *
 *   label = 'Click me';
 *   disabled = false;
 *
 *   protected override update(changed: PropertyValues): void {
 *     super.update(changed);
 *     this.textContent = this.label;
 *   }
 * }
 *
 * // Inheritance — spread parent properties
 * class FancyButton extends MyButton {
 *   static override properties = {
 *     ...MyButton.properties,
 *     variant: { type: String },
 *   };
 *
 *   variant = 'primary';
 * }
 * ```
 */
export class ReactiveElement extends HTMLElement {
  static properties: PropertyDeclarationMap = {};

  static get observedAttributes(): string[] {
    return [...resolve(this).attrToProp.keys()];
  }

  // --- Instance state ---

  #controllers: Set<ReactiveController> = new Set();
  #changedProperties: PropertyValues = new Map();
  #instanceProperties: Map<string, unknown> | undefined;
  #updatePending = false;
  #hasConnected = false;
  #isFirstUpdate = true;

  constructor() {
    super();

    // Save instance properties that might shadow prototype accessors.
    // Handles the "upgrade" case where properties were set before registration.
    const { props } = resolve(this.constructor as typeof ReactiveElement);

    for (const name of props.keys()) {
      if (Object.hasOwn(this, name)) {
        (this.#instanceProperties ??= new Map()).set(name, (this as Record<string, unknown>)[name]);
        delete (this as Record<string, unknown>)[name];
      }
    }
  }

  addController(controller: ReactiveController): void {
    this.#controllers.add(controller);

    if (this.#hasConnected) {
      controller.hostConnected?.();
    }
  }

  removeController(controller: ReactiveController): void {
    this.#controllers.delete(controller);
  }

  connectedCallback(): void {
    this.#hasConnected = true;

    for (const c of this.#controllers) {
      c.hostConnected?.();
    }

    if (this.#isFirstUpdate && !this.#updatePending) {
      this.#updatePending = true;
      queueMicrotask(() => this.#performUpdate());
    }
  }

  disconnectedCallback(): void {
    for (const c of this.#controllers) {
      c.hostDisconnected?.();
    }
  }

  attributeChangedCallback(attr: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    const { props, attrToProp } = resolve(this.constructor as typeof ReactiveElement);
    const propName = attrToProp.get(attr);
    if (!propName) return;

    const decl = props.get(propName);
    if (!decl) return;

    const value = decl.type === Boolean ? newValue !== null : newValue;
    (this as Record<string, unknown>)[propName] = value;
  }

  requestUpdate(name?: string, oldValue?: unknown): void {
    if (name !== undefined) {
      this.#changedProperties.set(name, oldValue);
    }

    if (this.#updatePending) return;
    this.#updatePending = true;

    queueMicrotask(() => this.#performUpdate());
  }

  #performUpdate(): void {
    if (!this.#hasConnected) {
      this.#updatePending = false;
      return;
    }

    // Restore saved instance properties on first update
    if (this.#isFirstUpdate && this.#instanceProperties) {
      for (const [name, value] of this.#instanceProperties) {
        (this as Record<string, unknown>)[name] = value;
      }
      this.#instanceProperties = undefined;
    }

    const changed = this.#changedProperties;

    this.willUpdate(changed);
    this.update(changed);

    this.#isFirstUpdate = false;
    this.#changedProperties = new Map();
    this.#updatePending = false;
  }

  protected willUpdate(_changed: PropertyValues): void {}

  protected update(_changed: PropertyValues): void {}

  get updateComplete(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
