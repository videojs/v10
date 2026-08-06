---
status: implemented
date: 2026-08-04
---

# Resolved player feature state

This record defines how a player feature resolves one public value from inputs with different owners and lifetimes. Source and tests define the current behavior.

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

- User-owned and media-owned inputs live in private, symbol-keyed source `state`.
- A feature's `config` map connects each user-facing input to its private state key and private action.
- `derived` calculates the public value from source state.

Features choose their own formula. A value with fallbacks can use:

```ts
userOverride ?? attachedMediaValue ?? userFallback ?? featureFallback
```

Only resolved values appear in the public store. Lower-priority values continue updating under an override, so removing the override reveals the latest value.

The config declaration also identifies lifecycle ownership. Authors check the map against the feature's source state:

```ts
config: {
  contentTitle: {
    action: SET_USER_CONTENT_TITLE,
    state: USER_CONTENT_TITLE,
  },
} satisfies PlayerFeatureConfig<MetadataSourceState>
```

The feature-level `config` object is routing metadata, not a second place that stores values. `action` must name a private source-state action that accepts `string | null | undefined`; `null` and `undefined` clear an absent input. `state` names the provider-owned source-state key, and `definePlayerFeature` uses it to derive the store's detach-persistence keys. Detach restores ordinary source state to its initial values while preserving the mapped provider-owned keys. Media state therefore resets, while provider and imperative user values survive.

## Provider adapters

Selected config keys become React provider props and HTML provider properties and attributes. Their TypeScript value types come from the mapped action's parameter. Each adapter applies changes through its normal lifecycle by invoking that private action. Configuration flows one way: store actions do not rewrite props, properties, or attributes.

React seeds a new store before the first render, then forwards only committed prop changes after render. HTML forwards reactive property changes and kebab-cases the corresponding attribute names.

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
- **A generic store config namespace** — gives user values a separate lifetime automatically and permits atomic patches, but adds config snapshots, controllers, generics, and a second input API throughout the store.
- **Replay provider props after detach** — cannot preserve imperative user writes and risks restoring stale props.
- **Put formulas inside `state`** — makes feature types harder to understand.

## Tradeoffs

The config map is narrow and feature-owned, and ordinary store actions handle every user write. In exchange, each configurable value needs a private source key plus a private action, and the store needs explicit detach-persistence metadata.

Adapters invoke actions one at a time, and the store derives a snapshot after each action. Subscriber notification is coalesced, so normal consumers observe the final values. The behavioral difference appears on failure: if a later action or derived formula throws, earlier actions remain applied. A generic store-config patch can derive a multi-key update before committing any of it. This design does not add a separate batching abstraction.

## Deliberate limits

Features do not need every kind of state or one shared precedence formula. This record does not define title UI, poster behavior, vendor integrations, or rules for other features.

## Sources of truth

- Store rules: [`internal/decisions/store/reactive-state.md`](../../decisions/store/reactive-state.md), [`packages/store/src/core/`](../../../packages/store/src/core/)
- Metadata and media behavior: [`packages/core/src/dom/store/features/`](../../../packages/core/src/dom/store/features/), [`packages/media/src/`](../../../packages/media/src/)
- Provider adapters: [`packages/react/src/player/`](../../../packages/react/src/player/), [`packages/html/src/player/`](../../../packages/html/src/player/)
