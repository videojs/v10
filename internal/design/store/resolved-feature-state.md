---
status: implemented
date: 2026-08-04
---

# Resolved player feature state

This record defines how a player feature resolves one public value from inputs with different owners and lifetimes. Source, exports, and tests define the current API.

## Media interaction

Media can provide inputs to player features. A feature reads those values when media attaches, listens for media events, and writes changes to its internal state. The store clears media-owned state on detach without clearing user input.

## Consumer experience

A selected feature can accept user input through its React or HTML provider.

For example, `metadataFeature` accepts user input for its `contentTitle` state:

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

HTML exposes the same inputs as `content-title` and `default-content-title`. Consumers read the resolved value through the store and update user input through feature actions such as `setContentTitle`.

## Decision

A feature can use three kinds of state:

- `config` stores user input for the provider lifetime.
- `state` stores feature actions and values read from media. Media-owned values reset on detach.
- `derived` calculates the public value from `config` and `state`.

Features choose their own formula. A value with fallbacks can use:

```ts
providerOverride ?? attachedMediaValue ?? providerFallback ?? featureFallback
```

Only resolved values appear in the public store. Lower-priority values continue updating under an override, so removing the override reveals the latest value.

## Provider adapters

Selected config keys become React props and HTML properties and attributes. Each adapter applies changes through its normal lifecycle. Provider input flows one way: store actions do not rewrite props, properties, or attributes. Adapters must preserve the feature's declared value types.

## Example: content title

The metadata feature resolves `contentTitle` in this order:

1. User `contentTitle`
2. Attached media `contentData.title`
3. User `defaultContentTitle`
4. Feature fallback `""`

`setContentTitle` and `setDefaultContentTitle` update the two user values. Empty strings stop the chain. `null` continues to the next value. `contentTitle` remains independent from the existing `title` and `poster` concepts.

Media provides metadata through `contentData` and emits `contentdatachange` when it changes. An `undefined` bag means the media does not support content data; keys in a defined bag can appear or disappear. The metadata feature reads `contentData.title`, not the legacy media `title` property.

## Alternatives considered

- **Publish every input** — exposes private values and hides which lifecycle owns them.
- **Keep user input in media state** — clears user input when media detaches.
- **Put formulas inside `state`** — makes feature types harder to understand.

## Deliberate limits

Features do not need every kind of state or one shared precedence formula. This record does not define title UI, poster behavior, vendor integrations, or rules for other features.

## Sources of truth

- Store rules: [`internal/decisions/store/reactive-state.md`](../../decisions/store/reactive-state.md), [`packages/store/src/core/`](../../../packages/store/src/core/)
- Metadata and media behavior: [`packages/core/src/dom/store/features/`](../../../packages/core/src/dom/store/features/), [`packages/media/src/`](../../../packages/media/src/)
- Provider adapters: [`packages/react/src/player/`](../../../packages/react/src/player/), [`packages/html/src/player/`](../../../packages/html/src/player/)
