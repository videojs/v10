# Builder Conventions

Naming and file placement conventions required by the api-docs-builder at `site/scripts/api-docs-builder/`.

## File Locations

| File | Path | Purpose |
|------|------|---------|
| Core | `packages/core/src/core/ui/{name}/{name}-core.ts` | Props, State, defaultProps |
| Data attrs | `packages/core/src/core/ui/{name}/{name}-data-attrs.ts` | Data attribute definitions |
| HTML element | `packages/html/src/ui/{name}/{name}-element.ts` | Custom element with `static tagName` |
| React parts | `packages/react/src/ui/{name}/index.parts.ts` | Multi-part detection (optional) |

## Naming Requirements

The builder derives PascalCase from kebab-case using `kebabCase` from es-toolkit. All interfaces and exports must follow this pattern:

| Convention | Example (play-button) |
|-----------|----------------------|
| Props interface | `PlayButtonProps` |
| State interface | `PlayButtonState` |
| Core class | `PlayButtonCore` |
| Data attrs export | `PlayButtonDataAttrs` |
| HTML element class | `PlayButtonElement` |
| HTML tag name | `static tagName = 'media-play-button'` |

## NAME_OVERRIDES

When kebab-to-pascal conversion doesn't produce the correct name, add an override in `site/scripts/api-docs-builder/src/index.ts`:

```ts
const NAME_OVERRIDES: Record<string, string> = {
  'pip-button': 'PiPButton',
};
```

Use overrides only when the standard conversion fails (e.g., acronyms like PiP). Prefer aligning component naming with the standard conversion when possible.

## Multi-Part Components

**Detection**: Presence of `packages/react/src/ui/{name}/index.parts.ts`.

**Primary part identification**: The part whose HTML element file is `{name}-element.ts` (not `{name}-{part}-element.ts`). The primary part receives the shared core props/state/data-attrs.

**Non-primary parts**: Each gets its own element file at `{name}-{part}-element.ts`. Element class must be `{Name}{Part}Element` (e.g., `TimeGroupElement`).

**Part descriptions**: Extracted from JSDoc on the React component export:
```tsx
/** Displays a formatted time value. */
export const Value = ...;
```

## JSDoc Extraction

- **Data attribute descriptions**: From JSDoc comments on each property in the data-attrs export object
- **Part descriptions**: From JSDoc on React component exports in their `.tsx` files
- **Prop/state descriptions**: From JSDoc on interface properties in the core file

## Common Failures

The builder fails silently for many issues — data just won't appear in the JSON:

| Symptom | Cause |
|---------|-------|
| No JSON generated | Core file missing or Props interface not found |
| Empty props | Interface not named `{PascalCase}Props` |
| Empty state | Interface not named `{PascalCase}State` |
| No data attributes | File missing or export not named `{PascalCase}DataAttrs` |
| No HTML tag | Element file missing or no `static tagName` |
| No part descriptions | Missing JSDoc on React component exports |
| Wrong PascalCase | Need a `NAME_OVERRIDES` entry |

## Validation

```bash
# Generate JSON
pnpm -F site api-docs

# Check output
cat site/src/content/generated-api-reference/{name}.json

# Verify schema
# The builder validates against ComponentApiReferenceSchema before writing.
# Schema errors are logged as errors and cause exit code 1.
```
