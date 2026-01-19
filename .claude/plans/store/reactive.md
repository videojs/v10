# Reactive State

**Status:** COMPLETE  
**PR:** [#311](https://github.com/videojs/v10/pull/311)

Replaced class-based `State` with proxy-based reactive primitives. Inspired by [Valtio](https://github.com/pmndrs/valtio).

## API

```ts
import { batch, flush, reactive, snapshot, subscribe, subscribeKeys, track } from '@videojs/store';
```

| Export                           | Purpose                                        |
| -------------------------------- | ---------------------------------------------- |
| `reactive(initial)`              | Create reactive state with parent bubbling     |
| `isReactive(value)`              | Check if value is reactive                     |
| `subscribe(state, fn)`           | Subscribe to all changes                       |
| `subscribeKeys(state, keys, fn)` | Subscribe to specific key changes              |
| `batch(fn)`                      | Group mutations, flush after                   |
| `flush()`                        | Force pending notifications (for tests)        |
| `snapshot(state)`                | Return frozen shallow copy                     |
| `track(state)`                   | Track property access for fine-grained updates |

## Key Behaviors

- **Auto-batching** — Notifications deferred to microtask
- **Nested tracking** — Auto-wraps nested objects, changes bubble to parents
- **Synchronous reads** — Mutations apply immediately, only notifications are deferred

## Decisions

| Question      | Decision                                                             |
| ------------- | -------------------------------------------------------------------- |
| Batching      | Auto-batch to microtask. Export `flush()` for tests.                 |
| React pattern | `useSyncExternalStore` with version counter for change detection     |
| Lit pattern   | `SnapshotController` with `host.requestUpdate()` + optional callback |

## Breaking Changes

**Removed:**

- React: `useMutation`, `useOptimistic`, `useSelector`
- Lit: `MutationController`, `OptimisticController`, `SelectorController`

**Migration:**

| Before                              | After                                 |
| ----------------------------------- | ------------------------------------- |
| `useSelector(store, s => s.volume)` | `useSnapshot(store.state).volume`     |
| `useMutation(store, 'play')`        | `useSnapshot(store.queue.tasks).play` |
| `SelectorController`                | `SnapshotController`                  |
| `store.subscribe(fn)`               | `subscribe(store.state, fn)`          |

## Testing

Use `flush()` for synchronous assertions:

```ts
state.volume = 0.5;
flush();
expect(listener).toHaveBeenCalledOnce();
```
