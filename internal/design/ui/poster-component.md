---
status: draft
date: 2025-02-05
---

# Poster Component

Display component for video poster image. Shows before playback starts, hides after.

## Problem

Video players show a poster image before playback. The poster:

1. Gives users a preview of the content
2. Should hide once playback starts
3. May optionally reappear when playback ends

Existing solutions (Media Chrome, Vidstack) either:

- Manage the image internally via `src` prop
- Expose complex state (`data-loading`, `data-error`, `data-hidden`, `data-visible`)

We want a simpler approach: expose minimal state, let the user control the image.

## Solution

Minimal components that:

1. Expose `data-visible` for CSS-based show/hide
2. Do nothing else

**HTML:** Wrapper element that accepts `<img>` as child.
**React:** Renders `<img>` directly — no wrapper needed.

### Usage

#### HTML

```html
<media-poster>
  <img src="poster.jpg" alt="Video description" />
</media-poster>
```

#### React

```tsx
import { Poster } from '@videojs/react';

<Poster src="poster.jpg" alt="Video description" />;
```

#### CSS

```css
media-poster:not([data-visible]) {
  display: none;
}
```

### With Responsive Image

#### HTML

```html
<media-poster>
  <img
    src="poster.jpg"
    srcset="poster-480.jpg 480w, poster-720.jpg 720w"
    sizes="(max-width: 600px) 480px, 720px"
    alt="Video description"
    loading="lazy"
  />
</media-poster>
```

#### React

```tsx
<Poster
  src="poster.jpg"
  srcSet="poster-480.jpg 480w, poster-720.jpg 720w"
  sizes="(max-width: 600px) 480px, 720px"
  alt="Video description"
  loading="lazy"
/>
```

User controls the image entirely — responsive images, lazy loading, placeholder strategies all work naturally.

## API

### Data Attributes

| Attribute      | Description                                  |
| -------------- | -------------------------------------------- |
| `data-visible` | Present when poster should show (`!started`) |

### Visibility Logic

```ts
visible = !playback.started;
```

The poster is visible until playback has started. Once `started` becomes `true` (user plays or seeks), the poster hides and stays hidden.

**Note:** `started` persists — pausing doesn't reset it. The poster only shows on initial load or after a new source is loaded.

## Styling Notes

The component sets no default styles. Recommended CSS:

```css
media-poster {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

media-poster:not([data-visible]) {
  display: none;
}

media-poster img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
```

**`pointer-events: none`** — Poster is decorative. Clicks should pass through to the video or play button beneath.

## Accessibility

**Wrapper (`<media-poster>`):** No ARIA role needed. Custom elements have no implicit role, so there's no semantics to hide or override.

**Child (`<img>`):** User provides appropriate `alt` text. If purely decorative, use `alt=""`.

## Alternatives Considered

### Raw state attributes (`data-started`, `data-ended`)

Expose underlying state, let users compose visibility in CSS.

```css
media-poster[data-started]:not([data-ended]) {
  display: none;
}
```

**Why not:** More flexible but requires users to understand the state model. The common case is "show before play, hide after" — `data-visible` captures this directly.

**Future:** Could add `data-started` and `data-ended` later if needed for advanced use cases (e.g., show poster on ended).

### Component-managed image (`src` prop)

Like Media Chrome and Vidstack — component owns the `<img>`.

**Why not:** Limits user control. Can't use `srcset`, `loading="lazy"`, or framework-specific optimized image components (Next.js `<Image>`, Astro `<Image>`).

## Open Questions

1. **Ended behavior** — Should we add a prop to show poster when media ends? For now, no — keep it simple. Users wanting this can use raw attributes if we add them later.

2. **Transitions** — Should we document recommended CSS transitions for fade in/out? Probably in a styling guide, not here.
