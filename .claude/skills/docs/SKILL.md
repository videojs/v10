---
name: docs
description: >-
  Write and review documentation for Video.js 10. Use for writing docs, guides, READMEs,
  JSDoc comments, or reviewing existing documentation. For docs review, load review/workflow.md.
  Triggers: "write docs", "create guide", "review docs", "audit documentation".
---

# Docs

Write documentation for Video.js 10.

## Reference Material

Load these files based on task:

| Task                       | Load                                   |
| -------------------------- | -------------------------------------- |
| Any docs task              | This file (SKILL.md)                   |
| README documentation       | `templates/readme.md`                  |
| Component docs             | `references/component-libraries.md`    |
| Multi-framework docs       | `references/multi-framework.md` (TODO) |
| Lit/Web Components         | `references/component-libraries.md`    |
| Studying exemplary docs    | `references/gold-standard.md`          |
| State/config/tooling docs  | `references/state-tooling.md`          |
| Error/troubleshooting docs | `patterns/error-docs.md`               |

| Pattern needed          | Load                                 |
| ----------------------- | ------------------------------------ |
| Props/attributes tables | `patterns/props-tables.md`           |
| Code examples           | `patterns/code-examples.md`          |
| Progressive disclosure  | `patterns/progressive-disclosure.md` |
| AI/agent readiness      | `patterns/ai-readiness.md`           |

| Starting from scratch | Load                           |
| --------------------- | ------------------------------ |
| README                | `templates/readme.md`          |
| API reference         | `templates/api-reference.md`   |
| Component page        | `templates/component-page.md`  |
| Guide/tutorial        | `templates/guide.md`           |
| Handbook page         | `templates/handbook.md`        |
| Migration guide       | `templates/migration-guide.md` |

## Principles

### Fast

- Optimize for static generation
- Fast search (Pagefind or Algolia)

### Readable

- Be concise — every token must earn its place
- Avoid jargon and idioms
- Optimize for skimming (bold, lists, headings)
- Simple first-time experience, reveal complexity gradually
- Many code examples you can copy/paste

### Helpful

- Document workarounds even for product gaps
- Include migration guides for breaking changes
- Easy to leave feedback

### AI-Native

- Prefer code over "click here"
- Prefer prompts over lengthy tutorials
- Serve `llms.txt` as docs directory
- Support `.md` URL suffix for markdown view

### Agent-Ready

- Pages easy to copy as markdown
- Ship docs in package (JSDoc, README)
- Include `AGENTS.md` with library
- Self-contained examples with all imports

### Polished

- Every heading linkable with stable anchors
- Cross-link related guides, APIs, examples
- Good metadata for search

### Accessible

- Alt tags on images
- Respect `prefers-reduced-motion`

## Tone & Style

Direct. Confident. Friendly but not chatty.

```markdown
// ❌ Wordy
In order to create a new player instance, you'll need to call the
createPlayer function and pass in a configuration object.

// ✅ Direct
Create a player:

const player = createPlayer({ src: 'video.mp4' });
```

**Rules:**

- Active voice, second person ("you")
- Short sentences
- No filler ("In order to", "basically", "simply")
- No hedging ("might", "could", "perhaps")
- Code does the heavy lifting

## Do/Don't Pattern

Show why something is better:

```markdown
### Requesting State Changes

// ❌ Don't — mutate directly
video.volume = 0.5; // No coordination, no error handling

// ✅ Do — use requests
await player.request.setVolume(0.5); // Queued, cancellable, tracked
```

## Familiar Terms

Explain using ecosystem patterns:

```markdown
// ✅ Good
Requests work like HTTP — you ask, the target responds asynchronously.

// ✅ Good
State flows down like React context. Events bubble up like DOM events.
```

## Cross-Linking

- Reference related pages liberally
- Repetition across pages is okay — users land anywhere
- Add "See also" sections

## Documentation Types

**Prefer handbooks.** Most documentation should be handbook pages — one concept, quickly scannable. Use guides only for true tutorials that build something from scratch.

### README

**Light** (has site docs): Description, install, one example, link.

**Comprehensive** (no site docs): Full API, progressive examples.

### Handbook (Preferred)

Bite-sized reference pages. One concept, quickly scannable. Users skim while building.

**Use for:** Concepts, patterns, configuration, troubleshooting, "how do I X?"

Reference: Base UI handbook (styling, composition, TypeScript, forms).

```markdown
## Styling

Style components using data attributes and CSS variables.

.slider[data-dragging] {
cursor: grabbing;
}

### Data Attributes

Components expose state via `data-*` attributes...

### CSS Variables

Dynamic values for sizing and transforms...

**See also:** [Tailwind Integration](/handbook/tailwind)
```

### Guides (Rare)

Narrative tutorials. Step-by-step, teaches "why", builds toward something complete.

**Use sparingly for:** Getting Started, Building X from Scratch. Most "guide-like" content should be a handbook page instead.

Reference: Tailwind Core Concepts.

```markdown
## Building a Custom Player

This guide walks through building a player from scratch.

### Prerequisites

...

### Step 1: Set up the store

...

### Step 2: Create the UI

...

### What's next?

...
```

**Handbook vs Guides:**

| Handbook                 | Guides                       |
| ------------------------ | ---------------------------- |
| **Preferred**            | Use sparingly                |
| Reference while working  | Learning from scratch        |
| One concept per page     | Multi-step narrative         |
| Scannable, minimal prose | Explains "why"               |
| Base UI style            | Tailwind Core Concepts style |

### API Reference

Structure: Example → Anatomy → Options → Returns → Data Attributes → See Also

See `templates/api-reference.md` for full template.

### Component Pages

Structure: Example → Features → Installation → Anatomy → API Reference → Examples → Accessibility

See `templates/component-page.md` for full template.

## Video.js 10 Architecture

When documenting, understand the package hierarchy:

| Package                 | Subpaths                        | Purpose                                 | Doc Focus                          |
| ----------------------- | ------------------------------- | --------------------------------------- | ---------------------------------- |
| `@videojs/utils`        | `/dom`, `/predicate`, `/events` | Shared utilities                        | Utility reference                  |
| `@videojs/store`        | `/lit`, `/react`                | State management                        | Features, requests, error handling |
| `@videojs/core`         | `/dom`                          | Runtime-agnostic logic + media features | API reference, concepts            |
| `@videojs/html`         | `/skins/frosted`                | Web Components (Lit)                    | Component docs, styling            |
| `@videojs/react`        | —                               | React adapter                           | Components, hooks                  |
| `@videojs/react-native` | —                               | React Native adapter                    | Mobile-specific guides             |

**Dependency flow:** `utils → store → core → html / react / react-native`

Document `@videojs/store` as state primitives (features, requests, guards).
Document `@videojs/html` as Web Components with controllers and mixins.
Document framework adapters with framework-native idioms.

## Output Locations

```
packages/{name}/README.md          — readme (primary docs until site launches)
packages/{name}/CLAUDE.md          — agent instructions
site/src/content/docs/api/         — API reference
site/src/content/docs/handbook/    — handbook
site/src/content/docs/guides/      — guides
site/src/content/docs/components/  — components
site/public/llms.txt               — AI docs index
```

> **Note:** Site structure (`site/src/content/docs/`) not yet created.
> Package READMEs are the primary documentation until the site launches.

## Process

1. Determine doc type (handbook preferred; guide only for true tutorials)
2. Load relevant reference/pattern/template files
3. Check existing style in codebase
4. Write concise draft with examples
5. Add do/don't where helpful
6. Add cross-links to related pages
7. Verify examples pass linting and types
8. Cut anything unnecessary

## Review

For reviewing existing documentation against these standards, load `review/workflow.md`.

| File                                                 | Content                         |
| ---------------------------------------------------- | ------------------------------- |
| [review/workflow.md](review/workflow.md)             | Review process and checklists   |
| [review/agents.md](review/agents.md)                 | Full prompts for each sub-agent |
| [review/issue-format.md](review/issue-format.md)     | Issue format with examples      |
| [review/merge-template.md](review/merge-template.md) | Final report template           |

## Related Skills

| Need                   | Use               |
| ---------------------- | ----------------- |
| Building UI components | `component` skill |
| Accessibility patterns | `aria` skill      |
| API design principles  | `api` skill       |
