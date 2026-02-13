---
name: api-reference
description: >-
  Scaffold API reference documentation for Video.js 10 components. Validates
  the api-docs-builder output, checks design docs and linked PRs for context,
  creates the MDX reference page with anatomy, prose sections, demos, and the
  ApiReference component. Triggers: "api reference", "reference page",
  "scaffold api docs", "add api docs", "component reference".
---

# API Reference

Scaffold a complete API reference page for a Video.js 10 component.

## Usage

```
/api-reference [component-name]
```

- `component-name` (optional): kebab-case component name (e.g., `play-button`). If omitted, will prompt.

## Arguments

$ARGUMENTS

## Reference Material

Load these files based on task:

| Need | Load |
|------|------|
| Builder naming conventions | `references/builder-conventions.md` |
| MDX page structure | `references/mdx-structure.md` |
| Demo file patterns | `references/demo-patterns.md` |
| Component libraries reference | `docs` skill → `references/component-libraries.md` |
| Component patterns | `component` skill |
| Accessibility | `aria` skill |
| Design docs | `internal/design/` |

## Your Tasks

### Step 1: Gather context

Accept component name as argument (kebab-case).

1. Read the core file at `packages/core/src/core/ui/{name}/{name}-core.ts` — extract Props, State, behavior
2. Read data-attrs file at `packages/core/src/core/ui/{name}/{name}-data-attrs.ts` — extract data attributes
3. Check `packages/react/src/ui/{name}/index.parts.ts` — detect if multi-part
4. Search `internal/design/` for matching design doc: `internal/design/**/*{name}*`
5. Read the HTML element file(s) for tag names at `packages/html/src/ui/{name}/`
6. Use `git log --oneline --all -- packages/core/src/core/ui/{name}` to find the commit that added the component, then check linked PRs via `gh pr list --search` for additional context

### Step 2: Validate api-docs-builder compatibility

1. Run `pnpm -F site api-docs` and check for errors
2. Read the generated JSON at `site/src/content/generated-api-reference/{name}.json`
3. Verify the JSON has expected sections (props, state, dataAttributes, platforms.html.tagName)
4. For multi-part: verify each part appears in `parts` with correct names

If JSON is missing or incomplete, diagnose which convention isn't met. Load `references/builder-conventions.md` for the full list of naming requirements and common failures. Propose fixes: either adjust the component to match conventions, or add a name override — prefer aligning with conventions unless there's good reason not to.

### Step 3: Determine relevant prose sections

Based on design docs, core logic, and component complexity, decide which sections to include between `## Anatomy` and `## Examples`. Not all are required — include only what adds value:

- **Behavior** — include when the component has state transitions, timing, interaction logic, or non-obvious behavior (e.g., Controls auto-hide, BufferingIndicator delay, Time formatting). Skip for trivial components.
- **Styling** — include when the component has data attributes for CSS targeting. Show CSS selector patterns. Always include for components with 2+ data attributes.
- **Accessibility** — include when the component has ARIA attributes, keyboard interactions, or screen reader considerations. Always include for interactive components (buttons, sliders).
- Other sections may be relevant depending on the component (e.g., "Platform Support" for features with availability detection).

### Step 4: Create demos

Create at least a BasicUsage demo in both HTML and React. Load `references/demo-patterns.md` for the full file structure and conventions.

- HTML demo: 4 files (`.astro`, `.html`, `.css`, `.ts`)
- React demo: 2 files (`.tsx`, `.css`)
- Follow BEM naming: `{framework}-{component}-{variant}__{element}`
- CSS uses data-attribute selectors for state-based styling
- React uses `render` prop for state-based rendering
- Video source: `https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4`
- Poster image: `https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/thumbnail.jpg`
- Consider additional demos for features not covered by BasicUsage

### Step 5: Create MDX reference page

Load `references/mdx-structure.md` for the full structure template.

1. Create `site/src/content/docs/reference/{name}.mdx`
2. Add to sidebar in `site/src/docs.config.ts` (alphabetically within Components section)
3. Structure: frontmatter → imports → Anatomy → prose sections → Examples → `<ApiReference />`
4. Run `pnpm dev` from root and verify the page renders in both HTML and React framework modes

## Related Skills

| Need | Use |
|------|-----|
| Building UI components | `component` skill |
| Accessibility patterns | `aria` skill |
| Documentation standards | `docs` skill |
| API design principles | `api` skill |
