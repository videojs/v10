---
status: draft
date: 2026-03-05
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
   reactive subscriber decides whether to trigger a new task. If that state is
   transiently wrong — because an abort left it half-updated — the player stalls
   or re-fetches data it already has.

---

## Current Architecture

### setupSourceBuffer

[`setup-sourcebuffer.ts`](../../../packages/spf/src/dom/features/setup-sourcebuffer.ts)

Creates a `SourceBuffer` and its `SourceBufferActor` together in a single
`owners.patch` so both arrive simultaneously in owners. No extra notification
cycle is required.

---

### SourceBufferActor

[`source-buffer-actor.ts`](../../../packages/spf/src/dom/media/source-buffer-actor.ts)

Wraps a single `SourceBuffer` and serializes all operations against it. Owned
by `owners` (not by `loadSegments`), making it accessible to any subscriber
that needs to observe buffer state.

```ts
interface SourceBufferActorContext {
  initTrackId?: string;
  segments: SegmentRecord[];       // with timing metadata
  bufferedRanges: BufferedRange[]; // snapshot of sourceBuffer.buffered
}
```

Operations via `send()` / `batch()`. Context updated atomically per operation.

**Segment model:**
- `appendSegmentTask` deduplicates by `startTime` with epsilon (time-aligned assumption).
- `removeTask` retains segments whose midpoint falls within post-flush `buffered` ranges.

---

### SegmentLoaderActor

[`segment-loader-actor.ts`](../../../packages/spf/src/dom/features/segment-loader-actor.ts)

Receives typed load messages and owns all execution: removes, fetches, appends,
seek detection, and task scheduling.

**Message protocol:**

```ts
{ type: 'load', track: VideoTrack | AudioTrack, range?: { start: number; end: number } }
```

- No `range` → init-only (metadata preload mode)
- With `range` → load init + segments overlapping `[start, end]`

**Internal state:** task loop with `currentTask`, `pendingMessage`, `taskSegmentIds`,
`abortController` closure variables. Seek detection compares incoming segment IDs
against `taskSegmentIds`; aborts if completely disjoint.

**Current execution model (step 1 — batch):** fetches all segments then appends
all segments. Streaming (fetch-append per segment) is a known pending improvement.

**Dependencies at construction:** `sourceBufferActor` (shared ref), `fetchBytes`
(tracked fetch closure).

---

### loadSegments (Reactor)

[`load-segments.ts`](../../../packages/spf/src/dom/features/load-segments.ts)

A thin Reactor layer. Watches relevant state changes and sends `'load'` messages
to the `SegmentLoaderActor`. Does not own task execution.

**Trigger mechanism:** uses `state.subscribe(selectLoadingInputs, handler, { equalityFn: loadingInputsEq })`
rather than a broad `combineLatest`. Only fires when meaningful inputs change.

**`selectLoadingInputs`** — plain pick: `{ playbackInitiated, preload, currentTime, track }`.

**`loadingInputsEq`** — encodes the condition hierarchy directly. This IS the
`shouldLoadSegments` logic expressed as an equality function:
- Pre-play: only `preload` changes matter; `currentTime` does not trigger
- `!playbackInitiated → playbackInitiated`: fires unless `preload === 'auto'`
  (suppressed: message was already full-range pre-play)
- Post-play: `resolvedTrackId` and `segmentStartFor(currentTime)` trigger

**`segmentsCanLoad`** — closure boolean; updated via `combineLatest([state, owners])`
watching `canLoadSegments(state, owners, type)`.

**`canLoadSegments`** — exported pure function; preconditions only: resolved track
+ `SourceBufferActor` in owners.

**Actor lifecycle:** `owners.subscribe((o) => o[actorKey], ...)` — creates
`SegmentLoaderActor` when actor appears, destroys on removal.

**Message derivation:**
- `!playbackInitiated && preload === 'metadata'` → `{ type: 'load', track }` (no range)
- Full mode → `{ type: 'load', track, range: { start: currentTime, end: currentTime + bufferDuration } }`

---

### fetchBytes / throughput

`createTrackedFetch` produces a `fetchBytes` closure. Bandwidth sampling is
invisible to callers; throughput is owned locally as `WritableState<BandwidthState>`.

**Migration bridge:** `onSample` callback publishes to `state.bandwidthState`
so ABR continues to work. Remove once ABR reads from throughput directly.

---

### endOfStream

[`end-of-stream.ts`](../../../packages/spf/src/dom/features/end-of-stream.ts)

Watches `[state, owners]` via `combineLatest` AND subscribes to actor snapshot
changes directly (via `owners.subscribe` → actor subscription chain). Fires when
the last segment of every selected track appears in `owners.videoBufferActor
.snapshot.context.segments`.

No longer reads `state.bufferState` — that field no longer exists in global state.

---

## Data Flow

```
state changes (track resolved, preload, playbackInitiated, currentTime)
         │
         │  state.subscribe(selectLoadingInputs, handler, { equalityFn: loadingInputsEq })
         │  fires only on meaningful tier-appropriate changes
         ▼
  loadSegments Reactor
         │
         │  segmentsCanLoad gate (combineLatest → canLoadSegments boolean)
         │
         ▼
  segmentLoader.send({ type: 'load', track, range? })
         │
         ▼
  ┌────────────────────────────────────────────────────┐
  │              SegmentLoaderActor                     │
  │  task loop + seek detection                         │
  │  executeTask: removes → fetch-all → append-all      │
  │  (batch mode — streaming is a pending improvement)  │
  └────────────────┬───────────────────────┬────────────┘
                   │ fetchBytes            │ send/batch
                   ▼                       ▼
         throughput (local)      SourceBufferActor (in owners)
                                        │
                                 owners.videoBufferActor
                                        │
                              endOfStream subscribes here
                              (actor snapshot changes trigger)
```

---

## Key Invariants

1. **One operation at a time.** The actor rejects `send`/`batch` while
   `status === 'updating'`.

2. **Atomic model updates.** The actor's context changes only when an operation
   completes. No intermediate states are observable.

3. **Remove before fetch.** Removes execute before any network I/O inside
   `executeTask`. The buffer model reflects removes even if the task is aborted
   during fetch.

4. **Init is always committed.** Once init data is in hand, it is appended
   regardless of signal state (using a fresh signal if needed). Prevents
   redundant re-fetches after seek-abort.

5. **endOfStream sees live actor state.** By subscribing to actor snapshot
   changes directly, `endOfStream` reacts when a segment is appended — not
   only when `state` or `owners` change structurally.

---

## Decisions

### Actor as SourceBuffer abstraction

**Decision:** Wrap `SourceBuffer` in an actor that serializes operations and
owns the buffer model.

**Rationale:** Callers previously patched `state.bufferState` inline; an abort
left state partially updated (the original stall bug). The actor gives a single
atomic update per operation.

---

### SourceBufferActor in owners (not in loadSegments)

**Decision:** `setupSourceBuffer` creates the actor alongside the SourceBuffer
in a single `owners.patch`. The actor is accessible to any subscriber via owners.

**Rationale:** When the actor lived inside `loadSegments`, `endOfStream` had no
way to observe it. Moving to owners lets `endOfStream` subscribe directly,
eliminating `syncActorToState` and `state.bufferState` entirely.

---

### Selector-based subscription in Reactor

**Decision:** Replace `combineLatest([state, owners])` with
`state.subscribe(selector, handler, { equalityFn })` where the equality function
encodes the condition hierarchy for when a new message should be sent.

**Rationale:** `combineLatest` fired on every state change, including unrelated
ones. The equality function IS `shouldLoadSegments` — it returns `true` (equal,
don't fire) or `false` (changed, fire) based on the current tier and what
actually changed.

---

### Segment model: time-aligned deduplication

**Decision:** Deduplicate appended segments by `startTime` with epsilon.

**Rationale:** Current playlists are time-aligned. Same `startTime` = same slot.
Non-boundary flushes are not yet in scope.

---

### Segment model: post-flush bufferedRanges

**Decision:** After `remove`, retain segments whose midpoint falls within
post-flush `sourceBuffer.buffered`.

**Rationale:** `sourceBuffer.buffered` is the ground truth.

---

## Open Questions / Pending Work

### LoadTask naming

`LoadTask`, `planTasks`, `executeLoadTask` risk confusion with the `Task` class
used in SourceBufferActor scheduling. These are closer to operation descriptors.
`@todo` markers exist in the code; rename when convenient (e.g. `SegmentLoaderOp`).

### endOfStream reactor cleanup

`endOfStream.ts` subscribes to actor snapshots and uses `combineLatest` for
state/owners. The `waitForSourceBuffersReady` and `shouldEndStream` now use
actor status correctly, but the overall subscription structure (actor unsubs,
combineLatest) could be simplified — e.g. a single actor-aware subscription
rather than two separate paths. Deferred.

### Bandwidth bridge

`createTrackedFetch` still publishes to `state.bandwidthState` via `onSample`.
Remove once ABR reads from throughput directly.

### preload='auto' seek-before-play

Known limitation: if the user seeks before pressing play with `preload='auto'`,
the `playbackInitiated` transition is suppressed (message was already full-range
pre-play). The first re-send is delayed until the next segment boundary crossing
post-play. Documented in `loadSegments` JSDoc.

---

## Target Architecture (not yet fully implemented)

The following describes where the architecture is heading. Parts are built
(Reactor thinning, actors in owners); parts are still future work.

### Message protocol (implemented)

```ts
{ type: 'load', track: VideoTrack | AudioTrack, range?: { start: number; end: number } }
```

### SegmentLoaderActor — current execution model

Planning happens in `send()` via `planTasks()`, producing an ordered `LoadTask[]`.
The runner (`runScheduled`) drains the list sequentially — one fetch+append per task.
This is already streaming: fetch s1 → append s1 → fetch s2 → append s2.

**`LoadTask` type** — derived from `SourceBufferMessage` minus `data`, plus fetch URL:

```ts
type LoadTask =
  | (Omit<AppendInitMessage, 'data'> & AddressableObject)   // fetch-then-append init
  | (Omit<AppendSegmentMessage, 'data'> & AddressableObject) // fetch-then-append segment
  | RemoveMessage;                                           // direct actor send
```

**Planning (Cases 1–3):**
1. **Removes** — forward and back buffer flush points (segment-aligned). No flush on
   track switch: appending overwrites; actor deduplication keeps the segment model accurate.
2. **Init** — schedule if `actorCtx.initTrackId !== track.id`.
3. **Segments** — `getSegmentsToLoad` window minus already-committed segments.

**Continue vs. preempt (in `send()`):**
- `inFlightInitTrackId` / `inFlightSegmentId` track what's currently being processed.
- If the in-flight item is needed by the new plan → **continue**: filter it from
  `pendingTasks`, let it complete, pick up the rest.
- Otherwise → **preempt**: abort, use full new plan as `pendingTasks`.

**Non-abort errors** (e.g. network failure on init): clear remaining scheduled tasks;
a pending replacement plan from `send()` is still picked up.

### Condition hierarchy for Reactor trigger (implemented)

```
!playbackInitiated
  preload==='none'      → dormant
  preload==='metadata'  → fires on transition to 'metadata'
  preload==='auto'      → fires on transition to 'auto'

!playbackInitiated → playbackInitiated
  preload !== 'auto'    → trigger
  preload === 'auto'    → suppressed (seek-before-play is a known limitation)

playbackInitiated
  resolvedTrackId changes         → trigger
  segmentStartFor(currentTime) changes → trigger
```
