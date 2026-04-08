---
status: draft
date: 2026-03-11
---

# Design Decisions

> **This document reflects decisions made in the current SPF codebase — not settled long-term choices.** The implementation is highly tentative and expected to undergo significant architectural change. The decisions recorded here capture lessons learned from the initial pass (source buffer creation order, end-of-stream gating, streaming response bodies, etc.) and are worth preserving as context, but many will be revisited as the underlying primitives and architecture evolve. See [primitives.md](primitives.md) for the forward-looking design and its open questions.

Rationale behind SPF's key choices.

---

## Actor/Reactor Pattern (from text track spike)

These decisions were made or confirmed during the text track architecture spike
(videojs/v10#1158). See [text-track-architecture.md](text-track-architecture.md) for
the full reference implementation and assessment.

---

### `monitor`-before-state ordering as a load-bearing guarantee

**Decision:** `monitor` effects in `createMachineReactor` always run before per-state effects.
This ordering guarantee is documented in `createMachineReactor`'s source and must be preserved.

**Rationale:** Per-state effects rely on invariants established by `monitor` functions.
When a `monitor` function returns a new state, the framework calls `transition()` and the
snapshot updates before any per-state effect fires — so per-state effects that no-op when
`snapshot.value !== expectedState` do so correctly without needing to re-check conditions
themselves.

**Caveat:** The guarantee is specific to `createMachineReactor`'s registration order. It depends
on the TC39 `signal-polyfill`'s `Watcher` preserving insertion order in `getPending()` —
not a formal guarantee of the TC39 Signals proposal.

---

### `deriveState` pattern for transition logic

**Decision:** Transition conditions live in a pure `deriveState` function, wrapped in a
`computed()` signal outside any effect body, consumed by the `monitor` field to drive
transitions. The `monitor` function returns the target state; the framework handles the
comparison and transition.

**Rationale:** Keeps the `monitor` function minimal and machine-readable; makes transition
conditions independently testable as a plain function; prevents the inline computed
anti-pattern (see [actor-reactor-factories.md](actor-reactor-factories.md)).

---

### Actors in owners as the lifecycle contract

**Decision:** Actors created by a reactor are written to the shared `owners` signal.
The engine's `destroy()` generically destroys any value in owners with a `destroy()`
method. The reactor does not destroy its own actors.

**Rationale:** Keeps reactor cleanup simple — no tracking of which actors were created,
no custom destroy logic. Gives the engine a single, uniform cleanup point. The tradeoff
is an implicit contract: callers using a reactor outside the engine must destroy actors
from owners before destroying the reactor.

---

### Entry-reset as a defensive pattern for actor-creating states

**Decision:** States that create actors (`'setting-up'`) and states that are reset points
(`'preconditions-unmet'`) both call `teardownActors()` on entry. `teardownActors` is a
guarded no-op when actors are already `undefined`, preventing spurious signal writes.

**Rationale:** Any transition to a reset state may arrive from a state where actors were
alive. Defensive teardown on *both* states eliminates the need to track "did I come from
an actor-alive state?" — the entry effect is always safe to run.

---

## Architecture

### Reactor / Actor Separation

**Decision:** Feature files are split into thin reactors (observe state → send messages) and stateful actors (execute work, own context). Reactors contain no async logic; actors contain no subscription logic.

**Alternatives:**

- **Monolithic feature classes** — common in traditional players; merge observation and execution in one class. Harder to test, harder to reason about what's in-flight.
- **Pure state machines** — encode all transitions as state; no actors. Eliminates side effects but makes async work (fetch, SourceBuffer) awkward to represent.

**Rationale:** MSE operations have inherent ordering constraints (one `appendBuffer` at a time). Actors model this naturally as a serial queue. Reactors stay simple because they do nothing async — if the actor is busy, the message waits in the queue.

---

### Actor Model for SourceBuffer

**Decision:** Each `SourceBuffer` is wrapped by a `SourceBufferActor` that serializes all operations through a `SerialRunner`. The actor owns a context snapshot (buffered segments, status) that other features can read synchronously.

**Alternatives:**

- **Direct SourceBuffer calls** — simpler initially, but requires callers to gate on `SourceBuffer.updating` everywhere. Spreads the serialization concern across multiple features.
- **Promise chain** — chain `.then()` calls on each operation. Loses the ability to inspect queue state or abort mid-chain.

**Rationale:** Centralizing serialization in the actor makes every caller simpler. The context snapshot — especially `status: 'idle' | 'updating'` and the `segments` list — is read by `endOfStream` and `loadSegments` without needing to query MSE directly.

---

### Single Event Stream Across Features

**Decision:** All features in `PlaybackEngine` share one typed event stream. Each feature casts its events via `@ts-expect-error` to fit the union type.

**Alternatives:**

- **Per-feature event streams** — cleaner types, but requires each feature to wire its own stream and increases object allocation.
- **No event stream** — features communicate only through state patches. Loses the ability to fire point-in-time events (e.g., "segment appended") without polluting state.

**Rationale:** Shared stream simplifies the wiring in `PlaybackEngine` without meaningful runtime cost. The type cast is localized to one line per feature.

---

## Segment Loading

### Three-Case Load Planning

**Decision:** `SegmentLoaderActor.planTasks()` runs in exactly three passes: removes first, then init, then media segments. The order is fixed.

**Alternatives:**

- **Interleaved planning** — decide removes and appends together. Harder to follow; removes must always precede appends for the same time range.
- **Single-pass with branching** — one loop that handles all cases. Conflates concerns; harder to test each case independently.

**Rationale:** The three cases map cleanly to the three things that can happen at any segment boundary: clean up stale buffer, switch to a new track's init, load new content. Fixed order prevents ordering bugs.

---

### In-Flight Preemption vs. Continuation

**Decision:** When a new `load` message arrives while work is in progress, the actor checks whether the in-flight task is still needed. If yes, it completes and queues remaining tasks (continue). If no, it aborts the in-flight task and replans (preempt).

**Alternatives:**

- **Always abort** — simpler logic; always replan from scratch on any new message. Wastes work when the in-flight segment is still needed (e.g., minor `currentTime` advance).
- **Always complete** — never abort in-flight work. Causes stale segments to be appended after a quality switch; requires later cleanup.

**Rationale:** Continue/preempt minimizes wasted network bytes while ensuring the buffer always reflects the current intent. Most `currentTime` advances continue; track switches preempt.

---

### Init Segment Atomicity

**Decision:** Init segments use `minChunkSize: Infinity` — the full response body is accumulated before appending.

**Alternatives:**

- **Stream init segments** — possible in theory, but init data must be complete before media segments can be decoded. A partial init append would likely cause a decode error.

**Rationale:** Init segments are small (typically < 1 KB). Atomicity avoids ordering issues with no meaningful cost.

---

### Streaming Body for Media Segments {#streaming-body}

**Decision:** Video media segments are streamed incrementally via `ChunkedStreamIterable` (default 128 KB chunks). Audio media segments currently use `minChunkSize: Infinity` (atomic, equivalent to `arrayBuffer()`).

**Alternatives:**

- **Full `arrayBuffer()` for all segments** — was the original approach; simpler abort semantics, no partial-segment state needed. But delays bandwidth sampling until the entire segment downloads and prevents mid-download abort.
- **Streaming for both video and audio** — the intended final state. Audio segments are short; streaming them would complicate the code for minimal benefit, but it would enable consistent abort semantics.

**Status: in flux.** Audio streaming is pending. The current asymmetry (video streams, audio does not) is a migration step. See [Open Questions](#audio-streaming).

---

### Partial Segment Tracking

**Decision:** When the first chunk of a segment is appended, the actor marks it `partial: true` in its context. This flag is cleared when the final chunk appends.

**Alternatives:**

- **Optimistic completion** — treat the segment as "done" once queued. Risks calling `endOfStream` while a segment is still in-flight.
- **Track by bytes** — compare `totalBytes` to `ContentLength`. Requires reliable `Content-Length` headers (not guaranteed with HLS).

**Rationale:** `partial` is a simple boolean derived from the actor's own execution state — no external dependencies. `endOfStream` checks `!partial` for the last segment, preventing premature stream end.

---

## ABR

### EWMA Bandwidth Estimation

**Decision:** Bandwidth estimation uses a fast/slow EWMA pair. The exported estimate is the minimum of both.

**Alternatives:**

- **Simple moving average** — easy to compute but slow to react to drops and prone to noise.
- **Percentile-based** — more robust to outliers, but requires keeping a sample window in memory.
- **Single EWMA** — one decay factor. Choosing fast vs. slow is a trade-off; the dual approach hedges.

**Rationale:** Conservative minimum of fast/slow is the standard approach (used in hls.js, Shaka, etc.). The fast EMA reacts quickly to drops; the slow EMA prevents overreaction to spikes. Taking the minimum biases toward caution, reducing stalls.

### Zero-Factor Correction

**Decision:** Displayed bandwidth estimates apply `estimate / (1 - α^totalWeight)` to correct for EWMA initialization bias.

**Context:** A freshly created EWMA has a near-zero estimate even before any samples arrive, because the accumulated weight starts at zero. Raw values are misleading in the UI and can cause ABR to under-select on the first quality decision.

**Rationale:** This is a standard EWMA correction. Without it, the first quality selection is always the lowest rendition regardless of actual network conditions.

---

### Upgrade Throttle

**Decision:** Quality upgrades are gated by `minUpgradeInterval` (default 8 s). Downgrades are immediate.

**Alternatives:**

- **Symmetric throttle** — gate both upgrades and downgrades. But slow downgrades during network drops cause buffer stalls.
- **No throttle** — react to every bandwidth sample. Causes oscillation when bandwidth fluctuates around a rendition threshold.

**Rationale:** Asymmetry matches the asymmetry in consequence: a missed upgrade just means slightly lower quality; a missed downgrade can cause a rebuffer. Immediate downgrades prevent stalls; gated upgrades prevent thrashing.

---

### `abrDisabled` Flag

**Decision:** Setting `state.abrDisabled = true` prevents `switchQuality` from updating `selectedVideoTrackId`.

**Alternatives:**

- **Separate `manualVideoTrackId` field** — explicit field for user-selected quality, with ABR writing to a different field. Cleaner separation; the player can show which track is "manually" vs. "automatically" selected.

**Status: provisional.** `abrDisabled` is a blunt instrument. The long-term design separates `manualVideoTrackId` from `abrVideoTrackId` so both can be tracked independently. See [Open Questions](#abr-track-fields).

---

## MSE Coordination

### SourceBuffer Creation Order {#sourcebuffer-creation-order}

**Decision:** Both the video and audio `SourceBuffer` are created in the same synchronous execution context (step 5 in `PlaybackEngine`), even if only one is needed at first.

**Context:** Firefox has a bug where `mozHasAudio` remains `false` if the video `SourceBuffer` is created before the audio `SourceBuffer` in a different task. This causes Firefox to believe the stream has no audio and mute/skip it.

**Alternatives:**

- **Lazy creation** — create each buffer only when the first segment for that track is ready. Cleaner conceptually but triggers the Firefox bug.

**Rationale:** Creating both buffers together is a workaround for a browser bug. The cost (one extra `SourceBuffer` created slightly early) is negligible. The fix is permanent until Firefox patches the underlying bug.

---

### `endOfStream` Actor-Idle Gate

**Decision:** `endOfStream` waits for both `SourceBufferActor` instances to report `status: 'idle'` before calling `mediaSource.endOfStream()`.

**Context:** `MediaSource.endOfStream()` must not be called while any `SourceBuffer.updating` is `true` — it throws a `DOMException`. The actors expose their status synchronously via their snapshot.

**Alternatives:**

- **Poll `SourceBuffer.updating` directly** — bypasses the actor abstraction. Introduces a direct DOM dependency in a feature that otherwise reads only from actor snapshots.
- **setTimeout/rAF delay** — unreliable; race condition if the buffer update finishes after the timer fires.

**Rationale:** Actor idle is the correct signal: it means all queued tasks have completed, not just the currently executing one. Subscribing to actor snapshots is instantaneous — no polling.

---

### `remove()` Re-opens `MediaSource`

**Decision:** Code that could call `endOfStream` must guard against spurious re-entry when `SourceBuffer.remove()` is called near end-of-stream.

**Context:** Calling `SourceBuffer.remove()` (and `appendBuffer()`) automatically transitions a `'ended'` `MediaSource` back to `'open'`. If `endOfStream` is watching actor state and immediately re-fires when actors go idle, a `remove()` operation after `endOfStream()` creates an infinite loop.

**Implementation:** `endOfStream` checks `currentTime >= lastSegment.startTime` before firing. Back-buffer cleanup removes segments behind `currentTime`, so this guard ensures we don't re-end after cleaning up the back buffer near end-of-stream.

---

## State Management

### Batched `patch()` with Explicit `flush()`

**Decision:** `state.patch()` defers updates via `queueMicrotask`. `state.flush()` is provided for cases where subscribers must react synchronously.

**Alternatives:**

- **Synchronous `patch()`** — subscribers fire immediately on every patch. Risks re-entrant subscription loops and makes it impossible to batch multiple simultaneous updates.
- **Manual batching only** — no automatic deferral; callers always batch explicitly. More control but more boilerplate.

**Rationale:** Automatic batching eliminates most accidental re-entrancy. `flush()` is the escape hatch for the cases (ABR bandwidth sampling) where timing matters.

---

### Bandwidth Bridge {#bandwidth-bridge}

**Decision:** `loadSegments` maintains local `throughput` state per track and syncs it to `state.bandwidthState` after each sample.

**Context:** This is a migration artifact. The long-term design has ABR read directly from a throughput observable rather than going through the global state. The bridge exists to decouple the refactor from the feature work.

**Status: temporary.** Remove once ABR reads from `throughput` directly. See [Open Questions](#abr-throughput).

---

## Open Questions

### Audio Streaming {#audio-streaming}

Audio segments currently use `minChunkSize: Infinity` (full atomic download). This prevents mid-download abort and delays bandwidth sampling for audio fetches.

**Options:**
- Stream audio like video (consistent abort semantics, better sampling)
- Keep atomic (audio segments are short; streaming buys little)

**Open:** Streaming audio would eliminate the asymmetry. The main blocker is that streaming requires partial-segment tracking, which is already in place. Worth revisiting once the video streaming path stabilizes.

---

### ABR Track Fields {#abr-track-fields}

`abrDisabled` is a boolean that suppresses all ABR. The desired model separates:

- `abrVideoTrackId` — the track ABR would choose
- `manualVideoTrackId` — the track the user explicitly selected

This lets the UI show "currently manual at 720p, ABR would choose 1080p" without having two separate play modes.

**Open:** Needs a state shape decision and migration path from `abrDisabled`.

---

### ABR Throughput Direct Read {#abr-throughput}

The bandwidth bridge (`loadSegments` → `state.bandwidthState` → `switchQuality`) introduces a round-trip through global state. ABR should eventually read from a throughput observable owned by the network layer, removing the bridge.

**Open:** Requires defining the throughput API in `core/` and wiring it through `dom/`.

---

### `SegmentLoaderActor` / `LoadTask` Naming

The current naming (`LoadTask`, related internals) is provisional. Better candidates: `SegmentLoaderOp`, `LoadOp`, or `SegmentFetchTask`.

**Open:** Rename before public API stabilizes.

---

### `endOfStream` Subscription Structure

The `endOfStream` feature currently subscribes to both actor snapshots and state separately, leading to some duplication in the condition checks. A cleaner approach would combine actor + state into a single derived selector.

**Open:** Refactor once the actor snapshot API stabilizes.
