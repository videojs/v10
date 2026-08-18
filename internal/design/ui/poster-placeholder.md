---
status: implemented
date: 2026-05-28
---

# Poster placeholder

Poster placeholders provide a low-resolution or first-frame visual while the final poster loads. Current props, attributes, and CSS names belong to source and API reference.

## Decisions

- Keep placeholder behavior on the poster component instead of introducing another public component with overlapping lifecycle and accessibility.
- Render placeholder and final poster as separate visual layers so the final image can crossfade without replacing the whole component.
- Let a consumer supply the placeholder directly; extraction of a first frame or image transformation is outside the UI component.
- Expose presentation through CSS custom properties so skins can align sizing, position, filtering, and transition behavior across both layers.
- Keep the placeholder decorative. The poster component owns any meaningful accessible name, preventing duplicate image announcements.

## Consequences

The same concept works in React and HTML and remains skinnable without a JavaScript animation API. Consumers are responsible for choosing a safe placeholder URL and for any media-frame generation policy.

## Current sources of truth

- React implementation: `packages/react/src/ui/poster/poster.tsx`
- HTML implementation: `packages/html/src/ui/poster/poster-element.ts`
- Poster design context: [Poster](poster.md)
- Public API reference and package exports
