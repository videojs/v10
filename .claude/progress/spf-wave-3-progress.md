# SPF Progress Report - Wave 3

**Date:** February 17–23, 2026 (Week 3)
**Epic:** Wave 3 — ABR & Integration (#386)
**Branch:** `feat/spf-wave-3-epic` → pending merge to `feat/spf`

## Summary

This wave we completed the Video.js integration layer (O8), wired bandwidth tracking into the segment loading pipeline (F8), built forward and back buffer management (F5, F6), bridged native media element events to the SPF event stream (O6), and established a task deduplication pattern across async features (O4). SPF can now be used via `<spf-video>` web component or `SpfVideo` React component inside a VJS player container with working UI controls, though integration-level bugs remain under investigation.

Beyond planned work, we discovered and fixed a gap in the VJS ContainerMixin: native `querySelector('video, audio')` excluded custom media elements entirely. We added `[data-media-element]` as a third discovery path, set it in `connectedCallback()` for spec-compliant timing, and extended the MutationObserver to watch attribute mutations as a fallback. The fix also applies to `<hls-video>` and other `CustomMediaMixin`-based elements.

The playback engine grew from 6.06 KB to 7.62 KB gzipped (38.1% of the 20 KB target), reflecting the new buffer management, bandwidth tracking, and integration layers added this wave.

## This Wave We (Wave 3):

- **Completed Video.js Adapter (O8)** — `SpfMedia` class with HTMLMediaElement-compatible `src`/`play()`, `SpfMediaMixin` in `@videojs/core`, `<spf-video>` web component, `SpfVideo` React component, sandbox demos in both flavours
- **Completed Media Event Orchestration (O6)** — bridged native `play` event to SPF event stream; `trackPlaybackInitiated` enables preload-agnostic segment loading after user gestures
- **Completed Forward Buffer Management (F5)** — buffer window awareness via `getSegmentsToLoad`, only fetches segments within target range
- **Completed Back Buffer Management + Buffer Flusher (F5, P12)** — `calculateBackBufferFlushPoint`, `flushBuffer` integrated in `loadSegments`
- **Completed Bandwidth Tracking (F8)** — `sampleBandwidth` wired into segment loading; EWMA estimator now receives real download measurements
- **Completed Task Deduplication Pattern (O4)** — composite task pattern with hierarchical tracking, promise-based deduplication across all async features
- **Added consistent AbortSignal support** — all async features use `AbortController` for cancellation, eliminating unhandled rejections
- **Fixed VJS ContainerMixin** — `[data-media-element]` discovery + `connectedCallback` timing fix; affects all packages, not just SPF
- **Sandbox demos** — `spf-html` (web component) and `spf-react` with play/mute icon controls fully wired to VJS player store
- **All tests passing** — 562 tests (up from 495 after wave 2)

## Issues Completed

### O4 - Task Deduplication ✅

**Implementation:**
- Composite task pattern with hierarchical tracking across all async features
- Promise-based deduplication (replaces ad-hoc `resolving` flags)
- Task created at module level with clean parameter separation

**Pattern:**
```ts
const task = createTask();
return combineLatest([state, owners]).subscribe(async ([s, o]) => {
  if (!can(s, o) || !should(s, o) || task.isRunning()) return;
  await task.run(async (signal) => {
    // abort-aware async work
  });
});
```

### O6 - Media Event Orchestrator ✅ (#414)

**Implementation:**
- `trackPlaybackInitiated.ts` — listens to native `play` event on `mediaElement`
- Sets `state.playbackInitiated = true` + dispatches `{ type: 'play' }` to event stream
- Enables `resolvePresentation` and `loadSegments` to proceed even when `preload="none"`
- `trackCurrentTime.ts` — mirrors `mediaElement.currentTime` into reactive state

**Tests:** Integrated into playback engine E2E tests

### F5 - Forward Buffer Management ✅ (#423)

**Implementation:**
- `getSegmentsToLoad(segments, bufferedSegments, currentTime)` in `forward-buffer.ts`
- `loadSegments` only fetches segments within the buffer window (default 30s ahead)
- Buffer state tracks which segments are already loaded per SourceBuffer
- `shouldLoadSegments` uses `getSegmentsToLoad` result to gate fetching

**Tests:** 24 passing (`load-segments.test.ts`)

### F6 - Back Buffer Management + P12 Buffer Flusher ✅ (#433, #402)

**Implementation:**
- `calculateBackBufferFlushPoint(currentTime, config)` in `back-buffer.ts`
- `flushBuffer(sourceBuffer, start, end)` in `buffer-flusher.ts` — removes old segments
- Integrated in `loadSegments`: flushes back buffer before appending new segments
- Configurable keep threshold (default: last 60s behind playhead)

**Tests:** Back buffer + flush tests integrated in `load-segments.test.ts`

### F8 - Bandwidth Tracking ✅

**Implementation:**
- `sampleBandwidth(state, bytes, durationMs)` called after each segment fetch
- EWMA estimator (`bandwidth-estimator.ts`) now receives real download measurements
- `bandwidthState` in engine state updates reactively after each segment
- Foundation for F9 (Quality Switching)

**Tests:** 8 passing bandwidth tracking tests

### O8 - Video.js Adapter ✅ (#416)

**Implementation:**
- `SpfMedia` class in `@videojs/spf/dom`:
  - Engine created once at construction, reused across `src`/element changes
  - `src` getter derived from `state.current.presentation?.url`
  - `play()` patches `playbackInitiated`, retries via `loadstart` when MSE not yet attached
  - Pending `loadstart` listener tracked as `#loadstartListener`, cleaned up on `detach()`/`destroy()`
- `SpfMediaMixin` + `SpfMedia` class in `@videojs/core/dom/media/spf` (mirrors `HlsMediaMixin`)
- `<spf-video>` web component in `@videojs/html/src/media/` + registration in `src/define/media/`
- `SpfVideo` React component in `@videojs/react/src/media/spf-video/`
- `@videojs/html` + `@videojs/react` declared as explicit deps on `@videojs/spf` (Vite workspace resolution)

**Tests:** 23 browser tests covering full `SpfMedia` lifecycle

## Infrastructure Improvements

### VJS ContainerMixin — Custom Media Element Discovery

**Problem:** `ContainerMixin.querySelector('video, audio')` and `node instanceof HTMLMediaElement` only recognise native elements. Custom elements (`<spf-video>`, `<hls-video>`) with shadow DOM `<video>` were invisible to the store — resulting in `StoreError: NO_TARGET` when buttons were clicked.

**Solution:**
- Extended `querySelector` to `'video, audio, [data-media-element]'`
- Extended `isMediaNode()` to also check `node.hasAttribute('data-media-element')`
- Extended `MutationObserver` to watch `attributeFilter: ['data-media-element']` mutations
- `CustomMediaMixin.connectedCallback()` sets `data-media-element` (spec-compliant; `init()` was lazy and parser-created elements cannot call `setAttribute` in constructors)

**Files:** `packages/html/src/store/container-mixin.ts`, `packages/html/src/ui/custom-media-element.ts`

### AbortSignal + Unhandled Rejection Fixes

Async orchestrations more consistently use `AbortController`:
- Signals passed through fetch chains
- Cleanup functions abort in-flight work
- Reduces unhandled promise rejections on destroy/navigation

### Preload-Aware Segment Loading

`loadSegments` now distinguishes three modes:
- `preload="auto"` or `playbackInitiated` → full loading
- `preload="metadata"` → init segment only (advances to `HAVE_METADATA`)
- `preload="none"` (default, not yet played) → blocked until play event

## Playback Engine Pipeline (Updated)

```
0a. syncPreloadAttribute        — mirrors mediaElement.preload → state
0b. trackPlaybackInitiated      — play event → state.playbackInitiated
1.  resolvePresentation (F1)    — fetch + parse multivariant playlist
2.  selectVideoTrack (F2)       — ABR-based initial quality selection
    selectAudioTrack (F2)       — language-preference-based
    selectTextTrack (F2)        — opt-in / DEFAULT flag
3.  resolveTrack×3 (F3)        — fetch media playlists (video/audio/text)
    3.5 calculatePresentationDuration
4.  setupMediaSource            — create MediaSource, attach blob URL
    4.5 updateDuration          — set MediaSource.duration
5.  setupSourceBuffer×2        — create SourceBuffers (video + audio)
    5.5 trackCurrentTime        — mirror currentTime into state (feeds F5)
6.  loadSegments×2 (F4+F5+F6+F8) — buffer-aware loading with back-buffer flush
    6.5 endOfStream             — signal completion
7.  setupTextTracks (F13)      — create <track> elements
8.  syncTextTrackModes (F13)   — activate selected track
9.  loadTextTrackCues (F13)    — fetch + parse VTT segments
```

## Test Coverage

**Total Tests:** 562 passing, 12 skipped (574 total)
**Test Suites:** 35 passing
**Δ from Wave 2:** +67 tests (+14% coverage growth)

**New test areas:**
- `SpfMedia` adapter (23 browser tests)
- Buffer state tracking in `loadSegments`
- Forward/back buffer management
- Bandwidth sampling
- Playback-initiated tracking

## Bundle Size

**Playback Engine:** 7.62 KB gzipped (was 6.06 KB after wave 2)
- Minified: 24.83 KB
- Target: 20 KB gzipped
- **Used: 38.1% (61.9% / 12.38 KB remaining)**

Growth of 1.56 KB reflects: buffer management, bandwidth tracking, `trackPlaybackInitiated`, `trackCurrentTime`, plus the new integration adapter.

## Sandbox Demos

Two new end-to-end demos:

**`/spf-html/`** — Web component flavour
- `<spf-video>` inside `<video-player>` with VJS provider
- `<media-play-button>` + `<media-mute-button>` with SVG icon slots
- Data-attribute CSS for icon state (`[data-paused]`, `[data-muted]`)

**`/spf-react/`** — React flavour
- `SpfVideo` inside `<Provider><Container>`
- `<PlayButton render={...}>` + `<MuteButton render={...}>` with icon render props
- VJS store wiring via `useMediaRegistration`

Both demos validated basic play/mute functionality with a Mux HLS stream and VJS UI controls. Known integration bugs remain to be addressed.

## Where We're At

- **Wave 3 Epic:** ~60% complete (O4 ✅, O6 ✅, O8 ✅, F5 ✅, F6 ✅, F8 ✅, F17 ✅ — F9, F14, F16, F15 remaining)
- **VJS integration: Basic playback working** — SPF plays HLS via VJS player with UI controls in both HTML and React; integration-level bugs under investigation
- **Test Suite: 100% passing** — 562 tests, no flaky tests
- **Bundle within target** — 7.62 KB, 12.38 KB remaining

## What's Next (Wave 3 Remainder + Wave 4)

**Highest priority:**
- F9: Quality Switching — last major ABR feature; all dependencies (F8, P7) now met
- Bug fixes identified during wave 3 integration testing

**Integration completions:**
- F16: Video.js Events Integration (O8 done — unblocked)
- F14: Startup Orchestration (partially done)

**Wave 4:**
- F18: Minimal Documentation (O8 done — unblocked)
- F7: Seek Orchestration (closed as complete but needs verification)
- F15: Playback State Machine (closed as complete but needs verification)

## Metrics

**Commits:** 58 commits in wave 3 branch
**Tests:** 562 passing (up from 495 after wave 2)
**Bundle Size:** 7.62 KB gzipped playback engine (61.9% of 20 KB budget remaining)
**Packages Modified:** `@videojs/spf`, `@videojs/core`, `@videojs/html`, `@videojs/react`, `@videojs/sandbox`

---

**Overall SPF Progress:** ~60% complete
**Remaining High-Impact:** F9 (Quality Switching), F16 (VJS Events), F14 (Startup), F18 (Docs)
