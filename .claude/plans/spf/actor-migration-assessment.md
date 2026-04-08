# Actor Migration Assessment

Assessment of migrating SPF's segment-related actors to the `createMachineActor` factory.
Written after completing the text track Actor/Reactor spike. **Partially stale** — see
inline notes for what has been completed.

---

## Background

The text track spike produced reference implementations using three actor patterns:

- `TextTracksActor` — uses `createTransitionActor` (reducer-style, no FSM)
- `TextTrackSegmentLoaderActor` — manual `CallbackActor` (lightweight, no framework)
- Reactors (`syncTextTracks`, `loadTextTrackCues`) — use `createMachineReactor`

The segment-loading layer had three actors to consider:
`SegmentLoaderActor`, `SourceBufferActor`, and `loadSegments` (Reactor).

---

## SegmentLoaderActor ✅ (Completed)

**File:** `packages/spf/src/dom/features/segment-loader-actor.ts`

Migrated to `createMachineActor` with `idle`/`loading` states, `onSettled: 'idle'`,
and continue/preempt logic. The continue case uses `SerialRunner.abortPending()` (added
during migration) — drops queued tasks without touching the in-flight task. In-flight
tracking (`inFlightInitTrackId`, `inFlightSegmentId`) lives in actor context via
`setContext`/`getContext`.

---

## SourceBufferActor ✅ (Completed)

**File:** `packages/spf/src/dom/media/source-buffer-actor.ts`

Migrated to `createMachineActor` with `idle`/`updating` states, `onSettled: 'idle'`,
and a `cancel` message in the `updating` state. The four originally-identified blockers
were resolved:

1. **Awaitable send** — `SegmentLoaderActor` now observes completion via
   `waitForIdle(snapshot, signal)` rather than awaiting `send()` directly.
2. **Context as task output** — tasks return new context; `.then(setContext)` commits it.
   `getContext` threading ensures each task reads the context committed by the previous task.
3. **`batch()`** — implemented as a message type; handler iterates and schedules all tasks.
4. **Partial updates** — `setContext()` called mid-task for streaming segment progress.

---

## loadSegments (Reactor)

**File:** `packages/spf/src/dom/features/load-segments.ts`

Currently a function with signals/effects inline — it is the Reactor layer that
bridges state → `SegmentLoaderActor` messages. Not itself an actor.

Could be rewritten as a class-based Reactor if a `createMachineReactor` pattern is established
(per the primitives.md design). Lower priority than the actor migrations; natural
follow-on after `SegmentLoaderActor` is migrated.

---

## Status

- ✅ `SegmentLoaderActor` — migrated to `createMachineActor` (with `abortPending()` instead of `replaceQueue()`)
- ✅ `SourceBufferActor` — migrated to `createMachineActor`
- ⬜ `loadSegments` — still function-based; natural follow-on as a `createMachineReactor` migration
