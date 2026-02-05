# API Docs Builder

Generates interactive API documentation from TypeScript sources for Video.js 10 components.

## Architecture

```
TypeScript Sources (core/html packages)
         ↓
   api-docs-builder (typescript-api-extractor)
         ↓
   JSON files (site/src/content/generated-api-reference/)
         ↓
   <ApiRefSection /> Astro component
         ↓
   Interactive tables in MDX pages
```

## How It Works

### 1. Source Discovery

The builder scans `packages/core/src/core/ui/` for component directories. For each component (e.g., `play-button`), it looks for:

- **Core file**: `play-button-core.ts` → Extracts `PlayButtonProps`, `PlayButtonState`, and `defaultProps`
- **Data attrs file**: `play-button-data-attrs.ts` → Extracts data attributes with JSDoc descriptions
- **HTML element file**: `packages/html/src/ui/play-button/play-button-element.ts` → Extracts `tagName`

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

The `<ApiRefSection />` component:

1. Loads the JSON via Astro Content Collections (`getEntry('apiReference', 'play-button')`)
2. Filters props based on current framework (hides React-only props on HTML pages)
3. Renders interactive tables with expandable prop details

## Usage

### In MDX

```mdx
import ApiRefSection from '@/components/docs/api-reference/ApiRefSection.astro';

## API Reference

### Props

<ApiRefSection component="PlayButton" section="props" />

### State

<ApiRefSection component="PlayButton" section="state" />

### Data Attributes

<ApiRefSection component="PlayButton" section="dataAttributes" />
```

### Building

The builder runs automatically before dev/build via npm scripts:

```bash
# Run manually
pnpm api-docs

# Runs automatically on:
pnpm dev      # via predev hook
pnpm build    # via prebuild hook
```

## File Structure

```
site/scripts/api-docs-builder/
├── README.md              # This file
└── src/
    ├── index.ts           # Main entry point, orchestrates handlers
    ├── types.ts           # TypeScript interfaces
    ├── formatter.ts       # Type formatting utilities
    ├── core-handler.ts    # Extracts Props/State from core packages
    ├── data-attrs-handler.ts  # Extracts data attributes
    ├── html-handler.ts    # Extracts Lit element info
    └── tests/
        ├── test-utils.ts
        ├── core-handler.test.ts
        ├── data-attrs-handler.test.ts
        ├── formatter.test.ts
        └── html-handler.test.ts

site/src/
├── content/generated-api-reference/  # Generated JSON files (gitignored)
│   ├── play-button.json
│   └── mute-button.json
└── components/docs/api-reference/
    ├── ApiRefSection.astro    # Main wrapper, loads JSON
    ├── ApiPropsTable.astro    # Props table
    ├── ApiStateTable.astro    # State interface table
    ├── ApiDataAttrsTable.astro # Data attributes table
    └── PropRow.astro          # Expandable prop row
```

## Adding a New Component

1. Create the component in `packages/core/src/core/ui/{name}/`
2. Export `{Name}Props` interface and `{Name}State` interface
3. Optionally create `{name}-data-attrs.ts` with data attribute definitions
4. Create the HTML element in `packages/html/src/ui/{name}/` with `static tagName`
5. Run `pnpm api-docs` to generate JSON
6. Use `<ApiRefSection component="{Name}" section="{section}" />` in MDX as described above

## Differences from base-ui

This implementation is adapted from MUI base-ui's api-docs-builder with key differences:

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
