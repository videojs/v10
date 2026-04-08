# Actor Migration Assessment

Assessment of migrating SPF's segment-related actors to the `createMachineActor` factory.
Written after completing the text track Actor/Reactor spike.

---

## Background

The text track spike produced two reference implementations using `createMachineActor`:

- `TextTracksActor` — cue management, `idle` → `loading` → `idle`
- `TextTrackSegmentLoaderActor` — VTT fetch planning/execution, same FSM shape

Both were clean fits: fire-and-forget message sending, `SerialRunner` as an internal
detail, status transitions driven by `onSettled`.

The segment-loading layer has three actors to consider:
`SegmentLoaderActor`, `SourceBufferActor`, and `loadSegments` (Reactor).

---

## SegmentLoaderActor

**File:** `packages/spf/src/dom/features/segment-loader-actor.ts`

### Fit with `createMachineActor`

Mostly a good fit. Status is effectively `idle | loading` (the `running` boolean),
messages are fire-and-forget, and the `SerialRunner` pattern is already there
conceptually. The FSM would look like:

```
idle    → load message → loading (schedule tasks)
loading → load message → loading (continue or preempt)
loading → runner settles → idle  (via onSettled)
```

### Key blocker: continue/preempt logic

When a new `load` arrives mid-run, the actor decides:

- **Preempt** — in-flight work is not needed for the new plan: `abortAll()` + reschedule.
  This maps cleanly to `SerialRunner`.

- **Continue** — in-flight work IS needed (e.g. currently fetching segment X, new plan
  also needs segment X): let it finish, replace the queued remainder only.
  `SerialRunner` has no concept of "replace queued tasks without aborting the running one."

The continue case exists to avoid re-fetching partially-streamed video/audio segments —
a real bandwidth cost, not just an edge case. Simplifying to always-preempt would be a
regression.

### Recommended path

Add `SerialRunner.replaceQueue(tasks: TaskLike[])` — drops queued (not in-flight) tasks
and enqueues the new list. This is a small, well-scoped addition that maps directly to
the continue case and is independently useful.

With that in place, the `loading` state handler becomes:

```ts
load: (msg, { runner, context, setContext }) => {
  const allTasks = planTasks(msg, context);
  if (inFlightStillNeeded(allTasks, context)) {
    runner.replaceQueue(allTasks.filter(/* exclude in-flight */));
  } else {
    runner.abortAll();
    allTasks.forEach(t => runner.schedule(t));
  }
}
```

In-flight tracking (`inFlightInitTrackId`, `inFlightSegmentId`) would move from
closure-locals into actor context via `setContext`.

---

## SourceBufferActor

**File:** `packages/spf/src/dom/media/source-buffer-actor.ts`

### Does not fit `createMachineActor`

`SourceBufferActor` is a fundamentally different kind of actor. The mismatches are
deep, not surface-level:

1. **Awaitable send** — `send()` returns `Promise<void>`; callers (`SegmentLoaderActor`)
   await it. `createMachineActor.send()` returns `void`. Bridging this would require either
   complicating the factory or losing the awaitable API that the loader depends on.

2. **Context as task output** — In `createMachineActor`, context updates happen synchronously
   inside handlers. In `SourceBufferActor`, context is the *return value* of async tasks:
   each task computes the new `SourceBufferActorContext` from the physical SourceBuffer
   state, and that value becomes the next snapshot. This is an inversion of control that
   doesn't map to `createMachineActor`'s handler model.

3. **`batch()` method** — A distinct multi-message protocol with its own `workingCtx`
   threading between tasks. No `createMachineActor` equivalent.

4. **`onPartialContext`** — Mid-task side-effect writing to the snapshot signal during
   streaming appends (before the task resolves). No hook for this in `createMachineActor`.

### Two actor patterns, not one

This reveals that the codebase has two distinct actor patterns:

| Pattern | Example | `send()` | Context updates | Runner |
|---|---|---|---|---|
| **Command-queue actor** | `SourceBufferActor` | `Promise<void>` (awaitable) | Derived from async task results | Exposed to callers indirectly |
| **Message actor** | `TextTracksActor`, `TextTrackSegmentLoaderActor` | `void` (fire-and-forget) | Set synchronously in handlers | Hidden internal detail |

Both are valid. The question is whether to unify them under a single factory, or
explicitly recognize and document the two patterns.

### Options for unification

**Option A: `createMachineActor` gains awaitable send**
- `send()` returns `Promise<void>`, resolved when the triggered tasks settle.
- Complex: requires tracking which tasks a message schedules and when they complete.
- May also need a way to propagate task results back to context.

**Option B: A separate `createCommandActor` factory**
- Factory for the command-queue pattern: tasks return next context, `send()` is awaitable.
- Keeps `createMachineActor` clean; explicit about the two patterns.

**Option C: Leave `SourceBufferActor` as bespoke**
- It already has a reactive snapshot, `SerialRunner`, and a sound destroy pattern.
- Unifying under a factory would be refactoring for its own sake.
- Revisit only if a second command-queue actor appears and the pattern is worth naming.

**Recommended:** Option C for now. `SourceBufferActor` is well-structured. Revisit
when (if) a second command-queue actor emerges.

---

## loadSegments (Reactor)

**File:** `packages/spf/src/dom/features/load-segments.ts`

Currently a function with signals/effects inline — it is the Reactor layer that
bridges state → `SegmentLoaderActor` messages. Not itself an actor.

Could be rewritten as a class-based Reactor if a `createMachineReactor` pattern is established
(per the primitives.md design). Lower priority than the actor migrations; natural
follow-on after `SegmentLoaderActor` is migrated.

---

## Recommended order

1. Add `SerialRunner.replaceQueue()`.
2. Migrate `SegmentLoaderActor` to `createMachineActor`.
3. Revisit `loadSegments` as a Reactor class.
4. Decide on command-queue actor unification only if a second such actor appears.
