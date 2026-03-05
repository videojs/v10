---
status: draft
date: 2026-03-04
---

# SPF Segment Loading Pipeline

How media segments move from a playlist into a SourceBuffer, and how the
system stays consistent across seeks and aborts.

---

## The Core Problem

Loading segments into a MediaSource `SourceBuffer` involves three hard
constraints that interact badly:

1. **SourceBuffer operations are exclusive.** Only one operation (`appendBuffer`,
   `remove`) may be in flight at a time. Starting a second before the first
   fires `updateend` throws an `InvalidStateError`.

2. **Seeks interrupt in-progress work.** A task loading segments for position 0
   must be aborted when the user seeks to position 60. But abort can happen at
   any point — mid-fetch, mid-append, between segments.

3. **The decision to load more segments depends on what's already loaded.** A
   reactive subscriber (`shouldLoadSegments`) checks state on every tick to
   decide whether to trigger a new task. If that state is transiently wrong —
   because an abort left it half-updated — the player stalls or re-fetches
   data it already has.

---

## Moving Pieces

### SourceBufferActor

[`source-buffer-actor.ts`](../../../packages/spf/src/dom/media/source-buffer-actor.ts)

Wraps a single `SourceBuffer` and serializes all operations against it. Owns
an internal model (its _context_) of what is currently in the buffer:

```ts
interface SourceBufferActorContext {
  initTrackId?: string;            // which track's init segment is loaded
  segments: SegmentRecord[];       // media segments with timing metadata
  bufferedRanges: BufferedRange[]; // snapshot of sourceBuffer.buffered
}
```

Operations are submitted as typed messages (`append-init`, `append-segment`,
`remove`) via `send()` (single) or `batch()` (atomic group). The context is
only updated after a message executes — never mid-operation.

**Why an actor?** A raw `SourceBuffer` has no model. Callers previously
patched `state.bufferState` inline after each operation; an abort anywhere in
a multi-step task left state partially updated. The actor collapses that into
a single atomic update per `send`/`batch` call.

**Lifecycle.** The actor is created when a `SourceBuffer` becomes available
and destroyed when it is removed. It lives inside `loadSegments`, co-located
with its only consumer. It is _not_ wired at the engine level: every
`owners` patch wakes all `combineLatest` subscribers; actor creation at the
engine would cause spurious mid-task re-evaluations.

---

### loadSegments

[`load-segments.ts`](../../../packages/spf/src/dom/features/load-segments.ts)

The orchestrator. Subscribes to `combineLatest([state, owners])` and runs a
task loop that loads and flushes segments for one track type (video or audio).

**Task loop invariant:** at most one executing task and one pending snapshot.
When a state change arrives while a task is in flight, the new snapshot
displaces any previous pending one. When the task finishes, the loop picks up
the pending snapshot (if any) and re-evaluates.

**Seek detection.** Before starting each task iteration, the loop records
which segment IDs it intends to load (`taskSegmentIds`). If a state change
arrives mid-task where all _needed_ segments are completely disjoint from
`taskSegmentIds`, the current task is aborted. This is a conservative check:
overlapping segment sets are left to complete.

---

### loadSegmentsTask

The individual unit of work. Runs in three phases:

```
Phase 1 — Remove   →  Phase 2 — Fetch   →  Phase 3 — Append
(actor.send/batch)     (network I/O)         (actor.send/batch)
```

**Phase 1 (Remove).** All `remove` operations are submitted to the actor
_before_ any network I/O. This ensures the buffer model is consistent with the
physical `SourceBuffer` even if the signal is aborted mid-fetch.

**Phase 2 (Fetch).** Sequential network I/O. Abortable at any fetch boundary.
Bandwidth is sampled immediately after each segment fetch so ABR sees fresh
data.

**Phase 3 (Append).** Init + media segments are batched to the actor. If the
signal was aborted during Phase 2, init data is still appended (it is codec
metadata — position-independent, and appending it avoids a redundant re-fetch
on the next task). Media segments fetched for the wrong seek position are
dropped.

**State sync.** A `try/finally` calls `syncActorToState()` at task exit
regardless of success, abort, or error. This pushes the actor's context into
`state.bufferState` so external consumers see up-to-date state after the task
completes.

---

### state.bufferState

Part of `PlaybackEngineState`. Tracks which segments have been loaded per
track type:

```ts
interface BufferState {
  video?: SourceBufferState;
  audio?: SourceBufferState;
}

interface SourceBufferState {
  initTrackId?: string;
  segments: Array<{ id: string; trackId: string }>;
}
```

This is a _projection_ of the actor's context into global state. It is written
exclusively by `syncActorToState` at task exit.

**Who reads it:**

| Consumer | What it needs |
|---|---|
| `shouldLoadSegments` | Which segments are loaded, to avoid re-fetching |
| `loadSegmentsTask` | `initTrackId` (needsInit), segment list (bufferedSegments) |
| `endOfStream` | Whether the last segment of the presentation has been loaded |

---

### shouldLoadSegments

A pure function that inspects `state` and `owners` to decide whether a
segment-loading task should run. Called at the top of every task loop
iteration and from the `combineLatest` subscriber.

Checks: track selected and resolved → SourceBuffer exists → preload mode
allows loading → forward buffer window has unloaded segments OR stale forward
content needs flushing.

**Architectural note.** `shouldLoadSegments` lives inside `loadSegments`
where `actor` is in scope. It currently reads from `state.bufferState` rather
than `actor.snapshot.context`. See [Open Questions](#open-questions).

---

### endOfStream

[`end-of-stream.ts`](../../../packages/spf/src/dom/features/end-of-stream.ts)

A separate `combineLatest` subscriber that watches `[state, owners]` and calls
`mediaSource.endOfStream()` once the last segment of every selected track has
been appended.

**How it detects completion.** It checks `state.bufferState` for whether the
last segment ID of each resolved track appears in the loaded segments list.
This is ID-based (not range-based) so it is robust across quality switches and
back-buffer flushes.

**MediaSource reopen.** Calling `appendBuffer()` on a SourceBuffer after
`endOfStream()` transitions the `MediaSource` back to `'open'`. The
`endOfStream` subscription monitors for this and re-signals when conditions
are met again (seek-back past what was buffered).

**Why this matters for rearchitecture.** `endOfStream` is an _external_
consumer of buffer state — it has no access to the actor. Any change to how
buffer state is published to global state must account for this subscriber
still being able to determine "has the last segment loaded?"

---

## Data Flow

```
                         ┌─────────────────────────────────────────┐
                         │            loadSegments                  │
                         │                                          │
  state + owners ──────► │  combineLatest subscriber                │
                         │       │                                  │
                         │       ├─ shouldLoadSegments?             │
                         │       │       reads: state.bufferState   │
                         │       │                                  │
                         │       └─► runTaskLoop                    │
                         │               │                          │
                         │               └─► loadSegmentsTask       │
                         │                       │                  │
                         │                Phase 1: actor.remove     │
                         │                Phase 2: fetch            │
                         │                Phase 3: actor.append     │
                         │                       │                  │
                         │                       └─ finally:        │
                         │                syncActorToState()        │
                         │                writes: state.bufferState │
                         └─────────────────────────────────────────┘

  state.bufferState ───► shouldLoadSegments (next iteration)
  state.bufferState ───► endOfStream (separate subscriber)
```

---

## Key Invariants

1. **One operation at a time.** The actor rejects `send`/`batch` while
   `status === 'updating'`. Only one task runs at a time in the loop.

2. **Atomic model updates.** The actor's context changes only when an
   operation completes. `state.bufferState` changes only when `syncActorToState`
   runs (task exit).

3. **Remove before fetch.** Phase 1 completes before Phase 2 begins. The
   buffer model reflects removes even if the task is aborted during the fetch.

4. **Init is always committed.** Once init data is in hand, it is appended
   to the actor regardless of signal state. Prevents redundant re-fetches
   after seek-abort.

5. **endOfStream sees consistent state.** Because `syncActorToState` runs in
   `finally`, `state.bufferState` always reflects a completed-task snapshot
   when `endOfStream` evaluates.

---

## Decisions

### Actor as SourceBuffer abstraction

**Decision:** Wrap `SourceBuffer` in an actor that serializes operations and
owns the buffer model, rather than calling `appendBuffer`/`remove` directly.

**Alternatives:**
- **Direct calls + inline state patches** — Simple, but leaves state
  partially updated on abort. The original stall bug.
- **Direct calls + local accumulator + try/finally** — Fixes atomicity without
  an actor, but loses the serialization and model-tracking benefits.

**Rationale:** The actor provides a clean boundary: callers submit _intent_
(messages), the actor ensures serial execution and model consistency. The
`batch()` API makes multi-step operations (remove + append) atomic from the
caller's perspective.

---

### syncActorToState at task exit, not on every actor transition

**Decision:** Sync actor context → `state.bufferState` once at task exit via
`try/finally`, not via a `subscribe` bridge on the actor.

**Alternatives:**
- **Subscribe bridge on actor** — Fires on every idle transition. Causes
  intermediate fires _between_ the remove phase and append phase of a single
  task. `shouldLoadSegments` sees a state with removes applied but appends
  not yet applied, triggering spurious re-evaluations.

**Rationale:** Intermediate states are an implementation detail. External
consumers should only observe stable snapshots — after a complete task
unit, not between its internal steps.

---

### Segment model: time-aligned deduplication

**Decision:** When tracking appended segments, deduplicate by `startTime`
(with a small epsilon) rather than interval overlap.

**Alternatives:**
- **Interval overlap** — Removes any segment whose time range overlaps the
  new segment. Inaccurate for non-boundary flushes (partial physical overlap
  is not modeled).
- **ID-based** — Correct for same-track re-appends but doesn't handle
  cross-track deduplication (different IDs for same time slot).

**Rationale:** Current playlists are time-aligned across quality levels.
A segment at the same `startTime` is definitionally the same slot.
Non-boundary flushes are not yet in scope.

---

### Segment model: post-flush bufferedRanges for removes

**Decision:** After a `remove` operation, retain only segments whose midpoint
falls within the post-flush `sourceBuffer.buffered` ranges.

**Alternatives:**
- **Interval arithmetic** — Remove segments whose range overlaps the remove
  range. Inaccurate when the remove is not at a segment boundary.

**Rationale:** `sourceBuffer.buffered` is the ground truth. Midpoint
membership is a good heuristic for "is this segment still meaningfully in
the buffer?" without requiring knowledge of exact flush boundaries.
Non-boundary flushes are not yet in scope.

---

## Architectural Tensions

The current implementation works but has several compounding tensions that
make it brittle and hard to reason about as complexity grows.

### The subscribe problem

`combineLatest([state, owners])` fires on _any_ state change, including writes
that `loadSegments` itself produces (`bufferState`, `bandwidthState`). The
subscriber callback is doing multiple jobs at once: checking conditions,
managing task state, detecting seeks, and storing pending snapshots. There is
no named relationship between a trigger and its effect — everything is an
implicit, ad-hoc callback.

`create-state.ts` already supports selector-based subscriptions that only fire
when a specific slice changes. These are not yet used in `loadSegments`.

### The ephemeral task problem

`loadSegmentsTask` is a one-shot async function: created, runs, discarded.
The work it represents — deciding what to remove, fetching segments, appending
to the buffer — is actually a meaningful, observable operation with phases and
progress. Nothing outside the function can observe where it is or what it has
committed. If it is aborted, its partial progress is only communicated via
`syncActorToState` at exit.

### The two-representation problem

The actor context (`SourceBufferActorContext`) holds rich data — segment IDs,
timing, buffered ranges. `state.bufferState` holds an impoverished projection
— IDs only, no timing. This forces `resolveBufferedSegments` as a bridge
everywhere timing is needed for window calculations. The two representations
are in sync at task boundaries but represent the same underlying truth.

### The coupled concerns problem

`loadSegments` currently owns: trigger evaluation, task scheduling, network
I/O, bandwidth sampling, SourceBuffer coordination, and state publication.
Bandwidth sampling (ABR feedback) is an accidental side effect of the fetch
loop — its output (`bandwidthState`) has nothing to do with SourceBuffer
management but is produced from the same code path.

---

## Candidate Architecture

The following decomposition has emerged from design discussion. It is the
current direction — not yet implemented, but concrete enough to build toward.

---

### The Reactor _(replaces the current `loadSegments` subscriber)_

A thin wiring layer. Watches for meaningful state changes and sends a typed
message to the SegmentLoaderActor when the loading assignment changes. Owns no
persistent state of its own.

**Watches:**
- Track selection and resolution (a resolved `ResolvedTrack` becomes available)
- `currentTime` changes that shift the buffer window meaningfully
- `preload` / `playbackInitiated` (gate on whether loading should happen at all)

**Computes:**
- `start = currentTime`
- `end = currentTime + bufferDuration` (or `currentTime` on a fresh seek before
  back-buffer data has accumulated)

**Sends:**

```ts
{ type: 'load', track: ResolvedTrack, start: number, end: number }
```

`start` and `end` are raw time values — no segment snapping. The actor maps
them onto segment boundaries internally.

The Reactor does **not** know about segments, buffer state, or flushing.
It waits until the track is resolved before sending — track resolution is a
natural gate that the Reactor already handles, keeping that concern out of the
actor entirely.

---

### SegmentLoaderActor _(new)_

A persistent actor that receives load assignments and owns all execution logic.

**Construction-time dependencies:**
- `sourceBufferActor: SourceBufferActor` — shared reference, not owned
- `fetchBytes` — the tracked-fetch closure (owns throughput sampling)

**Message protocol:**

```ts
{ type: 'load', track: ResolvedTrack, start: number, end: number }
```

`start` and `end` are raw time values. The actor maps them onto segment
boundaries by filtering `track.segments` to those overlapping `[start, end]`.

---

**Status:**

```
'idle' | 'working' | 'destroyed'
```

**Context (non-finite state):**

```ts
{
  assignment: { track: ResolvedTrack; start: number; end: number } | null;
  pending: PendingOp[];  // pending[0] is in-flight when status === 'working'
}

type PendingOp =
  | { type: 'append-init'; init: AddressableObject; trackId: string }
  | { type: 'append-segment'; segment: Segment };
```

`pending[0]` doubles as the in-flight item — it is the operation currently
executing. `pending[1...]` are queued but not yet started. When `pending` is
empty the actor transitions to `'idle'`.

Remove/flush operations are handled as a prerequisite step before the pending
list is populated (see Execution below) and are not tracked as pending items.
More granular remove tracking is deferred — a known gap for the continue path
when the flush range changes mid-execution.

---

**On receiving a `'load'` message:**

1. Compute the target segment set: `track.segments` filtered to `[start, end]`
2. Check `sourceBufferActor.snapshot.context` for committed segments
3. Decide: **continue** or **preempt**

**Continue** — same `track.id`, new range overlaps or extends current work.
- Keep `pending[0]` (in-flight, cannot be safely interrupted)
- Rebuild `pending[1...]` from the updated target set, excluding committed
  segments and `pending[0]`
- Add any new segments that entered the window; drop any that left

**Preempt** — `track.id` changed (track/quality switch) or new range is
completely disjoint from current work (large seek).
- Abort the current abort signal (interrupts `pending[0]` at its next
  checkpoint — fetch boundaries and actor send boundaries respect the signal)
- Clear `pending`
- SourceBufferActor always finishes its current physical operation regardless
  (browser constraint: `appendBuffer`/`remove` cannot be cancelled mid-execution)
- Rebuild from scratch for the new assignment

---

**Execution (streaming, not batch):**

1. **Removes** — computed upfront from committed context vs. `[start, end]`.
   Segments committed but outside the range → `sourceBufferActor.send(remove)`.
   Track switch (`track.id` changed) → `sourceBufferActor.send(remove, 0, Infinity)`.
   Removes complete before the pending list is populated.

2. **Populate pending** — init (if `initTrackId !== track.id`) + segments in
   `[start, end]` not yet committed, in chronological order.

3. **Worker loop** — while `pending` is non-empty:
   - `pending[0]` is the current operation
   - If `append-init`: `fetchBytes(init)` → `sourceBufferActor.send(append-init)`
   - If `append-segment`: `fetchBytes(segment)` → `sourceBufferActor.send(append-segment)`
   - On completion: shift `pending`, continue
   - At each await boundary: check abort signal; if aborted, stop

Each segment is streamed — fetched and appended before the next fetch begins.
This restores startup latency vs. the current batch approach and lets the
pending list be revised between operations.

---

### SourceBufferActor _(exists — no changes for now)_

Serializes SourceBuffer operations and owns the rich committed buffer model.
No changes needed for the initial SegmentLoaderActor implementation.

The SegmentLoaderActor tracks its own in-flight and pending state internally
(`pending[0]` = in-flight, `pending[1...]` = queued). Since the
SegmentLoaderActor is the sole sender to SourceBufferActor, it always has
perfect knowledge of what it has submitted — there is no need for
SourceBufferActor to echo this back.

Committed state (`sourceBufferActor.snapshot.context.segments`) remains the
ground truth for what is physically in the buffer. The SegmentLoaderActor
reads this directly when computing the delta for a new assignment.

**Future enhancement:** expose pending/queued state with segment IDs for
finer-grained introspection. Deferred until a concrete need emerges.

---

### SerialRunner _(exists — no changes for now)_

The streaming execution model (one segment at a time, each fetch+append
awaited before the next begins) means there is at most one operation queued
in SourceBufferActor at any time. The current SerialRunner is sufficient.

`abortAll()` handles teardown. The pending list in SegmentLoaderActor's
context replaces the need for per-task cancellation at the runner level.

**Future enhancement:** a real named queue with per-task cancellation by ID,
enabling finer-grained preemption. Deferred — the state-as-queue approach in
SegmentLoaderActor makes this unnecessary for the initial implementation.

---

### fetchBytes / throughput _(exists — recently extracted)_

`createTrackedFetch` produces a `fetchBytes` closure that transparently samples
bandwidth and owns `BandwidthState` locally. Passed to the SegmentLoaderActor
at construction. No changes needed here.

**Migration bridge:** currently publishes to `state.bandwidthState` via an
`onSample` callback so ABR continues to work. Remove once ABR reads from
throughput directly.

---

### Candidate Composition

```
State changes (track resolved, currentTime, preload)
         │
         │  Reactor — watches relevant slices only
         ▼
  { type: 'load', track, start, end }
         │
         ▼
  ┌────────────────────────────────────────────────────────┐
  │               SegmentLoaderActor                        │
  │                                                         │
  │  context: { assignment, pending: PendingOp[] }          │
  │  pending[0] = in-flight  pending[1...] = queued         │
  │                                                         │
  │  on 'load': continue (revise pending) or preempt        │
  │  worker loop: removes upfront → stream fetch+append     │
  └──────────┬──────────────────────────────┬──────────────┘
             │ fetchBytes(segment)           │ send(append/remove)
             ▼                              ▼
  ┌──────────────────┐        ┌─────────────────────────┐
  │  fetchBytes      │        │   SourceBufferActor      │
  │  (throughput,    │        │   committed context      │
  │   local state)   │        │   (unchanged)            │
  └──────────────────┘        └────────────┬────────────┘
                                           │
                                 narrow publication
                                 (segment IDs only)
                                           │
                                           ▼
                               state.bufferState ──► endOfStream
```

---

### Wiring and lifecycle

The SegmentLoaderActor is created when a SourceBufferActor becomes available
(i.e. when the SourceBuffer appears in owners) and destroyed when the
SourceBuffer is removed. The Reactor manages this lifecycle, passing the
SourceBufferActor reference at construction. Actor dependencies are
construction-time injections — not discovered through state.

---

## Open Questions

### SourceBufferActor lifecycle ownership

The SegmentLoaderActor receives a SourceBufferActor reference at construction.
Something external must manage that lifecycle — creating it when the
SourceBuffer appears, destroying it when the SourceBuffer is removed, and
passing the reference to the SegmentLoaderActor. The Reactor is the current
candidate, but this creates a dependency between the Reactor and the
SourceBufferActor that didn't exist in the simpler designs. Worth making
explicit before implementation.

### What does endOfStream actually need?

`endOfStream` reads `state.bufferState[type].segments` to check whether the
last segment of each track has been appended. Its needs are minimal — just
"is this segment ID in the buffer?" — but it sits outside the SegmentLoaderActor
and has no direct access to SourceBufferActor.

Options:
1. Keep the current `state.bufferState` projection — narrow write surface, no
   change to endOfStream
2. Have the SegmentLoaderActor publish a targeted `bufferComplete` signal when
   the full `[start, end]` range has been loaded — endOfStream subscribes to
   this instead of the full segment list
3. Make SourceBufferActor accessible outside the loading pipeline so endOfStream
   can query it directly

Option 1 is the lowest-friction path for now. Option 2 is the cleanest
long-term but requires the SegmentLoaderActor to know when it's "done."

### Batch vs. streaming (resolved in principle, not yet in code)

The current `loadSegmentsTask` batches all fetches before any appends.
This was motivated by atomicity concerns that don't apply — `syncActorToState`
fires at task exit, so intermediate actor state is never observable externally.

The new SegmentLoaderActor uses streaming: fetch s1 → append s1 → fetch s2 →
append s2. This restores startup latency, lowers peak memory, and is the
natural model for a persistent actor that tracks per-segment progress.

The current implementation should be migrated to streaming before (or as part
of) the SegmentLoaderActor work.

### continue vs. preempt: remove/flush revision

The continue/preempt decision and execution model is resolved for segment
operations. The remaining open question is what happens when a new assignment
arrives and the required removes have *changed* relative to what was computed
upfront.

Example: actor computed `remove(30, Infinity)` for the prior assignment, but
it's already in-flight. New assignment shifts the window — `remove(40, Infinity)`
would be more appropriate. Since physical removes cannot be cancelled, the
actor finishes the in-flight remove and may need a corrective operation after.

This is an edge case with bounded consequences and is deferred. Track as a
known gap in the current design.

### Migration path

The current `loadSegments` is a monolithic feature that will be decomposed
incrementally. Each step should be independently shippable and leave the system
in a working state.

**Step 1 — Streaming refactor (near-term, independent)**
Change `loadSegmentsTask` from batch (all fetches then all appends) to
streaming (fetch s1 → append s1 → fetch s2 → append s2). No architecture
change — just execution model. Directly improves startup latency and removes
the batch complexity from the current code.

**Step 2 — Build SegmentLoaderActor**
Implement the new actor with its message protocol, pending list model, and
continue/preempt logic. `loadSegments` (the current Reactor) continues to
drive it via messages. The actor owns execution; the existing subscriber loop
is replaced by message sends.

**Step 3 — Thin the Reactor**
Remove the remaining task loop, `shouldLoadSegments`, `taskSegmentIds`, and
`abortController` from `loadSegments`. It becomes purely: watch state, compute
`start`/`end`, send `'load'` messages. The actor owns everything else.

**Step 4 — Resolve endOfStream**
With the Reactor thinned, revisit how `endOfStream` gets the signal it needs.
Options remain: keep `state.bufferState` projection (lowest friction), or have
the SegmentLoaderActor publish a narrower completion signal.
