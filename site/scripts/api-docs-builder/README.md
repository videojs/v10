# API Docs Builder

Generates interactive API documentation from TypeScript sources for Video.js 10 components.

## Architecture

```
TypeScript Sources (core/html/react packages)
         ↓
   api-docs-builder (typescript-api-extractor)
         ↓
   JSON files (site/src/content/generated-api-reference/)
         ↓
   <ApiReference /> Astro component
         ↓
   Interactive tables in MDX pages
```

## How It Works

### 1. Source Discovery

The builder scans `packages/core/src/core/ui/` for component directories. For each component (e.g., `play-button`), it looks for:

- **Core file**: `play-button-core.ts` → Extracts `PlayButtonProps`, `PlayButtonState`, and `defaultProps`
- **Data attrs file**: `play-button-data-attrs.ts` → Extracts data attributes with JSDoc descriptions
- **HTML element file**: `packages/html/src/ui/play-button/play-button-element.ts` → Extracts `tagName`
- **Parts index**: `packages/react/src/ui/play-button/index.parts.ts` → Detects multi-part components

### 2. TypeScript Extraction

Uses `typescript-api-extractor` to parse TypeScript AST and extract:

- Interface properties with types and JSDoc descriptions
- Default values from `static defaultProps = { ... }`
- Data attributes from `const PlayButtonDataAttrs = { ... } as const`
- Lit element tag names from `static tagName = 'media-play-button'`

### 3. JSON Output

Generates one JSON file per component at `site/src/content/generated-api-reference/{kebab-case-name}.json`:

```json
{
  "name": "PlayButton",
  "props": {
    "label": {
      "type": "string | ((state: PlayButtonState) => string)",
      "description": "Custom label for the button.",
      "default": "''"
    }
  },
  "state": {
    "paused": {
      "type": "boolean",
      "description": "Whether playback is paused."
    }
  },
  "dataAttributes": {
    "data-paused": {
      "description": "Present when the media is paused."
    }
  },
  "platforms": {
    "html": {
      "tagName": "media-play-button"
    }
  }
}
```

### 4. Astro Components

The `<ApiReference />` component:

1. Loads the JSON via Astro Content Collections (`getEntry('apiReference', 'play-button')`)
2. For single-part components: renders Props, State, and Data Attributes sections with h3 headings
3. For multi-part components: renders each part with a framework-aware h3 heading, part description, and h4 sub-sections
4. Renders interactive tables with expandable prop details

## Usage

### In MDX

Use the unified `<ApiReference />` component for both single-part and multi-part components:

```mdx
import ApiReference from "@/components/docs/api-reference/ApiReference.astro";

<ApiReference component="PlayButton" />
```

For multi-part components, the same pattern applies — the component automatically renders part headings, descriptions, and sub-sections:

```mdx
import ApiReference from "@/components/docs/api-reference/ApiReference.astro";

<ApiReference component="Time" />
```

Part descriptions are extracted from JSDoc on the React component exports (e.g., `packages/react/src/ui/time/time-value.tsx`).

### Building

The builder runs automatically before dev/build via npm scripts:

```bash
# Run manually
pnpm api-docs

# Runs automatically on:
pnpm dev      # via predev hook
pnpm build    # via prebuild hook
```

## Multi-Part Components

Some components are composed of multiple parts (e.g., Time has Value, Group, Separator). The builder auto-discovers these via convention.

### Detection

**Trigger**: Presence of `packages/react/src/ui/{name}/index.parts.ts`.

Single-part components (PlayButton, MuteButton) don't have this file and are unaffected.

### Discovery Algorithm

1. **Part name discovery**: Named (non-type-only) exports are parsed from `index.parts.ts`. Each value export becomes a part.
2. **Kebab segment derivation**: Source path `./time-group` → strip `./time-` prefix → `group`.
3. **HTML element matching**: Each part's kebab segment is used to find `{name}-{kebab}-element.ts` in the HTML directory (e.g., `time-group-element.ts`).
4. **Primary part identification**: The part with NO `{name}-{part}-element.ts` match, whose element is just `{name}-element.ts`, is the primary part.
5. **Shared resource attribution**: `{name}-core.ts` and `{name}-data-attrs.ts` are attributed to the primary part only.

### Naming Conventions Required

- Core interfaces must be `{Name}Props` and `{Name}State` (not `{Name}CoreProps` etc.)
- Part exports in `index.parts.ts` must be value exports (not type-only)
- HTML element files must follow `{name}-{part}-element.ts` naming
- Element classes must be `{Name}{Part}Element` (e.g., `TimeGroupElement`)

### JSON Output

Multi-part components have empty top-level `props`/`state`/`dataAttributes`. All data lives in the `parts` record:

```json
{
  "name": "Time",
  "props": {},
  "state": {},
  "dataAttributes": {},
  "platforms": {},
  "parts": {
    "value": { "name": "Value", "description": "Displays a formatted time value.", "props": { ... }, ... },
    "group": { "name": "Group", "description": "Container for composed time displays.", "props": {}, ... },
    "separator": { "name": "Separator", "description": "Divider between time values.", "props": {}, ... }
  }
}
```

### Troubleshooting

- **Part not appearing in JSON?** Check `index.parts.ts` exports the part as a value export (not type-only).
- **Props/state empty for primary part?** Verify core interfaces are named `{Name}Props`/`{Name}State`.
- **HTML tag name missing?** Verify element file follows `{name}-{part}-element.ts` naming and has `static tagName`.
- **No primary part warning?** Ensure the primary part's element file is just `{name}-element.ts` (not `{name}-{part}-element.ts`).
- **Part description missing?** Add a JSDoc comment to the React component export (e.g., `/** Displays a formatted time value. */` above `export const Value`).

## File Structure

```
site/scripts/api-docs-builder/
├── README.md              # This file
└── src/
    ├── index.ts           # Main entry point, orchestrates handlers
    ├── types.ts           # TypeScript interfaces
    ├── formatter.ts       # Type formatting utilities
    ├── utils.ts           # Utility functions (naming helpers)
    ├── core-handler.ts    # Extracts Props/State from core packages
    ├── data-attrs-handler.ts  # Extracts data attributes
    ├── html-handler.ts    # Extracts Lit element info
    ├── parts-handler.ts   # Parses index.parts.ts for multi-part components
    └── tests/
        ├── test-utils.ts
        ├── core-handler.test.ts
        ├── data-attrs-handler.test.ts
        ├── formatter.test.ts
        ├── html-handler.test.ts
        ├── parts-handler.test.ts
        └── utils.test.ts

site/src/
├── content/generated-api-reference/  # Generated JSON files (gitignored)
│   ├── play-button.json
│   ├── mute-button.json
│   └── time.json
└── components/docs/api-reference/
    ├── ApiReference.astro     # Unified component — renders full API reference from JSON
    ├── ApiPropsTable.astro    # Props table
    ├── ApiStateTable.astro    # State interface table
    ├── ApiDataAttrsTable.astro # Data attributes table
    └── PropRow.astro          # Expandable prop row
```

## Adding a New Component

### Single-Part Component

1. Create the component in `packages/core/src/core/ui/{name}/`
2. Export `{Name}Props` interface and `{Name}State` interface
3. Optionally create `{name}-data-attrs.ts` with data attribute definitions
4. Create the HTML element in `packages/html/src/ui/{name}/` with `static tagName`
5. Run `pnpm api-docs` to generate JSON
6. Use `<ApiReference component="{Name}" />` in MDX

### Multi-Part Component

1. Follow the single-part steps above for the primary part's core/data-attrs/element files
2. Create `packages/react/src/ui/{name}/index.parts.ts` exporting each part
3. Add JSDoc descriptions to each React component export for part descriptions
4. Create HTML element files for each non-primary part at `packages/html/src/ui/{name}/{name}-{part}-element.ts`
5. Run `pnpm api-docs` to generate JSON
6. Use `<ApiReference component="{Name}" />` in MDX

## Acknowledgements

This builder's architecture and approach were inspired by [Base UI](https://github.com/mui/base-ui)'s
`api-docs-builder`, maintained by MUI. Base UI is licensed under the
[MIT License](https://github.com/mui/base-ui/blob/master/LICENSE) (Copyright 2019 Material-UI SAS).
Thank you to the MUI team for the excellent reference implementation.

### Key differences from Base UI's builder

1. **Multi-platform**: One JSON per component containing all platform variants (React/HTML)
2. **Core-first**: Props come from core package, not platform-specific components
3. **Data attributes**: Extracted from dedicated `*-data-attrs.ts` files
4. **HTML elements**: Extracts Lit element `static tagName`
5. **No prettier**: Uses biome for formatting (removed prettier dependency)

## Dependencies

- `typescript-api-extractor`: AST parsing for TypeScript types
- `es-toolkit`: Utility functions (kebabCase, etc.)
- `tsx`: TypeScript execution

All dependencies are in `site/package.json` devDependencies.
