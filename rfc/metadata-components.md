---
status: draft
date: 2026-09-14
---

# Title and metadata composition

## Problem

We need to display a media title in the video skins, with a gradient and visibility transitions. We also need a public component structure that remains useful if we later display a description or other metadata. The question is which responsibilities belong to a title component, a shared metadata surface, and the skin.

The working implementation uses a standalone `Title` in React and `media-title` in HTML. It owns its text and title availability, and reflects controls visibility. Skins render the gradient with a pseudo-element. The compound options below remain proposals for discussion.

A title-specific root currently disappears when the title is empty. Putting a future description inside it would therefore hide valid description content too. Renaming that root to “metadata” would not resolve the underlying ownership question.

## Customer salience

Built-in skin users should get a readable title without additional setup. Custom skin authors need to place, style, replace, or omit the text without the component replacing unrelated children. Authors displaying metadata outside the player controls may want it to remain visible throughout playback.

A description is a useful design test, not a committed feature. We do not yet have a concrete requirement for its source, formatting, truncation, expansion, or accessibility behavior.

## Constraints

- Keep metadata resolution in the player feature, separate from its presentation.
- Support comparable composition in HTML and React using each platform's normal lifecycle.
- Keep gradients, layout, and transition styles in skins.
- Avoid title-specific initialization in containers, sandbox consumers, or generated setup functions.
- Keep empty content behavior distinct from temporarily hidden controls.
- Do not require a title to display another metadata field.

## Options considered

| Option | Structure | Benefit | Cost and reversibility |
| --- | --- | --- | --- |
| A. Title compound | `Title.Root` contains `Title.Value` | Matches existing root/value indicators and supports an explicit text part | Adds a required title-specific parent. Future fields need siblings or a separate parent, not children of this root |
| B. Independent fields | A standalone `Title` renders text; the skin owns its surrounding surface | Keeps each field independently usable and leaves room for an optional group later | The skin still needs a way to hide an empty backdrop and coordinate visibility without duplicating metadata logic |
| C. Shared metadata compound | `Metadata.Root` contains title and future field parts | Gives several fields one layout and visibility boundary | Commits to group semantics before requirements are known: which fields determine emptiness, and whether parts work outside the group |

Illustrative React anatomy, not final API names:

```tsx
// A: Title-specific state boundary.
<Title.Root>
  <Title.Value />
</Title.Root>

// B: The surrounding surface is skin-owned markup.
<div className="media-metadata">
  <Title />
</div>

// C: Shared state boundary for metadata presentation.
<Metadata.Root>
  <Metadata.Title />
</Metadata.Root>
```

For A, the HTML equivalent is `<media-title><media-title-value></media-title-value></media-title>`. B would keep the title as a standalone text element. C would introduce a separate metadata root and explicitly named parts. None of these options requires an HTML consumer to initialize a binding manually.

## Proposed direction for discussion

Keep the initial scope title-only and compare A with B before publishing the API. A is the current candidate because the skin needs a surface and an explicit text part, and indicators provide an existing composition pattern. That similarity is useful precedent, but does not by itself justify making a title-specific root mandatory.

If A is chosen, define `Title.Root` strictly as the title's boundary. Future descriptions must not depend on its presence or title availability. A later optional metadata group could arrange independent components without changing the meaning of the title root.

Defer C until there is a concrete requirement for multiple fields sharing behavior. This keeps the initial implementation small without claiming that future grouping will be free: a required shared parent or a change in empty-state semantics would still require migration.

Treat `data-visible` as a styling hook rather than an instruction to remove metadata whenever controls hide. Keep the current gradient and motion as skin choices. Review whether controls visibility belongs on the title root or on a reusable presentation boundary before making that coupling public.

## Compatibility and decisions that are costly to reverse

The previous public React form was `<Title />`; the working compound form requires `<Title.Root><Title.Value /></Title.Root>`. Existing HTML usage with only `<media-title>` also needs an explicit value part. Accepting A therefore needs an intentional migration decision, including whether a compatibility period is warranted. The current branch's updated examples do not make existing consumers compatible.

Names, required ancestry, text ownership, empty-state behavior, and CSS hooks become consumer contracts. Changing a gradient is inexpensive; making a standalone field require a parent is not. Avoid promising `Title.Value` as an independently usable field if it requires title-root context.

Do not extend the metadata data model in this proposal. A future description needs its own decision about author input versus media-provided data and plain text versus rich content. Time and poster components need not move under a metadata namespace simply because their values describe media.

## Questions for review

1. Does title presentation justify a public root/value compound, or should `Title` remain a standalone text primitive?
2. Should controls visibility be exposed by title itself, or by a separate presentation boundary?
3. If a description exists without a title, which component would own its visibility and backdrop?
4. Should future fields be independently usable, with grouping strictly optional?
5. Is the migration cost of changing the existing title API acceptable before release?

## Acceptance criteria and next step

Choose an option and record the answers above before treating the working API as settled. Validate title-only, empty-title, custom sibling content, omitted value, and always-visible metadata cases in both frameworks. Use a hypothetical description-without-title layout to check the ownership boundary without implementing description support.

After agreement, align the implementation, examples, registration imports, styling hooks, and migration guidance with the chosen contract. Tests should verify composition and lifecycle behavior, not just generated markup.

## Source references

- [Metadata resolution](../packages/core/src/dom/store/features/metadata.ts)
- [Title state and empty behavior](../packages/core/src/core/ui/title/core.ts)
- [Working HTML title root](../packages/html/src/ui/title/element.ts) and [React title root](../packages/react/src/ui/title/component.tsx)
- [Skin composition](../packages/skins/src/components/metadata/title.tsx) and [title styles](../packages/skins/src/styles/metadata/title.styles.ts)
- [Existing indicator composition](../packages/core/src/core/ui/seek-indicator/component.ts)

## Final decision

Pending review. This draft does not approve the current implementation or add future metadata fields.
