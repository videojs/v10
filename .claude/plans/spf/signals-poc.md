---
status: in-progress
branch: poc/spf-signals
---

# SPF Signals POC — SourceBufferActor Snapshot as a Signal

> **This is an exploratory spike, not a committed implementation plan.** The goal is to get a feel
> for what a signals-based architecture looks like in practice, validate assumptions from
> `internal/design/spf/primitives.md` §5, and surface concrete answers to the open questions
> there. Nothing here is final. Findings should feed back into the primitives design doc.

## Background

The current SPF codebase uses a hand-rolled `createState` container (batched, push-based
subscribable) for both top-level state/owners and actor snapshots. `internal/design/spf/primitives.md`
identifies Observable State as the most consequential open design question and explicitly calls out
the TC39 Signals polyfill as worth evaluating.

The specific pain point motivating this spike is in `end-of-stream.ts`: re-evaluating `shouldEndStream`
requires subscribing to two independent push-based systems (`state`/`owners` changes AND actor
snapshot changes). When `owners` changes and actors appear or are replaced, subscriptions must be
manually torn down and rebuilt. This `activeActorUnsubs` machinery is ~30 lines of bookkeeping that
would disappear if actor snapshots were signals — because a `computed()` transitively tracks through
`owners → actor.snapshotSignal` automatically, re-tracking when the actor reference changes.

## Library Choice

**`signal-polyfill`** (TC39 Stage 1 proposal reference implementation).

Rationale:
- Directly answers the open question from `primitives.md`: "is the TC39 polyfill viable?"
- Has `equals` option on both `Signal.State` and `Signal.Computed` — matches SPF's per-selector
  custom equality use cases
- `Signal.subtle.untrack()` and batching (`beginBatch`/`afterBatch`) are built-in
- Low-level `Watcher` API forces explicit scheduling decisions (a feature, not a bug — see below)
- No framework baggage

Missing from the polyfill but trivial to build: a usable `effect(fn) → cleanup` wrapper (~20 lines
over `Watcher`). This is intentional: writing the scheduler makes the open scheduling question
concrete rather than hiding it behind library defaults.

## Scope

### In scope

- `packages/spf/src/core/signals/effect.ts` — new file; minimal `effect()` helper
- `packages/spf/src/dom/media/source-buffer-actor.ts` — internal `createState` → `Signal.State`;
  expose `snapshotSignal` on the returned actor; keep `snapshot` getter and `subscribe()` as bridges
- `packages/spf/src/dom/features/end-of-stream.ts` — add `WritableState → Signal` bridge for
  `owners`/`state`; collapse `activeActorUnsubs` re-subscription machinery into a single
  `computed()`; drive evaluation with `effect()`

### Explicitly out of scope

- `state`, `owners`, and `WritableState` — untouched; they bridge into signals at the consumer
  call site, not at the source
- `load-segments.ts`, `segment-loader-actor.ts` — untouched (beyond call-site `.snapshot.get()` fixes)
- `engine.ts` — untouched
- Other actors — only `SourceBufferActor` migrated; `SignalActor` interface is defined for future use

## Implementation Plan

### 1. Install `signal-polyfill`

Add to `packages/spf/package.json` dependencies.

### 2. `core/signals/effect.ts` (new)

Minimal `Watcher`-based `effect()`:

```ts
import { Signal } from 'signal-polyfill';

const pending = new Set<Signal.Computed<void>>();

const watcher = new Signal.subtle.Watcher(() => {
  // Scheduling decision: queueMicrotask mirrors current createState.patch() default.
  // Change to synchronous if tests reveal timing issues with flush() removal.
  queueMicrotask(flush);
});

function flush() {
  for (const c of watcher.getPending()) pending.add(c as Signal.Computed<void>);
  watcher.watch(); // re-arm
  for (const c of pending) { pending.delete(c); c.get(); }
}

export function effect(fn: () => void): () => void {
  const c = new Signal.Computed(fn);
  watcher.watch(c);
  c.get(); // initial run
  return () => watcher.unwatch(c);
}
```

The comment on scheduling is the key decision surface this file exposes.

### 3. `source-buffer-actor.ts` — internal state → Signal; `SignalActor` interface

Replace `createState<SourceBufferActorSnapshot>` with `Signal.State`. All `state.patch({ ... })`
calls become `snapshotSignal.set({ ...snapshotSignal.get(), ... })`.

The `state.flush()` calls are **dropped** — `Signal.State` notifies via microtask by default,
matching the prior `createState.patch()` behavior.

`SourceBufferActor` extends `SignalActor` (defined in `actor.ts`). The old `Actor` interface
(with a plain `snapshot` value and `subscribe()`) is removed from this actor. `snapshot` IS the
signal — consumers call `.get()` and use `effect()`/`computed()` directly:

```ts
export interface SignalActor<Status extends string, Context> {
  readonly snapshot: Signal.ReadonlyState<ActorSnapshot<Status, Context>>;
  destroy(): void;
}
```

The `subscribe()` method and plain-value `snapshot` getter are gone. Tests were updated to call
`actor.snapshot.get()` and `effect(() => actor.snapshot.get())` directly.

**`Signal.ReadonlyState<T>` module augmentation** (in `core/signals/effect.ts`):

```ts
declare module 'signal-polyfill' {
  namespace Signal {
    type ReadonlyState<T> = Omit<State<T>, 'set'>;
  }
}
```

Augmenting the `Signal` namespace keeps the type ergonomically consistent with `Signal.State` and
`Signal.Computed`. The internal `snapshotSignal` is `Signal.State` (writable); the public getter
returns `Signal.ReadonlyState` (`.set()` omitted by TypeScript), preventing consumers from writing
actor-internal state.

### 4. `end-of-stream.ts` — bridge + computed + effect

Add a `WritableState → Signal` bridge at the top of `endOfStream()`:

```ts
const stateSignal = new Signal.State(state.current);
const ownersSignal = new Signal.State(owners.current);
const unsubState = state.subscribe(v => stateSignal.set(v));
const unsubOwners = owners.subscribe(v => ownersSignal.set(v));
```

Replace the `combineLatest` subscription + `activeActorUnsubs` machinery with a `computed()` that
tracks through `ownersSignal → actor.snapshotSignal` transitively:

```ts
const shouldEnd = new Signal.Computed(() => shouldEndStream(stateSignal.get(), ownersSignal.get()));
```

`shouldEndStream` reads `actor.snapshot.status` and `actor.snapshot.context.segments` synchronously.
Those now delegate to `snapshotSignal.get()` inside the computed, so the computed auto-tracks the
actor snapshot without any explicit wiring. When `owners` changes and points to a new actor, the
computed re-tracks to the new actor's signal on next evaluation.

Drive the side effect with `effect()`:

```ts
let hasEnded = false;
const cleanupEffect = effect(() => {
  if (!shouldEnd.get()) return;
  if (hasEnded && ownersSignal.get().mediaSource?.readyState !== 'open') return;
  hasEnded = true;
  endOfStreamTask({ currentOwners: ownersSignal.get() }, {}).catch(console.error);
});
```

Cleanup:

```ts
return () => {
  cleanupEffect();
  unsubState();
  unsubOwners();
};
```

The `destroyed` flag, `activeActorUnsubs` array, and the separate owners subscription for actor
re-registration are all gone.

`waitForSourceBuffersReady` is kept as-is for now — it's used inside the async `endOfStreamTask`
and can be revisited later.

## Open Questions This Spike Answers

**1. Does transitive tracking work for actors that appear and disappear?**

When `owners` gets a new `videoBufferActor`, the computed re-evaluates and tracks the new actor's
`snapshotSignal`. When an actor is removed (`undefined`), optional chaining short-circuits. If this
works cleanly in tests, it validates the core premise.

**2. Does dropping `flush()` break ordering?**

`applyResult` currently calls `state.flush()` to fire `end-of-stream`'s subscriber synchronously
after a task completes. With microtask-deferred effects, it fires on the next tick instead.
The hypothesis: this is fine since `endOfStreamTask` is async anyway. Tests will confirm or deny.
If synchronous notification turns out to be necessary, the `effect()` scheduler can be changed to
call `flush()` synchronously in the `Watcher` notify callback.

**3. Does the `WritableState → Signal` bridge feel natural?**

Two subscribe lines at the call site. Explicit and localized. If this is the right pattern, it
scales to other features as they migrate incrementally.

**4. Does the `subscribe()` bridge on the actor behave correctly?**

`waitForSourceBuffersReady` still uses `actor.subscribe()`. The bridge (an `effect` wrapping the
listener) exercises the bridge under the async code path.

## Findings

### `effect()` fires immediately — no separate "immediate fire" needed

The `subscribe()` bridge initially called `listener(snapshotSignal.get())` explicitly before
returning `effect(() => listener(...))`. This caused a double-fire because `effect()` itself runs
synchronously on creation (calls `c.get()` immediately). Fix: remove the explicit call; the initial
effect run delivers the current value. This means the "fires immediately with current value"
semantic is intrinsic to `effect()`, not something callers need to arrange separately.

### Dropping `flush()` did not break any tests or smoke tests

The original `applyResult`, `handleError`, `onPartialContext`, and `destroy` all called
`state.flush()` for synchronous subscriber notification. These were simply removed — `Signal.State`
notifies effects via microtask by default (same as `createState.patch()`). All 707 tests pass and
the `/spf-segment-loading/` sandbox runs end-to-end with full playback, ABR, and end-of-stream.

### Transitive tracking through `owners → snapshotSignal` works

The `activeActorUnsubs` re-subscription machinery (~30 lines) in `end-of-stream.ts` was
replaced by a single `Signal.Computed`. When `owners` changes and introduces a new actor,
the computed re-evaluates and automatically tracks the new actor's `snapshotSignal`. No manual
teardown or re-registration of actor subscriptions required.

### The `WritableState → Signal` bridge is minimal

Two lines of setup per call site:
```ts
const stateSignal = new Signal.State(state.current);
const unsubState = state.subscribe(v => stateSignal.set(v));
```
This is explicit, localized, and easy to follow. It scales cleanly to incremental migration —
each feature can bridge independently without any central change.

### `snapshot` IS the signal — no bridge needed

The original plan preserved `snapshot` (plain value getter) and `subscribe()` as bridges so
existing callers wouldn't need to change. In practice, the call-site changes are mechanical
(`.snapshot.context` → `.snapshot.get().context`) and the bridge adds indirection with no payoff.
The cleaner design: `snapshot` IS the signal. Tests, sandbox, and all callers updated directly.
The `SignalActor` interface formalises this: `snapshot: Signal.ReadonlyState<...>`, no `subscribe`.

`Signal.ReadonlyState<T>` augments the `Signal` namespace (declared in `effect.ts`) rather than
introducing a separate `ReadonlySignal<T>` alias. This keeps the naming convention consistent with
`Signal.State` / `Signal.Computed` and makes the relationship to the polyfill obvious.

### Pre-existing test noise unchanged

5 unhandled fetch-rejection errors in the test suite predate this spike (confirmed by
stashing changes and re-running). All 707 tests pass before and after.
