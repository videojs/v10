---
status: implemented
date: 2025-02-05
---

# Poster

Display component for video poster image. Shows before playback starts, hides after.

## Problem

Video players show a poster image before playback. Existing solutions (Media Chrome, Vidstack) either manage the image internally via `src` prop or expose complex state (`data-loading`, `data-error`, `data-hidden`, `data-visible`).

We want a simpler approach: expose minimal state (`data-visible`), let the user control the image.

## Solution

**HTML:** Wrapper element that accepts `<img>` as child.
**React:** Renders `<img>` directly — no wrapper needed.

Visibility: `visible = !playback.started`. The poster shows until playback starts. `started` persists — pausing doesn't reset it.

## Accessibility

**Wrapper (`<media-poster>`):** No ARIA role needed. Custom elements have no implicit role, so there's no semantics to hide or override. Do not add `aria-hidden` — the poster image may be informative.

**Child (`<img>`):** User provides appropriate `alt` text. Whether a poster is informative or decorative is the author's judgment (per [WAI guidelines](https://www.w3.org/WAI/tutorials/images/decorative/)). This is an advantage over Media Chrome (which forces `aria-hidden="true"` on the internal image) and native `<video poster>` (which has no `alt` equivalent).

## Alternatives Considered

### Raw state attributes (`data-started`, `data-ended`)

Expose underlying state, let users compose visibility in CSS.

**Why not:** Requires users to understand the state model. `data-started` on a poster doesn't make sense in the component's local context — `data-visible` directly describes the poster's state. Consistent with how button components use context-appropriate names (`data-fullscreen`, `data-muted`) rather than raw feature state.

### Component-managed image (`src` prop)

Like Media Chrome — component owns the `<img>` internally.

**Why not:** Limits user control. Can't use `srcset`, `loading="lazy"`, `<picture>`, or framework-specific optimized image components (Next.js `<Image>`, Astro `<Image>`). Media Chrome acknowledges this tradeoff in their docs.

Our approach makes the flexible path the default.

## Future

1. **`data-ended`** — Show poster when media ends.
2. **`data-loaded`** — Set when child image loads, enabling CSS-only placeholder-to-main transitions.
3. **Transition/animation support** — CSS transition recommendations for fade in/out.
