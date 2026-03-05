# API Docs Builder Spec

Ground-truth specification for the API docs builder pipeline: from TypeScript source code to
rendered documentation tables. When implementation diverges from this spec, this spec wins.

Inspired by [Base UI](https://github.com/mui/base-ui)'s API reference system. Base UI generates one JSON
file per component part, and each part gets its own props and data-attributes tables. Our system
aspires to the same philosophy but has a known architectural limitation: a single Props/State
interface per component at the core level means only one part (the "primary") can own core-level props
and state. Non-primary parts get shared data attributes, custom React-specific props, and a description.

**Principles:**

- **Convention over configuration.** The builder infers structure from file naming and placement.
  No config files, no explicit annotations for standard cases. Follow the conventions and things
  just work.
- **Spec wins.** When implementation diverges from this spec, the spec is the source of truth.

**Scope:** This spec covers the builder (extraction + JSON generation), the reference model
layer (JSON → heading/section structure), TOC integration, and rendered output (tables + disclosure
panels). It does not cover CSS styling, demo scaffolding, or MDX page authoring.

---

## 1. Sample Inputs

These fictional examples are the source-of-truth for expected behavior throughout this spec.

### 1a. Single-part component: `ToggleButton`

**Core file** — `packages/core/src/core/ui/toggle-button/toggle-button-core.ts`:

```ts
interface ToggleButtonProps {
  /** Whether the button is disabled. */
  disabled: boolean;
  /** Custom label for the button. */
  label: string | ((state: ToggleButtonState) => string);
}

interface ToggleButtonState {
  /** Whether the toggle is pressed. */
  pressed: boolean;
  /** Whether the button is disabled. */
  disabled: boolean;
}

class ToggleButtonCore {
  static readonly defaultProps = {
    disabled: false,
    label: '',
  } as const;
}
```

**Data attributes file** — `packages/core/src/core/ui/toggle-button/toggle-button-data-attrs.ts`:

```ts
import type { StateAttrMap } from '../types';

export const ToggleButtonDataAttrs = {
  /** Present when the toggle is pressed. */
  pressed: 'data-pressed',
  /** Present when the button is disabled. */
  disabled: 'data-disabled',
} as const satisfies StateAttrMap<ToggleButtonState>;
```

**HTML element file** — `packages/html/src/ui/toggle-button/toggle-button-element.ts`:

```ts
export class ToggleButtonElement extends ... {
  static readonly tagName = 'media-toggle-button';
}
```

### 1b. Multi-part component: `Meter`

**Core file** — `packages/core/src/core/ui/meter/meter-core.ts`:

```ts
interface MeterProps {
  /** Minimum value. */
  min: number;
  /** Maximum value. */
  max: number;
  /** Custom label for accessibility. */
  label: string | ((state: MeterState) => string);
}

interface MeterState {
  /** Current value as a percentage (0–1). */
  percentage: number;
  /** The fill level. */
  fillState: 'empty' | 'partial' | 'full';
}

class MeterCore {
  static readonly defaultProps = {
    min: 0,
    max: 100,
    label: '',
  } as const;
}
```

**Data attributes file** — `packages/core/src/core/ui/meter/meter-data-attrs.ts`:

```ts
import type { StateAttrMap } from '../types';

export const MeterDataAttrs = {
  /** Current percentage as a string. */
  percentage: 'data-percentage',
  /** The fill level. */
  fillState: 'data-fill-state',
} as const satisfies StateAttrMap<MeterState>;
```

**HTML element files:**

- `packages/html/src/ui/meter/meter-element.ts` → `static tagName = 'media-meter'`
- `packages/html/src/ui/meter/meter-track-element.ts` → `static tagName = 'media-meter-track'`
- `packages/html/src/ui/meter/meter-fill-element.ts` → `static tagName = 'media-meter-fill'`

**React parts index** — `packages/react/src/ui/meter/index.parts.ts`:

```ts
export { default as Track } from './Track';
export { default as Fill } from './Fill';
export { default as Indicator } from './Indicator';
```

**React component JSDoc:**

```tsx
// Track.tsx
/** The track area of the meter. Renders a `<div>` element. */
export default function Track(...) { ... }

// Fill.tsx
/** The filled portion of the meter. Renders a `<div>` element. */
export default function Fill(...) { ... }

// Indicator.tsx — no matching HTML element file
/** A visual indicator for the current value. Renders a `<span>` element. */
export default function Indicator(...) { ... }
```

### 1c. Single-overload util: `useVolume`

```ts
/**
 * Subscribe to the player's volume state.
 */
export function useVolume(options?: { muted?: boolean }): {
  /** Current volume level (0–1). */
  volume: number;
  /** Whether audio is muted. */
  muted: boolean;
  /** Set the volume level. */
  setVolume: (level: number) => void;
};
```

Exported from `packages/react/src/index.ts` → framework: `react`.

### 1d. Multi-overload util: `createPlayer`

```ts
/**
 * Create a player instance with typed store, Provider component, Container, and hooks.
 */

/** @label Video */
export function createPlayer(config: CreatePlayerConfig<VideoFeatures>): CreatePlayerResult<VideoPlayerStore>;
/** @label Audio */
export function createPlayer(config: CreatePlayerConfig<AudioFeatures>): CreatePlayerResult<AudioPlayerStore>;
```

Exported from `packages/react/src/index.ts` → framework: `react`.

Return types differ (`VideoPlayerStore` vs `AudioPlayerStore`). Each overload uses the optional
`@label` JSDoc tag to give it a descriptive heading in the docs (see §2d).

### 1e. Context: `playerContext`

**Source** — `packages/html/src/player/context.ts`:

```ts
/** @public The default player context instance for consuming the player store in controllers. */
export const playerContext = createContext<PlayerContextValue, typeof PLAYER_CONTEXT_KEY>(PLAYER_CONTEXT_KEY);
```

Exported from `packages/html/src/index.ts` → framework: `html`. Discovered via `@public` JSDoc.
This is a non-function, non-controller export — a context value.

---

## 2. Builder Pipeline

### 2a. Component discovery

The builder scans `packages/core/src/core/ui/` for directories. For each directory with
kebab-name `{name}`:

| File | Location | Required |
|------|----------|----------|
| Core | `packages/core/src/core/ui/{name}/{name}-core.ts` | Yes |
| Data attrs | `packages/core/src/core/ui/{name}/{name}-data-attrs.ts` | No |
| CSS vars | `packages/core/src/core/ui/{name}/{name}-css-vars.ts` | No |
| HTML element | `packages/html/src/ui/{name}/{name}-element.ts` | No |
| React parts index | `packages/react/src/ui/{name}/index.parts.ts` | No |

**Kebab-to-PascalCase conversion:** `toggle-button` → `ToggleButton`. For cases where standard
conversion fails (e.g., `pip-button` → `PiPButton`), a `NAME_OVERRIDES` map provides the correct
PascalCase name.

**Multi-part detection:** A component is multi-part if and only if `index.parts.ts` exists.

**Domain variant components:** Components like TimeSlider and VolumeSlider that share base
logic (e.g., from `slider/`) must still have their own directories under `core/ui/`. The
builder discovers components by directory — files nested inside a shared directory (like
`slider/time-slider-core.ts`) won't be found.

### 2b. Component extraction

#### Single-part components

Extract from the three source files and merge into one reference object.

| Source | Extracts |
|--------|----------|
| Core file | Props interface members (if present), State interface members (if present), `defaultProps` values (if present) |
| Data attrs file | Data attribute names, JSDoc descriptions, and inferred types (if file exists) |
| CSS vars file | CSS custom property names and JSDoc descriptions (if file exists) |
| HTML element file | `static tagName` value (if file exists) |

**Naming conventions the builder depends on:**

| Symbol | Expected name |
|--------|---------------|
| Props interface | `{PascalCase}Props` |
| State interface | `{PascalCase}State` |
| Core class | `{PascalCase}Core` |
| Data attrs export | `{PascalCase}DataAttrs` |
| CSS vars export | `{PascalCase}CSSVars` |
| HTML element class | `{PascalCase}Element` |

**All symbols are optional.** Only the Core class is required. If a component has no Props
interface, `props` is `{}`. If it has no State interface, `state` is `{}`. If the Core class
has no `defaultProps`, no defaults are populated. If both Props and State are missing, the
component is skipped with a warning.

**Extraction conventions** (apply to both Props and State members):

- Members named `ref` are auto-skipped (React internal).
- Members with `@ignore` JSDoc tag are skipped.

**Missing-symbol behavior:**

| Missing symbol | Behavior | Output |
|---|---|---|
| Props interface only | Silent | `props: {}` |
| State interface only | Silent | `state: {}` |
| Both Props and State | Warn, skip component | Component omitted |
| `defaultProps` static | Silent | Props have no `default` field |
| Data-attrs file/export | Silent | `dataAttributes: {}` |
| CSS-vars file/export | Silent | `cssCustomProperties: {}` |
| JSDoc on a data attribute | Silent | `description: ""` (empty string) |
| HTML element file | Silent | No `platforms.html` section |

This applies uniformly to single-part and multi-part component extraction.

**Data attribute type inference:**

The builder infers data attribute types from the `StateAttrMap<State>` constraint on the
data-attrs export. Every data-attrs file follows the pattern:

```ts
export const FooDataAttrs = { ... } as const satisfies StateAttrMap<FooState>;
```

The builder uses the TypeScript type checker to:

1. Extract the `State` type argument from the `satisfies StateAttrMap<State>` expression
2. Resolve each property key's type on the state interface
3. Format the resolved type as a display string

| State property type | Inferred display type | Example |
|---|---|---|
| `boolean` | _(omitted)_ | `data-paused` — presence/absence, no type shown |
| String literal union | The union | `'off' \| 'low' \| 'medium' \| 'high'` |
| Named type alias (resolves to union) | Expanded literals | `VolumeLevel` → `'off' \| 'low' \| 'medium' \| 'high'` |
| `string` | `string` | Rare — freeform string value |
| `number` | `number` | Rare — numeric attribute |

Boolean attributes are presence/absence by convention (the runtime uses `setAttribute`/
`removeAttribute`), so their type is omitted from the output to avoid noise. Non-boolean
types are included to show the enumerated values the attribute can take.

**Fallback:** If the `satisfies` expression is absent or the type checker cannot resolve the
state type, the builder falls back to the existing `@type` JSDoc tag extraction. Manual
`@type` tags are no longer needed when the `satisfies StateAttrMap<State>` pattern is used.

#### Multi-part components

The builder discovers parts from `index.parts.ts` and matches them to HTML element files.

**Re-exported parts:** When `index.parts.ts` re-exports parts from another component (source
path doesn't start with `./`), the builder resolves the re-export back to its origin. It
parses the origin's `index.parts.ts`, matches each re-exported name to the original local
export, then derives the kebab segment and HTML element file from the **origin component** —
not the current one. Re-exported parts are never primary. For example, TimeSlider re-exports
Buffer, Fill, Thumb, Track, and Value from `../slider/index.parts`; each resolves to the
Slider component's HTML element files (`slider-buffer-element.ts`, etc.).

**Single-part fallback:** When all exports are local and filtering leaves only one part, the
component uses single-part mode. The remaining part (typically Root) becomes the top-level
component — its props/state/data-attrs/CSS-vars are promoted to the component level, not
nested under `parts`. Components with re-exported parts (like TimeSlider and VolumeSlider)
always produce multi-part output since the re-exports are resolved rather than filtered.

**Primary vs. sub-part convention:**

Every multi-part component has one **primary part** and one or more **sub-parts**.

**Primary part:** The part whose React source file instantiates the component's Core class
(matches `new \w+Core\(`). This captures the architectural relationship — the primary part
owns the Core — and is immune to import ordering and framework-divergent element structures.

Sub-part element files use the naming convention `{component}-{part}-element.ts` (e.g.,
`time-group-element.ts`) for HTML tag resolution.

**Part-to-element matching:**

For each local named export in `index.parts.ts`:
1. Derive kebab segment from the export's source path (e.g., `./time-value` → `value`)
2. Look for `{component}-{part}-element.ts` in the HTML directory
3. If found → sub-part (gets its own tag name)
4. If not found AND `{component}-element.ts` exists → check via Core-instantiation for primary

For re-exported parts: use the origin component's kebab and HTML directory for element file
lookup. The element class name is derived from the filename convention (`kebabToPascal` of the
basename, e.g., `slider-buffer-element.ts` → `SliderBufferElement`), not from the current
component's PascalCase name. This same convention-based derivation is also used for local
non-primary parts.

**What the primary part gets:** The shared core Props, State, data attributes, CSS custom
properties, and the root element's tag name.

**What sub-parts get:** Their own tag name, a description (from React JSDoc), shared data
attributes from the component's `*-data-attrs.ts` file (when the sub-part's React source
references `stateAttrMap`), and custom React-specific props (own members on the
`{LocalName}Props` interface, excluding inherited `UIComponentProps` members and `children`).
State and CSS custom properties remain empty.

For re-exported sub-parts, data attributes come from the **origin** component's data-attrs file
(e.g., TimeSlider.Fill uses Slider's data-attrs, not TimeSlider's), because the builder can't
resolve spread entries and the origin file has the complete set that sub-parts inherit.

**What the top-level component gets:** Empty props, state, dataAttributes, cssCustomProperties,
and empty platforms. All meaningful data lives in the `parts` record.

**Framework-divergent parts:** Parts discovered from `index.parts.ts` always get
`platforms.react`. Parts with a matching HTML element file also get `platforms.html`. The
renderer filters parts by framework — only parts with the current framework's platform
entry are shown. This handles cases like Popover where Arrow, Popup, and Trigger are
React-only compound parts with no HTML element counterparts.

> **Known limitation:** Our architecture has a single Props/State interface per component at the
> core level, so only the primary part can own core-level props and state. Sub-parts can declare
> custom React-specific props (e.g., `SliderValueProps.type`), which the builder extracts from
> the React source. In Base UI, each part has its own props independently.

### 2c. Util discovery

The builder scans a fixed set of entry points:

| Entry point | Framework |
|-------------|-----------|
| `packages/react/src/index.ts` | `react` |
| `packages/store/src/react/hooks/index.ts` | `react` |
| `packages/html/src/index.ts` | `html` |
| `packages/store/src/html/controllers/index.ts` | `html` |
| `packages/core/src/dom/store/selectors.ts` | _(none — framework-agnostic)_ |
| `packages/store/src/core/selector.ts` | _(none — framework-agnostic)_ |

**Re-export scoping:** For each entry point, the builder resolves local re-exports (relative
import paths starting with `./`) and scans the resolved modules. External package re-exports
(e.g., `export * from '@videojs/core/dom'`) are not followed — cross-package exports are
discovered via their own dedicated entry points instead. This prevents duplication and
incorrect framework tagging.

**Inclusion rules** — An export is included if it matches any naming convention OR has
`@public` JSDoc:

| Pattern | Rule | Category |
|---------|------|----------|
| `use*` (capital 4th char) + function | Hook | `react` |
| `select*` (capital 7th char) + function | Selector | varies |
| `*Controller` (non-function) | Controller | `html` |
| `create*` + function | Factory | varies |
| `@public` JSDoc tag | Explicit inclusion | varies |

**Note:** The raw TS AST fallback (used when TAE fails on a module) relaxes the function
check for `select*` — it includes by name alone, since type information isn't reliably
available in that path.

**Display name:** The export name is used as-is, except `create*Mixin` factories strip the
`create` prefix (e.g., `createProviderMixin` → `ProviderMixin`).

**Leaf module scanning:** When an entry point has no relative re-exports (i.e., `resolveLocalModules`
returns an empty list), the file itself is scanned directly.

**Slug generation:** kebab-case of the display name. If two frameworks produce the same slug,
React keeps the bare slug and HTML gets prefixed with `html-` (e.g., `create-player` vs
`html-create-player`). React entries must come before HTML entries in `UTIL_ENTRY_POINTS`
to ensure this ordering.

### 2d. Util extraction

**Functions (hooks, factories):** Extract call signatures via TypeScript API. Each signature
becomes an overload with parameters and return value.

**Controllers:** Extract constructor signatures. Each constructor becomes an overload. The
return value type uses `ClassName<TypeParams>` when the class has type parameters, or just
`ClassName` when it has none. The return value describes the controller's public interface
(e.g., `value` property).

**Contexts (non-function, non-controller):** These are non-function, non-controller exports
included via `@public` JSDoc. They produce a single overload with empty parameters and a
`returnValue` containing the type string.

**All overloads are preserved.** When a function or constructor has multiple overload
signatures, each becomes a separate entry in the `overloads` array. This applies uniformly
to function call signatures and class constructor signatures.

**Overload labels (`@label`):** If an overload signature has a `@label` JSDoc tag, the
builder extracts its value as the overload's `label`. This is optional — overloads without
`@label` get no label and fall back to "Overload {N}" headings in the rendered output.

**Degraded type repair:** After TAE extraction, the builder cross-references param and return
types against the raw TS AST. When a formatted type contains `any` (word boundary) or `__type`
— indicators that TAE couldn't resolve the type — the builder replaces it with the source
annotation text from the raw AST declaration. This handles types TAE can't resolve (e.g.,
cross-package interfaces like `Media`, ESSymbol-based types like `PlayerContext`).

### 2e. Type formatting

Every type string goes through two stages:

**Stage 1: Format** — Convert the TypeScript type node to a human-readable string.

| TS construct | Formatted as | Example |
|--------------|-------------|---------|
| Primitives | Lowercase name | `boolean`, `string`, `number` |
| String literals | Single-quoted | `'current'` |
| Unions | Pipe-separated | `'current' \| 'duration' \| 'remaining'` |
| Objects | Inline notation | `{ volume: number; muted: boolean }` |
| Arrays | Bracket suffix | `string[]` |
| Functions | Arrow notation | `((level: number) => void)` |
| Tuples | Bracket notation | `[string, number]` |
| Empty object type | `object` | `object` (not `{}`) |
| Type parameter (small constraint) | Constraint expansion | `string` for `T extends string` |
| Type parameter (large constraint, >5 union members) | Parameter name | `TagName` for `TagName extends keyof JSX.IntrinsicElements` |

**Stage 2: Abbreviate** — Shorten complex types for display. The abbreviated form goes in `type`;
the full form goes in `detailedType` (shown in the disclosure panel).

Abbreviation checks rules in the following order. The first match wins:

| # | Rule | Condition | Abbreviated to | `detailedType` |
|---|------|-----------|---------------|----------------|
| 1 | Pure function | Type contains `=>`, and either no `\|` or is a single function type (paren-depth matching detects `(params) => return \| union` vs `(fn) \| undefined`) | `function` | Full signature |
| 2 | `on*` / `get*` callback | Name matches, type contains `=>` | `function` | Full signature |
| 3 | `className` | Name matches, type contains `=>` | `string \| function` | Full union |
| 4 | `style` | Name matches, type contains `=>` | `CSSProperties \| function` | Full union |
| 5 | `render` | Name matches, type contains `=>` | `ReactElement \| function` | Full union |
| 6 | Simple primitive | `boolean`, `string`, `number` | _(no abbreviation)_ | _(omitted)_ |
| 7 | Object literal (> 40 chars) | Starts with `{ `, length > 40 | `object` | Full inline notation |
| 8 | Short union (< 3 members AND < 40 chars, no fn) | — | _(no abbreviation)_ | _(omitted)_ |
| 9 | Union with a function member | Type contains `=>` and `\|` | Non-fn members `\| function` | Full union |
| 10 | Long type (> 40 chars) | — | _(as-is, truncated)_ | Full type |
| 11 | Fallback | Everything else | _(no abbreviation)_ | _(omitted)_ |

`detailedType` is only present when abbreviation occurred. If the type is short enough to
display as-is, `detailedType` is omitted.

**Union member ordering:** `null`, `undefined`, and `any` sort to the end.

**Default values:** Stored as string representations of the literal value. Examples: `'false'`,
`"''"` (empty string), `'0'`, `'null'`, `'[]'`.

---

## 3. JSON Schemas

These are the intermediate format between builder and front-end. Defined as Zod schemas in
`site/src/types/`.

### 3a. Component reference

Output: `site/src/content/generated-component-reference/{kebab-name}.json`

```
ComponentReference
├── name: string                         — PascalCase (e.g., "ToggleButton")
├── description?: string                 — JSDoc description of the component
├── props: Record<string, PropDef>       — Empty {} for multi-part top-level
├── state: Record<string, StateDef>      — Empty {} for multi-part top-level
├── dataAttributes: Record<string, DataAttrDef>
├── cssCustomProperties: Record<string, CSSVarDef>
├── platforms
│   ├── html?
│   │   └── tagName: string              — e.g., "media-toggle-button"
│   └── react?                           — Present for React-discovered parts (object, no fields)
└── parts?: Record<string, PartReference>  — Only for multi-part components
    └── [partId]
        ├── name: string                 — PascalCase part name (e.g., "Track")
        ├── description?: string         — From React component JSDoc
        ├── props: Record<string, PropDef>
        ├── state: Record<string, StateDef>
        ├── dataAttributes: Record<string, DataAttrDef>
        ├── cssCustomProperties: Record<string, CSSVarDef>
        └── platforms
            ├── html?
            │   └── tagName: string
            └── react?                   — Always present (parts come from index.parts.ts)
```

**CSSVarDef:**

```
└── description: string              — JSDoc description of the CSS custom property
```

**PropDef:**

```
├── type: string              — Abbreviated type for display
├── detailedType?: string     — Full type (only if abbreviated)
├── description?: string      — JSDoc description
├── default?: string          — String representation of default value
└── required?: boolean        — Only present when true
```

**StateDef:**

```
├── type: string
├── detailedType?: string
└── description?: string
```

**DataAttrDef:**

```
├── description: string
├── type?: string             — Inferred from state type. Omitted for boolean (presence/absence).
│                               Shows enumerated values for non-boolean types (e.g., "'empty' | 'partial' | 'full'").
│                               Abbreviated via the same rules as PropDef/StateDef (§2e Stage 2).
└── detailedType?: string     — Full type when abbreviation occurred. Same semantics as PropDef.detailedType.
```

### 3b. Util reference

Output: `site/src/content/generated-util-reference/{slug}.json`

```
UtilReference
├── name: string                         — Display name (e.g., "useVolume")
├── description?: string                 — JSDoc description
├── frameworks?: string[]                — e.g., ["react"] or ["html"]; omitted if agnostic
└── overloads: UtilOverload[]            — At least one
    └── [n]
        ├── label?: string               — From @label JSDoc tag (e.g., "Video")
        ├── description?: string         — Overload-specific description
        ├── parameters: Record<string, ParamDef>
        └── returnValue: ReturnValue
```

**ParamDef** — Same shape as PropDef:

```
├── type: string
├── detailedType?: string
├── description?: string
├── default?: string          — Default parameter value (e.g., "0", "'muted'")
└── required?: boolean
```

**ReturnValue:**

```
├── type: string              — e.g., "object", "void", "boolean"
├── detailedType?: string
├── description?: string      — Used when return is a simple type (no fields)
└── fields?: Record<string, ReturnFieldDef>  — Used when return is an object
    └── [fieldName]
        ├── type: string
        ├── detailedType?: string
        └── description?: string
```

**Cleanup rules:** Optional fields are omitted from JSON when undefined. `required: false` is
omitted (absence means not required). This keeps JSON files small.

---

## 4. Expected JSON Output for Sample Inputs

### 4a. ToggleButton (single-part component)

```json
{
  "name": "ToggleButton",
  "props": {
    "disabled": {
      "type": "boolean",
      "description": "Whether the button is disabled.",
      "default": "false"
    },
    "label": {
      "type": "string | function",
      "detailedType": "string | ((state: ToggleButtonState) => string)",
      "description": "Custom label for the button.",
      "default": "''"
    }
  },
  "state": {
    "pressed": {
      "type": "boolean",
      "description": "Whether the toggle is pressed."
    },
    "disabled": {
      "type": "boolean",
      "description": "Whether the button is disabled."
    }
  },
  "dataAttributes": {
    "data-pressed": {
      "description": "Present when the toggle is pressed."
    },
    "data-disabled": {
      "description": "Present when the button is disabled."
    }
  },
  "cssCustomProperties": {},
  "platforms": {
    "html": {
      "tagName": "media-toggle-button"
    }
  }
}
```

### 4b. Meter (multi-part component)

```json
{
  "name": "Meter",
  "props": {},
  "state": {},
  "dataAttributes": {},
  "cssCustomProperties": {},
  "platforms": {},
  "parts": {
    "indicator": {
      "name": "Indicator",
      "description": "A visual indicator for the current value. Renders a `<span>` element.",
      "props": {
        "min": {
          "type": "number",
          "description": "Minimum value.",
          "default": "0"
        },
        "max": {
          "type": "number",
          "description": "Maximum value.",
          "default": "100"
        },
        "label": {
          "type": "string | function",
          "detailedType": "string | ((state: MeterState) => string)",
          "description": "Custom label for accessibility.",
          "default": "''"
        }
      },
      "state": {
        "percentage": {
          "type": "number",
          "description": "Current value as a percentage (0–1)."
        }
      },
      "dataAttributes": {
        "data-percentage": {
          "description": "Current percentage as a string.",
          "type": "number"
        },
        "data-fill-state": {
          "description": "The fill level.",
          "type": "'empty' | 'partial' | 'full'"
        }
      },
      "cssCustomProperties": {},
      "platforms": {
        "html": {
          "tagName": "media-meter"
        },
        "react": {}
      }
    },
    "track": {
      "name": "Track",
      "description": "The track area of the meter. Renders a `<div>` element.",
      "props": {},
      "state": {},
      "dataAttributes": {},
      "cssCustomProperties": {},
      "platforms": {
        "html": {
          "tagName": "media-meter-track"
        },
        "react": {}
      }
    },
    "fill": {
      "name": "Fill",
      "description": "The filled portion of the meter. Renders a `<div>` element.",
      "props": {},
      "state": {},
      "dataAttributes": {},
      "cssCustomProperties": {},
      "platforms": {
        "html": {
          "tagName": "media-meter-fill"
        },
        "react": {}
      }
    }
  }
}
```

### 4c. useVolume (single-overload hook)

```json
{
  "name": "useVolume",
  "description": "Subscribe to the player's volume state.",
  "overloads": [
    {
      "parameters": {
        "options": {
          "type": "object",
          "detailedType": "{ muted?: boolean }",
          "default": "{}"
        }
      },
      "returnValue": {
        "type": "object",
        "detailedType": "{ volume: number; muted: boolean; setVolume: (level: number) => void }",
        "fields": {
          "volume": {
            "type": "number",
            "description": "Current volume level (0–1)."
          },
          "muted": {
            "type": "boolean",
            "description": "Whether audio is muted."
          },
          "setVolume": {
            "type": "function",
            "detailedType": "((level: number) => void)",
            "description": "Set the volume level."
          }
        }
      }
    }
  ],
  "frameworks": ["react"]
}
```

### 4d. createPlayer (multi-overload)

Both overloads are preserved. Return types differ (`VideoPlayerStore` vs `AudioPlayerStore`).

```json
{
  "name": "createPlayer",
  "description": "Create a player instance with typed store, Provider component, Container, and hooks.",
  "overloads": [
    {
      "label": "Video",
      "description": "Create a player instance with typed store, Provider component, Container, and hooks.",
      "parameters": {
        "config": {
          "type": "CreatePlayerConfig<VideoFeatures>",
          "required": true
        }
      },
      "returnValue": {
        "type": "CreatePlayerResult<VideoPlayerStore>",
        "fields": {
          "Provider": {
            "type": "React.FC<ProviderProps>"
          },
          "Container": {
            "type": "function",
            "detailedType": "React.ForwardRefExoticComponent<ContainerProps & RefAttributes<HTMLDivElement>>"
          },
          "usePlayer": {
            "type": "UsePlayerHook<VideoPlayerStore>"
          }
        }
      }
    },
    {
      "label": "Audio",
      "parameters": {
        "config": {
          "type": "CreatePlayerConfig<AudioFeatures>",
          "required": true
        }
      },
      "returnValue": {
        "type": "CreatePlayerResult<AudioPlayerStore>",
        "fields": {
          "Provider": {
            "type": "React.FC<ProviderProps>"
          },
          "Container": {
            "type": "function",
            "detailedType": "React.ForwardRefExoticComponent<ContainerProps & RefAttributes<HTMLDivElement>>"
          },
          "usePlayer": {
            "type": "UsePlayerHook<AudioPlayerStore>"
          }
        }
      }
    }
  ],
  "frameworks": ["react"]
}
```

### 4e. playerContext (context)

```json
{
  "name": "playerContext",
  "description": "The default player context instance for consuming the player store in controllers.",
  "overloads": [
    {
      "parameters": {},
      "returnValue": {
        "type": "Context<typeof PLAYER_CONTEXT_KEY, PlayerContextValue>"
      }
    }
  ],
  "frameworks": ["html"]
}
```

---

## 5. Reference Model Layer

The reference model transforms flat JSON into a structured heading/section model. This model is
consumed by two places:

1. **Astro components** — to render headings and tables
2. **remarkConditionalHeadings** — to inject heading entries into the table of contents

Both consume the same model, which prevents anchor drift (TOC links matching rendered heading IDs).

### 5a. Component reference model

**Single-part** heading structure:

```
H2  "API Reference"                    id="api-reference"
 ├─ H3  "Props"                        id="props"              (if props non-empty)
 ├─ H3  "State"                        id="state"              (if state non-empty)
 ├─ H3  "Data attributes"             id="data-attributes"    (if dataAttributes non-empty)
 └─ H3  "CSS custom properties"       id="css-custom-properties" (if cssCustomProperties non-empty)
```

**Multi-part** heading structure:

```
H2  "API Reference"                    id="api-reference"
 ├─ H3  "{Part.name}" (React)         id="{partId}"
 │   or "{part.tagName}" (HTML)
 │  ├─ H4  "Props"                    id="{partId}-props"      (if props non-empty)
 │  ├─ H4  "State"                    id="{partId}-state"      (if state non-empty)
 │  ├─ H4  "Data attributes"         id="{partId}-data-attributes" (if dataAttributes non-empty)
 │  └─ H4  "CSS custom properties"   id="{partId}-css-custom-properties" (if cssCustomProperties non-empty)
 ├─ H3  next part...
 └─ ...
```

Multi-part H3 headings are framework-aware: React sees the PascalCase part name (e.g., "Track"),
HTML sees the tag name (e.g., "media-meter-track"). The TOC emits both variants with
`frameworks` metadata so the correct one displays per framework.

**Framework filtering:** The TOC and rendered output only emit headings for parts the current
framework supports (derived from `platforms` keys). React-only parts (those with
`platforms.react` but no `platforms.html`) are hidden when viewing HTML docs.

### 5b. Util reference model

**Single-overload** heading structure:

```
H2  "API Reference"                    id="api-reference"
 ├─ H3  "Parameters"                  id="parameters"          (if params non-empty)
 └─ H3  "Return Value"               id="return-value"
```

**Multi-overload** heading structure:

```
H2  "API Reference"                    id="api-reference"
 ├─ H3  "{label}" or "Overload 1"     id="{slug}" or "overload-1"
 │  ├─ H4  "Parameters"              id="{slug}-parameters" (if params non-empty)
 │  └─ H4  "Return Value"            id="{slug}-return-value"
 ├─ H3  "{label}" or "Overload 2"     id="{slug}" or "overload-2"
 │  ├─ H4  "Parameters"              id="{slug}-parameters"
 │  └─ H4  "Return Value"            id="{slug}-return-value"
 └─ ...
```

### 5c. TOC integration

The `remarkConditionalHeadings` remark plugin detects `<ComponentReference>` and
`<UtilReference>` components in MDX, loads the generated JSON, builds the reference model, and
injects synthetic heading entries into `frontmatter.conditionalHeadings`. These entries carry the
same `id`/`slug` values as the rendered headings, so TOC links always match.

---

## 6. Rendered Output

### 6a. Props table (components)

Rendered by `ApiPropsTable` → `PropRow` → `DetailRow`.

**Columns:**

| Prop | Type | Default | |
|------|------|---------|-|

- **Prop** — Property name in monospace. Required props have an orange `*` suffix.
- **Type** — Abbreviated type in monospace.
- **Default** — Default value in monospace, or `—` if none.
- **(toggle)** — Disclosure triangle. Only present if the row has a description or detailedType.

**Disclosure panel** (when expanded):

Contains a description list (`<dl>`):
- **Description** — Markdown-rendered description. Only shown if `description` is present.
- **Type** — Full `detailedType` in monospace. Only shown if `detailedType` is present
  (i.e., the type was abbreviated).

**Sort order:** Required props first, then alphabetical. (Defined at the builder level via
`sortProps`.)

**ToggleButton example:**

| Prop | Type | Default | |
|------|------|---------|-|
| `disabled` | `boolean` | `false` | |
| `label` | `string \| function` | `''` | ▸ |

Expanding `label`:
> **Description:** Custom label for the button.
> **Type:** `string | ((state: ToggleButtonState) => string)`

### 6b. State table (components)

Rendered by `ApiStateTable` → `StateRow` → `DetailRow`.

**Columns:**

| Property | Type | |
|----------|------|-|

- **Property** — State property name in monospace.
- **Type** — Type in monospace (abbreviated if needed).
- **(toggle)** — Disclosure triangle, same rules as props.

**Disclosure panel:** Same as props (description + detailedType).

**State preamble** (framework-specific, shown above the table):

- **React:** "State is accessible via the `render`, `className`, and `style` props."
- **HTML:** "State is reflected as data attributes for CSS styling."

**ToggleButton example:**

| Property | Type | |
|----------|------|-|
| `pressed` | `boolean` | ▸ |
| `disabled` | `boolean` | ▸ |

Expanding `pressed`:
> **Description:** Whether the toggle is pressed.

### 6c. Data attributes table (components)

Rendered by `ApiDataAttrsTable` → `DataAttrRow` → `DetailRow`. Uses the same disclosure
pattern as props and state tables.

**Columns:**

| Attribute | Type | |
|-----------|------|-|

- **Attribute** — Data attribute name in monospace (e.g., `data-pressed`).
- **Type** — Inferred from `StateAttrMap<State>`. Shows enumerated values in monospace for
  non-boolean types. Empty cell for boolean (present/absent) attributes. Abbreviated via §2e
  Stage 2 when the type is long.
- **(toggle)** — Disclosure triangle. Only present if the row has a description or detailedType.

**Disclosure panel** (when expanded):

Contains a description list (`<dl>`):
- **Description** — Markdown-rendered description. Only shown if `description` is present.
- **Type** — Full `detailedType` in monospace. Only shown if `detailedType` is present
  (i.e., the type was abbreviated).

**ToggleButton example** (boolean attributes — type column empty):

| Attribute | Type | |
|-----------|------|-|
| `data-pressed` | | ▸ |
| `data-disabled` | | ▸ |

Expanding `data-pressed`:
> **Description:** Present when the toggle is pressed.

**Meter example** (mix of boolean and non-boolean — types inferred from state):

| Attribute | Type | |
|-----------|------|-|
| `data-percentage` | `number` | ▸ |
| `data-fill-state` | `'empty' \| 'partial' \| 'full'` | ▸ |

Expanding `data-percentage`:
> **Description:** Current percentage as a string.

### 6d. Parameters table (utils)

Rendered by `UtilParamsTable` → `PropRow` → `DetailRow`. Reuses the same row component as
component props.

**Columns:**

| Parameter | Type | Default | |
|-----------|------|---------|-|

- **Parameter** — Parameter name in monospace. Required params have an orange `*` suffix.
- **Type** — Abbreviated type in monospace.
- **Default** — Default value in monospace, or `—` if none.
- **(toggle)** — Disclosure triangle.

**Disclosure panel:** Same as props (description + detailedType).

**useVolume example:**

| Parameter | Type | Default | |
|-----------|------|---------|-|
| `options` | `object` | `{}` | ▸ |

Expanding `options`:
> **Type:** `{ muted?: boolean }`

### 6e. Return value (utils)

Rendered by `UtilReturnTable`. Two rendering modes:

**Mode 1: Object return with fields** — Renders a table using `StateRow`:

| Property | Type | |
|----------|------|-|

Same columns and disclosure behavior as the state table.

**useVolume example:**

| Property | Type | |
|----------|------|-|
| `volume` | `number` | ▸ |
| `muted` | `boolean` | ▸ |
| `setVolume` | `function` | ▸ |

Expanding `setVolume`:
> **Description:** Set the volume level.
> **Type:** `((level: number) => void)`

**Mode 2: Simple return with detail** — When no fields but `detailedType` or `description` is
present, renders a single-row disclosure table using `DetailRow`:

| Type | |
|------|-|
| `function` | ▸ |

Expanding the row reveals the detailed type and/or description, same as prop/state disclosure.

**Mode 3: Simple return (no detail)** — When no fields, no `detailedType`, and no `description`,
renders inline:

> `ReturnType` — Description text here.

### 6f. CSS custom properties table (components)

Rendered by `ApiCSSVarsTable` → `CSSVarRow` → `DetailRow`. Uses the same disclosure
pattern as data attributes tables but with no type column.

**Columns:**

| Variable | |
|----------|-|

- **Variable** — CSS custom property name in monospace (e.g., `--media-slider-fill`).
- **(toggle)** — Disclosure triangle. Present if the row has a description.

**Disclosure panel** (when expanded):

Contains a description list (`<dl>`):
- **Description** — Markdown-rendered description. Only shown if `description` is present.

### 6g. Multi-part component rendering

For multi-part components, the top-level has no tables (all empty). Each part renders as:

```
H3: Part name (framework-specific label)
    Part description (if present)
    H4: Props (if non-empty) → Props table
    H4: State (if non-empty) → State table
    H4: Data attributes (if non-empty) → Data attributes table
    H4: CSS custom properties (if non-empty) → CSS custom properties table
```

**State section preamble** (framework-specific):

- **React:** "State is accessible via the `render`, `className`, and `style` props."
- **HTML:** "State is reflected as data attributes for CSS styling."

### 6h. Multi-overload util rendering

Each overload renders as:

```
H3: "{label}" or "Overload {N}"
    Overload description (if present)
    H4: Parameters (if non-empty) → Parameters table
    H4: Return Value → Return value table or inline
```

**Heading text:** If the overload has a `label` (from `@label` JSDoc), use it as the H3
heading text. Otherwise fall back to "Overload {N}".

**Heading ID:** Labeled overloads use the kebab-case slug of the label (e.g., `"Video"` →
`id="video"`). Unlabeled overloads use `id="overload-{n}"`.

### 6i. Disclosure panel interaction

The `DetailRow` component implements an expandable disclosure pattern:

- **Toggle button** renders a disclosure triangle (`▸`) that rotates 90° when expanded.
- Clicking anywhere on the summary row toggles the detail panel (unless the click target is
  a link or button).
- Uses `aria-expanded` and `aria-controls` for accessibility.
- The detail panel is initially `hidden` and toggled via JavaScript.

---

## 7. Full Rendered Example: ToggleButton

Given the ToggleButton source code from Section 1a, the user sees:

```
## API Reference

### Props

| Prop       | Type                | Default | |
|------------|---------------------|---------|-|
| disabled   | boolean             | false   |   |
| label      | string | function   | ''      | ▸ |

  └─ [expanded] Description: Custom label for the button.
                 Type: string | ((state: ToggleButtonState) => string)

### State

State is accessible via the render, className, and style props.  ← React
State is reflected as data attributes for CSS styling.           ← HTML

| Property   | Type    | |
|------------|---------|--|
| pressed    | boolean | ▸ |
| disabled   | boolean | ▸ |

  └─ [expanded] Description: Whether the toggle is pressed.
  └─ [expanded] Description: Whether the button is disabled.

### Data attributes

| Attribute       | Type | |
|-----------------|------|-|
| data-pressed    |      | ▸ |
| data-disabled   |      | ▸ |

  └─ [expanded] Description: Present when the toggle is pressed.
  └─ [expanded] Description: Present when the button is disabled.
```

## 8. Full Rendered Example: Meter (multi-part)

Given the Meter source code from Section 1b, the user sees:

```
## API Reference

### Indicator          ← React framework
### media-meter        ← HTML framework

A visual indicator for the current value. Renders a `<span>` element.

#### Props

| Prop  | Type                | Default | |
|-------|---------------------|---------|-|
| label | string | function   | ''      | ▸ |
| max   | number              | 100     |   |
| min   | number              | 0       |   |

#### State

State is accessible via the render, className, and style props.  ← React
State is reflected as data attributes for CSS styling.           ← HTML

| Property   | Type   | |
|------------|--------|-|
| percentage | number | ▸ |

#### Data attributes

| Attribute        | Type                          | |
|------------------|-------------------------------|-|
| data-percentage  | number                        | ▸ |
| data-fill-state  | 'empty' | 'partial' | 'full'  | ▸ |

  └─ [expanded] Description: Current percentage as a string.
  └─ [expanded] Description: The fill level.


### Track              ← React framework
### media-meter-track  ← HTML framework

The track area of the meter. Renders a `<div>` element.

(no Props, State, or Data attributes sections — all empty)


### Fill               ← React framework
### media-meter-fill   ← HTML framework

The filled portion of the meter. Renders a `<div>` element.

(no Props, State, or Data attributes sections — all empty)
```

## 9. Full Rendered Example: useVolume (single-overload)

```
## API Reference

### Parameters

| Parameter | Type   | Default | |
|-----------|--------|---------|-|
| options   | object | {}      | ▸ |

  └─ [expanded] Type: { muted?: boolean }

### Return Value

| Property  | Type     | |
|-----------|----------|-|
| volume    | number   | ▸ |
| muted     | boolean  | ▸ |
| setVolume | function | ▸ |

  └─ [expanded] Description: Set the volume level.
                 Type: ((level: number) => void)
```

## 10. Full Rendered Example: createPlayer (multi-overload, labeled)

```
## API Reference

### Video                                ← from @label "Video"

Create a player instance with typed store, Provider component, Container, and hooks.

#### Parameters

| Parameter | Type                              | Default | |
|-----------|-----------------------------------|---------|-|
| config*   | CreatePlayerConfig<VideoFeatures> | —       |   |

#### Return Value

| Property  | Type                            | |
|-----------|---------------------------------|-|
| Provider  | React.FC<ProviderProps>         |   |
| Container | function                        | ▸ |
| usePlayer | UsePlayerHook<VideoPlayerStore> |   |

  └─ [expanded] Type: React.ForwardRefExoticComponent<ContainerProps & RefAttributes<HTMLDivElement>>

### Audio                                ← from @label "Audio"

#### Parameters

| Parameter | Type                              | Default | |
|-----------|-----------------------------------|---------|-|
| config*   | CreatePlayerConfig<AudioFeatures> | —       |   |

#### Return Value

| Property  | Type                            | |
|-----------|---------------------------------|-|
| Provider  | React.FC<ProviderProps>         |   |
| Container | function                        | ▸ |
| usePlayer | UsePlayerHook<AudioPlayerStore> |   |

  └─ [expanded] Type: React.ForwardRefExoticComponent<ContainerProps & RefAttributes<HTMLDivElement>>
```
