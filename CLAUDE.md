# CLAUDE.md

Guidance for **Claude Code** (claude.ai/code) and other AI agents working with this repository.

## Overview

**Video.js 10** is a **Turborepo‑managed monorepo**, organized by runtime and platform.
Refer to **[`CONTRIBUTING.md`](./CONTRIBUTING.md)** for setup, development, and lint/test instructions.

## Package Layout

| Package Path            | Purpose                                                             |
| ----------------------- | ------------------------------------------------------------------- |
| `packages/utils`        | Shared utilities (`/dom` subpath for DOM‑specific helpers).         |
| `packages/core`         | Core runtime‑agnostic logic (`/dom` subpath for DOM bindings).      |
| `packages/store`        | State management (`/dom`, `/lit`, `/react` subpaths for platforms). |
| `packages/html`         | Web player—DOM/Browser‑specific implementation.                     |
| `packages/react`        | React player—adapts core state to React components.                 |
| `packages/react-native` | React Native player integration layer.                              |
| `site/`                 | Astro‑based docs and website.                                       |

IGNORE `packages/__tech-preview__/` — it's legacy code from the Demuxed demo. Don't reference or
modify it when working in other packages.

### Dependency Hierarchy

```text
utils/*         ← shared utilities
utils/dom       ← DOM-specific helpers

store           ← state management
store/dom       ← DOM platform APIs
store/lit       ← Lit bindings (controllers, mixins)
store/react     ← React bindings

core            ← runtime-agnostic logic
core/dom        ← DOM bindings

html            ← Web player (DOM/Browser)
react           ← React player
react-native    ← React Native player
```

```text
utils ← store ← core ← html / react / react-native
```

## Workspace

- Uses **PNPM workspaces** + **Turbo** for task orchestration.
- Internal deps are linked with `workspace:*`.
- Always use PNPM, do not use other package managers.

### Common Root Commands

```bash
# Install workspace deps
pnpm install

# Run all demos/sites in parallel
pnpm dev

# Typecheck across repo (fast - uses TypeScript project references)
# Always run from root, not per-package
pnpm typecheck

# Build all packages/apps
pnpm build
# Build all packages (no apps)
pnpm build:packages
# Build specific package
pnpm -F <pkg> build

# Run tests across all packages
pnpm test
# Run tests for specific package
pnpm -F <pkg> test
# Run tests matching a name or pattern
pnpm -F <pkg> test -t "test name pattern"
# Run tests for a specific file
pnpm -F <pkg> test src/path/to/file.test.ts
# Run tests matching a glob or filter
pnpm -F <pkg> test src/core

# Lint all workspace packages
pnpm lint
# Lint and fix a single file
pnpm lint:fix:file <file>

# Remove all dist and types outputs
pnpm clean
```

## Dev Workflow

1. Make changes.
2. If you added/changed **exported types** in a package, run `pnpm -F <pkg> build` first.
   - `pnpm typecheck` uses TypeScript project references against **built** `.d.ts` files.
   - New/changed types won't be visible until `tsdown` builds them.
3. Typecheck, fix all issues.
4. Run test/s, fix all issues. If there are no tests add them.
5. Lint file/s, fix all issues.
6. Run build/s, fix all errors.
7. Before creating a PR `pnpm test`.
8. If your changes introduced new patterns or conventions, ask the user to run `/claude-update`.

Be efficient when running operations, see "Common Root Commands".

## Testing

### File Organization

Tests live in a `tests/` directory next to the implementation they cover:

```text
packages/utils/src/dom/
├── listen.ts
├── event.ts
└── tests/
    ├── listen.test.ts
    └── event.test.ts
```

### Conventions

- Use Vitest as the test runner.
- Import test utilities from `vitest`: `describe`, `it`, `expect`, `vi`.
- Name test files `<module>.test.ts` matching the source file.
- Write or update matching tests for each new or modified behavior.
- Follow the `act → assert` pattern.
- Use `vi.fn()` for mocks and spies.

### Test describe() Names

Use the exact exported name being tested (preserving case):

```ts
// snapshot-controller.test.ts — class export
describe('SnapshotController', () => { ... });

// provider-mixin.test.ts — factory function export
describe('createStoreProviderMixin', () => { ... });

// disposer.test.ts — lowercase module/export
describe('disposer', () => { ... });
```

## Guidelines

When generating or editing code in this repository, follow these rules to ensure safe, high‑quality contributions:

1. **Edit Precisely**
   - Modify only the relevant lines or files.
   - Never overwrite large sections or regenerate entire files.
   - Preserve comments, type signatures, and existing code style.

2. **Match Existing Conventions**
   - Follow the repo's Biome and TypeScript settings automatically.
   - Use consistent naming (camelCase for variables, PascalCase for components).
   - Biome handles import organization (side-effects → external → internal).

3. **Type Safety First**
   - Never remove or bypass TypeScript types.
   - Avoid `any`; use `unknown` and proper narrowing if needed.
   - Always ensure edits pass `pnpm typecheck`.

4. **Framework‑Agnostic Mindset**
   - Core modules must remain DOM‑ and framework‑independent.
   - Place platform‑specific logic in the appropriate directory or adapter (HTML, React, RN).

5. **A11y, Styling & Performance**
   - Maintain accessibility: ARIA roles, keyboard interactions, focus management.
   - Use data‑attributes and CSS variables for style hooks—no inline animation JS.
   - Ensure logic runs at 60 FPS; prefer CSS transitions over manual DOM mutations.

6. **Commit Scope**
   - Use semantic commit messages (enforced by `commitlint`).
   - One focused change per commit—no mixed updates.
   - Breaking changes use `!`.

7. **Keep AI Documentation Current** — When introducing new patterns, ask the user to run `/claude-update` for guidance.

## Code Rules

### File Organization

- **Types live next to implementations** — Don't create separate `types.ts` files. Export types from the same file as their implementation.
- **Tests in `tests/` directories** — See Testing section above.

### Utilities

Prefer existing utilities over inline implementations:

| Instead of                | Use                                              |
| ------------------------- | ------------------------------------------------ |
| `x === undefined`         | `isUndefined(x)` from `@videojs/utils/predicate` |
| `x === null`              | `isNull(x)` from `@videojs/utils/predicate`      |
| `typeof x === 'function'` | `isFunction(x)` from `@videojs/utils/predicate`  |
| `typeof x === 'string'`   | `isString(x)` from `@videojs/utils/predicate`    |

Before writing new helpers, check `@videojs/utils` for existing utilities.

### Naming Conventions

| Pattern             | Prefix         | Example                                |
| ------------------- | -------------- | -------------------------------------- |
| Type inference      | `Infer*`       | `InferFeatureState<F>`                 |
| Type resolution     | `Resolve*`     | `ResolveRequestHandler<R>`             |
| Type constraint     | `Ensure*`      | `EnsureTaskRecord<T>`                  |
| Union type helpers  | `Union*`       | `UnionFeatureState<Features>`          |
| Default loose types | `Default*`     | `DefaultTaskRecord`                    |
| Type guards         | `is*`          | `isStoreError(error)`                  |
| Factory functions   | `create*`      | `createQueue()`, `createFeature()`     |
| Falsy wrapper       | `Falsy*`       | `Falsy<T>` (value that might be falsy) |
| Constructor types   | `*Constructor` | `Constructor<T>`, `AnyConstructor<T>`  |
| Mixin types         | `Mixin`        | `Mixin<Base, Result>`                  |

**Note on `create*` prefix:** Use `create*` for factory functions that construct stateful objects or classes (e.g., `createQueue()`, `createStore()`). Simple utility functions that return cleanup callbacks don't use this prefix (e.g., `listen()`, `animationFrame()`, `idleCallback()`).

### Component/Hook Namespace Pattern

Use namespaces to co-locate Props and Result types with components/hooks:

```tsx
// Component with Props namespace
export function Video({ src, ...props }: VideoProps): JSX.Element {
  // ...
}

export namespace Video {
  export type Props = VideoProps;
}

// Hook with Result namespace
export function useMutation(name: string): MutationResult {
  // ...
}

export namespace useMutation {
  export type Result = MutationResult;
}
```

Usage:

```tsx
// Props type via namespace
const props: Video.Props = { src: 'video.mp4' };

// Result type via namespace
const mutation: useMutation.Result = useMutation('play');
```

### Type Guards

Always return `value is Type` for proper type narrowing:

```ts
function isStoreError(value: unknown): value is StoreError {
  return value instanceof StoreError;
}
```

### Symbol Identification Pattern

Use symbols to identify objects when `instanceof` isn't reliable (e.g., cross-realm, serialization boundaries):

```ts
const STORE_SYMBOL = Symbol('@videojs/store');

interface Store {
  [STORE_SYMBOL]: true;
  // ...
}

function createStore(): Store {
  return {
    [STORE_SYMBOL]: true,
    // ...
  };
}

function isStore(value: unknown): value is Store {
  return isObject(value) && STORE_SYMBOL in value;
}
```

- Symbol constant named `*_SYMBOL` in SCREAMING_CASE
- Symbol description is `@videojs/*`
- Add `[SYMBOL]: true` property to the object/interface
- Type guard checks `isObject(value) && SYMBOL in value`

**`Symbol()` vs `Symbol.for()`:**

- Use `Symbol.for('@videojs/*')` for symbols that need cross-realm identity (e.g., metadata that must be recognized across module boundaries)
- Use `Symbol('@videojs/*')` for instance-unique identifiers (e.g., task IDs, feature IDs)

### Subscribe Pattern

Subscriptions return an unsubscribe function:

```ts
subscribe(callback: Callback): () => void {
  this.#subscribers.add(callback);
  return () => this.#subscribers.delete(callback);
}
```

### Optional Key Parameter

Methods that operate on one or all items use optional key:

```ts
// If key provided: operate on that item
// If no key: operate on all items
reset(key?: keyof Tasks): void {
  if (!isUndefined(key)) {
    // Single item
    return;
  }
  // All items
}
```

### Destroy Pattern

Guard re-entry, set flag first, cleanup in order:

```ts
destroy(): void {
  if (this.#destroyed) return;
  this.#destroyed = true;
  this.abort();
  this.#subscribers.clear();
}
```

### Cleanup Pattern

Use `Disposer` from `@videojs/utils/events` when managing multiple cleanup functions:

```ts
import { Disposer } from '@videojs/utils/events';

#disposer = new Disposer();

connect(): void {
  this.#disposer.add(store.subscribe(...));
  this.#disposer.add(listen(element, 'click', handler));
}

disconnect(): void {
  this.#disposer.dispose();
}
```

For single cleanup, use a simple unsubscribe function.

### Promise Cleanup

Use `.finally()` for cleanup that runs regardless of success or failure:

```ts
// Good - when awaiting or returning the promise
await promise.finally(() => cache.delete(key));

// Good - fire-and-forget cleanup that shouldn't propagate rejection
promise.then(
  () => cache.delete(key),
  () => cache.delete(key)
);
```

**Note:** `.finally()` propagates rejections to its returned promise. If you're not awaiting or returning it, use `.then()` with both handlers to avoid unhandled rejections.

### No Hungarian Type Notation

Never prefix type parameters with `T`. Use descriptive names instead:

```ts
// Bad
type Mixin<TBase extends Constructor> = ...
function createStore<TFeatures extends AnyFeature[]>(...) { ... }

// Good
type Mixin<Base extends Constructor> = ...
function createStore<Features extends AnyFeature[]>(...) { ... }
```

### React: Lazy Initialization

Use `useState` with initializer function for objects that should only be created once. Don't use `useRef` with inline object creation — the object is created on every render even though only the first value is kept:

```ts
// Bad - creates new Set on every render
const trackedRef = useRef(new Set<string>());

// Good - initializer only runs once
const [tracked] = useState(() => new Set<string>());
```

### No Obvious Comments

Don't write comments that restate what the code does. Comments should explain _why_, not _what_:

```ts
// Bad
// Create the store
const store = createStore(config);

// Loop through items
for (const item of items) { ... }

// Good
// Create store before rendering to allow pre-hydration
const store = createStore(config);
```

### No Pointless Type Casts

Avoid casts that don't add value. If TypeScript can infer the type, don't cast:

```ts
// Bad - already typed
const value = someFunction() as SomeType;

// Bad - use generic type argument
const media = node.querySelector('video, audio') as HTMLMediaElement | null;
```

### Minimal JSDoc

JSDoc should add value, not restate what TypeScript already shows:

**No redundant @param/@returns** — TypeScript signatures are the documentation:

```ts
// Bad
/**
 * @param callback - The callback to invoke
 * @returns A cleanup function
 */
export function animationFrame(callback: FrameRequestCallback): () => void;

// Good
/** Request an animation frame with cleanup. */
export function animationFrame(callback: FrameRequestCallback): () => void;
```

**Single JSDoc for overloads** — Document the first overload only:

```ts
/** Wait for an event to occur on a target. */
export function onEvent<K extends keyof HTMLMediaElementEventMap>(...): Promise<...>;
export function onEvent<K extends keyof HTMLElementEventMap>(...): Promise<...>;
```

**One example per function** — Consolidate into a single representative example.

**No JSDoc for self-documenting code** — Skip JSDoc when names are clear:

```ts
// No JSDoc needed
export function supportsIdleCallback(): boolean { ... }
get size(): number { ... }
add(cleanup: CleanupFn): void { ... }

// Bad - comment restates the obvious
/** Media element contract. */
export interface Media extends HTMLMediaElement {}

/** Feature capability availability. */
export type FeatureAvailability = 'available' | 'unavailable' | 'unsupported';

// Good - no comment needed
export interface Media extends HTMLMediaElement {}
export type FeatureAvailability = 'available' | 'unavailable' | 'unsupported';
```

## Design Documents

| Location           | Purpose                                                    |
| ------------------ | ---------------------------------------------------------- |
| `internal/design/` | Decisions you own — document for posterity                 |
| `rfc/`             | Proposals needing buy-in — get alignment before committing |
| `.claude/plans/`   | Implementation notes, AI-agent context, working drafts     |

### Design Doc vs RFC

|                | Design Doc             | RFC                              |
| -------------- | ---------------------- | -------------------------------- |
| **Scope**      | Your area of work      | Shared concerns or public API    |
| **Approval**   | None needed            | Needs buy-in from others         |
| **Purpose**    | Document for posterity | Get alignment first              |

**Design Docs** — Decisions you own. Write one when making significant decisions in your area, choosing between approaches, or documenting architecture others will build on. See `internal/design/README.md`.

**RFCs** — Cross-team alignment. Write one when the decision affects multiple areas, changes shared API surface, or is hard to reverse. See `rfc/README.md`.

**Implementation plans** — Step-by-step details for **how** to implement. Use `.claude/plans/` for implementation notes, debugging discoveries, and AI-agent context. Compact before merging.

## Rule Placement

CLAUDE.md contains repo-wide conventions. Domain-specific patterns live in skills:

| Domain                      | Location             |
| --------------------------- | -------------------- |
| Naming, testing, utilities  | CLAUDE.md Code Rules |
| Component patterns and APIs | `component` skill    |
| Accessibility               | `aria` skill         |
| Documentation               | `docs` skill         |
| API design and DX           | `api` skill          |
| Updating AI docs            | `claude-update` skill |

When adding a new rule, ask: "Who needs this?" If it's domain-specific, put it in the relevant skill.
