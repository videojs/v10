# Video.js Component Checklist

Video.js-specific patterns. See [videojs.md](../../references/videojs.md) for architecture details.

---

## Core Class

- [ ] Core class in `@videojs/core` (not in platform packages)
- [ ] Props interface with `optional | undefined` pattern
- [ ] State interface uses `Pick<FeatureState, ...>` for primitives only
- [ ] `static readonly defaultProps` with `NonNullableObject<Props>` type
- [ ] `setProps()` merges with defaults via `defaults()` utility
- [ ] Namespace exports `Props` and `State` types

## State vs Attrs Separation

- [ ] `getState()` returns primitives only (no methods)
- [ ] `getAttrs()` returns ARIA only (no `data-*`)
- [ ] Data attribute enum with JSDoc for API tooling

## Web Component (Lit)

- [ ] Extends `MediaElement`
- [ ] Uses `PlayerController` with selector for store subscription
- [ ] Uses `AbortController` for cleanup in `disconnectedCallback`
- [ ] `willUpdate`: syncs props to core via `setProps()`
- [ ] `update`: applies attrs and state data attrs

## React Component

- [ ] Uses `useState(() => new Core())` for lazy initialization
- [ ] Uses `usePlayer(selector)` for store subscription
- [ ] Uses `renderElement()` for consistent rendering
- [ ] Props type extends `UIComponentProps<Tag, State>`
- [ ] Namespace exports `Props` and `State` types

## Common

- [ ] Missing feature handled with `logMissingFeature()`
- [ ] Web Component registered in `define/ui/` with `HTMLElementTagNameMap`
- [ ] `static readonly tagName = 'media-{name}'`
