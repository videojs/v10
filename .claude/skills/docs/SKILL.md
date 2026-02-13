---
name: docs
description: >-
  Write and review documentation for Video.js 10 — site pages, READMEs, and JSDoc.
  Use for writing concept pages, how-to guides, package READMEs, and inline API docs.
  Component reference pages use the `api-reference` skill instead.
  Triggers: "write docs", "create guide", "review docs", "audit documentation",
  "write README", "JSDoc", "inline docs".
---

# Docs

Write documentation for Video.js 10.

## Before you start

Read the relevant sources of truth before writing any documentation:

| Source | What it covers |
|--------|----------------|
| `site/CLAUDE.md` | Site architecture, MDX components, demos, routing, collections, Tailwind config |
| `site/src/content/docs/how-to/write-guides.mdx` | Living reference with rendered examples of every MDX component |
| `CLAUDE.md` (repo root) | JSDoc conventions (Minimal JSDoc, No Obvious Comments sections) |

This skill adds writing guidance on top of those. When in doubt, the source files win.

## Reference material

| Task | Load |
|------|------|
| Writing style and voice | `references/writing-style.md` |
| Notes on effective component library docs | `references/component-libraries.md` |
| Notes on effective general developer tool docs | `references/gold-standard.md` |
| Notes on effective state tooling docs | `references/state-tooling.md` |
| Concept page from scratch | `templates/concept.md` |
| How-to guide from scratch | `templates/how-to.md` |
| Package README from scratch | `templates/readme.md` |
| Code example conventions | `patterns/code-examples.md` |
| Error documentation patterns | `patterns/error-docs.md` |
| Review workflow (multi-agent) | `review/workflow.md` |
| Review checklist (single-agent) | `review/checklist.md` |
| Review agent prompts | `review/agents.md` |
| Review issue/report templates | `review/templates.md` |
| Component reference page | `api-reference` skill |

## Documentation types

### Site documentation (Diataxis)

The site follows the [Diataxis](https://diataxis.fr/) framework:

| Mode | Directory | Purpose |
|------|-----------|---------|
| Concept | `concepts/` | Explain how and why things work |
| How-to | `how-to/` | Achieve a specific outcome with step-by-step instructions |
| Reference | `reference/` | Component API docs — owned by `api-reference` skill |

**When in doubt, write a concept page.** Most new documentation should be concept pages.

| Concept page | How-to guide |
|---|---|
| **Preferred** — default choice | Use sparingly |
| Reference while working | Learning from scratch |
| One concept per page | Multi-step narrative |
| Scannable, minimal prose | Explains "why" at each step |
| No prerequisites | Has prerequisites |
| Jump in anywhere | Sequential |

### Package documentation

| Type | Location | Purpose |
|------|----------|---------|
| README | `packages/{name}/README.md` | First impression — install, quick example, concepts |
| JSDoc | Inline in source | API docs for editors and generated references |

## JSDoc

CLAUDE.md (repo root) defines the hard rules — no redundant `@param`/`@returns`, no obvious comments, minimal JSDoc. This section adds a decision framework for **when** to write JSDoc.

### Decision tree

```
Is the export public (used outside the package)?
├─ No → Skip JSDoc
└─ Yes → Is the name self-documenting?
         ├─ Yes (e.g., `supportsIdleCallback()`) → Skip JSDoc
         └─ No → Does it have complex generics or non-obvious behavior?
                  ├─ Yes → JSDoc with @param/@example as needed
                  └─ No → One-sentence summary
```

### Patterns (from the codebase)

**Minimal** — One-sentence summary when the name is mostly clear but context helps:

```ts
// packages/utils/src/number/number.ts
/** Clamp a value between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
```

**With example** — Summary + `@example` when usage isn't obvious from the signature:

```ts
// packages/store/src/react/hooks/use-store.ts
/**
 * Access store state and actions.
 *
 * Without selector: Returns the store, does NOT subscribe to changes.
 * With selector: Returns selected state, re-renders when selected state changes (shallowEqual).
 *
 * @example
 * ```tsx
 * // Store access (no subscription) - access actions, subscribe without re-render
 * function Controls() {
 *   const { setVolume } = useStore(store);
 * }
 *
 * // Selector-based subscription - re-renders when paused changes
 * function PlayButton() {
 *   const paused = useStore(store, (s) => s.paused);
 *   return <button>{paused ? 'Play' : 'Pause'}</button>;
 * }
 * ```
 */
```

**With params** — `@param`/`@returns` for complex generics where TypeScript alone isn't enough:

```ts
// packages/store/src/core/combine.ts
/**
 * Combines multiple slices into a single slice.
 *
 * @param slices - The slices to combine.
 * @returns A new slice that represents the combination of the input slices.
 */
export function combine<Target, const Slices extends Slice<Target, any>[]>(
  ...slices: Slices
): Slice<Target, UnionSliceState<Slices>> {
```

## Writing principles

For full guidelines, load `references/writing-style.md`. The essentials:

- **Direct.** No filler ("In order to", "basically", "simply"). No hedging ("might", "could").
- **Code-first.** Show the code, then explain. Not the other way around.
- **Scannable.** Bold, lists, headings, tables. Walls of text become tables or lists.
- **Self-contained examples.** Include all imports. Use realistic values, not `foo`/`bar`.
- **Show output.** When the result isn't obvious, add a comment showing expected output.
- **Progressive.** Start with the simplest version. Add complexity in later examples.
- **Cross-link.** End pages with "See also" linking related concepts and references. Repetition across pages is fine — readers land anywhere.

### Do/don't contrasts

Use `// ❌ Don't` / `// ✅ Do` pairs to show why something is better. Effective for common mistakes, API misuse, and style guidance. Always explain *why* the wrong way is wrong.

### Callout types

Use `<Aside>` (never `:::note` syntax):

| Type | When |
|------|------|
| `note` | Supplementary info, not critical |
| `tip` | Optimization or best practice |
| `caution` | Could cause problems if ignored |
| `danger` | Will break things if ignored |

## MDX components

Full documentation is in `site/CLAUDE.md`. Quick reference:

| Component | Purpose |
|-----------|---------|
| `<FrameworkCase frameworks={["react"]}>` | Show content for specific framework only |
| `<StyleCase styles={["css"]}>` | Show content for specific style only |
| `<Aside type="note">` | Callout box (note, tip, caution, danger) |
| `<TabsRoot client:idle>` | Tabbed content container |
| `<ServerCode code={variable} lang="ts" />` | Render code from variable or `?raw` import |
| `<MinimalFrame>` | Bordered container for demos/iframes |
| `<DocsLink slug="reference/play-button">` | Framework-aware internal link |
| `<Demo files={[...]}>` | Code viewer with live preview |

Key gotchas:
- All `<Tab*>` components require `client:idle` — never `client:visible`
- No H1 — page title comes from frontmatter
- Only `.mdx` files, never `.md`

## Process

1. Determine doc type — site page (concept preferred), README, or JSDoc
2. Load the relevant template or reference
3. Check existing docs for style and patterns
4. Write concise draft — code before prose
5. Add do/don't contrasts where helpful
6. Add cross-links and "See also" section
7. **Site pages only:** Add page to sidebar in `site/src/docs.config.ts`
8. **Site pages only:** Verify it renders for all framework combinations

## Review

- **Quick review** (single agent): Load `review/checklist.md`
- **Full review** (multi-agent): Load `review/workflow.md`

## Related skills

| Need | Use |
|------|-----|
| Component reference pages | `api-reference` skill |
| Building UI components | `component` skill |
| Accessibility patterns | `aria` skill |
| API design principles | `api` skill |
