---
status: decided
date: 2026-08-08
---

# Placeholder

Supersedes [Poster placeholder](poster-placeholder.md).

## Decision

The blur-up placeholder is its own component: `<media-placeholder>` in HTML, `<Placeholder>` in React. It renders one empty element, sets `background-image` from the player's resolved `placeholder`, and leaves sizing, position, and blur to CSS.

The URL is player configuration, not skin markup. `placeholder` and `defaultPlaceholder` join the metadata feature and resolve on the same four tiers the poster uses: user, media, user default, then `''`.

`BaseVideoSkinProps.placeholder` and `<video-skin placeholdersrc>` are gone. So is `--media-poster-placeholder`.

## Context

The placeholder used to live on the poster component, painted into `media-poster::before` and fed by a CSS custom property that the skin threaded down from a prop.

That worked in HTML, where `<media-poster>` is a wrapper element. It could not work in React, where `<Poster>` renders an `<img>` directly. An `<img>` is a replaced element: it generates no `::before` box and cannot have children, so there was nowhere on the React poster to paint a second layer. The React skins painted the placeholder on the skin container instead — a different element, a different selector, and a rule that had to reach across the tree with `:has()` to find out whether the poster had loaded.

One concept, two implementations, and the divergence was structural rather than incidental. Neither side could adopt the other's.

Configuration had the same split. The placeholder was a skin prop, so it was only reachable from a packaged skin. Anyone composing components by hand, or ejecting a skin, had no way to set one.

## Rationale

**A separate element is the only shape both platforms can render.** React cannot put a layer inside an `<img>`, and HTML cannot make a custom element *be* an `<img>` — customized built-ins never shipped in WebKit. What both platforms can do is render a plain box next to the poster. So that is what the placeholder is.

**Painting over beats handing off.** The placeholder sits behind the poster and stays put. The poster covers it as it loads, and where the poster does not reach — the bars left by `object-fit: contain` — the placeholder keeps showing through. Nothing has to observe the poster's load state, so there is no cross-element selector and no coordination to get wrong. This is also what the HTML path already did for author-supplied images.

**Visibility mirrors the poster.** Both components carry `data-visible` and both drop it once playback starts, so one mental model and one pair of skin rules cover them. `visible` does not depend on having a URL: with no placeholder configured the element paints nothing, so the two states are indistinguishable on screen, and tying them together would only make the contract harder to state.

**The component sets the URL and nothing else.** A blur radius the component hardcoded would be unoverridable, and the signature look is the blur, so the component depends on CSS regardless. Setting only `background-image` keeps the split honest, and it means the same rules style both platforms — there is no shadow boundary to reach past and no `isShadowDOM` branch in the Tailwind variant.

**Configuring on the player, not the skin, is what makes the feature reachable.** A skin prop is available to packaged skins only. A store value is available to a packaged skin, an ejected one, and a hand-authored layout alike, and it opens the media tier: a `MediaContentData` donor can supply a placeholder the way it already supplies a poster.

## Alternatives considered

**Keep it on the poster (the superseded decision).** Its stated reason was to avoid a second public component with overlapping lifecycle and accessibility. Neither overlap turned out to be real. The lifecycle is one boolean both components already derive from `started`, and there is no accessibility question at all: the placeholder is a decorative background image, so it has no accessible name to duplicate and screen readers skip it. What the single-component shape did cost was React parity, which is the thing the decision was meant to protect.

**Give React's `<Poster>` a wrapper so it can host `::before`.** This closes the parity gap, and it was implemented and discarded. It breaks the rule that a component adds no elements to the page you style, it changes the React poster's public shape from an `<img>` to a `<div>`, and it makes `srcset`, `loading`, and `<picture>` reach one element deeper. [Poster](poster.md) treats author control of the image as the point of the component, and this trades it away to solve a problem that is not about the poster.

**Give `<media-placeholder>` a shadow root with default painting styles.** Sensible defaults for `background-size` and `background-repeat` would make the bare element behave without any CSS, and `media-thumbnail` sets that precedent. But React has no shadow root, so the defaults would exist on one platform only — reintroducing exactly the asymmetry this record removes.

## Consequences

`--media-poster-placeholder` and `--media-poster-placeholder-blur` are replaced. The blur is now `--media-placeholder-blur` on the new element; the URL is no longer a custom property at all.

The poster keeps `data-loaded`. Holding the image back until it loads is what makes the blur-up read as a fade rather than a pop, and the skins still use it.

Nothing donates a placeholder from the media tier today. Mux builds posters from a signed URL whose token is bound to its params, so it cannot synthesize a smaller variant. `MediaContentData` has an index signature and is a public extension point, so a third-party media can.

## Current sources of truth

- Core: `packages/core/src/core/ui/placeholder/placeholder-core.ts`
- Store: `packages/core/src/dom/store/features/metadata.ts`
- HTML: `packages/html/src/ui/placeholder/placeholder-element.ts`
- React: `packages/react/src/ui/placeholder/placeholder.tsx`
- Skins: `packages/skins/src/*/css/components/placeholder.css` and the Tailwind variant beside it
- Poster design context: [Poster](poster.md)
