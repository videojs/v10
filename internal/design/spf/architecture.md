---
status: draft
date: 2026-03-11
---

# Architecture

> **This document describes the current SPF codebase as a snapshot in time — not the target design.** The architecture, implementation details, and component boundaries documented here are highly tentative and subject to significant change. The initial implementation captured useful lessons (source buffer coordination, end-of-stream timing, streaming response bodies, etc.), but the underlying architecture, primitives, and structure are expected to be substantially reworked in the near term. See [primitives.md](primitives.md) for the forward-looking design.

Internal structure of SPF.

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                     core/ (DOM-free)                    │
│  state ─ actor ─ task ─ HLS parser ─ ABR ─ buffer math  │
└─────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                     dom/ (browser)                      │
│                                                         │
│  PlaybackEngine                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Reactors (features/)                            │  │
│  │  loadSegments · endOfStream · setupMediaSource   │  │
│  │  setupSourceBuffers · qualitySwitching · ...     │  │
│  └─────────────────┬────────────────────────────────┘  │
│                    │ send messages                       │
│  ┌─────────────────▼──────────────┐                    │
│  │  Actors                        │                    │
│  │  SegmentLoaderActor            │                    │
│  │  SourceBufferActor (×2)        │                    │
│  └─────────────────┬──────────────┘                    │
│                    │ execute                             │
│  ┌─────────────────▼──────────────┐                    │
│  │  MSE                           │                    │
│  │  MediaSource · SourceBuffer    │                    │
│  └────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

The `core/` layer is runtime-agnostic — no DOM APIs, no fetch. The `dom/` layer wires browser platform APIs (MSE, fetch, HTMLMediaElement) into the core abstractions.

---

## Core Layer

### Reactive State (`core/state/create-state.ts`)

A batched, subscription-based state container. All feature coordination flows through state.

```ts
interface State<S> {
  get(): S;
  patch(partial: Partial<S>): void;
  flush(): void;
  subscribe(listener: Listener<S>): () => void;
}
```

**Key behavior:**
- `patch()` defers via `queueMicrotask` — multiple synchronous patches are coalesced into one notification.
- `flush()` drains the pending patch immediately. Call when downstream subscribers need to react before the next tick (e.g., ABR sampling).
- Selector subscriptions fire only when the selected slice changes, using a custom equality function.

### Actor (`core/actor.ts` + `core/task.ts`)

An actor owns a `snapshot` (status + context) and serializes its own work via a runner.

```ts
interface Actor<Context> {
  snapshot: ActorSnapshot<Context>;
  subscribe(listener: () => void): () => void;
}
```

**Task** — wraps an async function with an `AbortController`. Abortable at any point.

**SerialRunner** — executes tasks one at a time. Used by SourceBufferActor because the SourceBuffer API is inherently serial (one `appendBuffer` at a time).

**ConcurrentRunner** — deduplicates by ID. Used where parallel work is safe but duplicate tasks are wasteful.

### HLS Parsing (`core/hls/`)

Parses multivariant and media playlists into typed structures (`Presentation`, `Track`, `Segment`). URL resolution is handled separately in `resolve-url.ts`, making the parsers pure functions of text input.

### ABR (`core/abr/`)

Two components:

**EWMA** — fast/slow exponentially weighted moving average pair. The fast weight tracks recent conditions; the slow weight anchors against outliers. Exported estimate is the minimum of both (conservative).

**Quality selection** (`quality-selection.ts`) — given a bandwidth estimate and a list of tracks sorted by bitrate, picks the highest track whose bitrate fits within the estimate. Upgrades are subject to a `minUpgradeInterval` gate (default 8 s) to prevent oscillation; downgrades are immediate.

> **Zero-factor correction:** Raw EWMA starts near zero. The displayed/used estimate must apply `estimate / (1 - α^totalWeight)` to correct for the initialization bias.

### Buffer Math (`core/buffer/`)

**Forward buffer** (`forward-buffer.ts`) — computes the target load window: `[currentTime, currentTime + forwardBufferDuration]`. Also computes the flush point (segments behind `currentTime - backBufferDuration`).

**Back buffer** (`back-buffer.ts`) — computes the portion of the buffer to evict when the engine is under memory pressure.

---

## DOM Layer

### PlaybackEngine (`dom/playback-engine/engine.ts`)

The orchestration hub. Initializes all features in a fixed order, wiring shared state, owners, and a single event stream.

**Feature init order:**

| Step | Feature | Purpose |
|------|---------|---------|
| 0a | `syncPreloadAttribute` | Read `preload` attr from `<video>` into state before any buffering decisions |
| 0b | `trackPlaybackInitiated` | `play` event → `state.playbackInitiated = true` |
| 1 | `resolvePresentation` | Fetch multivariant playlist, parse tracks |
| 2 | `selectVideoTrack` / `selectAudioTrack` / `selectTextTrack` | Choose initial tracks |
| 3 | `resolveTrack` | Fetch media playlist for each selected track |
| 3.5 | `calculatePresentationDuration` | Derive duration from playlists |
| 4 | `setupMediaSource` | Create `MediaSource`, attach to `<video>` |
| 4.5 | `updateDuration` | Set `mediaSource.duration` |
| 5 | `setupSourceBuffers` | Create both `SourceBuffer` instances **together** |
| 5.5 | `trackCurrentTime` | Poll `currentTime`, update state |
| 5.75 | `switchQuality` (ABR) | Monitor bandwidth, update `selectedVideoTrackId` |
| 6 | `loadSegments` (video + audio) | Reactor: observe state → send to SegmentLoaderActor |
| 6.5 | `endOfStream` | Call `mediaSource.endOfStream()` when conditions met |
| 7–9 | text track features | Setup, cue loading, mode sync |

> **Step 5 note:** Both SourceBuffers are created in a single synchronous pass to avoid a Firefox bug where `mozHasAudio` stays `false` if the video buffer is created first and an audio track is added later. See [decisions.md](decisions.md#sourcebuffer-creation-order).

> **Step 0a note:** `syncPreloadAttribute` must run before `setupSourceBuffers` attaches the media element. The `syncPreloadAttribute` feature reads the element's `preload` attribute and writes it to state; if mediaElement is attached first, `setupSourceBuffers` reads the attribute before state is initialized.

### SegmentLoaderActor (`dom/features/segment-loader-actor.ts`)

Plans and executes segment fetches. Receives `{ type: 'load', track, range? }` messages.

**Planning** runs in three passes on each `load` message:

1. **Removes** — compute flush ranges for forward buffer overflow and back-buffer cleanup; queue `remove` tasks on the SourceBufferActor.
2. **Init** — if the actor's current `initTrackId` doesn't match the requested track, fetch and append the init segment first.
3. **Segments** — filter the track's segment list to those within the load window and not yet committed; fetch and append each.

**In-flight management** — `inFlightInitTrackId` and `inFlightSegmentId` track ongoing work. When a new `load` message arrives mid-execution:

- **Continue** — if the in-flight task is still needed for the new message, let it finish; queue remaining tasks behind it.
- **Preempt** — if the in-flight task is no longer needed (e.g., track switch), abort it and replan from scratch.

### SourceBufferActor (`dom/media/source-buffer-actor.ts`)

Serializes all MSE operations for one `SourceBuffer`. Accepts three message types:

| Message | Payload | Effect |
|---------|---------|--------|
| `append-init` | `{ data: ArrayBuffer, trackId, ...meta }` | Sets `initTrackId`, appends to buffer |
| `append-segment` | `{ body: AsyncIterable<Uint8Array>, segmentId, ... }` | Streams chunks; sets `partial: true` on first chunk, clears on completion |
| `remove` | `{ start, end }` | Calls `SourceBuffer.remove()` |

**Context snapshot** — visible to reactors and `endOfStream`:

```ts
interface SourceBufferActorContext {
  initTrackId?: string;
  segments: SegmentRecord[];   // all fully or partially appended segments
  bufferedRanges: TimeRange[];
  status: 'idle' | 'updating' | 'destroyed';
}

interface SegmentRecord {
  id: string;
  startTime: number;
  duration: number;
  trackId: string;
  trackBandwidth?: number;
  partial?: boolean;           // true while streaming, cleared on completion
}
```

`partial: true` means the segment is present but not complete. `endOfStream` excludes partial segments from its "last segment appended" check.

### Load Segments Reactor (`dom/features/load-segments.ts`)

Observes state and owner changes, decides when and what to load, and sends `load` messages to `SegmentLoaderActor`.

**Preload behavior:**

| Condition | Behavior |
|-----------|---------|
| `preload='none'` | Dormant until play |
| `preload='metadata'` | Fetch init segment only (no media segments) |
| `preload='auto'` | Full forward buffer |

**Post-play triggers:**
- Track ID changes (quality switch or user selection)
- Segment boundary crossings (not raw `currentTime` — avoids excessive re-evaluation)

**Bandwidth sampling bridge:** Each fetch callback reports bytes and elapsed time. The reactor holds local `throughput` state per track and syncs it into `state.bandwidthState` after each sample, then calls `state.flush()` so ABR (`switchQuality`) fires before the next fetch starts.

> The bandwidth bridge is a migration artifact. See [decisions.md](decisions.md#bandwidth-bridge).

### End of Stream (`dom/features/end-of-stream.ts`)

Monitors actors and state; calls `mediaSource.endOfStream()` when all conditions hold:

- `MediaSource.readyState === 'open'`
- `HTMLMediaElement.readyState >= HAVE_METADATA`
- SourceBuffers exist for all selected tracks
- **Both actors are idle** (no pending `SourceBuffer.updating`)
- Last segment (by ID) has been appended for each track and is not `partial`
- `currentTime >= lastSegment.startTime` (guards against re-triggering during back-buffer refills near the end)

Subscribes to actor snapshot changes (not just state) so it reacts immediately when actors go idle.

### Network (`dom/network/`)

**`chunked-stream-iterable.ts`** — adapts a `ReadableStream<Uint8Array>` into an `AsyncIterable<Uint8Array>`. Accumulates chunks until a `minChunkSize` threshold is met (default 128 KB), then yields. Always releases the reader lock in `finally`.

Init segments use `minChunkSize: Infinity`, forcing the full body to accumulate before yielding. This means init appends are atomic — the SourceBuffer sees the complete init segment in one call.

Audio segments currently also use `minChunkSize: Infinity` (effectively `arrayBuffer()` semantics). Video segments stream incrementally. See [decisions.md](decisions.md#streaming-body).

---

## Data Flow: Segment Load Lifecycle

```
state.patch({ presentation })
  → resolvePresentation fetches playlist
  → state.patch({ presentation: parsedPresentation })
  → selectVideoTrack picks initial track
  → resolveTrack fetches media playlist
  → loadSegments reactor fires
  → SegmentLoaderActor.send({ type: 'load', track })
  → planTasks() → [remove?, init?, ...segments]
  → init: fetch() → SourceBufferActor.send({ type: 'append-init' })
  → segment: fetch() → SourceBufferActor.send({ type: 'append-segment' })
    → chunks stream in → SourceBuffer.appendBuffer(chunk)
    → bandwidth sample → state.bandwidthState updated → flush()
    → switchQuality evaluates → may update selectedVideoTrackId
      → loadSegments re-fires → SegmentLoaderActor preempts or continues
  → last segment appended → endOfStream detects idle + complete
  → mediaSource.endOfStream()
```

---

## Constraints

- `SourceBuffer.appendBuffer()` and `SourceBuffer.remove()` are mutually exclusive — only one operation can be in flight per buffer at a time. `SerialRunner` enforces this.
- `MediaSource.endOfStream()` must not be called while any SourceBuffer is `updating`. `endOfStream` feature waits for actor idle.
- `SourceBuffer.remove()` re-opens a `'ended'` MediaSource (same behavior as `appendBuffer`). Guard `endOfStream` triggers against spurious re-entry.
- Firefox: both SourceBuffers must be created in the same synchronous execution context to avoid `mozHasAudio = false`. See step 5 above.
