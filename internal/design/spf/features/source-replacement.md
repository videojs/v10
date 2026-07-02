---
status: implemented
date: 2026-05-20
definition: sketched
---

# Source replacement

The engine's source-change capability: load a new source on an
already-attached engine without recreating it. Driven by overwriting
`state.presentation` with a new unresolved `{url}`; `resolvePresentation`
routes the FSM back through `'resolving'` and downstream behaviors tear
down their per-source state via reactor state-exit. The cascade is
load-bearing — every behavior that gates on `isResolvedPresentation`
must honor the state-exit cleanup contract, or in-place replacement
breaks silently.

The canonical adapter (`SimpleHlsMediaMixin.src`) takes a different
path: destroy the engine and create a fresh one on every assignment.
Both paths work; the in-place path is the load-bearing one for
*engine-internal* reasoning, since the adapter's destroy path bypasses
the cascade entirely.

This doc captures the **capability surface**, the **cleanup contract**
new behaviors must honor, and the verification that pins the
in-place path against regression.

## Status

- **Composition:** `createSimpleHlsEngine` (HLS VoD)
- **Definition depth:** sketched — capability surface, cleanup contract,
  and validation test all in place
- **Cleanup contract** (load-bearing): every behavior that gates on
  `isResolvedPresentation` MUST tear down cleanly via reactor state-exit
  when presentation un-resolves. Setup behaviors detach DOM resources /
  destroy actors / clear context slots; async-fetch behaviors bind
  `AbortController` to state-exit. New behaviors that join the engine
  must follow this pattern or the in-place source-replacement validation
  test (`engine.test.ts` → "cleanly replaces source in place via
  state.presentation overwrite") will fail.

## Phases of complexity

Capability slices around the source-change contract. Each phase is a
distinct engine behavior observable from outside.

| Phase | What | Notes |
|---|---|---|
| Initial source load | First source on a fresh engine: external write of `state.presentation = { url }` triggers resolve + full pipeline setup | The unresolved → resolved transition that bootstraps everything |
| In-place source replacement | Overwrite `state.presentation` with a new `{ url }` while a previous source is resolved / playing. `resolvePresentation` routes back through `'resolving'`; downstream behaviors tear down via reactor state-exit; new source resolves and plays — *same engine instance* | Validated end-to-end. MediaSource + buffer actors are fresh instances; in-flight fetches aborted via state-bound `AbortController`s |
| Source unset | Set `state.presentation` to `undefined`. All presentation-gated behaviors transition to `'preconditions-unmet'` and tear down. Engine is fresh-but-attached, ready for the next source | The "no source" steady state; reachable from any resolved state |
| Destroy + recreate (canonical adapter path) | `SimpleHlsMediaMixin.src` destroys the current engine and creates a fresh one on every assignment. Re-attaches the media element to the new engine | Canonical *consumer-side* mechanism. Bypasses the in-place cascade entirely. Tested via `adapter.test.ts:115–150` |
| Per-source-identity slot lifecycle | `loadActivated` resets to `false` when source identity changes (URL or `mediaElement`); selected*TrackIds clear naturally on un-resolve (their pickers re-run against the new presentation); **`bandwidthState` is intentionally preserved** across source resets — sampling accumulates via the once-per-behavior `createTrackedFetch` | ABR resume: bandwidth estimate carries over so the first segment of a new source picks an appropriate quality based on observed throughput |

## What's not implemented

- **Cross-codec source replacement** — same-codec sources work (the
  segment-loader's time-aligned dedup handles it); cross-codec
  replacement would need `changeType()` handling. Folds into the
  `[buffer-flushing]` and `[5.1-surround-selection]` /
  `[hevc-variant-selection]` candidates.
- **Source-error recovery state** — `resolvePresentation` currently
  surfaces fetch / parse failures via `console.error` (with a TODO in
  the code: "route to a state-error slot once one exists"). Consumers
  have no observable signal for "source failed to load."
- **Per-source `bandwidthState` reset opt-in** — preservation is the
  baked-in policy (ABR resume). No opt-out exists for testing or
  fresh-session scenarios that want a clean estimator.
- **Concurrent pre-fetch / hand-off** — replacement is teardown-then-
  rebuild; the engine doesn't support pre-warming the next source while
  the current one plays. Playlist / queue semantics are out of scope.

## Implementation surface

**Composition:** `packages/spf/src/playback/engines/hls/engine.ts` — the
source-replacement capability isn't owned by any single behavior; it
emerges from `resolvePresentation`'s 4-state FSM + the cleanup contract
every presentation-gated behavior honors.

**Orchestrator:** `resolvePresentation`
(`packages/spf/src/playback/behaviors/resolve-presentation.ts`)

| State | What |
|---|---|
| `'preconditions-unmet'` | No presentation, or presentation has no URL |
| `'idle'` | URL present, unresolved, preload gate unmet — waits for `loadActivated` or non-blocking preload |
| `'resolving'` | URL present, unresolved, gate met. Entry starts fetch + binds `AbortController` to state-exit |
| `'resolved'` | `state.presentation` holds a resolved `Presentation` |

State transitions on `state.presentation` writes are the source-
replacement mechanism: overwriting a resolved presentation with a new
unresolved `{ url }` routes the FSM `'resolved' → 'resolving'` (assuming
gate open), aborting any prior in-flight fetch and starting fresh.

**Cleanup contract — behaviors that ride the resolved/unresolved cascade:**

| Behavior | What it tears down on state-exit |
|---|---|
| `setupMediaSource` | Aborts in-flight `waitForMediaSourceOpen`; detaches MediaSource from element; clears `context.mediaSource` |
| `setupVideoBufferActors` / `setupAudioBufferActors` | Destroys `SegmentLoaderActor` then `SourceBufferActor` (reverse order); clears `context.{video,audio}{BufferActor,SegmentLoaderActor}` |
| `setupTextTrackActors` | Destroys text-track actors; clears context slots |
| `updateMediaSourceDuration` | Aborts in-flight `waitForMediaSourceOpen` + `waitForSourceBuffersReady` |
| `endOfStream` | Aborts in-flight wait |
| `resolveVideoTrack` / `resolveAudioTrack` / `resolveTextTrack` | Aborts in-flight playlist fetch |
| `resolvePresentation` | Aborts in-flight manifest fetch via state-exit on the `'resolving'` entry's `AbortController` return |

**Per-source-identity-aware behaviors** (transition independently on
source change, not via the resolved/unresolved cascade):

| Behavior | Per-source reset |
|---|---|
| `trackLoadTriggers` | `loadActivated` reset to `false` on `(mediaElement, presentation.url)` identity change |
| `selectAudioTrack` / `switchTextTrack` / `switchVideoQuality` | Re-pick when presentation transitions to resolved with new content |

**Cross-source preservation:**

| Slot | Why preserved |
|---|---|
| `state.bandwidthState` | ABR resume — `createTrackedFetch` in `setupVideoBufferActors` is constructed once at behavior setup and accumulates EWMA across source resets |
| `state.preload` | Engine-wide preference, not source-specific |
| `state.currentTime` | DOM-side mirror via `trackCurrentTime`; resets on new presentation naturally (element `currentTime` resets on `src` change) |

**Multi-writer `state.presentation` pipeline.** Three writer domains,
non-overlapping aspects:
- **Adapter / external** — writes initial unresolved `{ url }` (and
  overwrites with new `{ url }` for in-place replacement)
- **`resolvePresentation`** — writes resolved `Presentation` with
  `id`, `selectionSets`, etc.
- **Per-track resolvers + `calculatePresentationDuration`** —
  `resolveVideoTrack` / `resolveAudioTrack` / `resolveTextTrack` patch
  resolved segment lists into their respective tracks;
  `calculatePresentationDuration` patches in `duration`. Each reads
  current value and writes a new one with their field added; none
  overwrites a field another owns.

## Config surface

No engine-level config for source replacement itself. The
`config.parsePresentation` required by `resolvePresentation` is the
format-neutral parser hook (e.g., the HLS engine supplies
`parseMultivariantPlaylist`); it doesn't affect source-replacement
semantics — every replaced source runs through the same parser.

## Verification

- **Unit tests:**
  - `packages/spf/src/playback/engines/hls/tests/engine.test.ts` →
    `"cleanly replaces source in place via state.presentation overwrite"`
    — end-to-end validation: mock fetch with two sources A and B,
    resolve source A through the full pipeline, capture identities of
    `mediaSource` / `videoBufferActor` / `audioBufferActor`, overwrite
    `state.presentation` with source B, verify B resolves and the
    captured identities differ from the new ones (proving teardown
    cascade ran)
  - `packages/spf/src/playback/engines/hls/tests/adapter.test.ts` →
    `"creates a new engine when src is set"` /
    `"destroys the old engine when src changes"` /
    `"re-attaches the media element to the new engine when src changes"`
    — validates the canonical adapter destroy-recreate path
  - `packages/spf/src/playback/behaviors/dom/tests/track-load-triggers.test.ts`
    — `loadActivated` per-source-identity reset coverage
- **Sandbox:**
  - `apps/sandbox/src/spf-segment-loading/` — exercises initial source
    load + manual rendition switching (in-track, not source change)
  - `apps/sandbox/src/simple-hls-html/` / `simple-hls-react/` — adapter
    integration; src reassignment hits the destroy-recreate path

## Open questions

- **Error recovery surface.** `resolvePresentation` currently uses
  `console.error` for fetch / parse failures and has a `TODO(error-
  management)` for a state-error slot. The shape of this slot — single
  error vs per-source — affects how consumers respond to "source failed
  to load."
- **Adapter rationale.** The canonical adapter destroys + recreates the
  engine on every src change instead of using in-place replacement. The
  reasoning (stricter isolation? simpler reasoning? guarding against
  cleanup-cascade bugs?) isn't documented in the code or commit history.
  If the in-place path is the engine's load-bearing capability for
  internal reasoning, why doesn't the adapter use it?
- **Per-source `bandwidthState` reset opt-in.** Preserving across
  sources is the right default for ABR resume, but a test / fresh-
  session escape hatch may earn its place when consumers start needing
  it.

## Related features

- **preload-modes** — gates `resolvePresentation`'s `'idle'` →
  `'resolving'` transition; per-source `loadActivated` reset (in
  `trackLoadTriggers`) is part of the source-identity-aware behavior
  surface this feature relies on.
- **mse-mms-pipeline** — `setupMediaSource` is the canonical example
  of riding the resolver's resolved/unresolved lifecycle for cleanup;
  the feature doc calls this "structural" routing out explicitly.
- **buffer-management** — segment-loader actors tear down via the same
  cascade; in-flight fetches aborted; bandwidth sampling preserved
  across sources via `createTrackedFetch` constructed once.
- **video-abr** — `bandwidthState` preservation policy lives here.
  Observable behavior: ABR resumes across source changes rather than
  re-bootstrapping from `initialBandwidth`.
- **subtitles** — text-track actors and selection clear on source
  un-resolve via the cleanup cascade.
- **engine-adapter-integration** *(not yet documented, candidate)* —
  `SimpleHlsMediaMixin`'s destroy-recreate path lives here. The
  adapter's choice to bypass in-place replacement is the
  feature-design decision to capture in that doc.

## See also

- [presentation-modeling.md](../presentation-modeling.md) —
  architectural deep-dive on the format-neutral data shape, parser
  interface, and per-track resolution layer. The multi-writer
  `state.presentation` pipeline this feature characterizes is anchored
  in that doc's data model
- [clusters.md § Engine lifecycle](./clusters.md#engine-lifecycle) —
  cross-cutting concerns around engine instantiation, source loading,
  and per-source identity resets (this feature + `preload-modes`)
- [packages/spf/docs/hls-engine.md](../../../../packages/spf/docs/hls-engine.md)
  — engine composition walkthrough (Stage 1 covers
  `resolvePresentation`)
- [conventions/behaviors.md](../conventions/behaviors.md) — reactor
  state-exit cleanup conventions
- [conventions/signals.md](../conventions/signals.md) — multi-writer
  slot conventions (`state.presentation` is the canonical pipeline-
  pattern example)
