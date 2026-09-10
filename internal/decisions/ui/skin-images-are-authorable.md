---
status: decided
date: 2026-09-09
---

# Every image a skin renders can be supplied by the author

## Decision

Any `<img>` a packaged skin renders internally is fallback content, not a private detail. The author can replace it from inside the skin tag — an `<img slot="poster">` or `<img slot="thumbnail">` in HTML, `renderPoster` or `renderThumbnail` in React — and the component that owns the image fills in only what the author left off. The poster and slider thumbnail follow this rule today; any image a skin adds later must too.

## Why

The attributes that make an image good — `srcset`, `sizes`, `loading`, `fetchpriority`, `crossorigin`, `alt`, a `<picture>` wrapper, or a framework component such as Next.js `<Image>` — cannot be exposed one by one through a shadow boundary or a skin prop without reinventing the `<img>` API. Handing the author the element is the only surface that stays complete as browsers add attributes. This is the same reasoning the [poster design](/internal/design/ui/poster.md#component-managed-image-src-prop) used to reject a component-managed `src` prop, generalized to every skin image.

The skin's own image is the slot's fallback content in light DOM rather than something drawn in a component's shadow root, so the skin styles it by class and an author's image through `::slotted(img)`, and there is never a hidden duplicate beside the author's. In React the same source becomes a `render` override because there is no slot to fill; the vjsc React target maps authored children of every image part to `render` so skin source needs no target-specific code.

Because the component still has to write to an image it did not create — the poster fills `src`, the thumbnail owns `src`/`srcset` and mirrors `crossorigin`, `loading`, and `fetchpriority` — ownership is settled once, when the image is adopted. What the image already carries is the author's and is left alone; what the component writes it also removes when the image steps aside. Deciding later would misread the component's own writes as authored. The thumbnail cannot simply leave a supplied image untouched, because the skin's own image is also a supplied image from the element's point of view and relies on it for `crossorigin` inheritance from the media element.

## Consequences

- A new skin image needs three things: a named slot around it in skin source, an owning component that respects authored attributes, and a `shadow-dom` style variant so a slotted image is sized and transitioned like the skin's own.
- Ejected HTML strips every named slot, since without a shadow root the author edits the image directly.

See [`packages/skins/src/components/layout/poster.tsx`](/packages/skins/src/components/layout/poster.tsx), [`packages/skins/src/components/sliders/time-slider.tsx`](/packages/skins/src/components/sliders/time-slider.tsx), and the adoption logic in [`packages/html/src/ui/thumbnail/element.ts`](/packages/html/src/ui/thumbnail/element.ts).
