---
status: implemented
date: 2026-08-04
---

# Player content metadata

This record preserves the consumer contract and ownership boundaries for player content metadata. Source, exports, and tests define the current API.

## Consumer experience

Metadata is an optional player feature. Standard audio, video, and live presets include it; custom players expose its provider inputs and store state only when they select the feature.

```tsx
<Player.Provider contentTitle="User title" defaultContentTitle="Fallback title">
  <Player.Container />
</Player.Provider>
```

```html
<video-player content-title="User title" default-content-title="Fallback title">
  <media-container />
</video-player>
```

Consumers read the resolved `contentTitle` through the normal store or selector APIs. Feature-authored `setContentTitle` and `setDefaultContentTitle` actions provide imperative writes; the low-level `$config` controller exists for provider adapters, not as the recommended consumer API.

`contentTitle` is intentionally independent from the existing `title` and `poster` concepts. Empty and whitespace-only strings are literal values. `null` falls through to the next tier.

## Resolution and ownership

The resolved title uses this precedence:

1. User `contentTitle`
2. Attached media `contentTitle`
3. User `defaultContentTitle`
4. Feature fallback `""`

Provider config belongs to the store lifetime and persists across media detach. Media-owned source state belongs to one attachment and resets on detach. This keeps lower-precedence media values current under a user override, so clearing the override reveals the latest media title.

Provider config and media source updates produce one eager, atomic frozen snapshot with derived state. Formula failure commits and notifies nothing. Internal symbol-backed source values use the same update/reset path but are omitted from the public store surface.

## Media contribution

Media may implement the narrow, read-only content-title capability and emit `contenttitlechange`. `undefined` means unsupported; `null` means supported without a current value. Capability support is fixed when media attaches, while capable media can move between `null` and string values during that attachment.

Native media does not donate its legacy `title`. DOM media hosts delegate an explicit content-title capability through the normal target/component override path and forward its notification event.

## Provider adapters

Feature config keys drive both platform provider surfaces.

- React seeds config during store creation so the first render and SSR agree, then applies actual prop changes after commit. Omitted, unchanged props do not overwrite imperative writes.
- HTML declares non-reflecting reactive properties and kebab-case attributes from selected config keys. Initial values are synchronized before context publication; later changes commit in the element update cycle.
- Provider inputs are one-way. Store writers do not rewrite React props or HTML properties/attributes.

## Deliberate limits

This feature contains only content title and its user default. It does not add title UI, map legacy `title`, change poster behavior, or fetch metadata from Mux. Content poster, MuxVideo donation, responsive orientation configuration, and user-facing guides remain separate work.

## Sources of truth

- Historical player composition: [`rfc/player-api.md`](../../../rfc/player-api.md)
- Media capability rationale: [`internal/design/media/architecture.md`](./architecture.md)
- Reactive snapshot decision: [`internal/decisions/store/reactive-state.md`](../../decisions/store/reactive-state.md)
- Store config and derivation: [`packages/store/src/core/`](../../../packages/store/src/core/)
- Metadata feature and tests: [`packages/core/src/dom/store/features/`](../../../packages/core/src/dom/store/features/)
- Media contracts and host forwarding: [`packages/media/src/`](../../../packages/media/src/)
- React and HTML providers: [`packages/react/src/player/`](../../../packages/react/src/player/), [`packages/html/src/player/`](../../../packages/html/src/player/)
