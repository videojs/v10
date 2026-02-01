# Reactive State

**Status:** COMPLETED
**PRs:** [#311](https://github.com/videojs/v10/pull/311), [#321](https://github.com/videojs/v10/pull/321)

## Summary

Simplified state management with explicit mutations and computed values.

PR #311 introduced proxy-based reactivity (Valtio-style). PR #321 replaced it with a simpler `State` + `Computed` design - explicit mutations via `patch` instead of proxy traps, and `Computed` for derived values.

## Key Decisions

| Decision                | Rationale                                                    |
| ----------------------- | ------------------------------------------------------------ |
| Explicit mutations      | `patch()` clearer than proxy assignment                      |
| Frozen snapshots        | `Object.freeze()` on `current` prevents accidental mutations |
| Key-based subscriptions | Built into State, subscribe to specific keys for efficiency  |
| Computed class          | Lazy derivation, notifies only when result actually changes  |
| Auto-batch to microtask | Coalesce rapid mutations, export `flush()` for tests         |

## API

```ts
import { createComputed, createState, flush } from '@videojs/store';

// State
const state = createState({ volume: 1, muted: false });
state.current; // readonly snapshot
state.patch({ volume: 0.8 }); // update one or more keys
state.subscribe(listener); // all changes

// Computed
const effective = createComputed(state, ['volume', 'muted'], ({ volume, muted }) => (muted ? 0 : volume));
effective.current; // derived value (lazy)
effective.subscribe(fn); // notified only when result changes
effective.destroy(); // cleanup
```

## Breaking Changes

Removed from PR #311: `reactive`, `snapshot`, `track`, `batch`, `subscribe`, `subscribeKeys`

Migration: Use `createState()` with `patch()` and `createComputed()` for derived values.

**Note:** `WritableState` now only exposes `patch()`. The `set()` and `delete()` methods were removed as `patch()` covers all use cases.
