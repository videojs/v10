# Lit ReactiveElement Fundamentals

Core Lit concepts for building web components. For Video.js-specific patterns, see [lit.md](lit.md).

## ReactiveElement Basics

`ReactiveElement` is the base class providing the reactive update cycle and property system. It extends `HTMLElement` directly:

```ts
class MyElement extends ReactiveElement {
  static properties = {
    name: { type: String }
  };

  constructor() {
    super();
    this.name = 'World';
  }
}
customElements.define('my-element', MyElement);
```

**Reactive update cycle:** property change → `hasChanged()` check → `requestUpdate()` → microtask batch → `shouldUpdate()` → `willUpdate()` → `update()` → `firstUpdated()` (first time only) → `updated()` → `updateComplete` resolves.

**Shadow DOM provides:**

- DOM scoping (selectors won't leak)
- Style scoping (CSS encapsulated)
- Composition via slots

Override `createRenderRoot()` to customize shadow root creation or disable it.

---

## Reactive Properties

Properties declared via static `properties` field:

| Option | Purpose |
|--------|---------|
| `type` | `String \| Number \| Boolean \| Array \| Object` for attribute conversion |
| `attribute` | Custom attribute name or `false` to disable |
| `reflect` | `true` to sync property → attribute |
| `converter` | Custom `fromAttribute`/`toAttribute` functions |
| `hasChanged` | Custom change detection function |
| `noAccessor` | Skip Lit's accessor generation |
| `useDefault` | Reset to default when attribute removed |
| `state` | `true` for internal reactive state (no attribute) |

```ts
static properties = {
  // Public property with attribute
  name: { type: String },

  // Custom attribute name
  count: { type: Number, attribute: 'item-count' },

  // Reflected to attribute
  active: { type: Boolean, reflect: true },

  // Internal state (no attribute)
  _data: { state: true },

  // Custom converter
  date: {
    converter: {
      fromAttribute: (value) => new Date(value),
      toAttribute: (value) => value.toISOString()
    }
  },

  // Custom change detection
  items: {
    hasChanged: (newVal, oldVal) => newVal !== oldVal
  }
};
```

---

## Lifecycle Methods

**In execution order:**

1. **`constructor()`** — Initialize properties, call `super()`. No DOM access.

2. **`connectedCallback()`** — Element added to DOM. Always call `super.connectedCallback()`. Start external subscriptions here.

3. **`attributeChangedCallback(name, old, new)`** — Attribute changed. Handled automatically for declared properties.

4. **`willUpdate(changedProperties)`** — Before update, compute derived state. Runs during SSR.

5. **`update(changedProperties)`** — Performs the update. Call `super.update(changedProperties)`.

6. **`firstUpdated(changedProperties)`** — After first update only. Safe for one-time DOM setup.

7. **`updated(changedProperties)`** — After every update. Safe for DOM-dependent operations.

8. **`disconnectedCallback()`** — Element removed. Always call `super.disconnectedCallback()`. Clean up subscriptions.

**Update control methods:**

- `requestUpdate(name?, oldValue?)` — Manually trigger update cycle
- `shouldUpdate(changedProperties)` — Return `false` to skip update
- `getUpdateComplete()` — Override to await child updates
- `updateComplete` — Promise resolving after update completes
- `performUpdate()` — Override for custom scheduling (use carefully)

```ts
class MyElement extends ReactiveElement {
  static properties = {
    items: { type: Array },
    _computedValue: { state: true }
  };

  willUpdate(changedProperties) {
    if (changedProperties.has('items')) {
      this._computedValue = this.items.reduce((a, b) => a + b, 0);
    }
  }

  shouldUpdate(changedProperties) {
    return this.items.length > 0;
  }

  async getUpdateComplete() {
    await super.getUpdateComplete();
    await this._childElement?.updateComplete;
  }
}
```

---

## Shadow DOM and Render Root

Override `createRenderRoot()` to customize:

```ts
// Default: open shadow root
createRenderRoot() {
  return this.attachShadow({ mode: 'open' });
}

// Render to light DOM instead
createRenderRoot() {
  return this;
}

// Custom shadow root options
createRenderRoot() {
  return this.attachShadow({
    mode: 'open',
    delegatesFocus: true
  });
}
```

---

## Styling

Use static `styles` property for optimal performance (evaluated once per class, uses Constructable Stylesheets):

```ts
import { css } from 'lit';

class MyElement extends ReactiveElement {
  static styles = css`
    :host { display: block; }
    :host([hidden]) { display: none; }
    :host(.active) { border: 1px solid blue; }
    ::slotted(p) { color: blue; }
  `;
}
```

**Key selectors:**

- `:host` — Target host element
- `:host([attr])` — Host with attribute
- `:host(.class)` — Host with class
- `::slotted(selector)` — Direct slotted children only

**CSS custom properties** inherit through shadow boundaries — primary theming mechanism.

**Share styles across components:**

```ts
// shared-styles.ts
export const sharedStyles = css`
  :host { box-sizing: border-box; }
`;

// my-element.ts
static styles = [sharedStyles, css`
  :host { display: flex; }
`];
```

---

## Reactive Controllers

Encapsulate reusable behavior with lifecycle hooks:

```ts
interface ReactiveController {
  hostConnected?(): void;
  hostDisconnected?(): void;
  hostUpdate?(): void;
  hostUpdated?(): void;
}

class ClockController implements ReactiveController {
  host: ReactiveControllerHost;
  value = new Date();
  #timerID?: number;

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  hostConnected() {
    this.#timerID = window.setInterval(() => {
      this.value = new Date();
      this.host.requestUpdate();
    }, 1000);
  }

  hostDisconnected() {
    clearInterval(this.#timerID);
  }
}

// Usage
class MyElement extends ReactiveElement {
  #clock = new ClockController(this);
}
```

---

## Context API (@lit/context)

Context enables data sharing without prop drilling:

```ts
import { createContext, ContextProvider, ContextConsumer } from '@lit/context';

// Define context
const userContext = createContext<User>('user-context');

// Provider
class MyApp extends ReactiveElement {
  #provider = new ContextProvider(this, {
    context: userContext,
    initialValue: { name: 'Guest' }
  });

  setUser(user: User) {
    this.#provider.setValue(user);
  }
}

// Consumer
class UserDisplay extends ReactiveElement {
  #consumer = new ContextConsumer(this, {
    context: userContext,
    subscribe: true,
    callback: (value) => this.requestUpdate()
  });

  get user() {
    return this.#consumer.value;
  }
}
```

---

## TypeScript Configuration

Required setting to prevent class fields from shadowing reactive accessors:

```json
{
  "compilerOptions": {
    "useDefineForClassFields": false
  }
}
```

---

## Best Practices

### Do

- **Always call `super` in lifecycle methods** — Maintains Lit functionality
- **Use `willUpdate()` for derived state** — Computed before render
- **Clean up in `disconnectedCallback()`** — Prevents memory leaks
- **Use immutable data patterns** — `this.arr = [...this.arr, item]` not `push()`
- **Wait for `updateComplete`** before asserting DOM state in tests
- **Use `state: true`** for internal reactive state not exposed as attributes
- **Override `createRenderRoot()`** when shadow DOM isn't appropriate

### Don't

- **Don't mutate arrays/objects** without reassigning — Won't trigger updates
- **Don't access DOM in constructor** — Shadow root doesn't exist yet
- **Don't use external stylesheets via `<link>`** — FOUC issues, ShadyCSS incompatibility
- **Don't reflect Object/Array properties** — Serialization overhead
- **Don't forget `super` calls** in lifecycle methods
- **Don't perform side effects in `shouldUpdate`** — Use `willUpdate` instead

### Common Mistakes

1. **Forgetting super calls**: `connectedCallback() { super.connectedCallback(); ... }`
2. **Boolean defaults**: Must default to `false` for attribute configuration to work
3. **Memory leaks**: Add listeners in `connectedCallback`, remove in `disconnectedCallback`
4. **DOM access too early**: Wait for `firstUpdated()` or `updateComplete`
5. **Mutating instead of replacing**: `this.items = [...this.items, item]` not `push()`
