# Queue Simplification

**Status:** COMPLETED

## Summary

Simplified Queue from ~524 LOC to ~405 LOC. Removed convenience features only used in tests/docs, kept essentials for async media operations.

## Why Queue Exists

All writes are async requests. Queue handles:

- Supersession (rapid clicks → only last executes)
- AbortController propagation
- Task lifecycle tracking (pending/success/error)
- Error surfacing for UI

## Removed

- `cancel()`, `flush()`, `queued` getter
- `TaskScheduler`, `QueueConfig`, `schedule` param
- `delay()`, `microtask`, DOM schedulers (`raf()`, `idle()`)
- `onDispatch`, `onSettled` hooks

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
