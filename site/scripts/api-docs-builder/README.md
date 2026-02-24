# API Docs Builder

Generates API reference JSON from TypeScript sources for Video.js 10 components and utilities.

> **Spec:** [`internal/design/site/api-docs-builder.md`](../../../internal/design/site/api-docs-builder.md)
> is the ground-truth for discovery conventions, extraction rules, JSON schemas, the reference model,
> and rendered output. When implementation diverges from the spec, the spec wins.

## Architecture

```
TypeScript Sources (core/html/react/store packages)
         ↓
   api-docs-builder (typescript-api-extractor)
         ↓
   JSON files (component + util references)
         ↓
   Astro components (ComponentReference / UtilReference)
         ↓
   Interactive tables in MDX pages
```

## Usage

### Building

The builder runs automatically before dev/build via npm scripts:

```bash
# Run manually
pnpm api-docs

# Runs automatically on:
pnpm dev      # via predev hook
pnpm build    # via prebuild hook
```

### In MDX

```mdx
import ComponentReference from "@/components/docs/api-reference/ComponentReference.astro";
import UtilReference from "@/components/docs/api-reference/UtilReference.astro";

<ComponentReference component="PlayButton" />
<UtilReference util="usePlayer" />
```

## File Structure

```
site/scripts/api-docs-builder/
├── README.md                  # This file
└── src/
    ├── index.ts               # Main entry point, orchestrates handlers
    ├── types.ts               # TypeScript interfaces
    ├── formatter.ts           # Type formatting utilities
    ├── utils.ts               # Utility functions (naming helpers)
    ├── core-handler.ts        # Extracts Props/State from core packages
    ├── data-attrs-handler.ts  # Extracts data attributes
    ├── html-handler.ts        # Extracts Lit element info
    ├── parts-handler.ts       # Parses index.parts.ts for multi-part components
    ├── util-handler.ts        # Extracts util params/return from store/react packages
    └── tests/
        ├── test-utils.ts
        ├── fixtures/          # Monorepo fixtures for integration tests
        ├── core-handler.test.ts
        ├── data-attrs-handler.test.ts
        ├── formatter.test.ts
        ├── html-handler.test.ts
        ├── parts-handler.test.ts
        ├── util-handler.test.ts
        └── utils.test.ts

site/src/
├── content/generated-component-reference/  # Generated component JSON (gitignored)
├── content/generated-util-reference/       # Generated util JSON (gitignored)
└── components/docs/api-reference/
    ├── ComponentReference.astro  # Renders full component API reference
    ├── UtilReference.astro       # Renders full util API reference
    ├── ApiPropsTable.astro       # Props table
    ├── ApiStateTable.astro       # State interface table
    ├── ApiDataAttrsTable.astro   # Data attributes table
    ├── UtilParamsTable.astro     # Util parameters table
    ├── UtilReturnTable.astro     # Util return type table
    ├── PropRow.astro             # Expandable prop row
    ├── StateRow.astro            # Expandable state row
    ├── DataAttrRow.astro         # Data attribute row
    ├── DetailRow.astro           # Shared disclosure row
    └── InlineMarkdown.astro      # Renders inline markdown (backticks → <code>)
```

## Dependencies

- `typescript-api-extractor`: AST parsing for TypeScript types
- `es-toolkit`: Utility functions (kebabCase, etc.)
- `tsx`: TypeScript execution

All dependencies are in `site/package.json` devDependencies.

## Acknowledgements

This builder's architecture and approach were inspired by [Base UI](https://github.com/mui/base-ui)'s
`api-docs-builder`, maintained by MUI. Base UI is licensed under the
[MIT License](https://github.com/mui/base-ui/blob/master/LICENSE) (Copyright 2019 Material-UI SAS).
Thank you to the MUI team for the excellent reference implementation.
