# Queue Simplification

> **STATUS: COMPLETED**

## Summary

Simplified Queue from ~524 LOC to ~405 LOC. Removed convenience features only used in tests/docs, kept what's essential for async media operations.

## Why Queue Exists

All writes are async requests — this is the architecture. Queue handles:

- Supersession (rapid clicks → only last executes)
- AbortController propagation
- Task lifecycle tracking (pending/success/error)
- Error surfacing for UI

## Features Removed

- `cancel()` method (use `abort()`)
- `flush()` method (no configurable scheduling)
- `queued` getter (internal detail)
- `TaskScheduler` type, `QueueConfig` interface
- `delay()`, `microtask` exports
- `schedule` param on `QueueTask`
- `onDispatch`, `onSettled` hooks
- DOM schedulers (`raf()`, `idle()`)

## Files Changed

| File                      | Change                               |
| ------------------------- | ------------------------------------ |
| `core/queue.ts`           | Main simplification                  |
| `core/task.ts`            | NEW: Extracted task types and guards |
| `core/index.ts`           | Added task.ts export                 |
| `core/request.ts`         | Removed schedule field               |
| `core/store.ts`           | Removed schedule from enqueue        |
| `dom/`                    | DELETED entire directory             |
| Various controllers/hooks | Updated imports                      |

## Final API

```ts
interface Queue<Tasks> {
  readonly tasks: TasksRecord<Tasks>;
  readonly destroyed: boolean;
  enqueue<K>(task: QueueTask<K>): Promise<Tasks[K]['output']>;
  abort(name?: keyof Tasks): void;
  reset(name?: keyof Tasks): void;
  destroy(): void;
  subscribe(listener: QueueListener<Tasks>): () => void;
}
```

## Bundle Size

| Scenario                            | Gzipped |
| ----------------------------------- | ------- |
| Minimal (createStore + createSlice) | 2.3 KB  |
| Full entry (all exports)            | 3.0 KB  |
