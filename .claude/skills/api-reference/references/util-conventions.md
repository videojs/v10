# Util Reference Conventions

Conventions for the util reference system that documents React hooks/utilities and HTML controllers/mixins.

## Architecture

Util references use **convention-based auto-discovery** from package index files. The builder scans entry points, resolves local module paths, and includes exports matching naming conventions or annotated with `@public`.

## Auto-Discovery Pipeline

The builder (`site/scripts/api-docs-builder/src/util-handler.ts`) scans entry points:

```ts
packages/react/src/index.ts              → framework: 'react'
packages/store/src/react/hooks/index.ts  → framework: 'react'
packages/html/src/index.ts               → framework: 'html'
packages/store/src/html/controllers/index.ts → framework: 'html'
packages/core/src/dom/store/selectors.ts → framework: null (agnostic)
packages/store/src/core/selector.ts      → framework: null (agnostic)
```

Framework-agnostic entries (`framework: null`) produce JSON without a `frameworks` field, meaning they apply to all frameworks. Framework-specific entries get `frameworks: ['react']` or `frameworks: ['html']` in the JSON.

**Phase 1 — Resolve local modules.** Raw TS AST reads export declarations from each index file, keeping only local paths (`./...`), skipping external packages (`@videojs/...`).

**Phase 2 — Filter by convention.** Each local module is parsed with TAE (typescript-api-extractor) or raw TS AST. Exports are included if they match naming conventions or have `@public`.

### Adding a New Util

1. Export it from the appropriate package index file
2. Add JSDoc with a description
3. If it doesn't match a naming convention (see below), add `@public` to the JSDoc
4. Run `pnpm api-docs` to generate its JSON
4. Create an MDX page with `<UtilReference util="{Name}" />`
5. Add to the sidebar in `docs.config.ts`

No code changes needed in the builder itself — convention over configuration.

## JSDoc Conventions

The builder extracts JSDoc from source exports to populate reference pages. These rules override the root CLAUDE.md "Minimal JSDoc" guidelines for API reference exports.

### Summary description (required)

Every util export needs a JSDoc summary. This becomes the description in the generated JSON:

```ts
/** Subscribe to the player's volume state. */
export function useVolume(...): VolumeResult;
```

### `@param` descriptions (required for non-obvious params)

Unlike internal code, API reference exports need `@param` tags so the builder can populate parameter tables. Describe intent and defaults, not types:

```ts
/**
 * Subscribe to derived state with customizable equality check.
 *
 * @param subscribe - Subscribe function that returns an unsubscribe callback.
 * @param selector - Derives a value from the snapshot.
 * @param isEqual - Custom equality function. Defaults to `shallowEqual`.
 */
export function useSelector<S, R>(...): R;
```

Format: `@param name - description` (dash after name).

### No `@returns`

Return types are inferred from the TypeScript signature. Don't add `@returns`.

### `@label` for multi-overload functions

When a function has multiple overload signatures with different return types, each overload gets its own JSDoc block with an `@label` tag. The label becomes a heading in the docs:

```ts
/**
 * Create a player instance with typed store, Provider, and hooks.
 *
 * @label Video
 * @param config - Player configuration with features.
 */
export function createPlayer(config: CreatePlayerConfig<VideoFeatures>): CreatePlayerResult<VideoPlayerStore>;

/**
 * Create a player for audio media.
 *
 * @label Audio
 * @param config - Player configuration with features.
 */
export function createPlayer(config: CreatePlayerConfig<AudioFeatures>): CreatePlayerResult<AudioPlayerStore>;
```

Without `@label`, overloads render as "Overload 1", "Overload 2", etc.

### `@label` for constructor overloads

Same pattern applies to controller constructors:

```ts
/**
 * @label Without Selector
 * @param host - The host element that owns this controller.
 * @param state - The State container to subscribe to.
 */
constructor(host: ReactiveControllerHost, state: State<T>);

/**
 * @label With Selector
 * @param host - The host element that owns this controller.
 * @param state - The State container to subscribe to.
 * @param selector - Derives a value from the state.
 */
constructor(host: ReactiveControllerHost, state: State<T>, selector: Selector<T, R>);
```

### `@public` for non-convention exports

Exports that don't match a naming convention (`use*`, `*Controller`, `create*`, `select*`) need `@public` to be discovered:

```ts
/** @public The default player context for consuming the player store. */
export const playerContext = createContext<PlayerContextValue>(...);
```

## Inclusion Conventions

Exports are auto-included when they match these patterns:

| Pattern | Match Rule | Examples |
|---------|-----------|----------|
| Hooks | Name starts with `use`, is a function | `usePlayer`, `useStore` |
| Controllers | Name ends with `Controller` | `PlayerController`, `StoreController` |
| Factories | Name starts with `create`, is a function | `createPlayer` |
| Mixin factories | Name starts with `create` + contains `Mixin` | `createProviderMixin` |
| `@public` | Has `@public` JSDoc tag | `playerContext`, `mergeProps`, `renderElement` |

Exports that don't match any convention are excluded (UI components, types, internal helpers).

## Slug Conventions

- Slugs are kebab-case: `use-player`, `player-controller`, `merge-props`
- All slugs must be unique across both frameworks
- When the same name exists in both React and HTML (e.g., `createPlayer`), prefix the HTML slug: `html-create-player`

## Frameworks

| Framework | Sidebar Section | Source Packages |
|-----------|----------------|-----------------|
| `react` | Hooks & Utilities | `@videojs/react`, `@videojs/store/react` |
| `html` | Controllers & Mixins | `@videojs/html`, `@videojs/store/html` |
| `null` (agnostic) | Selectors | `@videojs/core/dom`, `@videojs/store` |

Agnostic utils omit the `frameworks` field in JSON, meaning they're available to all frameworks.

## Overloads

Use multiple overloads when the return type genuinely differs between signatures:

```ts
// Two overloads — different return types
usePlayer()          → PlayerStore
usePlayer(selector)  → T (selected value)
```

For simple param-count differences with the same return type, use a single overload with optional params instead.

## Generated JSON

Output: `site/src/content/generated-util-reference/{slug}.json`

Schema: `UtilReferenceSchema` from `site/src/types/util-reference.ts`

```json
{
  "name": "usePlayer",
  "description": "...",
  "overloads": [
    {
      "description": "...",
      "parameters": { "selector": { "type": "...", "required": true } },
      "returnValue": { "type": "...", "description": "..." }
    }
  ]
}
```

## Content Collection

The `utilReference` collection in `site/src/content.config.ts` loads from `generated-util-reference/` and validates against `UtilReferenceSchema`.

## Astro Components

| Component | Purpose |
|-----------|---------|
| `UtilReference.astro` | Main component — loads JSON, renders sections |
| `UtilParamsTable.astro` | Parameter table (reuses `PropRow.astro`) |
| `UtilReturnTable.astro` | Return value table (reuses `StateRow.astro` for object returns) |

## Common Failures

| Symptom | Cause |
|---------|-------|
| No JSON generated | Export not in a scanned index file, or doesn't match convention / lack `@public` |
| Zod validation error | Schema mismatch — check field names and types |
| Missing from sidebar | Not added to `docs.config.ts` in correct section |
| Page 404 | MDX file missing or slug mismatch |
| Wrong framework section | Export in wrong entry point — check which index file re-exports it |
| TAE crash on index file | Known issue with `UniqueESSymbol` types — raw TS AST fallback handles this |

## Discovery vs MDX Pages

Auto-discovery generates JSON files in `site/src/content/generated-util-reference/`. A JSON file without a corresponding MDX page is harmless — it sits unused.

Only utils with **both** generated JSON **and** a manually-created MDX page appear in the docs. This is intentional: discovery casts a wide net using naming conventions, while MDX pages are curated to document the public API surface.

For example, `SubscriptionController` is discovered (matches `*Controller`) but has no MDX page because it's an internal building block not intended for direct consumer use.

When adding a new util to the docs:
1. Ensure the builder discovers it (check with `pnpm api-docs`)
2. Create the MDX page at `site/src/content/docs/reference/{slug}.mdx`
3. Add to the sidebar in `docs.config.ts`

## Tests

- `site/scripts/api-docs-builder/src/tests/util-handler.test.ts` — fixture-based tests for discovery, slug uniqueness, frameworks, overloads
- `site/src/utils/tests/utilReferenceModel.test.ts` — validates model structure and TOC headings
