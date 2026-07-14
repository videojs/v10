---
status: implemented
date: 2026-05-20
definition: sketched
---

# Preload modes

SPF models native-like preload semantics with two values: the requested preload mode and whether user or programmatic intent has activated loading.

## Implemented decisions

- `none` blocks source work until activation, `metadata` allows manifest/MediaSource/initialization work, and `auto` permits segment loading.
- Play and seeking activate loading. Activation is sticky for the current source and resets when the source changes.
- Keep DOM preload synchronization separate from activation tracking so adapter input and engine intent cannot overwrite each other accidentally.
- Default to metadata-like behavior and preserve unknown extended values in state for forward compatibility without reflecting them as invalid DOM values.
- Downstream behaviors consume derived gates rather than reinterpreting preload independently.

## Deferred scope

More granular modes, deactivation after activation, and additional activation triggers require their own use cases.

## Current sources of truth

- Preload state machine and tests: `packages/spf/src/playback/behaviors/sync-preload.ts` and `packages/spf/src/playback/behaviors/tests/sync-preload.test.ts`
- DOM activation tracking and tests: `packages/spf/src/playback/behaviors/dom/track-load-triggers.ts` and its colocated tests
- Shared preload helpers: `packages/spf/src/media/utils/preload.ts`
