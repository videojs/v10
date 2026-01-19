# Framework Adapter Patterns

Patterns for framework-agnostic cores with thin bindings.

## Core Principles

1. **Pure logic in core** — no DOM, no framework dependencies
2. **Thin adapters** — under 50 lines, no duplicated logic
3. **Same mental model** — consistent API across frameworks
4. **Types defined once** — in core, inherited by adapters

---

## Architecture Patterns

### Pattern 1: Vanilla Core with Framework Hooks

**Used by:** Zustand, Nanostores, TanStack Store

```
@lib/store/
├── core/           ← Runtime-agnostic logic
│   ├── store.ts
│   └── types.ts
├── react/          ← React hooks
├── vue/            ← Vue composables
├── solid/          ← Solid primitives
└── svelte/         ← Svelte stores
```

**Core exposes minimal subscription interface:**

```ts
interface Store<T> {
  get(): T;
  set(value: T | ((prev: T) => T)): void;
  subscribe(listener: (value: T) => void): () => void;
}
```

**Framework adapter responsibilities:**

- Subscribe to core store on mount
- Trigger framework re-render on state change
- Clean up subscription on unmount
- Support selectors for partial subscription (perf optimization)

**Pseudocode pattern:**

```ts
function useStore<T>(store: Store<T>, selector?: (s: T) => unknown) {
  // 1. Subscribe to store
  // 2. On change: if selector, compare selected value; trigger re-render if changed
  // 3. Return current (selected) value
  // 4. Cleanup: unsubscribe on unmount
}
```

> **Reference:** [Zustand React adapter](https://github.com/pmndrs/zustand/blob/main/src/react.ts)

---

### Pattern 2: State Machine Core

**Used by:** Zag.js, XState

**Why machines work cross-framework:**

- Logic encoded as pure state + transitions (no framework code)
- Machine defines states, events, actions, guards
- `connect()` function translates machine state → UI props
- Normalizer handles framework event naming (`onClick` vs `on:click`)

**Key insight:** The machine knows nothing about React/Vue/Solid. Framework bindings only:

1. Run the machine interpreter
2. Call `connect(state, send)` to get props
3. Spread props onto elements

**Normalizer concept:**

| Framework | Click      | Class       |
| --------- | ---------- | ----------- |
| React     | `onClick`  | `className` |
| Vue       | `on:click` | `class`     |
| Solid     | `onClick`  | `class`     |
| Svelte    | `on:click` | `class`     |

> **Reference:** [Zag.js architecture](https://zagjs.com/overview/architecture)

---

### Pattern 3: Separated State + Behavior

**Used by:** React Aria + React Stately

**Architecture:**

| Layer          | Scope             | Example                               |
| -------------- | ----------------- | ------------------------------------- |
| State hooks    | Platform-agnostic | `useToggleState()` — manages boolean  |
| Behavior hooks | DOM-specific      | `useCheckbox()` — adds ARIA, keyboard |
| Component      | Composes both     | `<Checkbox />`                        |

**Why this separation:**

- State hooks portable to React Native (no DOM)
- Behavior hooks encapsulate web accessibility patterns
- Clear testing boundary — test state logic without DOM
- Behavior hooks reusable across components (toggle → checkbox, switch, button)

**Key insight:** State knows _what_ to do. Behavior knows _how_ to expose it to the DOM.

> **Reference:** [React Spectrum architecture](https://react-spectrum.adobe.com/architecture.html)

---

## Prop Normalization

Handle framework-specific attribute naming:

```ts
// Core returns canonical props
{ onClick: handler, className: 'foo' }

// Normalizer transforms per framework
normalize.vue(props)   // → { 'on:click': handler, class: 'foo' }
normalize.solid(props) // → { onClick: handler, class: 'foo' }
```

**Implementation approach:**

- Core always uses React-style names (most common)
- Each framework adapter includes a normalizer
- Normalizer is ~10 lines per framework

---

## SSR / Hydration Safety

**Rules:**

1. No `window`, `document`, `navigator` at module scope
2. Lazy DOM access inside functions
3. Provide server snapshot for initial render
4. Support `forceMount` for SSR-first render

**Pattern:**

```ts
// ❌ Breaks SSR
const width = window.innerWidth;

// ✅ Lazy access
function getWidth() {
  return typeof window === 'undefined' ? 0 : window.innerWidth;
}
```

**Hydration-safe subscription:**

- Server snapshot must match client initial state
- Use framework's SSR-aware subscription primitive
- Avoid layout effects that read DOM on first render

---

## Testing Adapters

**What to test:**

- Adapter subscribes on mount
- Adapter unsubscribes on unmount
- State changes trigger re-render
- Selectors prevent unnecessary re-renders
- SSR: No errors during server render

**Testing approach:** Create real store, render component, verify reactivity.

---

## See Also

- [Multi-Framework Documentation](../../docs/references/multi-framework.md) — documenting cross-framework libraries
- [Extensibility Patterns](extensibility.md) — plugin and middleware design
