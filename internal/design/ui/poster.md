---
status: implemented
date: 2025-02-05
---

# Poster

Display component for video poster image. Shows before playback starts, hides after.

## Problem

Video players show a poster image before playback. Existing solutions (Media Chrome, Vidstack) either manage the image internally via `src` prop or expose complex state (`data-loading`, `data-error`, `data-hidden`, `data-visible`).

We want a simpler approach: keep the state small, let the user control the image.

## Solution

**HTML:** A controller that renders no image and sets `src` on the one that is already its child. `<picture>` is the loose precedent for the shape, though sourcing runs the other way around: `<picture>` treats the `src` on its `<img>` as the fallback, while here an image with no source of its own is the one we fill in.
**React:** Renders `<img>` directly — no wrapper needed.

The URL is player state on the metadata feature, not markup here, so a hand-authored layout resolves it the same way a skin does. Either binding fills in `src` only when the consumer supplied none — the [decision below](#component-managed-image-src-prop) still holds, so it is a default rather than a takeover. The packaged skins carry a plain `<img>` as poster-slot fallback content, which an `<img slot="poster">` displaces.

Visibility: `visible = !playback.started`. The poster shows until playback starts. `started` persists — pausing doesn't reset it.

`data-visible`, `data-loading`, `data-loaded`, and `data-error` are reported on `<media-poster>` rather than on the image, since the image may be the author's and a skin has no selector that reaches into it.

## Accessibility

**HTML element (`<media-poster>`):** No ARIA role needed. Custom elements have no implicit role, so there's no semantics to hide or override. Do not add `aria-hidden` — the poster image may be informative.

**Image:** The one each binding renders carries `alt=""`. A resolved URL says nothing about what it depicts, and announcing the URL is worse than announcing nothing. Supply your own `alt` — as a prop in React, on your own `<img>` in HTML — to describe a poster that carries meaning. Whether a poster is informative or decorative is the author's judgment (per [WAI guidelines](https://www.w3.org/WAI/tutorials/images/decorative/)). This is an advantage over Media Chrome (which forces `aria-hidden="true"` on the internal image) and native `<video poster>` (which has no `alt` equivalent).

## Alternatives Considered

### Raw state attributes (`data-started`, `data-ended`)

Expose underlying state, let users compose visibility in CSS.

**Why not:** Requires users to understand the state model. `data-started` on a poster doesn't make sense in the component's local context — `data-visible` directly describes the poster's state. Consistent with how button components use context-appropriate names (`data-fullscreen`, `data-muted`) rather than raw feature state.

### Component-managed image (`src` prop)

Like Media Chrome — component owns the `<img>` internally.

**Why not:** Limits user control. Can't use `srcset`, `loading="lazy"`, `<picture>`, or framework-specific optimized image components (Next.js `<Image>`, Astro `<Image>`). Media Chrome acknowledges this tradeoff in their docs.

Our approach makes the flexible path the default.

### An `<img>` the HTML element owns in its shadow root

Considered so `<media-poster>` alone would render something once the URL came from the store.

**Why not:** the owned image is stylable only through `::part(img)`, skins end up with two styling contracts instead of one, and two images sit in the tree with one hidden.

Two costs follow. `<media-poster>` renders nothing on its own, so a hand-authored layout supplies the image and a `__DEV__` warning fires when a poster resolves without one. And a skin reaches a slotted image through `::slotted(img)`, which matches only what is assigned directly — wrap one in a `<picture>` or a framework component and its sizing belongs to the author.

## Future

1. **`data-ended`** — Show poster when media ends.
2. **Transition/animation support** — CSS transition recommendations for fade in/out.
