# Component Patterns

Patterns for Video.js web components. For ReactiveElement fundamentals (lifecycle, properties, controllers), see [videojs-element.md](videojs-element.md).

## Package Requirements

```ts
import { ReactiveElement } from '@videojs/element';
import { ContextConsumer, ContextProvider } from '@videojs/element/context';
```

- Use `@videojs/element` for the base class and types
- Use `@videojs/element/context` for context (re-exports `@lit/context`)
- **Never** import from `lit` or `@lit/reactive-element`

## Platform Bindings

- Store HTML bindings: `@videojs/store/html`
- Main web component library: `@videojs/html`

---

## Component Types

### Skins (Container Elements)

- Extend `ReactiveElement`
- May use shadow DOM for style encapsulation
- Provide store to descendants via context
- Register with `customElements.define()`

### Primitives (Control Elements)

- Extend `ReactiveElement`
- **No shadow DOM** — style via light DOM
- **No slots**
- **No render()** — manipulate host element directly
- Controllers provide all behavior

---

## Controllers

Controllers are the primary composability mechanism. Use controllers, not hooks or behavior mixins.

All store-related controllers live in `@videojs/store/html`. See that package for available controllers and their APIs.

### Controller Pattern

```ts
class MyElement extends ReactiveElement {
  #store = new StoreController(this, context);
}
```

### Architecture

- Accept `StoreSource<Store>` — either direct store OR context
- `StoreAccessor` resolves source internally
- Register via `host.addController(this)`
- Lifecycle: `hostConnected()`, `hostDisconnected()`

---

## StoreAccessor

Internal utility that resolves a store from either a direct instance or context. This enables controllers to accept a `StoreSource<Store>` parameter — users can pass either:

1. **Direct store** — For testing or when store is already available
2. **Context** — For production use where store is provided by an ancestor

```ts
// Direct store — value available immediately
const store = new StoreController(this, store);

// Context — value available after context resolves
const store = new StoreController(this, context);
```

Controllers handle both cases transparently. The `StoreAccessor`:

- Returns store immediately if passed directly
- Waits for context resolution if passed a context
- Fires `onAvailable` callback when store becomes available (for subscription setup)

---

## Host Type Pattern

Always export an explicit host type for controllers and mixins:

```ts
export type StoreControllerHost = ReactiveControllerHost & HTMLElement;
export type ProviderMixinHost = ReactiveElement & EventTarget;
```

- Never use bare `ReactiveControllerHost`
- Allows future extension without breaking consumers
- Self-documents required host capabilities

---

## Mixins

Mixins are for **store provision only**, not behavior. Behavior goes in controllers.

### Store Mixins

`createStore()` returns mixins for different use cases:

```ts
const { StoreMixin, ProviderMixin, ContainerMixin } = createStore({
  features: [playbackFeature],
});

// StoreMixin: provides store AND auto-attaches slotted media
class MyPlayer extends StoreMixin(ReactiveElement) {
  // Store provided to all descendants, media auto-attached
}

// ProviderMixin: provides store only (no auto-attach)
class MyProvider extends ProviderMixin(ReactiveElement) {
  // Store provided to all descendants
}

// ContainerMixin: consumes store from context, auto-attaches media
class MyControls extends ContainerMixin(ReactiveElement) {
  // Inherits store from parent provider
}
```

- Creates store on first access (lazy)
- Provides via Context Protocol (`@lit/context`)
- Destroys store on disconnect (if owned)

---

## Context Protocol

- `ContextProvider` — skin/root provides store to descendants
- `ContextConsumer` — controllers consume store via context
- Context passed as `StoreSource` to controller constructors

```ts
// Provider (in skin)
#provider = new ContextProvider(this, { context, initialValue: this.store });

// Consumer (in controller)
#consumer = new ContextConsumer(host, { context, subscribe: false });
```

---

## Element Registration

Use the standard custom elements registry:

```ts
customElements.define('vjs-play-button', PlayButtonElement);
```

For elements that need a store mixin:

```ts
customElements.define('vjs-player', StoreMixin(PlayerElement));
```

---

## See Also

- `@videojs/store/html` — Controller and mixin implementations
- `@videojs/html` — Web component library
- [react.md](react.md) — React-specific patterns (parallel reference)
