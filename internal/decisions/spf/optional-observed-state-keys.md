---
status: decided
date: 2026-07-30
---

# Allow optional observed state keys for cross-cutting policy inputs

## Decision

A behavior may *observe* a state key it does not declare in `stateKeys`, when the key is an optional policy input whose presence is decided by the feature that writes it. The reader types the slot as optional (`key?: ReadonlySignal<T>`) and reads with optional access; the writer declares the key in its own `stateKeys`, which is what materializes the slot in a composition. An absent slot must mean the neutral policy (e.g. "not suspended").

First use: `loadingSuspended` — "initiate no new loading work." The `loadXSegments` dispatchers park in `'dormant'` while it holds, and `setupMediaSource` holds a pending rebuild (attach runs the element's load algorithm); neither reader declares it. `setupAirPlay` declares and writes it. Compositions without a remote-playback feature (e.g. background-video) carry no slot and pay nothing.

The key deliberately serves both readers ("double duty") because one sentence covers both: don't *initiate* loading work — a segment fetch and an element `load()` alike. Split trigger: the day a writer needs to suspend fetch dispatch and attach-holds independently (e.g. a data-saver policy that parks fetching but permits rebuilds), split into two keys; observed keys have greppable readers, so the split is "add a key, move one read."

## Context

`createComposition` builds one signal map from the union of declared `stateKeys` and passes the full map to every behavior's setup, so slot presence is fixed before any setup runs — an undeclared read is stable, never racy. Declaring cross-cutting policy causes in generic behaviors (the alternative actually tried: `remotePlaybackActive` in every load-segments variant) diffuses feature knowledge: every composition inherits the key, and each new suspension cause means editing the generic behavior. Observed-optional inverts the dependency: the writer opts the composition in; the reader stays cause-agnostic.

## Constraints

- The reader owns the contract type: the key and its value type live on the reader's exported state shape (`SegmentLoadingState['loadingSuspended']`), and writers reference that type. The observed edge is invisible to `ValidateComposition`, so this single type source is what prevents silent shape drift between writer and reader.
- Absence must be the neutral value. A policy whose absence is not safely neutral must be a declared key.
- Document the key as "observed, never declared" at both ends; the edge does not appear in `stateKeys`, so prose is the only discoverability.

## Alternatives considered

- **Declare the key in every reader variant** — pollutes every composition's state shape with a feature-specific key and grows the generic behavior with each new cause.
- **Feature-specific fact read by the generic behavior** (`remotePlaybackActive` in load-segments) — couples segment loading to remote-playback semantics; the cause→policy mapping belongs to the feature.
- **Config-injected gate** — config is scoped to tunables and composition-supplied strategies, not reactive cross-behavior wiring; the state bag is the wiring medium.
