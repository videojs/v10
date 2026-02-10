# SPF Work Triage

This document contains the initial T-shirt sizing and prioritization of SPF work items.

## Triage Table

### Core Playback

| ID | Category | Feature/Task | Description | Size | Impact | Effort | Priority | Dependencies | Notes |
|----|----------|--------------|-------------|------|--------|--------|----------|--------------|-------|
| 1 | Core | HLS Multivariant Playlist Parsing | Parse master.m3u8, extract video/audio variants, select initial tracks | M | High | Medium | P0 | None | Spec-compliant parsing |
| 2 | Core | HLS Media Playlist Parsing | Parse media.m3u8, extract segments, durations, metadata | M | High | Medium | P0 | #1 | Handle VOD playlists only |
| 3 | Core | Segment Fetching | Fetch video/audio segments using fetch + readable stream | M | High | Medium | P0 | #2 | No abortable fetches |
| 4 | Core | MediaSource Setup | Initialize MediaSource, create audio/video SourceBuffers | S | High | Medium | P0 | None | MSE + MMS support |
| 5 | Core | Segment Appending | Append fetched segments to SourceBuffers | M | High | Medium | P0 | #3, #4 | Handle append errors |
| 6 | Core | Playback State Management | Core state machine (loading, buffering, playing, paused, seeking) | L | High | High | P0 | None | Architecture foundation |
| 7 | Core | Play/Pause Event Handling | React to media element play/pause events | S | High | Low | P0 | #6 | Event-driven, not API |
| 8 | Core | Seek Event Handling | React to seeking/seeked events, flush buffers, fetch new segments | M | High | Medium | P0 | #5, #6 | Basic buffer flushing |
| 9 | Core | Playback Rate Handling | React to ratechange events if needed | XS | Medium | Low | P0 | #6 | May not need handling |
| 10 | Core | Load/Unload Orchestration | Load HLS source, cleanup resources | S | High | Medium | P0 | #1, #6 | Resource management |

### ABR & Buffer Management

| ID | Category | Feature/Task | Description | Size | Impact | Effort | Priority | Dependencies | Notes |
|----|----------|--------------|-------------|------|--------|--------|----------|--------------|-------|
| 11 | ABR | Bandwidth Estimation | EWMA throughput tracking from segment downloads | M | High | Medium | P0 | #3 | Core ABR component |
| 12 | ABR | Quality Selection Algorithm | Choose optimal track based on bandwidth | M | High | Medium | P0 | #11 | Simple heuristic |
| 13 | ABR | Track Switching | Switch video quality without rebuffering | L | High | High | P0 | #5, #12 | Complex - smooth switching |
| 14 | ABR | Dynamic Forward Buffer | "Can play through" buffer strategy (preferred approach) | L | High | High | P0 | #11, #12 | Alternative: #14b |
| 14b | ABR | Simple Forward Buffer | Time/size-based buffer strategy (simpler alternative if time-constrained) | M | High | Medium | P0 | #11, #12 | Alternative to #14 |
| 15 | Buffer | Forward Buffer Management | Maintain buffer ahead of playhead | M | High | Medium | P0 | #5, #14 or #14b | Part of ABR strategy |
| 16 | Buffer | Smart Back Buffer Flushing | Track bytes, flush on append errors at segment boundaries (preferred) | M | Medium | Medium | P1 | #5 | Alternative: #16b |
| 16b | Buffer | Simple Back Buffer Flushing | Simple "keep N segments" strategy (simpler alternative if time-constrained) | S | Medium | Low | P1 | #5 | Alternative to #16 |
| 18 | ABR | Manual Quality Selection API | Allow manual track selection, disable ABR | M | Medium | Medium | P1 | #12, #13 | Stretch for V1 |

### Captions

| ID | Category | Feature/Task | Description | Size | Impact | Effort | Priority | Dependencies | Notes |
|----|----------|--------------|-------------|------|--------|--------|----------|--------------|-------|
| 19 | Captions | VTT Fetch via Track Element | Use <track> src to fetch+parse WebVTT segments | S | High | Low | P0 | #1 | POC already done |
| 20 | Captions | Track Mode Event Handling | React to track mode changes for enable/disable | S | High | Low | P0 | #19 | Event-driven, not API |
| 21 | Captions | Caption Display Integration | Ensure captions display in sync with video | S | High | Medium | P0 | #19, #20 | Browser handles rendering |

### Integration & Developer Experience

| ID | Category | Feature/Task | Description | Size | Impact | Effort | Priority | Dependencies | Notes |
|----|----------|--------------|-------------|------|--------|--------|----------|--------------|-------|
| 22 | Integration | Video.js Integration Layer | Adapter between SPF and Video.js v10 APIs | L | High | High | P0 | #6, #7, #8, #10 | Key integration point |
| 23 | DX | TypeScript Type Definitions | Complete types for all APIs and internal modules | M | High | Medium | P1 | All modules | Ongoing as features built |
| 24 | DX | Event System | Emit playback events (playing, paused, seeking, error, etc.) | M | High | Medium | P0 | #6 | Video.js integration |
| 25 | DX | Error Handling & Reporting | Detect errors, emit events, graceful failure | M | Medium | Medium | P2 | #6, #24 | Basic detection |
| 26 | DX | Logging Infrastructure | Structured logging with configurable levels | S | Medium | Low | P1 | None | Development debugging |
| 27 | DX | Performance Monitoring (Startup) | Track time to first frame metrics | S | High | Low | P1 | #6 | V1 focus |
| 28 | DX | Performance Monitoring (Buffer) | Track buffer health metrics | S | High | Low | P1 | #15 | V1 focus |
| 29 | DX | Documentation (Minimal) | Basic API reference, Video.js integration guide | M | Medium | Medium | P2 | #22 | Minimal for V1 |
| 30 | DX | Demo Application | Simple demo showing CMAF playback | S | High | Low | P1 | #22 | Mux-hosted stream |

### Testing Infrastructure

| ID | Category | Feature/Task | Description | Size | Impact | Effort | Priority | Dependencies | Notes |
|----|----------|--------------|-------------|------|--------|--------|----------|--------------|-------|
| 31 | Testing | Unit Test Infrastructure | Vitest setup, mocks for MediaSource/SourceBuffer/fetch | M | High | Medium | P0 | None | Foundation for all tests |
| 32 | Testing | Integration Test Infrastructure | Test framework for multi-component scenarios | M | High | Medium | P0 | #31 | Simulate playback workflows |
| 33 | Testing | E2E Test Infrastructure | Playwright setup for browser automation | L | High | High | P0 | None | Cross-browser testing |
| 34 | Testing | Test Stream Setup | Curated Mux + Apple test streams, local server | M | High | Medium | P0 | None | Reliable test content |
| 35 | Testing | CI/CD Integration | GitHub Actions, run tests on PR, coverage/bundle size gates | M | High | Medium | P0 | #31, #32, #33 | Automated testing |
| 36 | Testing | Bundle Size Tracking | Track bundle size, fail on growth, comparison tooling | S | High | Low | P0 | #35 | PRIMARY METRIC |
| 37 | Testing | Coverage Tracking | Coverage reports, ≥80% requirement, prevent regressions | S | High | Low | P1 | #31, #35 | Quality gate |
| 38 | Testing | Performance Benchmarks | Automated startup/seek/memory benchmarks in CI | M | Medium | Medium | P1 | #33, #35 | Track over time |

### Architecture & Foundation

| ID | Category | Feature/Task | Description | Size | Impact | Effort | Priority | Dependencies | Notes |
|----|----------|--------------|-------------|------|--------|--------|----------|--------------|-------|
| 39 | Arch | Module Structure Design | Define package structure, public/internal APIs, dependency graph | M | High | Medium | P0 | None | Do early, informs all work |
| 40 | Arch | State Management Pattern | State machine/context pattern (XState-inspired, not XState) | M | High | Medium | P0 | None | Architecture foundation |
| 41 | Arch | Event Bus / Pub-Sub | Internal event system for module communication | S | High | Medium | P0 | #40 | Decouple modules |
| 42 | Arch | Resource Cleanup Pattern | Consistent pattern for cleanup/disposal | S | High | Low | P1 | #40 | Prevent memory leaks |

## T-Shirt Size Reference

- **XS** (1-2 days) - Single function, minimal dependencies
- **S** (2-5 days) - Small feature, straightforward
- **M** (1-2 weeks) - Medium feature, some complexity
- **L** (2-4 weeks) - Large feature, requires design
- **XL** (1-2 months) - Major feature, significant architecture
- **XXL** (2+ months) - Epic, needs breakdown

## Notes on Alternatives

Items marked as "Alternative" (e.g., #14 vs #14b, #16 vs #16b) represent **different implementation approaches**, not runtime fallbacks. We will choose ONE approach based on:
- Time constraints
- Complexity assessment
- Priority

For example:
- **#14 (Dynamic Forward Buffer)** is the preferred sophisticated approach
- **#14b (Simple Forward Buffer)** is the simpler alternative if we're time-constrained
- We implement ONE, not both

## Impact × Effort Matrix

```
         Low Effort    High Effort
High    ┌──────────┬──────────┐
Impact  │ QUICK    │ STRATEGIC│
        │ WINS     │ BETS     │
        ├──────────┼──────────┤
Low     │ FILL-IN  │ AVOID    │
Impact  │          │          │
        └──────────┴──────────┘
```

## Priority Buckets

### P0 - Blockers
Must have for MVP/launch

### P1 - High Priority
Critical for quality/performance

### P2 - Medium Priority
Important but can defer

### P3 - Low Priority
Nice to have, future enhancement

### P4 - Deferred
Out of scope, backlog
