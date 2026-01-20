# Reactive State

**Status:** COMPLETED
**PR:** [#311](https://github.com/videojs/v10/pull/311)

## Summary

Replaced class-based `State` with proxy-based reactive primitives inspired by Valtio.

## Key Decisions

| Decision                      | Rationale                                            |
| ----------------------------- | ---------------------------------------------------- |
| Auto-batch to microtask       | Coalesce rapid mutations, export `flush()` for tests |
| React: `useSyncExternalStore` | Version counter for change detection                 |
| Lit: `SnapshotController`     | `host.requestUpdate()` + optional callback           |

## API

```ts
import { batch, flush, reactive, snapshot, subscribe, subscribeKeys, track } from '@videojs/store';
```

## Breaking Changes

Removed: `useMutation`, `useOptimistic`, `useSelector`, `MutationController`, `OptimisticController`, `SelectorController`

Migration: Use `useSnapshot(store.state)` and `subscribe(store.state, fn)` instead.
