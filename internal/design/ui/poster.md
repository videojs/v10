---
status: draft
date: 2025-02-05
---

# Poster

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

### With Placeholder (Blurhash / LQIP)

Use CSS `background-image` on the `<img>` element to show a placeholder while the main image loads. When the `src` loads, it naturally covers the background.

#### HTML

```html
<media-poster>
  <img
    src="poster.jpg"
    alt="Video description"
    style="background: url(data:image/jpeg;base64,...) center/cover no-repeat;"
  />
</media-poster>
```

#### React

```tsx
<Poster
  src="poster.jpg"
  alt="Video description"
  style={{ background: 'url(data:image/jpeg;base64,...) center/cover no-repeat' }}
/>
```

For fade transitions (blur → sharp), handle the `load` event on the image:

```html
<media-poster>
  <img
    src="poster.jpg"
    alt="Video description"
    style="background: url(blur.jpg) center/cover; opacity: 0; transition: opacity 0.3s;"
    onload="this.style.opacity = 1"
  />
</media-poster>
```

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

**`pointer-events: none`** — Clicks should pass through to the video or play button beneath.

## Accessibility

**Wrapper (`<media-poster>`):** No ARIA role needed. Custom elements have no implicit role, so there's no semantics to hide or override. Do not add `aria-hidden` to the wrapper — the poster image may be informative.

**Child (`<img>`):** User provides appropriate `alt` text describing the poster content (e.g., `alt="Keynote speaker at a conference"`). If purely decorative, use `alt=""`.

Whether a poster is informative or decorative is the author's judgment (per [WAI guidelines](https://www.w3.org/WAI/tutorials/images/decorative/)). In most video player contexts, posters are informative — they give users a preview of the video content. This is an advantage over Media Chrome (which forces `aria-hidden="true"` on the internal image) and native `<video poster>` (which has no `alt` equivalent).

## Alternatives Considered

### Raw state attributes (`data-started`, `data-ended`)

Expose underlying state, let users compose visibility in CSS.

```css
media-poster[data-started]:not([data-ended]) {
  display: none;
}
```

**Why not:** Requires users to understand the state model. `data-started` on a poster doesn't make sense in the component's local context — `data-visible` directly describes the poster's state. Consistent with how button components use context-appropriate names (`data-fullscreen`, `data-muted`) rather than raw feature state.

**Future:** Could add `data-started` and `data-ended` later if needed for advanced use cases (e.g., show poster on ended).

### Component-managed image (`src` prop)

Like Media Chrome — component owns the `<img>` internally.

**Why not:** Limits user control. Can't use `srcset`, `loading="lazy"`, `<picture>`, or framework-specific optimized image components (Next.js `<Image>`, Astro `<Image>`). Media Chrome acknowledges this tradeoff in their docs: "If better control or better performance is desired, you can use `<img slot="poster" src="...">` instead."

Our approach makes the flexible path the default.

## Future

1. **`data-ended`** — Show poster when media ends. Would allow `media-poster[data-visible]:not([data-ended])` patterns.
2. **`data-loaded`** — Set when child image loads. Enables CSS-only placeholder-to-main transitions without user-handled `onload`. Lightweight to implement (listen for `load` event on child `<img>`).
3. **Transition/animation support** — CSS transition recommendations for fade in/out.
