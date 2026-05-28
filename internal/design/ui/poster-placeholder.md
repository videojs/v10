---
status: draft
date: 2026-05-28
---

# Poster Placeholder

Low-resolution placeholder image shown before the full poster loads, enabling blur-up progressive-loading UX. Improves perceived performance on slow connections.

## Problem

The poster image is often the first visual users see. On slow connections it may take several hundred milliseconds to load, leaving a blank area. A blurred low-resolution placeholder — typically a [blurhash](https://blurha.sh/) or [palette-based data URI](https://github.com/muxinc/blurup) — can fill that space immediately from an inline data URI, then transition to the full image as it loads.

The existing `Poster` component (React) and `PosterElement` (HTML) expose no mechanism for this. Users who need it today have to compose their own layering solution.

## Solution

Extend both the React `Poster` component and the HTML `PosterElement` to accept a placeholder URL or data URI. When provided, the placeholder renders as the `background-image` of the same `<img>` element that displays the main poster. The browser shows the background behind the element's painted content — until the `src` image finishes loading and paints over it. No JS transitions, no second element, no layout change.

This matches how [Media Chrome implements `placeholdersrc`](#media-chrome) internally.

### React

```tsx
<Poster src="poster.jpg" alt="Video title" placeholder={blurDataURL} />
```

`placeholder` is stripped from the forwarded img props and merged into the element's inline `style` as `backgroundImage`:

```tsx
// Rendered output
<img
  src="poster.jpg"
  alt="Video title"
  data-visible
  style="background-image: url('data:image/jpeg;base64,...');"
/>
```

### HTML

```html
<media-poster placeholdersrc="data:image/jpeg;base64,...">
  <img src="poster.jpg" alt="Video title" />
</media-poster>
```

`PosterElement` observes the `placeholdersrc` attribute and sets a CSS custom property on itself. The skin propagates it as `background-image` to the slotted `<img>` via `::slotted()`:

```ts
// In PosterElement.attributeChangedCallback
if (newValue) {
  this.style.setProperty('--media-poster-placeholder', `url(${newValue})`);
} else {
  this.style.removeProperty('--media-poster-placeholder');
}
```

The CSS variable cascades into slotted content via normal custom property inheritance.

## How It Works

The `<img>` element renders two visual layers:

1. **`background-image`** — placeholder data URI, decoded synchronously in-memory, visible immediately.
2. **`src` image** — main poster, loads asynchronously, paints on top of the background when ready.

Once the `src` image loads, the browser replaces the background with the decoded bitmap. No JS `load` listener or CSS transition is needed for the basic effect. The placeholder simply disappears as the main image paints over it.

## CSS Custom Properties

`background-size` and `background-position` must match `object-fit` and `object-position` so the placeholder and the poster align exactly. The skins apply these:

| Property | Value |
|---|---|
| `background-image` | `var(--media-poster-placeholder, none)` |
| `background-size` | `var(--media-object-fit, contain)` |
| `background-position` | `var(--media-object-position, center)` |
| `background-repeat` | `no-repeat` |

For **React**, `background-image` is set as an inline style by the component. `background-size`, `background-position`, and `background-repeat` come from the skin.

For **HTML**, all four properties are applied via the skin's `::slotted(img)` rule using the `--media-poster-placeholder` CSS variable set by the element.

## Skin Integration

### CSS skins (`packages/skins/src/*/css/components/poster.css`)

Add to the slotted img and direct img rules:

```css
/* HTML: slotted img inherits the CSS variable */
.media-default-skin media-poster ::slotted(img),
.media-default-skin media-poster img {
  background-image: var(--media-poster-placeholder, none);
  background-size: var(--media-object-fit, contain);
  background-position: var(--media-object-position, center);
  background-repeat: no-repeat;
}

/* React: direct img — background-image set inline by component */
.media-default-skin > img {
  background-size: var(--media-object-fit, contain);
  background-position: var(--media-object-position, center);
  background-repeat: no-repeat;
}
```

### Tailwind skins (`packages/skins/src/*/tailwind/components/poster.ts`)

Add the background equivalents to the slotted and direct img branches using the same CSS variables.

## Accessibility

The placeholder is purely decorative — it is a blurred or low-resolution version of the poster that exists only to fill space during loading. It requires no `alt` text and no ARIA attributes. Rendering it as a CSS `background-image` is semantically correct: it carries no meaning for assistive technology.

User-provided `alt` text on the main `<img>` is unaffected.

## Naming

| Platform | Attribute / Prop | Rationale |
|---|---|---|
| HTML | `placeholdersrc` | Lowercase HTML attribute convention; matches Media Chrome |
| React | `placeholder` | Camelcase React prop convention; matches Mux Player |
