# Buffer State Design: SourceBufferActor + Dual Model

**Status:** In Discussion — design significantly revised from initial draft
**Branch:** `fix/spf-seek-rebuffer-stall` → `feat/spf-f9-issue-434`

---

## Problem

A seek-rebuffer stall was diagnosed in the sandbox. Root cause: after a series of rapid
seeks, the physical video SourceBuffer had a gap at `currentTime` but the segment model
(`bufferState.segments`) still marked that range as covered. `getSegmentsToLoad` trusted
the segment model, skipped loading the missing segment, and the media element stalled
indefinitely.

From the diagnostic logs: physical buffer was `[45.01, 50.02] [65.01, 85.00]`,
`currentTime = 54.82`, and the segment at `startTime=50` was in the segment model as
"buffered" — but physically absent.

This is one instance of a general class of bugs: the segment model can diverge from the
physical SourceBuffer, and when it does, all coverage-based decisions break silently.
The root cause is structural: the connection between "I appended X" and "the buffer now
reflects X" was an implicit convention between two separate pieces of code — the MSE
operation and the state patch that followed it. They worked together by happenstance and
were therefore brittle.

Fixing this correctly requires making those connections *definitionally*, not by
convention — which leads to the `SourceBufferActor` design.

---

## Three Sources of Truth

Reasoning about what's in the SourceBuffer requires three distinct sources of
information, each answering different questions:

### 1. Segment Metadata (from the playlist/presentation)

The playlist declares each segment's expected start time, duration, URL, and codec
parameters. This is the declared structure of the content.

- Source: `track.segments` (resolved track in state)
- Answers: what should be at this time position? which URL to fetch? what's the
  expected duration?
- Limitation: playlist-declared times may not match actual coded media timestamps

### 2. Segment Model — "what we loaded" (existing: `bufferState.segments`)

Records which segment IDs have been fetched and appended, and which track they came
from. This is our *record of operations*.

- Source: currently maintained by `load-segments.ts`, updated after each
  `appendBuffer()` completes; will move to `SourceBufferActor`
- Answers: did we append segment X? which rendition/quality did we load at t=X?
  was there a track switch? did we load the last segment?
- Limitation: can drift from physical reality (eviction, MSE boundary imprecision,
  etc.) — this is what the `SourceBufferActor` design addresses

### 3. Actual Model — "what's physically there" (`sourceBuffer.buffered`)

A direct mirror of `sourceBuffer.buffered`, updated on every `updateend` event. This
is *physical ground truth* — what the browser actually considers playable.

- Source: snapshotted by `SourceBufferActor` after every operation it executes; will
  live in reactive state as `BufferedRange[]`
- Answers: is t=X actually playable right now? where are the buffer gaps? what is
  the actual media timeline start?
- Limitation: no semantic knowledge — doesn't know about segment IDs, quality levels,
  or track boundaries

---

## Why All Three Are Needed

The richest and most reliable reasoning comes from cross-referencing all three. Neither
the segment model nor the actual model alone is sufficient.

### Example: determining if a segment needs loading

Naive approach (today): check if segment's `startTime` is in the segment model.
Problem: the segment model can be stale.

Better approach: check if the segment's time range is covered in the actual model.
But: a gap in the actual model might be *expected* (encoded media gap) rather than
*missing* (should have been loaded). Cross-referencing with segment metadata tells
us which case we're in.

### Example: media encoding gaps

Contiguous segments A, B, C are all fetched and appended. Segment model: all three
IDs present. But the encoded media in those segments has a gap — actual model comes
out as `[0, 50.02]` and `[55.00, 85.00]`. Both models are correct. The gap is a
property of the media, not a model error. Knowing this requires the segment metadata
(expected start/end times) as a reference.

### Example: model drift (the seek stall bug)

Segment B was appended (segment model: ID present). Later a flush removed it from the
SourceBuffer but the segment model wasn't updated correctly. Actual model shows a gap;
segment model says it's covered. Here the models genuinely disagree — the segment model
is wrong. The actual model is authoritative about physical coverage.

### Example: media timeline offset

A segment declared in the playlist at `startTime=0` may have actual coded timestamps
starting at `t=1000000` (common in live-to-VOD streams). After appending, the actual
model's first range start reveals the true media timeline. Segment model uses
playlist-declared times. Cross-referencing the two with the segment metadata yields
the offset to translate between media time and presentation time.

---

## Divergence Taxonomy

Understanding divergence between segment model and actual model:

| Type | Segment model | Actual model | Correct action |
|---|---|---|---|
| Model drift (stale entry) | ID present | Gap at that time | Reload; segment model needs correcting |
| Media encoding gap | IDs all present | Discontiguous ranges | No action; expected |
| Timeline offset | ID present, playlist time | Actual time ≠ playlist time | Compute offset; no reload needed |
| Not yet loaded | ID absent | Gap | Load segment |
| Browser eviction | ID present | Gap | Reload; segment model needs correcting |

The key insight: **a gap in the actual model does not always mean "load this segment."**
The right decision depends on cross-referencing with segment metadata to determine
whether the gap is expected or represents missing content.

---

## The SourceBufferActor

The central new abstraction. Rather than having `loadSegments` perform MSE operations
and then separately patch state, `SourceBufferActor` is the **transaction boundary**:
updating both models is not a step that follows an operation — it is part of what
completing that operation *means*.

### Responsibilities

- Wraps a single `SourceBuffer`
- Owns an internal task queue/scheduler; processes one operation at a time (respecting
  MSE's constraint that `appendBuffer`/`remove` cannot overlap)
- Accepts append and remove tasks from callers (e.g. `loadSegments`), each carrying
  their payload plus caller-supplied metadata
- After each operation completes, atomically updates **both** the segment model and
  the physical model (`sourceBuffer.buffered` snapshot) into reactive state
- Exposes an operation state (at minimum an `updating` equivalent) reactively, so
  other features can observe whether the SourceBuffer is busy

### Why "Actor"

The Actor model gives us: sequential message processing, private state, and changes
only via message handling. `SourceBufferActor` is structurally actor-like — it
processes operations one at a time, owns the resulting state, and can be reasoned
about in isolation. The pragmatic departure: it writes outward to shared reactive
state (rather than being fully encapsulated), which is intentional for our
reactive architecture.

### Message Model

The operation units submitted to the Actor are called **Messages** — technically
precise (these are messages sent to an Actor in the Actor model sense) and generically
understandable without that background. This also cleanly distinguishes them from the
existing `Task` abstraction (orchestration-level units with id + composed AbortSignal),
which remains unchanged.

**Structural discrimination at `kind`, ad hoc polymorphism via `meta`:**
`kind` cleanly discriminates the message types at the top level. `meta` within each
message type carries the modeling metadata as an extension point — the Actor's
execution path for each `kind` is uniform (e.g. all appends call `appendBuffer`), while
`meta` is where the modeling behavior diverges. This keeps execution and modeling
concerns cleanly separated.

**`data: ArrayBuffer` is a stable boundary.** Streaming/progressive delivery logic
(e.g. consuming a `ReadableStream` from a fetch response body) lives outside the Actor
and resolves to an `ArrayBuffer` before constructing a message. The Actor always
receives resolved binary data.

**`AppendSegmentMeta` is derived from CMAF-HAM types** via a flat intersection rather
than nesting — this maps directly to the Segment Model's flat storage shape (no
collapsing needed when the Actor writes to state), while still preserving the semantic
relationship to `Segment` and `Track`.

```ts
// Flat intersection derived from CMAF-HAM types.
// Only the fields the Actor needs — identity and timing.
type AppendSegmentMeta = Pick<Segment, 'id' | 'startTime' | 'duration'> & {
  trackId: Track['id'];
  // partial?: boolean | 'start' | 'middle' | 'end'
  //   boolean: simple partial-segment flag for streaming append support
  //   'start' | 'middle' | 'end': richer variant letting the Actor track
  //   completion state of an in-progress segment across multiple messages
  //   (relevant when response.body() ReadableStream support is added)
};

// `type` as the discriminant key follows Actor model conventions (XState, Redux)
// and aligns with the existing codebase pattern (PlaybackEngineAction, track types).
type AppendInitMessage = {
  type: 'append-init';
  data: ArrayBuffer;
  meta: { trackId: Track['id'] };
};

type AppendSegmentMessage = {
  type: 'append-segment';
  data: ArrayBuffer;
  meta: AppendSegmentMeta;
};

type RemoveMessage = {
  type: 'remove';
  start: number;
  end: number;
  // meta: reserved for future segment-based removal (remove by ID rather than range)
};

type SourceBufferMessage = AppendInitMessage | AppendSegmentMessage | RemoveMessage;
```

Caller (`loadSegments`) supplies the metadata; the Actor uses it to update both models
on completion. `AppendSegmentMeta` gives the Actor what it needs to detect and handle
quality replacement — finding existing Segment Model entries whose time ranges overlap
the incoming segment's range and removing them before adding the new entry. This handles
the case where new content overwrites existing buffered content without an explicit
prior remove (e.g. partial quality upgrades with different GOP boundaries), where the
physical `bufferedRanges` delta alone would be insufficient.

### Abort Semantics

- Each `send` / `batch` call takes an `AbortSignal` from the caller
- The Actor checks the signal **before starting** each pending message; if aborted,
  the remaining messages are skipped and the queue is cleared
- A **currently executing** message runs to completion — `appendBuffer` cannot be
  interrupted mid-operation per the MSE spec
- The Promise resolves normally (the operation did complete); the caller checks
  `signal.aborted` before submitting the next message or batch
- This preserves the "finish current, stop after" semantic of the existing code, but
  makes it explicit and reliable

### API Shape

Method-based, returning Promises. In JavaScript's single-threaded environment this is
semantically equivalent to the Actor ask-pattern, and fits naturally with the existing
async/await patterns in `loadSegments`. The internal scheduler still does real work —
enforcing the MSE constraint, managing the queue, and owning the atomic state updates.

```ts
// Rough interface sketch — subject to refinement
interface SourceBufferActor {
  send(message: SourceBufferMessage, signal: AbortSignal): Promise<void>;
  batch(messages: SourceBufferMessage[], signal: AbortSignal): Promise<void>;
  // reactive state (updating, segment model, buffered ranges) exposed via state
}
```

### Batching

The Actor supports both single-message and batch submission. The primary use cases for
batching are:

- **Remove-then-append** (track switch, seek-flush-then-reload): causally connected
  operations that should be expressed as a unit
- **Init + first segment**: establishing a playable baseline atomically

A batch is an ordered sequence the Actor processes with no interleaving with other
submitted work. State updates still happen per-operation (each message is its own
atomic transaction — MSE op + state update), but `loadSegments` gets a single await
point for the whole sequence.

**Why batching helps `loadSegments` coordination:** The current load loop interleaves
decision-making and execution — state can change mid-execution, flush and append
operations are tracked separately, seek detection must happen manually. Batching gives
`loadSegments` a clean decision-cycle boundary:

1. Evaluate state, compute the full sequence of operations needed
2. Submit as a batch, await completion
3. Re-evaluate with fresh, fully-updated state
4. Repeat

This one decision → one batch → one await → fresh state rhythm is also what sets up
the eventual decomposition of `loadSegments` — once the operations for a decision cycle
are already a discrete unit, separating decision logic from execution logic becomes a
natural boundary.

**`endOfStream` coordination:** Other subscribers (including `endOfStream`) will see
per-operation state updates during a batch. This is acceptable because those subscribers
have appropriate guards (e.g. `endOfStream` checks for the last segment ID, not just
any non-empty state). Worth monitoring as the implementation takes shape.

### State Output

The Actor's state updates go into the same shared reactive state (`PlaybackEngineState`)
but are now the **single, authoritative mutation path** for SourceBuffer-related state.
This replaces the scattered `state.patch(...)` calls currently spread across the
`loadSegments` load loop.

The previously proposed standalone `trackBufferedRanges` feature is **superseded** by
the Actor — since the Actor handles every SourceBuffer mutation, it is the right place
to snapshot `sourceBuffer.buffered` after each operation. A separate passive observer
is no longer needed.

---

## loadSegments Refactor

With the Actor owning (b) — MSE execution and state updates — `loadSegments` becomes
purely responsible for content-level decisions:

- What needs loading (coverage decisions via `getSegmentsToLoad`)
- What needs flushing (forward/back buffer flush calculations)
- Seek detection and abort
- Constructing tasks and submitting them to the Actor
- Awaiting each task before deciding what's next

The load loop no longer owns any state update responsibility. When `await actor.append(...)`
resolves, `loadSegments` knows all state is consistent — it reads updated state to make
its next decision.

`loadSegments` stays a function for now. Further decomposition (separating flush
orchestration from load orchestration, etc.) is deferred but anticipated.

---

## Loading Decision Changes

### `getSegmentsToLoad`

Currently takes `bufferedSegments` (Segment[] from segment model) and checks coverage
by start time. Unreliable when segment model is stale.

**Proposed:** Use actual model (`BufferedRange[]`) for coverage checking. A segment is
considered covered if its midpoint falls within any buffered range:

```ts
const segMid = seg.startTime + seg.duration / 2;
const isCovered = bufferedRanges.some(r => r.start <= segMid && r.end > segMid);
```

The midpoint check tolerates MSE boundary imprecision without being fooled by adjacent
ranges that barely touch the segment's boundary.

**Note:** This does not yet handle the media encoding gap case — a gap in the actual
model would be treated as "needs loading" even if it's an encoded gap. That distinction
requires cross-referencing with segment metadata, which is Phase 3 work.

### Flush calculations

`calculateForwardFlushPoint` and `calculateBackBufferFlushPoint` currently take
`bufferedSegments` from the segment model.

`calculateForwardFlushPoint` — straightforward to migrate to `BufferedRange[]`: find
ranges whose `start` is at or beyond the threshold.

`calculateBackBufferFlushPoint` — **open question**: the current algorithm counts
model segments before `currentTime` (keep 2, flush the rest). With `BufferedRange[]`
that count-based logic doesn't apply cleanly because contiguous media produces a single
large range, not per-segment ranges. Options: count ranges, measure duration, or derive
from segment metadata + actual model. Needs resolution before Phase 2.

### Segment model's continued role

Even with actual model driving coverage, the segment model still informs:
- Which specific segment to fetch (URL, initialization reference)
- Ordering within the window
- Track switch detection (`initTrackId`)
- End-of-stream signaling (is the last segment ID present?)

Pipeline: actual model identifies uncovered time range → segment model + track metadata
identify which segment ID to fetch to cover it.

---

## Use Cases Enabled by Cross-Referencing

### Immediate: seek-stall fix (Phase 2)

Actual model used in `getSegmentsToLoad`. Gap at `currentTime` → segment correctly
identified as needed → loaded → stall prevented. Segment model staleness no longer
causes silent gaps.

### ABR quality awareness (Phase 3)

When considering a quality upgrade at time T:
- Actual model: is T covered at all?
- Segment model: which rendition/quality is currently buffered at T?
- Cross-reference: covered by low-quality → candidate for flush+reload at higher quality

Currently impossible: the segment model alone can't distinguish "not buffered" from
"buffered at wrong quality."

### End-of-stream reliability (Phase 3)

Dual-validate: segment model says last segment ID is present AND actual model confirms
the end of stream is physically covered. Reduces premature or missed `endOfStream()`.

### Media timeline offset (Phase 3)

After first append: `bufferedRanges[0].start` (actual) vs. `presentation.startTime`
(metadata) = offset. Use to translate between playlist time and media time for
`currentTime`, `duration`, `buffered`, `seekable`, etc.

---

## Migration Path

**Phase 1 — Build `SourceBufferActor`:**
- New `SourceBufferActor` abstraction with task queue, append/remove methods, abort
  semantics as described above
- Owns atomic updates to both segment model and physical model (`BufferedRange[]`)
  after each operation
- Wire into `playback-engine.ts` in place of bare `SourceBuffer` owners where relevant
- No behavioral changes to loading decisions yet — this phase is purely structural

**Phase 2 — Refactor `loadSegments` to use the Actor:**
- Remove scattered `state.patch(...)` calls for buffer state from the load loop
- Submit append/remove tasks to Actor; await each before proceeding
- Update `getSegmentsToLoad` to use `BufferedRange[]` from Actor's state output
- Update `calculateForwardFlushPoint` to use `BufferedRange[]`
- Resolve `calculateBackBufferFlushPoint` counting logic
- Fixes the seek-stall class of bugs

**Phase 3 — Cross-referencing and advanced use cases:**
- Media encoding gap detection (segment metadata + actual model)
- ABR quality-level buffer awareness
- End-of-stream dual-validation
- Media timeline offset infrastructure

Each phase is independently shippable and testable.

---

## Open Questions

1. **`calculateBackBufferFlushPoint` with time ranges:** The current count-based
   algorithm doesn't apply cleanly to physical `BufferedRange[]`. Options: count
   ranges, measure duration, or keep using segment model for back-buffer flush only
   (safest for Phase 2). Needs resolution before Phase 2 implementation.

2. **Graceful fallback before first message:** Before the Actor has processed its
   first message, `bufferedRanges` is empty/undefined. Phase 2 loading decisions need
   a sensible fallback — treating as empty (load everything in window) is probably
   correct and safe.

3. **Media encoding gap handling in Phase 2:** Using actual model for coverage will
   treat encoded media gaps as "needs loading" — triggering fetches of segments already
   appended. Acceptable for Phase 2 (safe, just slightly wasteful) but Phase 3 should
   resolve with the segment metadata cross-reference.

4. **Fate of `appendSegment.ts` and `buffer-flusher.ts`:** These currently wrap MSE
   operations as Promises. They could be absorbed into the Actor as its internal
   primitives, or kept as standalone utilities the Actor uses. To be decided during
   Phase 1 implementation.

5. **`SourceBufferActor` reactive state shape:** Exact fields to expose (beyond
   `updating`, segment model, and `bufferedRanges`) need to be worked out during
   Phase 1 implementation.

6. **Actor placement and ownership in `playback-engine.ts`:** The Actor wraps a
   `SourceBuffer` — does it live in `owners` (alongside the raw `SourceBuffer`), does
   it replace it, or is it something else? To be decided during Phase 1.

7. **Batch state update granularity and `endOfStream` coordination:** Per-operation
   state updates within a batch are the current plan. If intermediate states prove
   problematic for `endOfStream` or other subscribers, a batch-end-only update
   strategy may be needed. Monitor during Phase 1/2 implementation.
