# ReactiveElement Fundamentals

Core concepts for building web components with `@videojs/element`. For Video.js-specific patterns, see [lit.md](lit.md).

## ReactiveElement Basics

`ReactiveElement` is our lightweight custom element base class (`@videojs/element`). It provides reactive properties, attribute reflection, batched updates, and reactive controllers — without Shadow DOM, `static styles`, or decorators.

```ts
import { ReactiveElement } from '@videojs/element';
import type { PropertyValues } from '@videojs/element';

class MyElement extends ReactiveElement {
  static override properties = {
    name: { type: String },
  };

  name = 'World';

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    this.textContent = `Hello, ${this.name}!`;
  }
}
customElements.define('my-element', MyElement);
```

**Reactive update cycle:** property change → `Object.is()` check → `requestUpdate()` → microtask batch → `willUpdate()` → `update()` → `updateComplete` resolves.

**Light DOM only** — elements render directly to `this` (e.g. `this.textContent`, `this.appendChild()`). No Shadow DOM, no `createRenderRoot()`.

---

## Reactive Properties

Properties declared via the static `properties` field:

| Option | Purpose |
|--------|---------|
| `type` | `String`, `Boolean`, or `Number` — used for attribute → property coercion |
| `attribute` | Custom attribute name (defaults to the property name) |

```ts
static override properties = {
  // String property, attribute name matches property name
  label: { type: String },

  // Number property
  count: { type: Number },

  // Boolean property (attribute presence = true, absence = false)
  disabled: { type: Boolean },

  // Custom attribute name
  negativeSign: { type: String, attribute: 'negative-sign' },
};
```

**How attribute coercion works:**

- `String` — attribute value passed through as-is
- `Boolean` — `true` if attribute is present, `false` if absent
- `Number` — attribute value parsed via `Number()`

**Change detection** uses `Object.is()` — setting a property to the same value does not trigger an update. This correctly handles `NaN` and `-0`.

**Property storage** uses Symbols internally. Prototype accessors are installed automatically when the class is registered via `customElements.define()`.

### TypeScript Configuration

Required to prevent class fields from shadowing reactive accessors:

```json
{
  "compilerOptions": {
    "useDefineForClassFields": false
  }
}
```

Without this, `label = 'default'` uses `[[Define]]` semantics which creates an own data property, bypassing the prototype getter/setter.

---

## Lifecycle Methods

**In execution order:**

1. **`constructor()`** — Call `super()`. Initialize field defaults. No DOM access.

2. **`connectedCallback()`** — Element added to DOM. Always call `super.connectedCallback()`. Start subscriptions here. The first update is scheduled automatically.

3. **`attributeChangedCallback(name, old, new)`** — Attribute changed. Handled automatically for declared properties — you rarely need to override this.

4. **`willUpdate(changed: PropertyValues)`** — Called before `update()`. Use for computing derived state from changed properties.

5. **`update(changed: PropertyValues)`** — Performs the DOM update. Always call `super.update(changed)`. This is where you write to the DOM.

6. **`disconnectedCallback()`** — Element removed. Always call `super.disconnectedCallback()`. Clean up subscriptions.

**Update control:**

- `requestUpdate(name?, oldValue?)` — Manually trigger an update cycle
- `updateComplete` — Promise that resolves after the current update completes

```ts
class MyElement extends ReactiveElement {
  static override properties = {
    items: { type: String },
  };

  items = '';

  #computedCount = 0;

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('items')) {
      this.#computedCount = this.items.split(',').length;
    }
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    this.textContent = `${this.#computedCount} items`;
  }
}
```

### What we DON'T have (vs Lit)

These Lit lifecycle methods are **not available** in our ReactiveElement:

- `shouldUpdate()` — no skipping updates
- `firstUpdated()` — use a flag in `update()` if needed
- `updated()` — use `update()` directly
- `getUpdateComplete()` — no async update chaining
- `performUpdate()` — no custom scheduling

---

## Reactive Controllers

Encapsulate reusable behavior with lifecycle hooks:

```ts
import type { ReactiveController, ReactiveControllerHost } from '@videojs/element';

class ClockController implements ReactiveController {
  #host: ReactiveControllerHost;
  #timerID?: number;
  value = new Date();

  constructor(host: ReactiveControllerHost) {
    this.#host = host;
    host.addController(this);
  }

  hostConnected(): void {
    this.#timerID = window.setInterval(() => {
      this.value = new Date();
      this.#host.requestUpdate();
    }, 1000);
  }

  hostDisconnected(): void {
    clearInterval(this.#timerID);
  }
}

// Usage
class MyElement extends ReactiveElement {
  #clock = new ClockController(this);

  protected override update(): void {
    this.textContent = this.#clock.value.toLocaleTimeString();
  }
}
```

**Controller interface:**

- `hostConnected()` — Called when the host element connects to the DOM
- `hostDisconnected()` — Called when the host element disconnects

Note: Lit's `hostUpdate()` and `hostUpdated()` are **not available**.

---

## Context API

Context enables data sharing without prop drilling. We re-export `@lit/context` from `@videojs/element/context`:

```ts
import { createContext, ContextProvider, ContextConsumer } from '@videojs/element/context';

// Define context
const userContext = createContext<User>('user-context');

// Provider
class MyApp extends ReactiveElement {
  #provider = new ContextProvider(this, {
    context: userContext,
    initialValue: { name: 'Guest' },
  });

  setUser(user: User): void {
    this.#provider.setValue(user);
  }
}

// Consumer
class UserDisplay extends ReactiveElement {
  #consumer = new ContextConsumer(this, {
    context: userContext,
    subscribe: true,
    callback: () => this.requestUpdate(),
  });

  protected override update(): void {
    const user = this.#consumer.value;
    this.textContent = user?.name ?? 'Unknown';
  }
}
```

---

## Best Practices

### Do

- **Always call `super` in lifecycle methods** — maintains the reactive update cycle
- **Use `willUpdate()` for derived state** — computed before DOM update
- **Clean up in `disconnectedCallback()`** — prevents memory leaks
- **Use immutable data patterns** — `this.arr = [...this.arr, item]` not `push()`
- **Wait for `updateComplete`** before asserting DOM state in tests
- **Use `useDefineForClassFields: false`** in tsconfig for packages with reactive elements

### Don't

- **Don't mutate arrays/objects** without reassigning — won't trigger updates
- **Don't access DOM in constructor** — element isn't connected yet
- **Don't forget `super` calls** in lifecycle methods

### Common Mistakes

1. **Forgetting super calls**: `connectedCallback() { super.connectedCallback(); ... }`
2. **Boolean defaults**: Must default to `false` for attribute coercion to work correctly
3. **Memory leaks**: Add listeners in `connectedCallback`, remove in `disconnectedCallback`
4. **Mutating instead of replacing**: `this.items = [...this.items, item]` not `push()`
5. **Missing tsconfig setting**: `useDefineForClassFields: false` is required
