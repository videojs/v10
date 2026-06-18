---
status: implemented
date: 2026-05-28
---

# Poster Placeholder

Low-resolution placeholder image shown before the full poster loads, enabling blur-up progressive-loading UX. Improves perceived performance on slow connections.

## Problem

The poster image is often the first visual users see. On slow connections it may take several hundred milliseconds to load, leaving a blank area. A blurred low-resolution placeholder — typically a [blurhash](https://blurha.sh/) or [palette-based data URI](https://github.com/muxinc/blurup) — can fill that space immediately from an inline data URI, then transition to the full image as it loads.

The existing `Poster` component (React) and `PosterElement` (HTML) exposed no mechanism for this. Users who needed it had to compose their own layering solution.

## Solution

Both the React `Poster` component and the HTML `PosterElement` accept a placeholder URL or data URI. When provided, the placeholder renders as the `background-image` of a `::before` pseudo-element positioned behind the poster. A `filter: blur()` is applied to create the blur-up effect.

This matches how Media Chrome implements `placeholdersrc` and Mux Player implements `placeholder`.

### React

```tsx
<VideoPlayer poster="poster.jpg" placeholder={blurDataURL} />
```

The `placeholder` prop is accepted on `BaseVideoSkinProps` and all skin variants (`VideoSkin`, `LiveVideoSkin`, and their minimal equivalents). When provided, the skin sets `--media-poster-placeholder` as an inline CSS custom property on the container element:

```tsx
const containerStyle = placeholder
  ? ({ '--media-poster-placeholder': `url(${placeholder})`, ...style } as CSSProperties)
  : style;
```

The skin CSS then renders the placeholder via `::before` on the container, with an `opacity` fade-in triggered by `:has(> img[data-visible])` once the full poster is loaded:

```css
.media-default-skin::before {
  /* positioned layer behind the poster */
  background-image: var(--media-poster-placeholder, none);
  filter: blur(var(--media-poster-placeholder-blur, 20px));
  opacity: 0;
  transition: opacity 0.25s;
}
.media-default-skin:has(> img[data-visible])::before {
  opacity: 1;
}
```

The placeholder is intentionally hidden until the skin detects a visible poster (`data-visible`). This avoids a flash of the blurred image when no poster is shown (e.g. after playback starts).

### HTML

```html
<media-poster placeholdersrc="data:image/jpeg;base64,...">
  <img src="poster.jpg" alt="Video title" />
</media-poster>
```

`PosterElement` observes the `placeholdersrc` attribute and sets `--media-poster-placeholder` as an inline CSS custom property on itself:

```ts
// In PosterElement.attributeChangedCallback
if (newValue) {
  this.style.setProperty('--media-poster-placeholder', `url(${newValue})`);
} else {
  this.style.removeProperty('--media-poster-placeholder');
}
```

The skin picks up the variable via `::before` on `media-poster`. No opacity transition is needed on the HTML path — the `media-poster` element itself transitions in via its existing `opacity` rule keyed on `[data-visible]`, so the `::before` appears and disappears with it.

```css
.media-default-skin media-poster::before {
  background-image: var(--media-poster-placeholder, none);
  filter: blur(var(--media-poster-placeholder-blur, 20px));
}
```

## How It Works

The placeholder is a separate absolutely-positioned layer rendered via CSS `::before`, not part of the `<img>` element itself. This avoids interfering with the poster's `object-fit`/`object-position` or `src` loading.

**React path:**

1. Skin container gets `--media-poster-placeholder` via inline style.
2. `::before` on the container renders the blurred placeholder at `opacity: 0`.
3. When the `<img>` inside gets `data-visible`, `:has()` flips `::before` to `opacity: 1` — the placeholder fades in.
4. When the poster hides (after playback starts), the container's `opacity` transitions to `0`, taking `::before` with it.

**HTML path:**

1. `PosterElement` sets `--media-poster-placeholder` on itself via `attributeChangedCallback`.
2. `::before` on `media-poster` renders the blurred placeholder, always visible while the element is visible.
3. `media-poster[data-visible]` / `media-poster:not([data-visible])` control the element's own opacity, so placeholder visibility is tied to the element's lifecycle.

## CSS Custom Properties

| Property | Value |
| --- | --- |
| `--media-poster-placeholder` | Set by the component/element to `url(...)` |
| `--media-poster-placeholder-blur` | Controls blur radius; defaults to `20px` |
| `--media-object-position` | Aligns placeholder to match poster position |
| `--media-object-fit` | Sizes placeholder to match poster fit |

`background-size` and `background-position` use `--media-object-fit` and `--media-object-position` so the placeholder aligns exactly with the poster.

## Skin Integration

Both `default` and `minimal` CSS skins implement both paths identically.

**HTML path** — `::before` on `media-poster`:

```css
.media-default-skin media-poster::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background-image: var(--media-poster-placeholder, none);
  background-repeat: no-repeat;
  background-position: var(--media-object-position, center);
  background-size: var(--media-object-fit, contain);
  filter: blur(var(--media-poster-placeholder-blur, 20px));
}
```

**React path** — `::before` on the skin container with fade-in:

```css
.media-default-skin::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background-image: var(--media-poster-placeholder, none);
  background-repeat: no-repeat;
  background-position: var(--media-object-position, center);
  background-size: var(--media-object-fit, contain);
  opacity: 0;
  filter: blur(var(--media-poster-placeholder-blur, 20px));
  transition: opacity 0.25s;
}
.media-default-skin:has(> img[data-visible])::before {
  opacity: 1;
}
```

Tailwind skin variants wire `--media-poster-placeholder` the same way as the CSS skins — via inline style on the container — and rely on the same `::before` rules.

## Accessibility

The placeholder is purely decorative — a blurred version of the poster that exists only to fill space during loading. Rendering it as a CSS `background-image` on a `::before` pseudo-element is semantically correct: it carries no meaning for assistive technology and requires no `alt` text or ARIA attributes.

User-provided `alt` text on the main `<img>` is unaffected.

## Naming

| Platform | Attribute / Prop | Rationale |
| --- | --- | --- |
| HTML | `placeholdersrc` | Lowercase HTML attribute convention; matches Media Chrome |
| React | `placeholder` | CamelCase React prop convention; matches Mux Player |
