---
status: draft
date: 2026-03-16
---

# CSP Nonce And Inline Styles

## Problem Statement

The HTML and React players rely on inline styles in two forms:

1. **Runtime-created `<style>` elements** and embedded `<style>` blocks.
2. **Inline style attributes** created by React `style={...}` props or imperative `element.style.*` writes.

These patterns require `style-src 'unsafe-inline'` in the page's [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) (CSP).

Current HTML usage:

- Runtime `<style>` injection in [`skin-mixin.ts`](../../packages/html/src/define/skin-mixin.ts)
- Shadow-root `<style>` injection in [`thumbnail-element.ts`](../../packages/html/src/ui/thumbnail/thumbnail-element.ts)
- Embedded `<style>` inside template HTML in [`background-video/index.ts`](../../packages/html/src/media/background-video/index.ts)

Current React usage:

- Inline style props for slider CSS vars and layout in [`slider-root.tsx`](../../packages/react/src/ui/slider/slider-root.tsx)
- Inline style props for time slider CSS vars and layout in [`time-slider-root.tsx`](../../packages/react/src/ui/time-slider/time-slider-root.tsx)
- Inline style props for volume slider CSS vars and layout in [`volume-slider-root.tsx`](../../packages/react/src/ui/volume-slider/volume-slider-root.tsx)
- Inline style props for thumbnail sizing and transforms in [`thumbnail.tsx`](../../packages/react/src/ui/thumbnail/thumbnail.tsx)

Current imperative style writes:

- Thumbnail width and height writes in [`thumbnail-element.ts`](../../packages/html/src/ui/thumbnail/thumbnail-element.ts)

If we do nothing, the player remains incompatible with strict CSP deployments without `'unsafe-inline'`.

## Customer Salience

**Who is affected?**

- Player integrators deploying into environments with strict CSP policies.

**How many customers are realistically impacted?**

A meaningful minority. Strict CSP requirements are common in:

- Large enterprises with strict CSP baselines
- Government and public-sector deployments
- Finance and healthcare environments
- Browser extension surfaces
- Teams with XSS requirements and CSP review gates
- Customers with procurement or security-review checklists that reject inline styles categorically

**How strongly would they feel about it?**

For some teams it will be acceptable. For others it will prevent them from using the product — a hard blocker at the procurement or security-review stage.

This is weaker than `script-src 'unsafe-inline'`, but it still causes real friction. If the player is intended to be embedded in stricter environments, the current requirement is a product risk as well as a technical one.

## Non-Goals

- This RFC does not try to remove every CSP requirement. Media, image, worker, `blob:`, and `connect-src` requirements still depend on the playback path.
- This RFC does not propose removing all dynamic styling. Dynamic layout and sizing are still required for sliders and thumbnails.
- This RFC does not rely on CSP hashes. Hashes do not help with runtime-generated CSS values.

## Options Considered

### Option 1: Keep `unsafe-inline`

Do nothing. Require consumers to allow `style-src 'unsafe-inline'`.

- **Enables:** Zero engineering cost.
- **Constrains:** Preserves adoption risk for stricter customers. Some environments will reject the player outright.
- **Reversibility:** Fully reversible — we can always add nonce support later.

### Option 2: CSP Hashes

Use CSP hashes (`style-src 'sha256-...'`) instead of nonces.

- **Enables:** No runtime nonce plumbing.
- **Constrains:** Hashes only work for static content. They do not solve runtime-generated CSS values (slider percentages, thumbnail transforms). This approach is fundamentally insufficient for the dynamic styling the player requires.
- **Reversibility:** Fully reversible.

### Option 3: Global Nonce Setter

Expose a global `setNonce(value)` function that all player instances read from.

- **Enables:** Simple API, easy to set up.
- **Constrains:** Incorrect for multi-player pages where different players need different nonces. Harder to reason about in SSR and tests. Creates hidden shared mutable state.
- **Reversibility:** Reversible but migration cost if consumers adopt it.

### Option 4: Convert All Dynamic Styling to Fixed Classes

Replace every dynamic value with predefined CSS classes.

- **Enables:** No CSP concerns at all.
- **Constrains:** Too limiting for continuous values like slider percentages and thumbnail transforms. Would require a fundamentally different approach to dynamic UI that degrades the experience.
- **Reversibility:** Major refactor to reverse.

### Option 5: Player-Scoped Nonce + Managed Stylesheets

Add a `nonce` option to `createPlayer`. Apply that nonce to every runtime-created `<style>` element. Replace inline `style` attributes with managed stylesheet rules keyed by stable element ids.

- **Enables:** Full `style-src 'unsafe-inline'` removal. Standard CSP integration point at the player boundary. Dynamic styling preserved. Multiple players on the same page can use different nonces.
- **Constrains:** Requires refactoring every inline style site. Adds a shared style manager abstraction.
- **Complexity:** Moderate — contained within a small shared module, with callsite changes that are mechanical.
- **Reversibility:** Reversible. The nonce option is additive and the style manager is internal.

## Recommendation

**Option 5: Player-scoped nonce + managed stylesheets.**

This is the smallest change that addresses the CSP problem comprehensively. It separates the two concerns cleanly:

- A player-scoped nonce handles inline `<style>` creation.
- A shared style manager replaces style attributes with stylesheet rules.

That combination is required to remove `style-src 'unsafe-inline'` end to end.

The other options are either insufficient (hashes can't handle dynamic values), architecturally wrong (global nonce breaks multi-player and SSR), or too limiting (fixed classes can't express continuous values).

Customer impact justifies the investment — this is a hard blocker for a meaningful segment, not a hypothetical concern.

---

## Detailed Design

### Why A Nonce Is Only Part Of The Fix

A CSP nonce solves one class of problem:

- Inline `<style nonce="...">...</style>`

It does not solve the other class:

- `style=""` attributes
- React `style={...}` props
- Imperative `element.style.width = ...`

To fully remove `style-src 'unsafe-inline'`, the player must do both:

1. Apply a nonce to every runtime-created `<style>`.
2. Stop using inline style attributes.

### Consumer API

The nonce is passed through `createPlayer`, then shared internally via context:

```ts
createPlayer({
  nonce: window.__CSP_NONCE__,
});
```

Requirements:

- Accepts `string | undefined`
- Is supplied through `createPlayer`
- Is available to any internal package that creates runtime styles
- Does not require threading the nonce through every component prop manually
- Allows multiple players on the same page to use different nonces if needed

### Consumer Usage

Example server output:

```html
<script>
  window.__CSP_NONCE__ = "{{nonce}}";
</script>
```

Example CSP:

```http
Content-Security-Policy:
  script-src 'self' 'nonce-{{nonce}}';
  style-src 'self' 'nonce-{{nonce}}';
  img-src 'self' https: data: blob:;
  media-src 'self' https: blob:;
  connect-src 'self' https:;
  worker-src 'self' blob:;
```

Example usage:

```ts
createPlayer({
  target,
  nonce: window.__CSP_NONCE__,
});
```

If the player runs without a nonce, runtime style helpers should still function in development, but strict CSP compatibility should be considered disabled for that player instance.

### Internal Architecture

The player should centralize CSP state and dynamic stylesheet writes behind a small shared module and expose the nonce through player context.

Proposed module: `packages/core/src/dom/style/csp.ts`

Responsibilities:

- Define the nonce-aware style helpers
- Expose `applyNonce(styleEl, nonce)`
- Expose helpers for creating managed style targets

Proposed API:

```ts
export function applyStyleNonce(style: HTMLStyleElement, nonce?: string | undefined): HTMLStyleElement;
```

For dynamic rules:

```ts
export interface ScopedStyleTarget {
  readonly id: string;
  setRule(cssText: string): void;
  destroy(): void;
}

export function createScopedStyleTarget(id?: string): ScopedStyleTarget;
```

Id generation requirements:

- React components should use `useId()` to derive a stable internal styling id.
- HTML custom elements should use a shared internal id generator that produces unique document-level ids with a reserved prefix.
- Generated ids should be internal-only and namespaced to avoid collisions with consumer-authored ids.

Player context requirements:

- The player owns the `nonce` value
- Child controls, UI elements, and style helpers can read it from context
- HTML custom elements created under the player need a way to read the same nonce from the owning player or root controller

Implementation notes:

- When creating a plain `<style>` element, always set the nonce passed from player context.
- Prefer a single managed style element per root or per component family over many single-use tags.

### Shadow DOM Strategy

CSP is enforced at the document level — it applies to all `<style>` elements regardless of which DOM root they live in. However, [constructable stylesheets](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/CSSStyleSheet) created via `new CSSStyleSheet()` and applied through `adoptedStyleSheets` are not subject to CSP's `style-src` directive because they are created programmatically, not parsed from markup.

| Approach                                       | Nonce required | Reason                               |
| ---------------------------------------------- | -------------- | ------------------------------------ |
| `<style>` element appended to shadow root      | Yes            | Parsed element, CSP applies          |
| `shadowRoot.innerHTML = '<style>...'`          | Yes            | Parsed from markup, CSP applies      |
| `new CSSStyleSheet()` + `adoptedStyleSheets`   | No             | Programmatic API, CSP does not apply |

Shadow DOM components should use `adoptedStyleSheets` as the primary approach:

```ts
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);
shadowRoot.adoptedStyleSheets = [sheet];
```

This sidesteps the nonce question entirely for shadow roots. The nonce is only needed for `<style>` elements injected into the document-level DOM (e.g., the `SkinMixin` style in `document.head`).

`adoptedStyleSheets` is supported in all modern browsers (Chrome 73+, Firefox 101+, Safari 16.4+). A nonced `<style>` fallback is not needed unless the player's browser support matrix extends beyond this baseline.

### How Internals Should Share The Nonce

The nonce should not be stored in global module state and should not be threaded through leaf props.

The recommended flow is:

1. Consumer passes `nonce` to `createPlayer`.
2. The player stores that value in player context.
3. HTML and React internals read the nonce from context or the owning player/controller.
4. Any code that creates a `<style>` element uses the shared helper with that nonce.
5. Any code that needs dynamic per-instance rules uses a shared scoped-style helper with that nonce.

This ensures:

- One source of truth
- No global CSP singleton
- No duplication across HTML and React packages
- Consistent behavior in tests and demos
- Clean support for multiple players on the same page

### Context Shape

React player context can carry the nonce directly:

```ts
interface PlayerContextValue {
  nonce: string | undefined;
  // existing player fields...
}
```

HTML player internals need the same value on the controller side. The HTML player should capture `nonce` once at player creation time and expose it to custom elements through the existing player context/controller plumbing rather than a global accessor.

The important constraint is that style-producing internals resolve the nonce from the active player instance, not from process-wide shared state.

### Resolving Each Current Inline Style Instance

#### 1. HTML `SkinMixin`

Current behavior: Creates a runtime `<style>` element and appends it to `document.head`. Builds constructable stylesheets from inline CSS strings. Renders templates into shadow roots with `innerHTML`.

Source: [`skin-mixin.ts`](../../packages/html/src/define/skin-mixin.ts)

Resolution:

- Create the root `<style>` with `applyStyleNonce()`
- Keep `CSSStyleSheet.replaceSync()` if desired, but do not rely on inline `<style>` blocks embedded in template HTML
- Use adopted stylesheets or explicitly appended nonced `<style>` nodes for any CSS currently embedded in template strings

#### 2. HTML `ThumbnailElement` Shadow `<style>`

Current behavior: Creates a `<style>` inside the shadow root.

Source: [`thumbnail-element.ts`](../../packages/html/src/ui/thumbnail/thumbnail-element.ts)

Resolution:

- Replace the raw `<style>` creation with `applyStyleNonce(document.createElement('style'))`
- Or move the CSS into a constructable stylesheet created once and adopted into the shadow root

#### 3. HTML `BackgroundVideo` Embedded `<style>` In Template HTML

Current behavior: Injects a `<style>` block via `shadowRoot.innerHTML`.

Source: [`background-video/index.ts`](../../packages/html/src/media/background-video/index.ts)

Resolution:

- Remove the `<style>` block from the HTML template string
- Create a constructable stylesheet or explicit nonced `<style>` node and append it to the shadow root separately

#### 4. React Slider Roots

Current behavior: Writes inline style objects containing CSS vars and layout state.

Sources:

- [`slider-root.tsx`](../../packages/react/src/ui/slider/slider-root.tsx)
- [`time-slider-root.tsx`](../../packages/react/src/ui/time-slider/time-slider-root.tsx)
- [`volume-slider-root.tsx`](../../packages/react/src/ui/volume-slider/volume-slider-root.tsx)

Resolution:

- Assign each slider a stable internal `id` using `useId()`
- Replace inline `style` props with a shared style-target update
- Emit a rule like:

```css
#media-style-slider-123 {
  --media-pointer-percent: 42%;
  --media-fill-percent: 42%;
}
```

- Keep discrete state in attributes and classes where possible

#### 5. React Thumbnail

Current behavior: Writes inline width, height, and transform styles on the container and image.

Source: [`thumbnail.tsx`](../../packages/react/src/ui/thumbnail/thumbnail.tsx)

Resolution:

- Assign the container a stable internal `id` using `useId()`
- Emit stylesheet rules for both container and image descendants:

```css
#media-style-thumb-123 {
  width: 160px;
  height: 90px;
  overflow: hidden;
}

#media-style-thumb-123 > img {
  width: 320px;
  height: 180px;
  max-width: none;
  transform: translate(-40px, -20px);
}
```

#### 6. HTML Thumbnail Imperative `element.style.*`

Current behavior: Writes width, height, and transform directly to elements.

Source: [`thumbnail-element.ts`](../../packages/html/src/ui/thumbnail/thumbnail-element.ts)

Resolution:

- Create a per-element scoped style target owned by the custom element
- Generate a stable internal `id` using a shared HTML-side id helper
- Emit rules scoped to `:host` and `img`:

```css
:host {
  width: 160px;
  height: 90px;
}

img {
  width: 320px;
  height: 180px;
  max-width: none;
  transform: translate(-40px, -20px);
}
```

- Destroy the style target in the element cleanup path

### Shared Style Manager

To keep the refactor contained, introduce one small style manager for both HTML and React.

Responsibilities:

- Create a style element with the active nonce
- Insert or replace component-scoped rules
- Remove rules on teardown
- Support document-level and shadow-root-level insertion
- Work with real element ids rather than `data-*` styling hooks

Example API:

```ts
export interface StyleScope {
  set(cssText: string): void;
  destroy(): void;
}

export function createDocumentStyleScope(key: string): StyleScope;
export function createShadowRootStyleScope(root: ShadowRoot, key: string): StyleScope;
```

### Id Strategy

The dynamic style system should use actual element ids rather than `data-*` attributes.

Reasons:

- Id selectors are simpler and easier to debug in DevTools.
- The style manager needs a unique selector target, and an id is the most direct fit.
- Internal ids can be namespaced and generated safely enough to avoid practical collisions.

React strategy:

- Use `useId()` to create the internal styling id.
- Prefix it before assigning it to the DOM, for example `media-style-slider-...`.
- Keep the internal styling id separate from any consumer-authored id prop.

HTML strategy:

- Add a small shared id generator for custom elements.
- Assign an internal id to the host element when it is first connected or constructed.
- Use a reserved prefix such as `media-style-...` to avoid collisions.

The important constraint is that the id used for stylesheet targeting is stable for the lifetime of the element instance.

### Rollout Plan

1. Add `nonce` to the `createPlayer` public API and define nonce-aware style helpers in a shared DOM module.
2. Store `nonce` in player context/controller state.
3. Update all runtime-created `<style>` elements to use the nonce helper.
4. Remove embedded `<style>` blocks from template HTML.
5. Introduce the shared style manager for dynamic rules.
6. Migrate React thumbnail and HTML thumbnail first.
7. Migrate React slider roots second.
8. Add strict CSP integration coverage for HTML and React demos.
9. Remove `style-src 'unsafe-inline'` from the recommended CSP documentation.

## Final Decision

*(Completed after review)*

**Decision:**
**Rationale:**
**Date:**
