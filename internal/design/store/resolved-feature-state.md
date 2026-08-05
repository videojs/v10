---
status: implemented
date: 2026-08-04
---

# Resolved player feature state

This record defines how a player feature resolves one public value from inputs with different owners and lifetimes. Content metadata illustrates the pattern but does not define its boundary. Source, exports, and tests define the current API.

## Consumer experience

A selected feature may expose user inputs through its provider. Those inputs appear in React and HTML only when the player includes that feature.

For example, a content-title feature may accept a user override:

```tsx
const Player = createPlayer({ features: [metadataFeature] });

<Player.Provider contentTitle="Title from my CMS">
  <Player.Container />
</Player.Provider>
```

Or a user may provide a fallback that media can override:

```tsx
<Player.Provider defaultContentTitle="Title if media provides none">
  <Player.Container />
</Player.Provider>
```

HTML exposes the same inputs as `content-title` and `default-content-title`. Consumers read the resolved value through normal store or selector APIs. Feature-authored actions provide intentional imperative writes; the low-level `$config` controller exists for provider adapters, not as the recommended consumer API.

## Decision

A feature may separate its inputs into three layers:

- `config` holds user-provided values for the provider/store lifetime and survives media detach.
- `state` holds attachment-owned source values and feature actions. It resets when media detaches.
- `derived` eagerly resolves public state from `config` and `state` before one frozen snapshot is published.

Features choose their own formula. A fallback-shaped value can use:

```ts
providerOverride ?? attachedMediaValue ?? providerFallback ?? featureFallback
```

Internal source values may use symbol keys. They follow the normal attachment update and reset path but do not appear in the public store. Lower-precedence inputs remain current beneath an override, so removing that override reveals the latest available value.

Source, config, and derived values commit atomically. A formula failure commits and notifies nothing. An internal change that produces a shallowly equal public snapshot preserves its identity and does not notify subscribers.

## Provider adapters

Selected feature config keys drive both provider surfaces.

- React seeds config during store creation so the first render and SSR agree, then applies actual prop changes after commit. Omitted, unchanged props do not overwrite imperative writes.
- HTML declares non-reflecting reactive properties and kebab-case attributes. Initial values synchronize before context publication; later changes use the element update cycle.
- Provider inputs flow one way. Store actions do not rewrite React props or HTML properties or attributes.

Provider adapters must preserve the feature's declared config types. HTML attribute conversion is adapter-specific and must not be inferred solely from a nullable default.

## Example: content title

The metadata feature resolves `contentTitle` in this order:

1. User `contentTitle`
2. Attached media `contentData.title`
3. User `defaultContentTitle`
4. Feature fallback `""`

`setContentTitle` and `setDefaultContentTitle` write the two user-owned config values. Empty and whitespace-only strings are literal values; `null` falls through to the next tier. `contentTitle` remains independent from the existing `title` and `poster` concepts.

Media may implement the general, read-only content-data capability by exposing a defined `contentData` bag. `undefined` for the whole bag means the capability is unsupported. A defined bag, including `{}`, opts into content-data notifications. Individual keys may appear or disappear during one attachment, and `null` means a key has no current value.

All content-data fields share the plain `contentdatachange` event. The metadata feature listens whenever `contentData !== undefined`, then re-reads `contentData.title` after each event. Native media does not donate its legacy `title`; DOM media hosts delegate `contentData` and forward its notification event.

## Alternatives considered

- **Publish every input as ordinary state** — exposes implementation ingredients to consumers and obscures which lifecycle owns each value.
- **Keep user configuration in attachment state** — clears user intent when media detaches and couples provider lifetime to media lifetime.
- **Put derived functions inside `state`** — keeps one object shape but makes feature inference substantially harder to read and maintain.

## Deliberate limits

Features need not use every layer, and this design does not prescribe one precedence formula for unrelated state. The content-title example does not define title UI, legacy `title` mapping, poster behavior, vendor integrations, or the precedence rules of other features; those require their own contracts.

## Sources of truth

- Historical player composition: [`rfc/player-api.md`](../../../rfc/player-api.md)
- Media capability rationale: [`internal/design/media/architecture.md`](../media/architecture.md)
- Reactive snapshot decision: [`internal/decisions/store/reactive-state.md`](../../decisions/store/reactive-state.md)
- Store config and derivation: [`packages/store/src/core/`](../../../packages/store/src/core/)
- Metadata feature and tests: [`packages/core/src/dom/store/features/`](../../../packages/core/src/dom/store/features/)
- Media contracts and host forwarding: [`packages/media/src/`](../../../packages/media/src/)
- React and HTML providers: [`packages/react/src/player/`](../../../packages/react/src/player/), [`packages/html/src/player/`](../../../packages/html/src/player/)
