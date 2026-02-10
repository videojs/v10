# SPF GitHub Issues - Complete Set (58 Issues)

**Target Date:** February 27, 2026
**Total Issues:** 58
**Organization:** 4 Waves across 24 days

---

## Story Point Reference

- **XS** = 1-2 points (1-2 days)
- **S** = 3-5 points (2-5 days)
- **M** = 8 points (1-2 weeks)
- **L** = 13 points (2-4 weeks)

---

# Wave 1: Foundation & Pure Functions (23 issues)
**Dates:** Feb 3-10 (Week 1)
**Goal:** Build foundation and all parallelizable pieces

---

## [O1] Reactive State Container

**Type:** Infrastructure | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 1 | **Category:** Orchestration

### Description

Build the foundational reactive state management system based on the spike implementation. This is a lightweight state container with `patch()` for updating state, `subscribe()` for reactive listeners, batched updates via microtask flush, and immutable state snapshots. **This is the #1 priority item - everything else depends on it.**

### Acceptance Criteria

- [ ] `createState<T>(initial: T): WritableState<T>` factory function
- [ ] `WritableState` interface with `current`, `patch()`, `subscribe()`
- [ ] State updates are immutable (frozen objects)
- [ ] Subscribers are notified on state changes
- [ ] Updates are batched via microtask (queueMicrotask)
- [ ] Multiple patches in same tick only trigger one notification
- [ ] `flush()` function for manual batching control
- [ ] Type-safe state access and updates
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** None - **START DAY 1**

**Blocks:** O2, O3, O5, O6, O7, O8, O9, O12, O13, F1-F16 (40+ items)

### Technical Notes

**Reference:** `/Users/cpillsbury/dev/experiments/xstate-concepts-experiments/src/vjs/store/state.ts`

**Key Implementation:**
- Use `Object.freeze()` for immutable snapshots
- Use `Object.is()` for change detection
- Use `queueMicrotask()` for batched flush
- Use `Set<StateChange>` for subscriber management

**Files:** `packages/spf/src/core/state/create-state.ts`, `types.ts`, `tests/create-state.test.ts`

### Bundle Size Impact

**Target:** <1KB minified+gzipped (Core primitive, must be tiny)

---

## [O10] Module Structure Design

**Type:** Architecture | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 1 | **Category:** Orchestration

### Description

Define the package structure, module organization, public/internal APIs, and dependency graph for the SPF codebase. This is an architectural decision that informs all development work and must be completed early alongside O1.

### Acceptance Criteria

- [ ] Package structure defined (`packages/spf/src/...`)
- [ ] Module organization documented (core, dom, utils subdirectories)
- [ ] Public API surface identified (what's exported vs internal)
- [ ] Dependency rules established (no circular deps, clear hierarchy)
- [ ] File naming conventions defined
- [ ] Bundle entry points defined
- [ ] TypeScript project references configured
- [ ] Documentation in `packages/spf/ARCHITECTURE.md`

### Dependencies

**Depends on:** None - **START DAY 1**

**Blocks:** All other work (everyone needs to know where to put code)

### Technical Notes

**Proposed Structure:**
```
packages/spf/src/
  core/         # Runtime-agnostic (state, orchestration, hls, abr, buffer, types)
  dom/          # DOM bindings (media, captions, events, network, integration)
  utils/        # Shared utilities (preload, logging)
```

**Dependency Hierarchy:** utils → core → dom → integration

**Key Decisions:** Single bundle vs. multiple? Public API surface? Feature-based or layer-based structure?

### Bundle Size Impact

**Target:** N/A (Architecture decision, but structure should enable tree-shaking)

---

## [O3] Resolvables Pattern

**Type:** Infrastructure | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 1 | **Category:** Orchestration

### Description

Implement the "resolvables" pattern for reactive orchestration: monitor state for unresolved items → automatically trigger resolution. This pattern enables declarative "what" instead of imperative "how" for async operations like fetching playlists and resolving tracks.

### Acceptance Criteria

- [ ] `createResolvable<T>()` factory for monitoring unresolved state
- [ ] Type predicates for `isResolved()` / `isUnresolved()`
- [ ] Reactive subscription triggers resolve operation
- [ ] Deduplication prevents duplicate resolves
- [ ] AbortController support for cancellation
- [ ] State updates on resolution complete
- [ ] Error handling for failed resolutions
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** O1 (State Container) - **BLOCKED UNTIL O1 DONE**

**Blocks:** F1, F2, F3, F9, O4, O5

### Technical Notes

**Reference:** `/Users/cpillsbury/dev/experiments/xstate-concepts-experiments/src/vjs/examples/hls-playlist-direct.ts`

**Pattern:** Declarative selectors monitor state, automatically trigger async resolution, update state on completion.

**Key Challenges:** Deduplication, cancellation, error handling, type safety.

**Files:** `packages/spf/src/core/orchestration/resolvable.ts`, `types.ts`, `tests/resolvable.test.ts`

### Bundle Size Impact

**Target:** <2KB minified+gzipped (Core orchestration pattern)

---

## [P1] Multivariant Playlist Parser

**Type:** Pure Function | **Size:** S (3 points) | **Priority:** P0 | **Wave:** 1 | **Category:** Pure/Isolated

### Description

Parse HLS master playlist (multivariant m3u8) to extract variant streams, audio tracks, subtitle tracks, and metadata. Pure function with no state or side effects.

### Acceptance Criteria

- [ ] Parse `#EXT-X-STREAM-INF` tags for video variants
- [ ] Parse `#EXT-X-MEDIA` tags for audio/subtitle tracks
- [ ] Extract bandwidth, resolution, codecs, frame rate
- [ ] Handle relative and absolute URLs
- [ ] Return structured `Presentation` type
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** None

**Blocks:** F1 (Playlist Resolution Flow)

### Technical Notes

**Input:** Raw m3u8 text string + base URL
**Output:** `Presentation` object with selection sets (variants, audio, subtitles)

**Files:** `packages/spf/src/core/hls/parse-multivariant.ts`, `tests/parse-multivariant.test.ts`

### Bundle Size Impact

**Target:** <2KB (Parser logic only)

---

## [P2] Media Playlist Parser

**Type:** Pure Function | **Size:** S (3 points) | **Priority:** P0 | **Wave:** 1 | **Category:** Pure/Isolated

### Description

Parse HLS media playlist (m3u8) to extract segment information, duration, sequence numbers, and discontinuities. Pure function with no state or side effects.

### Acceptance Criteria

- [ ] Parse `#EXTINF` tags for segment duration
- [ ] Parse `#EXT-X-BYTERANGE` for byte-range requests
- [ ] Parse `#EXT-X-DISCONTINUITY` markers
- [ ] Extract `#EXT-X-TARGETDURATION`, `#EXT-X-MEDIA-SEQUENCE`
- [ ] Handle relative and absolute segment URLs
- [ ] Return structured `Track` type
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** None

**Blocks:** F1, F3 (Playlist/Track Resolution)

### Technical Notes

**Input:** Raw m3u8 text string + base URL
**Output:** `Track` object with resolved segments array

**Files:** `packages/spf/src/core/hls/parse-media.ts`, `tests/parse-media.test.ts`

### Bundle Size Impact

**Target:** <2KB (Parser logic only)

---

## [P3] Playlist URL Resolution

**Type:** Utility | **Size:** XS (1 point) | **Priority:** P0 | **Wave:** 1 | **Category:** Pure/Isolated

### Description

Resolve relative URLs in HLS playlists to absolute URLs. Utility function for handling URL resolution logic consistently across parsers.

### Acceptance Criteria

- [ ] Resolve relative URLs against base URL
- [ ] Handle absolute URLs (pass through)
- [ ] Handle protocol-relative URLs
- [ ] Support query strings and fragments
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** None

**Blocks:** P1, P2 (Used by both parsers)

### Technical Notes

**Implementation:** Use `new URL(relative, base)` for resolution.

**Files:** `packages/spf/src/core/hls/resolve-url.ts`, `tests/resolve-url.test.ts`

### Bundle Size Impact

**Target:** <0.5KB (Tiny utility)

---

## [P4] HTTP Fetch Wrapper

**Type:** Network | **Size:** S (3 points) | **Priority:** P0 | **Wave:** 1 | **Category:** Pure/Isolated

### Description

Wrapper around `fetch()` API with readable stream support, error handling, timeout support, and abort controller integration. Isolated network layer for all HTTP requests.

### Acceptance Criteria

- [ ] Fetch with ReadableStream support
- [ ] AbortController integration for cancellation
- [ ] Timeout support with automatic abort
- [ ] Error handling and retry logic
- [ ] Progress tracking for bandwidth estimation
- [ ] Response validation (status codes, content-type)
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** None

**Blocks:** F1, F3, F4 (Used for all network requests)

### Technical Notes

**Features:** AbortSignal, timeout, progress events, error wrapping

**Files:** `packages/spf/src/dom/network/fetch.ts`, `tests/fetch.test.ts`

### Bundle Size Impact

**Target:** <1KB (Thin wrapper around native fetch)

---

## [P5] Fetch-Parse Pattern

**Type:** Utility | **Size:** S (3 points) | **Priority:** P1 | **Wave:** 1 | **Category:** Pure/Isolated

### Description

Reusable abstraction for fetch-then-parse operations to reduce code duplication. Combines P4 (fetch) with parsing functions (P1, P2) in a composable pattern.

### Acceptance Criteria

- [ ] Generic `fetchAndParse<T>()` function
- [ ] Error handling for both fetch and parse failures
- [ ] Type-safe parser integration
- [ ] Progress tracking support
- [ ] AbortController propagation
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** P4 (HTTP Fetch Wrapper)

**Blocks:** F1, F3 (Simplifies playlist/track fetching)

### Technical Notes

**Pattern:** `fetchAndParse(url, parser, options)` → typed result

**Files:** `packages/spf/src/dom/network/fetch-parse.ts`, `tests/fetch-parse.test.ts`

### Bundle Size Impact

**Target:** <0.5KB (Small abstraction)

---

## [P6] Bandwidth Estimator

**Type:** Algorithm | **Size:** S (3 points) | **Priority:** P0 | **Wave:** 1 | **Category:** Pure/Isolated

### Description

EWMA (Exponentially Weighted Moving Average) throughput calculation from segment download metrics. Pure algorithm for bandwidth estimation used by ABR.

### Acceptance Criteria

- [ ] EWMA calculation with configurable alpha
- [ ] Update from segment download (bytes, duration)
- [ ] Return current bandwidth estimate (bits/sec)
- [ ] Handle initial state (no samples yet)
- [ ] Support reset functionality
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** None

**Blocks:** F8 (Bandwidth Tracking)

### Technical Notes

**Algorithm:** `bandwidth = alpha * sample + (1 - alpha) * bandwidth`

**Default alpha:** 0.2 (can be tuned)

**Files:** `packages/spf/src/core/abr/bandwidth-estimator.ts`, `tests/bandwidth-estimator.test.ts`

### Bundle Size Impact

**Target:** <0.5KB (Simple math)

---

## [P7] Quality Selection Algorithm

**Type:** Algorithm | **Size:** S (3 points) | **Priority:** P0 | **Wave:** 1 | **Category:** Pure/Isolated

### Description

Choose video track variant based on current bandwidth estimate and buffer state. Pure function implementing simple heuristic for quality selection.

### Acceptance Criteria

- [ ] Select track based on bandwidth and variants
- [ ] Apply buffer-based adjustments (stable buffer → upshift)
- [ ] Prevent rapid switching (hysteresis)
- [ ] Support manual quality override
- [ ] Return selected track index
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** None

**Blocks:** F2 (Initial Track Selection), F9 (Quality Switching)

### Technical Notes

**Heuristic:** 90% of bandwidth for safety margin, prefer higher quality when buffer is healthy.

**Files:** `packages/spf/src/core/abr/quality-selector.ts`, `tests/quality-selector.test.ts`

### Bundle Size Impact

**Target:** <1KB (Simple heuristic)

---

## [P8] Forward Buffer Calculator

**Type:** Algorithm | **Size:** S (5 points) | **Priority:** P0 | **Wave:** 1 | **Category:** Pure/Isolated

### Description

Calculate forward buffer target to determine how much content to buffer ahead of playback position. V1 uses simple time-based approach with stretch goal for dynamic "can play through" calculation.

### Acceptance Criteria

**V1 (Must Have):**
- [ ] Calculate buffer target based on playback time
- [ ] Support configurable target duration (default: 30s)
- [ ] Return target time ahead of currentTime
- [ ] Handle edge cases (end of content, initial buffering)
- [ ] Unit tests with ≥80% coverage

**Stretch Goal (Time Permitting):**
- [ ] Dynamic calculation based on bandwidth and segment durations
- [ ] "Can play through" estimation
- [ ] Adaptive target based on network conditions

### Dependencies

**Depends on:** None

**Blocks:** F5 (Forward Buffer Management)

### Technical Notes

**V1 Implementation:** Fixed 30s target (configurable)

**Stretch Enhancement:** Use bandwidth estimate and segment durations to calculate "can play through" time.

**Trade-off:** Start simple for V1 reliability, enhance if time permits.

**Files:** `packages/spf/src/core/buffer/forward-buffer-calculator.ts`, `tests/forward-buffer-calculator.test.ts`

### Bundle Size Impact

**Target:** <1KB (V1 simple, <2KB with dynamic calculation)

---

## [P9] Back Buffer Strategy

**Type:** Algorithm | **Size:** S (3 points) | **Priority:** P1 | **Wave:** 1 | **Category:** Pure/Isolated

### Description

Calculate flush points for back buffer to manage memory. V1 uses simple "keep N segments" logic with stretch goal for smart byte-tracking with append errors.

### Acceptance Criteria

**V1 (Must Have):**
- [ ] Keep last N segments before currentTime (default: 5)
- [ ] Return time range to flush (start, end)
- [ ] Handle edge cases (near start of content)
- [ ] Unit tests with ≥80% coverage

**Stretch Goal (Time Permitting):**
- [ ] Byte-based tracking instead of segment count
- [ ] Detect and handle SourceBuffer append errors
- [ ] Dynamic threshold based on available memory

### Dependencies

**Depends on:** None

**Blocks:** F6 (Back Buffer Management)

### Technical Notes

**V1 Implementation:** Keep fixed number of segments behind playhead.

**Stretch Enhancement:** Track bytes, detect SourceBuffer quota exceeded errors, calculate flush points dynamically.

**Trade-off:** Start simple for V1 reliability, enhance if time permits.

**Files:** `packages/spf/src/core/buffer/back-buffer-strategy.ts`, `tests/back-buffer-strategy.test.ts`

### Bundle Size Impact

**Target:** <1KB (V1 simple, <2KB with smart tracking)

---

## [P10] MediaSource Setup

**Type:** DOM/MSE | **Size:** S (3 points) | **Priority:** P0 | **Wave:** 1 | **Category:** Pure/Isolated

### Description

Create and configure MediaSource and SourceBuffer instances. Isolated wrapper around MSE/MMS API for managing media attachment to video element.

### Acceptance Criteria

- [ ] Create MediaSource instance
- [ ] Attach to HTMLMediaElement via Object URL
- [ ] Create SourceBuffer with codec string
- [ ] Handle `sourceopen` event
- [ ] Support ManagedMediaSource when available
- [ ] Error handling for unsupported codecs
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** None

**Blocks:** P11, P12 (SourceBuffer operations)

### Technical Notes

**API:** Wrapper around native MediaSource/ManagedMediaSource APIs

**Codec support:** Check `MediaSource.isTypeSupported()`

**Files:** `packages/spf/src/dom/media/media-source.ts`, `tests/media-source.test.ts`

### Bundle Size Impact

**Target:** <1KB (Thin API wrapper)

---

## [P11] Segment Appender

**Type:** DOM/MSE | **Size:** S (3 points) | **Priority:** P0 | **Wave:** 1 | **Category:** Pure/Isolated

### Description

Append segment data to SourceBuffer with queue management and error handling. Isolated operation for adding media data to MSE buffer.

### Acceptance Criteria

- [ ] Append ArrayBuffer to SourceBuffer
- [ ] Queue operations (SourceBuffer can only handle one at a time)
- [ ] Handle `updateend` event
- [ ] Error handling for append failures
- [ ] Support abort on cancellation
- [ ] Return promise that resolves when complete
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** P10 (MediaSource Setup)

**Blocks:** F4 (Segment Fetch Pipeline), F9 (Quality Switching)

### Technical Notes

**Challenge:** SourceBuffer can only process one operation at a time - need queue.

**Files:** `packages/spf/src/dom/media/segment-appender.ts`, `tests/segment-appender.test.ts`

### Bundle Size Impact

**Target:** <1KB (Queue + append logic)

---

## [P12] Buffer Flusher

**Type:** DOM/MSE | **Size:** XS (1 point) | **Priority:** P0 | **Wave:** 1 | **Category:** Pure/Isolated

### Description

Remove data from SourceBuffer for back buffer and seek operations. Isolated operation for flushing media data from MSE buffer.

### Acceptance Criteria

- [ ] Remove time range from SourceBuffer
- [ ] Handle `updateend` event
- [ ] Error handling for remove failures
- [ ] Return promise that resolves when complete
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** P10 (MediaSource Setup)

**Blocks:** F6 (Back Buffer Management), F7 (Seek Orchestration)

### Technical Notes

**API:** `SourceBuffer.remove(start, end)`

**Files:** `packages/spf/src/dom/media/buffer-flusher.ts`, `tests/buffer-flusher.test.ts`

### Bundle Size Impact

**Target:** <0.5KB (Simple wrapper)

---

## [P13] Track Element Manager

**Type:** DOM/Captions | **Size:** S (3 points) | **Priority:** P0 | **Wave:** 1 | **Category:** Pure/Isolated

### Description

Manage <track> elements for WebVTT captions: set src attribute, handle mode changes, sync with HLS playlist caption tracks. POC already exists - implement cleanly.

### Acceptance Criteria

- [ ] Create/update <track> elements dynamically
- [ ] Set src to VTT URL
- [ ] Handle mode changes (disabled, hidden, showing)
- [ ] Remove old tracks when playlist changes
- [ ] Emit events for track changes
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** None

**Blocks:** F13 (Caption Loading Flow), P14 (Caption Sync Validator)

### Technical Notes

**POC exists** - adapt and clean up for production.

**Files:** `packages/spf/src/dom/captions/track-manager.ts`, `tests/track-manager.test.ts`

### Bundle Size Impact

**Target:** <1KB (DOM manipulation)

---

## [P15] Core Type Definitions

**Type:** Types | **Size:** S (3 points) | **Priority:** P1 | **Wave:** 1 | **Category:** Pure/Isolated

### Description

Shared TypeScript type definitions for Presentation, Track, Segment, State, and other core domain types. Foundation for all strongly-typed code.

### Acceptance Criteria

- [ ] `Presentation` type (variants, audio tracks, subtitles)
- [ ] `Track` type (segments, metadata)
- [ ] `Segment` type (URL, duration, byterange)
- [ ] `State` type (player state shape)
- [ ] Unresolved/Resolved type patterns
- [ ] Comprehensive JSDoc documentation
- [ ] Exported from single types module

### Dependencies

**Depends on:** None

**Blocks:** All development (types used everywhere)

### Technical Notes

**Pattern:** Use discriminated unions for Unresolved/Resolved states.

**Files:** `packages/spf/src/core/types/index.ts`

### Bundle Size Impact

**Target:** N/A (Types only, no runtime)

---

## [P16] Preload State Reader

**Type:** Utility | **Size:** XS (1 point) | **Priority:** P1 | **Wave:** 1 | **Category:** Pure/Isolated

### Description

Read and monitor the media element's preload attribute (`none`, `metadata`, `auto`). Simple utility for preload orchestration.

### Acceptance Criteria

- [ ] Read current preload value
- [ ] Normalize to standard values
- [ ] Support attribute change detection
- [ ] Return typed preload state
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** None

**Blocks:** O5 (Preload Orchestrator)

### Technical Notes

**Simple getter:** `media.preload` with normalization.

**Files:** `packages/spf/src/utils/preload.ts`, `tests/preload.test.ts`

### Bundle Size Impact

**Target:** <0.5KB (Tiny utility)

---

## [P17] Media Event Helpers

**Type:** Utility | **Size:** XS (1 point) | **Priority:** P0 | **Wave:** 1 | **Category:** Pure/Isolated

### Description

Event listener utilities for HTMLMediaElement events: play, pause, seeking, seeked, ratechange, etc. Consistent event handling pattern.

### Acceptance Criteria

- [ ] Type-safe event listeners for media events
- [ ] Cleanup/removal support
- [ ] Support for once/capture options
- [ ] Return cleanup function
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** None

**Blocks:** O6 (Media Event Orchestrator)

### Technical Notes

**Pattern:** Wrap `addEventListener` with cleanup function return.

**Files:** `packages/spf/src/dom/events/media-events.ts`, `tests/media-events.test.ts`

### Bundle Size Impact

**Target:** <0.5KB (Tiny utility)

---

## [O2] State Batching/Flush

**Type:** Infrastructure | **Size:** S (3 points) | **Priority:** P0 | **Wave:** 1 | **Category:** Orchestration

### Description

Enhance the state container (O1) with explicit microtask-batched state updates and manual flush control. Ensures multiple patches in same tick only trigger one subscriber notification.

### Acceptance Criteria

- [ ] Microtask batching for state patches
- [ ] `flush()` function for manual flushing
- [ ] Batch queuing logic
- [ ] Test batching behavior
- [ ] Documentation of batching semantics

### Dependencies

**Depends on:** O1 (State Container)

**Blocks:** None (Enhancement to O1)

### Technical Notes

**Implementation:** May be part of O1 or separate enhancement.

**Files:** Part of `packages/spf/src/core/state/` module

### Bundle Size Impact

**Target:** Included in O1 budget (<1KB total)

---

## [O11] Structured Logging System

**Type:** Infrastructure | **Size:** S (3 points) | **Priority:** P1 | **Wave:** 1 | **Category:** Orchestration

### Description

Logging infrastructure with log levels (debug, info, warn, error), context metadata, and configurable output. Development debugging and production diagnostics.

### Acceptance Criteria

- [ ] Log levels (debug, info, warn, error)
- [ ] Context object for structured data
- [ ] Configurable output (console, custom handler)
- [ ] Performance impact minimal in production
- [ ] Log namespaces/categories
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** None

**Blocks:** None (Used throughout, but not blocking)

### Technical Notes

**Simple implementation:** Wrapper around console methods with level filtering.

**Files:** `packages/spf/src/utils/logging.ts`, `tests/logging.test.ts`

### Bundle Size Impact

**Target:** <1KB (Simple wrapper)

---

## [T1] Unit Test Infrastructure

**Type:** Testing | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 1 | **Category:** Testing

### Description

Vitest setup with mocks for MSE/fetch, test utilities, and fixtures. Foundation for all unit testing across SPF codebase.

### Acceptance Criteria

- [ ] Vitest configuration complete
- [ ] MSE/SourceBuffer mocks
- [ ] Fetch API mocks
- [ ] HTMLMediaElement mocks
- [ ] Test fixture generators
- [ ] Coverage reporting configured
- [ ] Run tests in CI
- [ ] Documentation for writing tests

### Dependencies

**Depends on:** None

**Blocks:** T2 (Test Utilities), All unit testing

### Technical Notes

**Mocking strategy:** Use Vitest's built-in mocking + custom MSE stubs.

**Files:** `vitest.config.ts`, `packages/spf/tests/setup.ts`, `fixtures/`

### Bundle Size Impact

**Target:** N/A (Testing infrastructure)

---

## [T4] Playwright Setup

**Type:** Testing | **Size:** L (13 points) | **Priority:** P0 | **Wave:** 1 | **Category:** Testing

### Description

Browser automation infrastructure using Playwright for E2E testing. Cross-browser testing for Chrome, Safari, Firefox, and Edge. Takes time to set up properly - start early.

### Acceptance Criteria

- [ ] Playwright configuration for all browsers
- [ ] Test server setup for serving test content
- [ ] Video element test harness
- [ ] Screenshot/video capture on failure
- [ ] Parallel test execution
- [ ] CI integration (GitHub Actions)
- [ ] Documentation for writing E2E tests

### Dependencies

**Depends on:** None

**Blocks:** T5 (Browser Test Helpers), All E2E testing

### Technical Notes

**Browsers:** Chromium, Firefox, WebKit (Safari)

**Challenge:** Cross-browser MSE behavior differences

**Files:** `playwright.config.ts`, `packages/spf/tests/e2e/`

### Bundle Size Impact

**Target:** N/A (Testing infrastructure)

---

## [T6] Test Stream Setup

**Type:** Testing | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 1 | **Category:** Testing

### Description

Curated collection of test HLS streams from Mux and Apple. Known-good content for reliable testing across features and browsers.

### Acceptance Criteria

- [ ] Mux-hosted CMAF HLS test streams
- [ ] Apple test streams (various formats)
- [ ] Streams with captions
- [ ] Streams with multiple audio tracks
- [ ] Short streams for fast tests
- [ ] Long streams for stress testing
- [ ] Documentation of each stream's purpose

### Dependencies

**Depends on:** None

**Blocks:** All integration and E2E testing

### Technical Notes

**Hosting:** Use Mux-hosted streams for reliability.

**Files:** `packages/spf/tests/fixtures/streams.ts`

### Bundle Size Impact

**Target:** N/A (Test data)

---

# Wave 2: Core Features & Orchestration (20 issues)
**Dates:** Feb 10-17 (Week 2)
**Goal:** Build core playback pipeline

---

## [O5] Preload Orchestrator

**Type:** Infrastructure | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 2 | **Category:** Orchestration

### Description

Monitor src + preload state → trigger playlist fetch at appropriate time. Orchestration logic for controlling when to start loading content based on preload attribute.

### Acceptance Criteria

- [ ] Monitor src and preload attribute changes
- [ ] Trigger fetch based on preload mode (none, metadata, auto)
- [ ] Respect timing (metadata on load, auto immediately)
- [ ] Cancel fetch if src changes
- [ ] Coordinate with playlist resolution (F1)
- [ ] Unit and integration tests

### Dependencies

**Depends on:** O1, O3, P16

**Blocks:** F1 (Playlist Resolution Flow)

### Technical Notes

**Logic:**
- `preload="auto"` → fetch immediately
- `preload="metadata"` → fetch on play or canplay
- `preload="none"` → fetch on play

**Files:** `packages/spf/src/core/orchestration/preload-orchestrator.ts`, `tests/`

### Bundle Size Impact

**Target:** <1KB (Simple orchestration)

---

## [F1] Playlist Resolution Flow

**Type:** Feature | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 2 | **Category:** Feature Integration

### Description

End-to-end flow for resolving HLS playlist: unresolved presentation `{ url }` → fetch multivariant playlist → parse → resolved presentation with selection sets. First complete feature using orchestration pattern.

### Acceptance Criteria

- [ ] Detect unresolved presentation in state
- [ ] Fetch multivariant playlist (P4)
- [ ] Parse to extract variants, audio, subtitles (P1)
- [ ] Update state with resolved presentation
- [ ] Handle fetch/parse errors
- [ ] Integration tests with real playlists
- [ ] E2E tests in browser

### Dependencies

**Depends on:** O5, P1, P2, P3, P4, O1, O3

**Blocks:** F2 (Track Selection), F13 (Captions)

### Technical Notes

**Flow:** src attribute set → O5 triggers fetch → P4 fetch → P1 parse → state updated → F2 triggered

**Files:** `packages/spf/src/core/orchestration/playlist-resolution.ts`, `tests/`

### Bundle Size Impact

**Target:** <2KB (Orchestration glue)

---

## [F2] Initial Track Selection

**Type:** Feature | **Size:** S (3 points) | **Priority:** P0 | **Wave:** 2 | **Category:** Feature Integration

### Description

When presentation is resolved, automatically select initial video track variant based on bandwidth estimate (or default). Triggered by playlist resolution completing.

### Acceptance Criteria

- [ ] Detect resolved presentation in state
- [ ] Select initial track using quality selector (P7)
- [ ] Update state with selected track
- [ ] Handle case with no bandwidth estimate (pick first)
- [ ] Integration tests

### Dependencies

**Depends on:** F1, P7, O3

**Blocks:** F3 (Track Resolution)

### Technical Notes

**Logic:** When presentation resolves → P7 picks track → state updated → F3 triggered

**Files:** `packages/spf/src/core/orchestration/track-selection.ts`, `tests/`

### Bundle Size Impact

**Target:** <1KB (Simple orchestration)

---

## [F3] Track Resolution Flow

**Type:** Feature | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 2 | **Category:** Feature Integration

### Description

End-to-end flow for resolving selected track: unresolved track (playlist URL) → fetch media playlist → parse → resolved track with segments array.

### Acceptance Criteria

- [ ] Detect unresolved track in state
- [ ] Fetch media playlist (P4)
- [ ] Parse to extract segments (P2)
- [ ] Update state with resolved track
- [ ] Handle fetch/parse errors
- [ ] Integration tests with real playlists

### Dependencies

**Depends on:** F2, P2, P4, O3

**Blocks:** F4 (Segment Fetch Pipeline)

### Technical Notes

**Flow:** Track selected → fetch media playlist → parse segments → state updated → F4 triggered

**Files:** `packages/spf/src/core/orchestration/track-resolution.ts`, `tests/`

### Bundle Size Impact

**Target:** <1KB (Orchestration glue)

---

## [F4] Segment Fetch Pipeline

**Type:** Feature | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 2 | **Category:** Feature Integration

### Description

Fetch segments based on buffer needs: monitor resolved track + buffer state → fetch next segment → append to SourceBuffer → repeat. Core buffering loop.

### Acceptance Criteria

- [ ] Monitor buffer and track state
- [ ] Fetch next segment when buffer needs it
- [ ] Append segment to SourceBuffer (P11)
- [ ] Track progress for bandwidth estimation
- [ ] Handle fetch failures (retry logic)
- [ ] Respect abort signals
- [ ] Integration tests

### Dependencies

**Depends on:** F3, P4, P11, O1

**Blocks:** F5, F7, F8 (Buffer management, seeking, bandwidth tracking)

### Technical Notes

**Core loop:** Check buffer → fetch segment → append → update state → repeat

**Files:** `packages/spf/src/core/orchestration/segment-pipeline.ts`, `tests/`

### Bundle Size Impact

**Target:** <2KB (Core buffering logic)

---

## [F5] Forward Buffer Management

**Type:** Feature | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 2 | **Category:** Feature Integration

### Description

Maintain buffer ahead of playhead using forward buffer calculator (P8). Active buffering to ensure smooth playback without stalls.

### Acceptance Criteria

- [ ] Calculate buffer target using P8
- [ ] Determine if buffer needs filling
- [ ] Trigger segment fetch (F4) when needed
- [ ] Monitor playback position continuously
- [ ] Handle playback rate changes
- [ ] Integration tests with various playback scenarios

### Dependencies

**Depends on:** F4, P8, O1

**Blocks:** F14 (Startup Orchestration)

### Technical Notes

**Logic:** `bufferEnd - currentTime < target` → fetch more segments

**Files:** `packages/spf/src/core/orchestration/forward-buffer.ts`, `tests/`

### Bundle Size Impact

**Target:** <1KB (Buffer monitoring)

---

## [F8] Bandwidth Tracking

**Type:** Feature | **Size:** S (3 points) | **Priority:** P0 | **Wave:** 2 | **Category:** Feature Integration

### Description

Wire up bandwidth estimator (P6) to segment fetch pipeline (F4). Update bandwidth estimates from actual download metrics.

### Acceptance Criteria

- [ ] Extract download metrics from segment fetches
- [ ] Update bandwidth estimator (P6) after each download
- [ ] Store bandwidth estimate in state
- [ ] Handle initial state (no estimates yet)
- [ ] Integration tests

### Dependencies

**Depends on:** F4, P6, O1

**Blocks:** F9 (Quality Switching)

### Technical Notes

**Integration:** Hook into F4's fetch completion → extract bytes/time → P6.update() → state.patch()

**Files:** Part of `segment-pipeline.ts` or separate `bandwidth-tracker.ts`

### Bundle Size Impact

**Target:** <0.5KB (Integration glue)

---

## [O6] Media Event Orchestrator

**Type:** Infrastructure | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 2 | **Category:** Orchestration

### Description

React to play, pause, seeking, seeked, ratechange events from media element. Event-driven coordination layer that triggers appropriate state changes and operations.

### Acceptance Criteria

- [ ] Listen to key media events using P17
- [ ] Update player state on play/pause
- [ ] Trigger buffer operations on seeking
- [ ] Handle ratechange if needed
- [ ] Coordinate with segment pipeline (F4)
- [ ] Unit and integration tests

### Dependencies

**Depends on:** O1, P17

**Blocks:** F11 (Play/Pause Handling), F7 (Seek Orchestration)

### Technical Notes

**Event handling:** Centralized listener that dispatches to appropriate handlers

**Files:** `packages/spf/src/dom/events/event-orchestrator.ts`, `tests/`

### Bundle Size Impact

**Target:** <1KB (Event coordination)

---

## [F11] Play/Pause Handling

**Type:** Feature | **Size:** S (3 points) | **Priority:** P0 | **Wave:** 2 | **Category:** Feature Integration

### Description

React to play and pause events from media element. Update player state and coordinate with buffering pipeline.

### Acceptance Criteria

- [ ] Listen to play event via O6
- [ ] Listen to pause event via O6
- [ ] Update state (isPlaying: true/false)
- [ ] Trigger buffering on play if needed
- [ ] Integration tests

### Dependencies

**Depends on:** O6

**Blocks:** F14, F15 (Startup, State Machine)

### Technical Notes

**Simple:** Event → state update → buffering logic reacts

**Files:** Part of `event-orchestrator.ts`

### Bundle Size Impact

**Target:** <0.5KB (Event handlers)

---

## [F12] Playback Rate Handling

**Type:** Feature | **Size:** XS (1 point) | **Priority:** P0 | **Wave:** 2 | **Category:** Feature Integration

### Description

React to ratechange event if needed for buffer adjustments. May not require specific logic for V1.

### Acceptance Criteria

- [ ] Listen to ratechange event via O6
- [ ] Determine if buffer logic needs adjustment
- [ ] Update state if relevant
- [ ] Integration tests

### Dependencies

**Depends on:** O6

**Blocks:** None

### Technical Notes

**Note:** May be no-op for V1 if buffer logic is rate-independent

**Files:** Part of `event-orchestrator.ts`

### Bundle Size Impact

**Target:** <0.5KB (Event handler)

---

## [F7] Seek Orchestration

**Type:** Feature | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 2 | **Category:** Feature Integration

### Description

Handle seeking event → flush buffers → fetch segments at new position → resume playback. Full seek flow coordination.

### Acceptance Criteria

- [ ] Listen to seeking event via O6
- [ ] Flush forward and back buffers (P12)
- [ ] Determine segment at new position
- [ ] Trigger segment fetch (F4) at new position
- [ ] Handle seeked event
- [ ] Integration and E2E tests

### Dependencies

**Depends on:** F4, P12, O6

**Blocks:** F15 (State Machine)

### Technical Notes

**Flow:** seeking event → flush SourceBuffer → find segment at currentTime → resume F4 at new position

**Files:** `packages/spf/src/core/orchestration/seek-handler.ts`, `tests/`

### Bundle Size Impact

**Target:** <1KB (Seek logic)

---

## [O8] Video.js Adapter

**Type:** Integration | **Size:** L (13 points) | **Priority:** P0 | **Wave:** 2 | **Category:** Orchestration

### Description

Adapt SPF to Video.js v10 APIs. Key integration point that bridges SPF core with Video.js player framework. **HIGH RISK - complexity unknown.**

### Acceptance Criteria

- [ ] Expose SPF as Video.js tech or plugin
- [ ] Map Video.js API calls to SPF state
- [ ] Emit Video.js-compatible events
- [ ] Support Video.js configuration options
- [ ] Handle Video.js lifecycle (setup, dispose)
- [ ] Integration tests with actual Video.js
- [ ] Documentation for Video.js users

### Dependencies

**Depends on:** O1, O6

**Blocks:** F16 (Video.js Events), F17 (Demo), F18 (Docs)

### Technical Notes

**Challenge:** Understand Video.js v10 tech/plugin architecture

**Recommendation:** Spike early to identify integration surface

**Files:** `packages/spf/src/dom/integration/videojs-adapter.ts`, `tests/`

### Bundle Size Impact

**Target:** <3KB (Integration layer)

---

## [O7] Event Bus / Pub-Sub

**Type:** Infrastructure | **Size:** S (3 points) | **Priority:** P1 | **Wave:** 2 | **Category:** Orchestration

### Description

Internal event system for module communication. Decouple modules via pub-sub pattern instead of direct dependencies.

### Acceptance Criteria

- [ ] Publish/subscribe API
- [ ] Type-safe event definitions
- [ ] Namespace/scope support
- [ ] Cleanup/unsubscribe support
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** O1

**Blocks:** O13 (Error Reporting), F16 (Video.js Events)

### Technical Notes

**Simple implementation:** EventEmitter-like pattern

**Files:** `packages/spf/src/core/events/event-bus.ts`, `tests/`

### Bundle Size Impact

**Target:** <1KB (Simple pub-sub)

---

## [O9] Resource Cleanup Manager

**Type:** Infrastructure | **Size:** S (3 points) | **Priority:** P1 | **Wave:** 2 | **Category:** Orchestration

### Description

Consistent cleanup and disposal pattern for SPF resources. Prevent memory leaks from event listeners, timers, and subscriptions.

### Acceptance Criteria

- [ ] Disposer pattern for cleanup functions
- [ ] Cleanup coordination across modules
- [ ] Integration with Video.js dispose lifecycle
- [ ] Unit tests with ≥80% coverage

### Dependencies

**Depends on:** O1

**Blocks:** None (Used throughout)

### Technical Notes

**Pattern:** Similar to `@videojs/utils/events/Disposer`

**Files:** `packages/spf/src/utils/disposer.ts`, `tests/`

### Bundle Size Impact

**Target:** <0.5KB (Simple utility)

---

## [O12] Performance Metrics Collector

**Type:** Monitoring | **Size:** S (3 points) | **Priority:** P1 | **Wave:** 2 | **Category:** Orchestration

### Description

Track and emit performance metrics: startup time, time to first frame, buffer health, segment download times. Emit metrics for external monitoring.

### Acceptance Criteria

- [ ] Track startup time (load → first frame)
- [ ] Track buffer health (stalls, rebuffers)
- [ ] Track segment download metrics
- [ ] Emit metrics via event bus (O7)
- [ ] Integration tests

### Dependencies

**Depends on:** O1

**Blocks:** F16 (Video.js Events)

### Technical Notes

**Metrics:** Use Performance API for timing

**Files:** `packages/spf/src/core/monitoring/metrics.ts`, `tests/`

### Bundle Size Impact

**Target:** <1KB (Metric tracking)

---

## [F13] Caption Loading Flow

**Type:** Feature | **Size:** S (3 points) | **Priority:** P0 | **Wave:** 2 | **Category:** Feature Integration

### Description

Integrate caption track manager (P13) with playlist resolution (F1). Load VTT via <track> elements and handle mode changes.

### Acceptance Criteria

- [ ] Detect caption tracks in resolved presentation
- [ ] Create <track> elements using P13
- [ ] Set VTT URLs as src
- [ ] Handle user mode changes (showing/hidden)
- [ ] Remove old tracks on playlist change
- [ ] Integration and E2E tests

### Dependencies

**Depends on:** P13, F1, O1

**Blocks:** None

### Technical Notes

**Integration:** Hook into F1 completion → extract caption tracks → P13 creates <track> elements

**Files:** `packages/spf/src/dom/captions/caption-loader.ts`, `tests/`

### Bundle Size Impact

**Target:** <1KB (Integration glue)

---

## [T2] Test Utilities

**Type:** Testing | **Size:** S (3 points) | **Priority:** P0 | **Wave:** 2 | **Category:** Testing

### Description

Helper functions for creating test fixtures, mock data, and common test scenarios. Reduce boilerplate in unit tests.

### Acceptance Criteria

- [ ] Mock playlist generators
- [ ] Mock segment data generators
- [ ] State fixture builders
- [ ] Common assertion helpers
- [ ] Documentation for test utilities

### Dependencies

**Depends on:** T1

**Blocks:** None (Used throughout testing)

### Technical Notes

**Utilities:** Factory functions for creating test data

**Files:** `packages/spf/tests/utilities/`, `fixtures/`

### Bundle Size Impact

**Target:** N/A (Testing infrastructure)

---

## [T3] Integration Test Framework

**Type:** Testing | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 2 | **Category:** Testing

### Description

Multi-component test scenarios that validate feature integration. Test workflows like playlist resolution → track selection → buffering.

### Acceptance Criteria

- [ ] Test harness for multi-component scenarios
- [ ] Mock dependencies appropriately
- [ ] Validate state transitions
- [ ] Test error scenarios
- [ ] Documentation for integration tests

### Dependencies

**Depends on:** T1

**Blocks:** All integration testing

### Technical Notes

**Approach:** Use real implementations where possible, mock external dependencies (network, MSE)

**Files:** `packages/spf/tests/integration/`

### Bundle Size Impact

**Target:** N/A (Testing infrastructure)

---

## [T5] Browser Test Helpers

**Type:** Testing | **Size:** M (8 points) | **Priority:** P1 | **Wave:** 2 | **Category:** Testing

### Description

Utilities for E2E test scenarios in Playwright: wait for playback, check buffer state, verify captions, etc.

### Acceptance Criteria

- [ ] Wait for video playback helpers
- [ ] Buffer state inspection helpers
- [ ] Caption verification helpers
- [ ] Screenshot/video comparison utilities
- [ ] Documentation for E2E tests

### Dependencies

**Depends on:** T4

**Blocks:** All E2E testing

### Technical Notes

**Utilities:** Playwright helper functions for common video operations

**Files:** `packages/spf/tests/e2e/helpers/`

### Bundle Size Impact

**Target:** N/A (Testing infrastructure)

---

## [T7] CI/CD Pipeline

**Type:** Testing | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 2 | **Category:** Testing

### Description

GitHub Actions workflow for running tests on every PR: unit tests, integration tests, E2E tests across browsers. Automation for quality gates.

### Acceptance Criteria

- [ ] GitHub Actions workflow file
- [ ] Run unit tests (T1)
- [ ] Run integration tests (T3)
- [ ] Run E2E tests (T4) across browsers
- [ ] Fail PR on test failures
- [ ] Parallel execution for speed
- [ ] Status checks required for merge

### Dependencies

**Depends on:** T1, T3, T4

**Blocks:** T8, T9 (Bundle size and coverage tracking)

### Technical Notes

**CI provider:** GitHub Actions

**Files:** `.github/workflows/test.yml`

### Bundle Size Impact

**Target:** N/A (CI infrastructure)

---

# Wave 3: ABR, Integration & Polish (10-15 issues)
**Dates:** Feb 17-24 (Week 3)
**Goal:** Complete ABR, integrate everything, start testing

---

## [F9] Quality Switching

**Type:** Feature | **Size:** L (13 points) | **Priority:** P0 | **Wave:** 3 | **Category:** Feature Integration

### Description

Switch video tracks based on bandwidth estimates. Complex feature requiring smooth transitions without playback disruption. **HIGH RISK - assign most experienced engineer.**

### Acceptance Criteria

- [ ] Monitor bandwidth (F8) and buffer state
- [ ] Trigger quality switch using P7
- [ ] Fetch new track's media playlist
- [ ] Coordinate SourceBuffer append for smooth switch
- [ ] Handle switch failures (fall back to current track)
- [ ] Prevent rapid switching (hysteresis)
- [ ] Integration and E2E tests

### Dependencies

**Depends on:** F8, P7, P11, O1, O3

**Blocks:** F10 (Manual Quality API)

### Technical Notes

**Challenge:** Smooth switching requires careful SourceBuffer management to avoid stalls

**Approaches:** Append new track segments at discontinuity OR use multiple SourceBuffers

**Recommendation:** Start spike/research early during Wave 1

**Files:** `packages/spf/src/core/orchestration/quality-switcher.ts`, `tests/`

### Bundle Size Impact

**Target:** <3KB (Complex orchestration)

---

## [F14] Startup Orchestration

**Type:** Feature | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 3 | **Category:** Feature Integration

### Description

End-to-end startup flow: load → parse → select track → fetch segments → play. Orchestrate complete startup sequence.

### Acceptance Criteria

- [ ] Coordinate F1 → F2 → F3 → F4 → F5
- [ ] Handle startup errors at each stage
- [ ] Track startup performance metrics
- [ ] Support preload modes correctly
- [ ] Integration and E2E tests

### Dependencies

**Depends on:** F1, F2, F3, F4, F5

**Blocks:** F17 (Demo Application)

### Technical Notes

**Flow:** src set → O5 triggers F1 → F2 → F3 → F4 → F5 → play

**Files:** High-level orchestration across features

### Bundle Size Impact

**Target:** <1KB (Coordination logic)

---

## [F15] Playback State Machine

**Type:** Feature | **Size:** L (13 points) | **Priority:** P0 | **Wave:** 3 | **Category:** Feature Integration

### Description

High-level playback state machine: Loading → Buffering → Playing → Paused → Seeking. Coordinate state transitions across features.

### Acceptance Criteria

- [ ] Define state machine (loading, buffering, playing, paused, seeking)
- [ ] Coordinate transitions across F11, F7, F4
- [ ] Emit state change events
- [ ] Handle edge cases (seek while buffering, etc.)
- [ ] Integration and E2E tests

### Dependencies

**Depends on:** F11, F7, F4, O1

**Blocks:** F16 (Video.js Events)

### Technical Notes

**State machine:** Explicit states with guarded transitions

**Files:** `packages/spf/src/core/orchestration/state-machine.ts`, `tests/`

### Bundle Size Impact

**Target:** <2KB (State machine logic)

---

## [F16] Video.js Events Integration

**Type:** Integration | **Size:** M (8 points) | **Priority:** P1 | **Wave:** 3 | **Category:** Feature Integration

### Description

Emit Video.js-compatible events from SPF state changes and metrics. Map SPF internal events to Video.js event API.

### Acceptance Criteria

- [ ] Map state changes to Video.js events
- [ ] Emit progress, timeupdate, etc.
- [ ] Emit custom events (qualitychange, bandwidthchange)
- [ ] Integration with O8 (Video.js Adapter)
- [ ] Integration tests

### Dependencies

**Depends on:** O8, O7, O12

**Blocks:** F17 (Demo needs events)

### Technical Notes

**Event mapping:** SPF state → Video.js player.trigger()

**Files:** Part of `videojs-adapter.ts`

### Bundle Size Impact

**Target:** <1KB (Event mapping)

---

## [F17] Demo Application

**Type:** DX | **Size:** S (3 points) | **Priority:** P1 | **Wave:** 3 | **Category:** Feature Integration

### Description

Simple demo showing CMAF HLS playback with SPF via Video.js v10. Proof of concept and testing harness.

### Acceptance Criteria

- [ ] HTML page with Video.js player
- [ ] Load Mux-hosted CMAF stream
- [ ] Show playback controls
- [ ] Display caption tracks
- [ ] Show current quality/bandwidth
- [ ] Works in Chrome, Safari, Firefox, Edge

### Dependencies

**Depends on:** O8, F14

**Blocks:** None

### Technical Notes

**Simple demo:** Single HTML page, minimal styling

**Files:** `packages/spf/demo/index.html`, `demo.js`

### Bundle Size Impact

**Target:** N/A (Demo application)

---

## [T8] Bundle Size Tracking

**Type:** Testing | **Size:** S (3 points) | **Priority:** P0 | **Wave:** 3 | **Category:** Testing

### Description

Track bundle size over time and fail CI if size grows beyond threshold. **PRIMARY METRIC** for V1 success.

### Acceptance Criteria

- [ ] Measure minified+gzipped bundle size
- [ ] Store size history
- [ ] Fail PR if size exceeds threshold
- [ ] Report size delta in PR comments
- [ ] Dashboard for size trends

### Dependencies

**Depends on:** T7

**Blocks:** None (Quality gate)

### Technical Notes

**Tool:** Use bundlesize or size-limit

**Threshold:** TBD based on initial implementation

**Files:** `.github/workflows/bundle-size.yml`, `size-limit.config.js`

### Bundle Size Impact

**Target:** N/A (Monitoring infrastructure)

---

## [T9] Coverage Tracking

**Type:** Testing | **Size:** S (3 points) | **Priority:** P1 | **Wave:** 3 | **Category:** Testing

### Description

Track test coverage and enforce ≥80% requirement. Prevent coverage regressions on new code.

### Acceptance Criteria

- [ ] Coverage reports generated
- [ ] ≥80% coverage requirement enforced
- [ ] Fail PR if coverage drops
- [ ] Coverage badge in README
- [ ] Per-file coverage breakdown

### Dependencies

**Depends on:** T1, T7

**Blocks:** None (Quality gate)

### Technical Notes

**Tool:** Vitest built-in coverage (via c8)

**Files:** Part of CI workflow

### Bundle Size Impact

**Target:** N/A (Monitoring infrastructure)

---

## [P14] Caption Sync Validator

**Type:** Testing | **Size:** XS (1 point) | **Priority:** P1 | **Wave:** 3 | **Category:** Pure/Isolated

### Description

Testing utility to verify captions display in sync with video. Helper for E2E caption tests.

### Acceptance Criteria

- [ ] Check caption cue timing
- [ ] Verify captions display at correct time
- [ ] Helper for E2E tests
- [ ] Documentation

### Dependencies

**Depends on:** P13

**Blocks:** None (Test helper)

### Technical Notes

**Usage:** E2E test utility for caption validation

**Files:** `packages/spf/tests/e2e/helpers/caption-validator.ts`

### Bundle Size Impact

**Target:** N/A (Test utility)

---

## [F6] Back Buffer Management

**Type:** Feature | **Size:** S (3 points) | **Priority:** P1 | **Wave:** 3 | **Category:** Feature Integration

### Description

Flush old segments from back buffer to manage memory. Use back buffer strategy (P9) to determine flush points.

### Acceptance Criteria

- [ ] Monitor back buffer size
- [ ] Calculate flush point using P9
- [ ] Flush buffer using P12
- [ ] Prevent flushing too aggressively
- [ ] Integration tests

### Dependencies

**Depends on:** F4, P9, P12, O1

**Blocks:** None (Optimization)

### Technical Notes

**Logic:** If back buffer > threshold → P9 calculates flush range → P12 removes

**Files:** `packages/spf/src/core/orchestration/back-buffer.ts`, `tests/`

### Bundle Size Impact

**Target:** <1KB (Buffer monitoring)

---

## [F10] Manual Quality API

**Type:** Feature | **Size:** M (8 points) | **Priority:** P1 | **Wave:** 3 | **Category:** Feature Integration

### Description

Allow manual track selection and disable ABR. User-facing API for quality control.

### Acceptance Criteria

- [ ] API to set quality manually
- [ ] API to enable/disable ABR
- [ ] Prevent ABR when manual quality set
- [ ] Re-enable ABR when manual cleared
- [ ] Integration with O8 (Video.js API)
- [ ] Integration tests

### Dependencies

**Depends on:** F9, O8

**Blocks:** None (Stretch goal)

### Technical Notes

**API:** `player.qualityLevel(index)`, `player.autoQuality(true/false)`

**Files:** Part of `videojs-adapter.ts` or `quality-api.ts`

### Bundle Size Impact

**Target:** <1KB (API layer)

---

## [O4] Task Deduplication

**Type:** Infrastructure | **Size:** S (3 points) | **Priority:** P1 | **Wave:** 3 | **Category:** Orchestration

### Description

Prevent duplicate resolve operations in resolvables pattern (O3). Enhancement to avoid manual `isResolving` flags.

### Acceptance Criteria

- [ ] Track in-flight resolves
- [ ] Prevent duplicate triggers
- [ ] Cancel outdated resolves
- [ ] Integration with O3
- [ ] Unit tests

### Dependencies

**Depends on:** O3

**Blocks:** None (Enhancement)

### Technical Notes

**Pattern:** Track active resolve promises, skip if already resolving

**Files:** Part of `resolvable.ts` or separate `deduplication.ts`

### Bundle Size Impact

**Target:** <0.5KB (Small enhancement)

---

## [O13] Error Detection & Reporting

**Type:** Infrastructure | **Size:** M (8 points) | **Priority:** P2 | **Wave:** 3 | **Category:** Orchestration

### Description

Detect errors across SPF (network, parse, MSE), emit events, and handle gracefully. Basic error handling for production robustness.

### Acceptance Criteria

- [ ] Detect network errors (fetch failures)
- [ ] Detect parse errors (invalid playlists)
- [ ] Detect MSE errors (SourceBuffer failures)
- [ ] Emit error events via O7
- [ ] Graceful failure (don't crash)
- [ ] Integration tests for error scenarios

### Dependencies

**Depends on:** O1, O7

**Blocks:** None (Can defer to March)

### Technical Notes

**Error types:** Network, Parse, MSE, ABR, Unknown

**Files:** `packages/spf/src/core/errors/`, `error-handler.ts`

### Bundle Size Impact

**Target:** <2KB (Error handling)

---

# Wave 4: Final Testing & Documentation (5 issues)
**Dates:** Feb 24-27 (Final Days)
**Goal:** Production readiness

---

## [F18] Minimal Documentation

**Type:** DX | **Size:** M (8 points) | **Priority:** P2 | **Wave:** 4 | **Category:** Feature Integration

### Description

Basic API reference and Video.js integration guide for V1 release. Enough documentation for developers to use SPF.

### Acceptance Criteria

- [ ] README with overview and quick start
- [ ] API reference for public APIs
- [ ] Video.js integration guide
- [ ] Example code snippets
- [ ] Known limitations documented
- [ ] Migration guide (if applicable)

### Dependencies

**Depends on:** O8

**Blocks:** None

### Technical Notes

**Scope:** Minimal for V1, can expand in March

**Files:** `packages/spf/README.md`, `docs/`

### Bundle Size Impact

**Target:** N/A (Documentation)

---

## [T10] Performance Benchmarks

**Type:** Testing | **Size:** M (8 points) | **Priority:** P1 | **Wave:** 4 | **Category:** Testing

### Description

Automated performance benchmarks for startup time, seek time, and memory usage. Track performance over time.

### Acceptance Criteria

- [ ] Startup time benchmark (load → first frame)
- [ ] Seek time benchmark (seek → resume)
- [ ] Memory usage benchmark
- [ ] Run benchmarks in CI
- [ ] Track trends over time
- [ ] Fail if performance regresses

### Dependencies

**Depends on:** T4, T7

**Blocks:** None (Can defer to March)

### Technical Notes

**Tool:** Playwright + Performance API

**Files:** `packages/spf/tests/benchmarks/`

### Bundle Size Impact

**Target:** N/A (Testing infrastructure)

---

## [POLISH] End-to-End Testing

**Type:** Testing | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 4 | **Category:** Testing

### Description

Comprehensive E2E testing across all browsers and features. Validate production readiness.

### Acceptance Criteria

- [ ] E2E tests for all critical paths
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Test with real Mux streams
- [ ] Test captions, seeking, quality switching
- [ ] Screenshot/video comparison for visual regressions
- [ ] All tests passing

### Dependencies

**Depends on:** All features (F1-F17)

**Blocks:** Production release

### Technical Notes

**Scope:** Validate every feature works end-to-end

### Bundle Size Impact

**Target:** N/A (Testing)

---

## [POLISH] Bug Fixes & Polish

**Type:** Polish | **Size:** M (8 points) | **Priority:** P0 | **Wave:** 4 | **Category:** Polish

### Description

Fix bugs discovered during testing, improve edge case handling, polish UX and performance.

### Acceptance Criteria

- [ ] All critical bugs fixed
- [ ] Edge cases handled
- [ ] Performance optimized
- [ ] Code quality improved
- [ ] Ready for demo

### Dependencies

**Depends on:** Testing revealing issues

**Blocks:** Production release

### Technical Notes

**Scope:** Reactive to testing findings

### Bundle Size Impact

**Target:** Maintain or reduce current size

---

## [POLISH] Performance Validation

**Type:** Polish | **Size:** S (3 points) | **Priority:** P0 | **Wave:** 4 | **Category:** Polish

### Description

Validate performance meets targets: startup time, seek time, memory usage, bundle size.

### Acceptance Criteria

- [ ] Startup time < target
- [ ] Seek time < target
- [ ] Memory usage stable
- [ ] Bundle size < target (**PRIMARY METRIC**)
- [ ] No performance regressions
- [ ] Benchmarks documented

### Dependencies

**Depends on:** T10, T8

**Blocks:** Production release

### Technical Notes

**Targets:** TBD based on baseline measurements

### Bundle Size Impact

**Target:** Final validation of primary metric

---

## Summary Statistics

| Category | Total Items | Story Points | XS | S | M | L |
|----------|-------------|--------------|----|----|----|----|
| Wave 1 | 23 | 66 | 6 | 13 | 4 | 0 |
| Wave 2 | 20 | 108 | 1 | 7 | 11 | 1 |
| Wave 3 | 10-15 | 64-66 | 1 | 4 | 5 | 2 |
| Wave 4 | 5 | 35 | 0 | 1 | 4 | 0 |
| **TOTAL** | **58** | **273-275** | **8** | **25** | **24** | **3** |

**Pure/Isolated Functions:** 17 items (was 19)
**Orchestration:** 13 items
**Feature Integration:** 18 items
**Testing:** 10 items

---

## Critical Path Summary

1. **O1** (State Container) → foundational for everything
2. **O10** (Module Structure) → architectural decisions
3. **O3** (Resolvables Pattern) → core orchestration
4. **O5** (Preload Orchestrator) → trigger playlist fetch
5. **F1** (Playlist Resolution) → first end-to-end feature
6. **F2-F5** (Track Selection, Track Resolution, Segment Pipeline, Forward Buffer) → core playback
7. **F8** (Bandwidth Tracking) → enable ABR
8. **F9** (Quality Switching) → complete ABR
9. **F14** (Startup Orchestration) → full playback flow
10. **F15** (State Machine) → high-level coordination

---

## Alternative Choices (V1 Decisions Made)

- **P8** Forward Buffer Calculator → V1 uses simple 30s fixed time, stretch goal for dynamic "can play through"
- **P9** Back Buffer Strategy → V1 uses simple "keep N segments", stretch goal for smart byte-tracking

---

## Can Defer to March (If Needed)

- F6 (Back Buffer Management) - P1
- F10 (Manual Quality API) - P1 stretch
- O4 (Task Deduplication) - P1 optimization
- O13 (Error Detection) - P2
- T10 (Performance Benchmarks) - P1

---

## Risk Mitigation

### High Risk Items

1. **O1** (State Container) - **Blocks everything** → Start Day 1, assign best engineer
2. **F9** (Quality Switching) - **Complex** → Spike early, budget extra time
3. **O8** (Video.js Adapter) - **Unknown complexity** → Spike early, involve expert

### Timeline Risk

- Track progress daily against milestones
- Identify slippage early (by Feb 10)
- Use defer list if needed (~9 items can slip)
- Maintain quality over features

---

## Success Criteria by Feb 27

### Must Have (P0)

- ✅ Load Mux-hosted CMAF HLS stream
- ✅ Play, pause, seek functionality
- ✅ Basic ABR with quality switching
- ✅ WebVTT captions display
- ✅ Video.js v10 integration
- ✅ Demo application working
- ✅ Bundle size < target (**PRIMARY METRIC**)
- ✅ Cross-browser testing passing (Chrome, Safari, Firefox, Edge)

### Nice to Have (P1 - Can Defer)

- Back buffer management
- Manual quality selection API
- Comprehensive error handling
- Performance benchmarks
- Detailed documentation
