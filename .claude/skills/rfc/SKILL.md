---
name: rfc
description: >-
  Write and review RFCs for Video.js 10. Use for design documents, architecture decisions,
  API proposals, and UI component specifications. Triggers: "write RFC", "create RFC",
  "design doc", "review rfc", "component spec", "architecture proposal".
---

# RFC

Write Request for Comments (RFC) documents for Video.js 10.

## Reference Material

| Task                  | Load                              |
| --------------------- | --------------------------------- |
| Any RFC task          | This file (SKILL.md)              |
| Choosing structure    | `references/structure.md`         |
| Feature guidance      | `references/features.md`          |
| Component guidance    | `references/components.md`        |
| Feature (single-file) | `templates/feature-single.md`     |
| Feature (multi-file)  | `templates/feature-multi.md`      |
| Component (basic)     | `templates/component-basic.md`    |
| Component (compound)  | `templates/component-compound.md` |

## When to Write an RFC

**Write an RFC for:**

- Major API changes or new APIs
- Architectural decisions affecting multiple packages
- Design patterns used across the codebase
- UI component specifications

**Skip the RFC for:**

- Bug fixes
- Small features in one package
- Implementation details
- Documentation updates

See `rfc/README.md` for status lifecycle, branch workflow, and relationship to implementation plans.

## Principles

### 1. Start with the Problem

Every RFC begins with the pain we're solving. A first-time reader needs context before solutions make sense.

```markdown
## Problem

Two concerns, one player:

1. **Media** — play, pause, volume. Owned by `<video>`.
2. **Container** — fullscreen, keyboard. Owned by the UI wrapper.

Different targets, different lifecycles. But users want one API.
```

### 2. Human-Readable

RFCs are for humans, not machines. Write for someone joining the project tomorrow.

- Explain "why" before "what"
- Define terms on first use
- Link to existing code instead of duplicating

### 3. Concise with Good Flow

Every sentence earns its place. Cut ruthlessly.

```markdown
// ❌ Verbose
In order to ensure that the user is able to interact with the player
in a consistent manner across different platforms, we need to...

// ✅ Direct
Users expect one API. We expose two stores internally, one API externally.
```

### 4. Progressive Disclosure

Start high-level, reveal complexity gradually:

1. **Problem** — What pain exists?
2. **Solution overview** — How do we solve it?
3. **Quick start** — Show it working
4. **Details** — API surface, architecture
5. **Rationale** — Why these choices?

### 5. Code Illustrates Ideas

Code examples show concepts, not implementation details:

```markdown
// ✅ Illustrates the concept
const player = usePlayer();
player.paused; // state
player.play(); // request

// ❌ Implementation detail
function usePlayer() {
const store = useContext(PlayerContext);
const [, forceUpdate] = useReducer(x => x + 1, 0);
// ... 50 more lines
}
```

### 6. Unpack Chronologically

Introduce concepts in the order a reader needs them. Don't reference something before explaining it.

```markdown
// ❌ References unexplained concept
PlayerTarget includes a reference to the media proxy.

// ✅ Explains first, then uses
Media features observe `<video>`. Player features need access to media state.
PlayerTarget includes a media proxy for this coordination.
```

### 7. Examine Existing Code

Before writing, explore relevant parts of the codebase. Link to existing patterns rather than duplicating.

```markdown
Based on the existing `SnapshotController` pattern. See `packages/store/src/snapshot.ts`.
```

### 8. Track Key Decisions

Record every significant design decision in `decisions.md`. Include alternatives considered. When a decision evolves, **update the existing entry** — don't append a new one.

```markdown
// ❌ Appending creates confusion

### Flat API Shape (v1)

State and requests on same object.

### Flat API Shape (v2)

Actually, we added namespaces...

// ✅ Update in place, include alternatives

### Flat API Shape

**Decision:** State and requests on same object, no namespaces.

**Alternatives:**

- `.state`/`.request` namespaces — explicit but verbose
- Separate hooks (`usePlayerState`, `usePlayerActions`) — familiar but splits concerns

**Rationale:** Less nesting, proxy tracks at property level. Runtime duplicate detection catches collisions.
```

## Two RFC Types

### Feature RFC

For APIs, architecture, patterns, extensibility decisions.

**Structure:** Problem → Solution → Quick Start → API Surface → Architecture → Decisions

**When to use:**

- New public APIs
- Architectural changes
- Cross-cutting patterns

See `references/features.md` for guidance, `templates/feature-single.md` or `templates/feature-multi.md` for templates.

### Component RFC

For UI primitives and compound components.

**Structure:** Anatomy → Examples → Parts (API tables) → Accessibility

**When to use:**

- New UI components
- Component API changes
- Interaction patterns

See `references/components.md` for guidance, `templates/simple-component.md` or `templates/compound-component.md` for templates.

## Single vs Multi-File

**Single file** — One concept, straightforward proposal

**Multi-file** — 3+ distinct concepts that deserve separate pages

```
rfc/
├── simple-feature.md           # single file
└── complex-feature/            # multi-file
    ├── index.md                # overview, quick start
    ├── architecture.md         # how it works
    ├── decisions.md            # rationale
    └── examples.md             # usage examples
```

See `references/structure.md` for guidance.

## Checklist

Before finalizing an RFC:

- [ ] Problem before solution — context first
- [ ] Concepts explained before referenced
- [ ] Code illustrates ideas, not implementation
- [ ] Minimal examples — only show what's different, `{/* ... */}` for the rest
- [ ] Scannable — lists and whitespace, not walls of text
- [ ] Single source of truth — explain once, link elsewhere
- [ ] Decisions have alternatives and rationale
- [ ] Decisions updated in place, not appended
- [ ] Examples match current proposal
- [ ] Focused scope — future work in Open Questions
- [ ] Multi-file if 3+ distinct concepts
- [ ] Frontmatter has `status: draft`

## Process

1. **Explore** — Read relevant code, understand current patterns
2. **Choose type** — Feature RFC or Component RFC?
3. **Choose structure** — Single or multi-file?
4. **Draft** — Start with problem, build progressively
5. **Cut** — Remove anything that doesn't earn its place
6. **Link** — Reference existing code, related RFCs
7. **Review** — Check against checklist

## Related

| Need                   | Use               |
| ---------------------- | ----------------- |
| API design principles  | `api` skill       |
| Building UI components | `component` skill |
| Writing documentation  | `docs` skill      |
