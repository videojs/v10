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

**HTML:** Element that owns an `<img part="img">` in a shadow root, beside a slot for an image of your own.
**React:** Renders `<img>` directly — no wrapper needed.

The URL comes from the player's resolved `poster`, not from markup here. See [Poster from the store](#poster-from-the-store) below.

Visibility: `visible = !playback.started`. The poster shows until playback starts. `started` persists — pausing doesn't reset it.

## Accessibility

**HTML element (`<media-poster>`):** No ARIA role needed. Custom elements have no implicit role, so there's no semantics to hide or override. Do not add `aria-hidden` — the poster image may be informative.

**Image:** The one each binding renders carries `alt=""`. A resolved URL says nothing about what it depicts, and announcing the URL is worse than announcing nothing. Supply your own `alt` — as a prop in React, on your own `<img>` in HTML — to describe a poster that carries meaning. Whether a poster is informative or decorative is the author's judgment (per [WAI guidelines](https://www.w3.org/WAI/tutorials/images/decorative/)). This is an advantage over Media Chrome (which forces `aria-hidden="true"` on the internal image) and native `<video poster>` (which has no `alt` equivalent).

## Poster from the store

*Added 2026-08-08.*

The poster was configured in markup: an `<img slot="poster">` in HTML, a `poster` prop on the React skin. That left content configuration in the skin's hands and made it unreachable from a hand-authored layout, and it left the store's resolved `poster` — user, media, user default — with no reader.

The URL now comes from the metadata feature. The skins pass no arguments, and every consumer inherits the same chain: a packaged skin, an ejected one, a layout you wrote yourself.

Rendering an image is what that requires, and the [decision below](#component-managed-image-src-prop) still holds — so it is a default, not a takeover:

- **React** renders the `<img>` it always did. `src` fills in from the store when you don't pass one; every other image attribute is untouched. `render` receives the resolved `src` in its props, which is the way to hand it to `next/image`.
- **HTML** owns an `<img part="img">` in a shadow root, beside a `<slot>`. Supply an image and the owned one is hidden and its `src` removed. Removing the `src` is not cosmetic: an image that isn't rendered still downloads.

Detecting a supplied image is `slot.assignedElements({ flatten: true }).length > 0`. Flattening is required, not defensive. A skin forwards its own `<slot name="poster">` into the element, and an empty forwarding slot is itself an assigned node — so counting assigned nodes finds one whether or not the author supplied anything. This is also why the owned image sits *beside* the slot rather than inside it as fallback content: slot fallback renders only when nothing is assigned, and inside a skin something always is.

`data-loaded` is reported on the host rather than the image, because a selector cannot reach past `::part()` to read an attribute. `media-poster:not([data-loaded])::part(img)` is expressible; `::part(img):not([data-loaded])` is not.

An `<img>` cannot host the blur-up placeholder — it is a replaced element and generates no `::before` box — so the placeholder is a separate component. See [Placeholder](placeholder.md).

## Alternatives Considered

### Raw state attributes (`data-started`, `data-ended`)

Expose underlying state, let users compose visibility in CSS.

**Why not:** Requires users to understand the state model. `data-started` on a poster doesn't make sense in the component's local context — `data-visible` directly describes the poster's state. Consistent with how button components use context-appropriate names (`data-fullscreen`, `data-muted`) rather than raw feature state.

### Component-managed image (`src` prop)

Like Media Chrome — component owns the `<img>` internally.

**Why not:** Limits user control. Can't use `srcset`, `loading="lazy"`, `<picture>`, or framework-specific optimized image components (Next.js `<Image>`, Astro `<Image>`). Media Chrome acknowledges this tradeoff in their docs.

Our approach makes the flexible path the default.

### Wrap React's `Poster` in a container

Considered while looking for somewhere to paint the placeholder. Rejected: it changes the React poster's public shape from an `<img>` to a `<div>`, puts `srcset` and friends one element deeper, and breaks the rule that a component adds no elements to the page you style. See [Placeholder](placeholder.md), which solved that problem instead.

## Future

1. **`data-ended`** — Show poster when media ends.
2. **Transition/animation support** — CSS transition recommendations for fade in/out.
