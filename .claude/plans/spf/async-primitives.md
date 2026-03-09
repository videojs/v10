---
status: decided
date: 2026-03-02
---

# SPF Async Primitives: Task, Actor, and Runner

## Problem

The SPF pipeline has two distinct async needs that resist a single abstraction:

1. **Ephemeral work** — fetch a segment, append an init chunk, flush a range. These
   are discrete operations: they start, do something, finish (or fail), and are gone.
   Callers need to know the outcome — what value was produced, whether an error occurred.

2. **Persistent state** — a `SourceBufferActor` that owns the MSE operation queue and
   its shadow state models indefinitely. It cycles between `idle` and `updating` across
   its entire lifetime. It is never "done."

Forcing these into the same abstraction produces awkward compromises: a persistent actor
with meaningless `done`/`error` terminal states, or an ephemeral task that pretends to
have an ongoing reactive lifecycle it doesn't need.

The solution is two complementary primitives — **Task** and **Actor** — sharing design
philosophy but not a type hierarchy.

---

## The Two Primitives at a Glance

| | Task | Actor |
|---|---|---|
| Lifetime | Ephemeral — runs once, then done | Persistent — lives until `destroy()` |
| Status | Linear: `pending → running → done/error` | Cyclic: `idle ↔ updating` (application-defined) |
| Terminal states | Yes — `done`, `error` | No |
| State access | Flat properties: `status`, `value`, `error` | `actor.snapshot` wrapper object |
| Reactivity | None yet — sync read only | `actor.subscribe(listener)` fires immediately |
| Driven by | Its own `run()` | External `send()` messages |
| Output | Typed value via `Promise<TValue>` + `task.value` | Ongoing `context` |
| Cleanup | `abort()` | `destroy()` |

---

## Task\<TValue, TError\>

A Task is a single unit of async work with a typed output and typed error.

```ts
type TaskStatus = 'pending' | 'running' | 'done' | 'error';

interface Task<TValue = void, TError = unknown> {
  readonly id: string;
  readonly status: TaskStatus;
  readonly value: DeepReadonly<TValue> | undefined;
  readonly error: DeepReadonly<TError> | undefined;
  run(): Promise<TValue>;
  abort(): void;
}
```

`DeepReadonly<T>` recursively marks all properties readonly, preventing callers from
mutating the task's output or error after completion. The getter implementation casts
from the internally-held `TValue` / `TError` to satisfy the type:

```ts
get value(): DeepReadonly<TValue> | undefined {
  return this.#value as DeepReadonly<TValue> | undefined;
}
```

`DeepReadonly` is a utility type — the standard recursive definition, to live in
`@videojs/utils` or a shared types module:

```ts
type DeepReadonly<T> =
  T extends (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
```

**Lifecycle:**

```
pending  ──run()──▶  running  ──resolves──▶  done
                        │
                        └──rejects──▶  error
```

Status progresses linearly and terminates. `value` is set immediately **before**
`status` transitions to `'done'` — any reader observing `status === 'done'` is
guaranteed `value` is already present. Likewise, `error` is set immediately before
`status` transitions to `'error'`. Reading either before that point returns `undefined`.

**`run()` returns the value.** This is the primary API for imperative callers — they
`await task.run()` and get the result directly. `task.value` is secondary: it allows
after-the-fact inspection of a task that has already completed without re-awaiting.

**`id` for deduplication.** The id enables Runners to deduplicate or key in-flight
work. See [Runners](#runners).

**No `subscribe()` yet.** A sync read of `task.status` / `task.value` is sufficient
for a short-lived operation. If reactivity is needed later (e.g. observing `running →
done` transitions), `subscribe()` can be added — the design doesn't preclude it.

**`TValue = void` default.** Tasks that have no meaningful output (pure side-effect
operations) use `Task<void>`. The `value` property is always `undefined` in this case;
callers use the resolved Promise as the completion signal.

### Relationship to XState Promise Actors

XState v5 models promise actors with a near-identical snapshot shape:
`status: 'active' | 'done' | 'error' | 'stopped'`, `output: TOutput`, `error`. The
conceptual equivalence is deliberate — `done + value` in a Task is the same as a
state machine that enters a terminal `done` state with the output as context.

We don't formalize this equivalence in the type hierarchy (Task does not extend Actor).
The conceptual parallel is enough; the concrete needs of each abstraction diverge.

---

## Actor\<Status, Context\>

An Actor is a persistent state machine that owns its snapshot and notifies observers.

```ts
interface ActorSnapshot<Status extends string, Context> {
  status: Status;
  context: Context;
}

interface Actor<Status extends string, Context> {
  readonly snapshot: ActorSnapshot<Status, Context>;
  subscribe(listener: (snapshot: ActorSnapshot<Status, Context>) => void): () => void;
  destroy(): void;
}
```

`Status` is application-defined — a bounded string union specific to the Actor's
domain (`'idle' | 'updating'` for `SourceBufferActor`, not the generic Task lifecycle).
`Context` is the non-finite data the Actor manages.

**`snapshot` wraps both fields.** This is intentional: the snapshot is a named concept
— "the current state of this state machine at this moment." Atomicity matters here; you
read `snapshot` once and then read `.status` and `.context` from that same reference,
guaranteed to be from the same point in time.

**`subscribe` fires immediately.** New subscribers receive the current snapshot on
registration, then subsequent updates. Returns an unsubscribe function.

**No terminal states.** An Actor's `Status` type should not contain terminal states
like `done` or `error`. The Actor is alive until `destroy()` is called. If terminal
behavior is needed, model it as a specific status value in the application domain.

### `SourceBufferActor` — the primary Actor in SPF

See [buffer-state-shadow-actual-model.md](buffer-state-shadow-actual-model.md)
for the full design. In brief: `SourceBufferActor` wraps a `SourceBuffer`, serializes
MSE operations (one at a time, per the MSE spec), and atomically updates both the
segment model and the `bufferedRanges` shadow after each operation.

```ts
type SourceBufferActorStatus = 'idle' | 'updating';

interface SourceBufferActorContext {
  initTrackId?: string;
  segments: SegmentRecord[];
  bufferedRanges: BufferedRange[];
}

interface SourceBufferActor
  extends Actor<SourceBufferActorStatus, SourceBufferActorContext> {
  send(message: SourceBufferMessage, signal: AbortSignal): Promise<void>;
  batch(messages: SourceBufferMessage[], signal: AbortSignal): Promise<void>;
}
```

### Deliberate departure from XState

XState actors use `actor.send(event): void` — synchronous, fire-and-forget. Callers
react to state changes via `subscribe`, never by awaiting individual sends.

`SourceBufferActor.send()` returns `Promise<void>`. This is intentional: callers like
`loadSegments` need to know when an operation completes before deciding what to do next
(await append → read updated state → decide on next segment). The Promise is a natural
fit for this imperative decision loop. The Actor still owns its state and exposes it
reactively — the departure is only in how callers interact with individual operations.

---

## Runners

A Runner schedules Tasks. The scheduling strategy is separated from the Task itself.

```ts
interface TaskLike<TValue = void> {
  readonly id: string;
  run(): Promise<TValue>;
  abort(): void;
}
```

**`ConcurrentRunner`** — runs tasks concurrently, deduplicated by id. Already in use
for track resolution in `resolve-track.ts`. If a task with a given id is already
in-flight, subsequent schedule calls for that id are ignored until it completes.

**`SerialRunner`** — runs tasks one at a time, in submission order. The natural fit for
`SourceBufferActor` (MSE requires serial operation), and the named complement to
`ConcurrentRunner`. Currently implemented as the internal `drain()` loop in
`source-buffer-actor.ts`; will be extracted as a named abstraction when the Task
refactor lands.

```ts
// Conceptual interface — implementation pending
interface SerialRunner {
  schedule<TValue>(task: TaskLike<TValue>): Promise<TValue>;
  abortAll(): void;
  destroy(): void;
}
```

Both runners own in-flight task references so `abortAll()` / `destroy()` can cancel
any pending work — e.g. on engine teardown.

---

## Design Decisions

### Task has flat properties, not a `snapshot` wrapper

**Decision:** `task.status`, `task.value`, `task.error` as direct properties.

**Alternatives:**
- `task.snapshot.status` / `task.snapshot.value` — consistent with Actor's API shape

**Rationale:** Task is not a state machine. There is no "current snapshot" concept for
a short-lived operation — there are just three things you can read about it right now.
The `snapshot` wrapper on Actor is meaningful because Actor's state is an ongoing,
named thing. Forcing that framing onto Task would be vocabulary for vocabulary's sake.

The cost: TypeScript won't narrow `task.value` to `TValue` (from `TValue | undefined`)
after checking `task.status === 'done'`, because flat properties don't form a
discriminated union on the Task object. The ordering guarantee (value is written before
status transitions) means the assertion is always safe at runtime — the compiler just
can't prove it. In practice this rarely matters anyway: callers get the value from
`await task.run()` and use `task.value` only for inspection after the fact.

### Task and Actor are parallel designs, not an inheritance hierarchy

**Decision:** No shared base interface or extension relationship.

**Alternatives:**
- `Task<TValue>` extends `Actor<TaskStatus, { value?: TValue }>` — maximum reuse
- Shared `Reactive<TSnapshot>` base for the observable-state pattern

**Rationale:** Task has terminal states; Actor doesn't. Task produces a value; Actor
manages ongoing context. Task is driven by `run()`; Actor by `send()`. Forcing Task
into Actor's shape (`context: { value?: TValue }`) misrepresents the semantics. A
shared `Reactive<TSnapshot>` base names a concept that currently only has two instances
— an abstraction for two things risks over-engineering.

The shared design philosophy (snapshot-like readable state, abort/cleanup mechanism,
`id` for coordination) is captured at the conceptual level. Task and Actor are
separately implemented with no shared runtime machinery — Task uses plain private
mutable fields; Actor uses `WritableState` for its reactive snapshot.

### Both `TValue` and `TError` are type parameters on Task

**Decision:** `Task<TValue = void, TError = unknown>`.

**Rationale:** `TError = unknown` is safe and idiomatic TypeScript — callers must
narrow before using. Parameterizing it allows specific tasks to declare a narrower
error contract when known (e.g. `Task<ArrayBuffer, NetworkError>`), which aids callers
that handle errors specifically. `TValue = void` preserves backward compatibility
for side-effect-only tasks.

### No `subscribe()` on Task (yet)

**Decision:** Task exposes only synchronous `status`, `value`, `error` reads.

**Rationale:** The lifecycle is short and the primary consumption pattern is
`await task.run()`. Reactivity on an ephemeral object solves a problem that doesn't
currently exist. If a future use case requires observing task lifecycle transitions
(e.g. a progress UI for a long-running task), `subscribe()` can be added — at that
point a reactive backing (e.g. `WritableState`) would be introduced.

---

## Open Questions

1. **SerialRunner extraction timing.** Currently the serial queue lives as `drain()`
   inside `createSourceBufferActor`. The extraction into a named `SerialRunner` is
   anticipated but deferred until the broader Task refactor of `source-buffer-actor`
   lands. The drain loop's status management (`status: 'updating'/'idle'`) needs to
   remain in the actor, not in SerialRunner — the actor wraps task execution with
   state transitions; the runner only handles sequencing.

2. **Atomic context updates.** Currently `execute()` patches context directly during
   a message, producing an intermediate snapshot where `status: 'updating'` but
   `context` already reflects the new data. The XState-aligned approach would have
   `execute()` return a context delta, with drain applying it atomically alongside the
   `idle` transition. This is deferred to the Phase 2 `loadSegments` refactor.

3. **`Task<void>` value property.** When `TValue = void`, `task.value` is always
   `undefined`. Whether to suppress the `value` property entirely for void tasks
   (via conditional type) or leave it as `undefined` is TBD — current leaning is to
   leave it for simplicity.
