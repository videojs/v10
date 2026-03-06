# SPF Session Notes

## Current State (as of 2026-03-05)

### Branch
- `fix/spf-seek-rebuffer-stall` — active, NOT yet merged to main

### What Was Built This Session

#### Bug fixes shipped
- Seek-rebuffer stall fix via SourceBufferActor (atomic model updates)
- Post-flush buffered ranges for segment model in removeTask (midpoint heuristic)
- Time-aligned startTime deduplication in appendSegmentTask

#### Architecture migration (incremental, still in progress)
- `createTrackedFetch` closure — bandwidth sampling co-located with fetch, invisible to callers
- `SegmentLoaderActor` extracted from `loadSegments`; `loadSegments` thinned to a Reactor
- `state.bufferState` removed from global state entirely
- `SourceBufferActor` moved to `owners` (created by `setupSourceBuffer` alongside SourceBuffer, single patch)
- `syncActorToState` eliminated — `endOfStream` subscribes to actor snapshots directly
- Reactor replaced `combineLatest` with a state selector (`LoadingInputs` + `loadingInputsEq`)
- `combineLatest` gained selector subscription support (same API as `createState`)
- `createState`/`StateContainer` fixed to support primitive state values (not just objects)
- `loadingInputsEq` equality convention corrected (was inverted)

### Known Issues / Broken Tests
- `src/dom/features/tests/load-segments.test.ts` — imports `shouldLoadSegments` and `canLoadSegments`
  which changed signature/semantics in recent WIP commits. Tests need updating to match new model.
- Two WIP commits on branch (`c2d6490a`, `c1d259a1`) have `@ts-expect-error` and `@TODO` markers
  that need cleanup.

### Key Architecture (Current Actual State)

**`setupSourceBuffer`** — creates `SourceBuffer` + `SourceBufferActor` together, single `owners.patch`

**`loadSegments` (Reactor)** — uses `state.subscribe(selectLoadingInputs, handler, { equalityFn: loadingInputsEq })`.
`loadingInputsEq` IS the shouldLoadSegments logic — returns true (equal/don't fire) or false (changed/fire).
`segmentsCanLoad` is a closure boolean updated via `combineLatest([state, owners])`.

**`SegmentLoaderActor`** — receives `{ type: 'load', track, range? }` messages; owns task loop,
seek detection, removes/fetches/appends. Still batch mode (fetch-all then append-all) — streaming not yet done.

**`endOfStream`** — subscribes to `owners.videoBufferActor/audioBufferActor` snapshot changes directly.
No more `state.bufferState`.

**`canLoadSegments`** — exported pure function; preconditions only (resolved track + actor in owners).

### Next Steps (in priority order)

1. **Fix broken `load-segments.test.ts`** — update tests to reflect new model (no `shouldLoadSegments` export,
   new `canLoadSegments` semantics, actors in owners)
2. **Streaming refactor** — `executeTask` in `SegmentLoaderActor` still batches all fetches before
   any appends; change to fetch-s1 → append-s1 → fetch-s2 → append-s2
3. **Clean up WIP commits** — remove `@ts-expect-error`, `@TODO`, fix type precision on `LoadingInputs.track`
4. **Design doc update** — `internal/design/spf/segment-loading-pipeline.md` partially updated but
   "Moving Pieces" and "Data Flow" sections still describe the old architecture

### Migration Bridges Still In Place
- `bandwidthState` bridge: `createTrackedFetch` still publishes to `state.bandwidthState` via `onSample`
  callback so ABR continues to work. Remove once ABR reads from throughput directly.

### File Locations
- Reactor + helpers: `packages/spf/src/dom/features/load-segments.ts`
- SegmentLoaderActor: `packages/spf/src/dom/features/segment-loader-actor.ts`
- SourceBufferActor: `packages/spf/src/dom/media/source-buffer-actor.ts`
- setupSourceBuffer: `packages/spf/src/dom/features/setup-sourcebuffer.ts`
- endOfStream: `packages/spf/src/dom/features/end-of-stream.ts`
- Design doc: `internal/design/spf/segment-loading-pipeline.md`
