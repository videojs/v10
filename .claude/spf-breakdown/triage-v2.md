# SPF Work Triage (v2 - Architecture-Oriented)

This breakdown separates **isolated/testable pieces** from **orchestration/integration**, making dependencies and parallelization opportunities clearer.

## Organizational Structure

### Category 1: Pure/Isolated Functionality
Things we can build and test independently with minimal dependencies. These are generally smaller and highly parallelizable.

### Category 2: Orchestration & Integration
The reactive/architectural pieces that coordinate between components. These are foundational.

### Category 3: Feature Integration
Putting the pieces together into full user-facing features. These depend on both pure functionality and orchestration.

---

## Category 1: Pure/Isolated Functionality

*Can be built and tested independently. Minimal dependencies. Highly parallelizable.*

| ID | Component | Feature/Task | Description | Size | Impact | Effort | Priority | Dependencies | Notes |
|----|-----------|--------------|-------------|------|--------|--------|----------|--------------|-------|
| P1 | HLS | Multivariant Playlist Parser | Parse master.m3u8 → extract variants (pure function) | S | High | Low | P0 | None | No state, just parsing |
| P2 | HLS | Media Playlist Parser | Parse media.m3u8 → extract segments (pure function) | S | High | Low | P0 | None | No state, just parsing |
| P3 | HLS | Playlist URL Resolution | Resolve relative URLs in playlists | XS | High | Low | P0 | None | Utility function |
| P4 | Network | HTTP Fetch Wrapper | Fetch with readable stream, error handling | S | High | Medium | P0 | None | Isolated network layer |
| P5 | Network | Fetch-Parse Pattern | Reusable fetch + parse abstraction | S | Medium | Low | P1 | P4 | Reduces repetition |
| P6 | ABR | Bandwidth Estimator | EWMA throughput calculation from segment downloads | S | High | Low | P0 | None | Pure algorithm |
| P7 | ABR | Quality Selection Algorithm | Choose track based on bandwidth (pure function) | S | High | Low | P0 | None | Simple heuristic |
| P8 | ABR | Forward Buffer Calculator | Calculate "can play through" buffer target | M | High | Medium | P0 | None | Algorithm/heuristic |
| P9 | ABR | Forward Buffer Calculator (Simple) | Time/size-based buffer target (alternative) | S | High | Low | P0 | None | Alternative to P8 |
| P10 | Buffer | Back Buffer Strategy (Smart) | Calculate flush points based on bytes/errors | M | Medium | Medium | P1 | None | Algorithm |
| P11 | Buffer | Back Buffer Strategy (Simple) | "Keep N segments" logic (alternative) | XS | Medium | Low | P1 | None | Alternative to P10 |
| P12 | Media | MediaSource Setup | Create MediaSource, SourceBuffers (isolated) | S | High | Low | P0 | None | MSE/MMS API wrapper |
| P13 | Media | Segment Appender | Append segment data to SourceBuffer (isolated) | S | High | Medium | P0 | P12 | Handle append operation |
| P14 | Media | Buffer Flusher | Remove data from SourceBuffer (isolated) | XS | High | Low | P0 | P12 | Handle remove operation |
| P15 | Captions | Track Element Manager | Set src on <track>, handle mode events | S | High | Low | P0 | None | POC already done ✅ |
| P16 | Captions | Caption Sync Validator | Verify captions display in sync (testing utility) | XS | Medium | Low | P1 | P15 | Test helper |
| P17 | Types | Core Type Definitions | Presentation, Track, Segment, State types | S | High | Low | P1 | None | Foundation for all code |
| P18 | Utils | Preload State Reader | Read media element preload attribute | XS | Medium | Low | P1 | None | Simple utility |
| P19 | Utils | Media Event Helpers | Listen to play, pause, seek events | XS | High | Low | P0 | None | Event utilities |

**Total Pure/Isolated Items:** 19
**Estimated Total:** ~15 Small, ~3 Medium items

---

## Category 2: Orchestration & Integration

*Foundational architecture pieces that coordinate components. Build early.*

| ID | Component | Feature/Task | Description | Size | Impact | Effort | Priority | Dependencies | Notes |
|----|-----------|--------------|-------------|------|--------|--------|----------|--------------|-------|
| O1 | State | Reactive State Container | Patch/subscribe state management (from spike) | M | High | Medium | P0 | None | Architecture foundation |
| O2 | State | State Batching/Flush | Microtask-batched state updates | S | Medium | Low | P0 | O1 | Part of state system |
| O3 | Orchestration | Resolvables Pattern | Monitor for unresolved → trigger resolve | M | High | Medium | P0 | O1 | Core orchestration |
| O4 | Orchestration | Task Deduplication | Prevent duplicate resolve operations | S | Medium | Low | P1 | O3 | Avoid isResolving flags |
| O5 | Orchestration | Preload Orchestrator | Monitor src + preload state → trigger fetch | M | High | Medium | P0 | O1, P18 | Controls fetch timing |
| O6 | Orchestration | Media Event Orchestrator | React to play/pause/seek from media element | M | High | Medium | P0 | O1, P19 | Event-driven coordination |
| O7 | Integration | Event Bus / Pub-Sub | Internal event system for module communication | S | High | Medium | P1 | O1 | Decouple modules |
| O8 | Integration | Video.js Adapter | Adapt SPF to Video.js v10 APIs | L | High | High | P0 | O1, O6 | Key integration point |
| O9 | Integration | Resource Cleanup Manager | Consistent cleanup/disposal pattern | S | High | Low | P1 | O1 | Prevent memory leaks |
| O10 | State | Module Structure Design | Package structure, public/internal APIs, dependency graph | M | High | Medium | P0 | None | Do early, informs all |
| O11 | Logging | Structured Logging System | Log levels, context, configurable output | S | Medium | Low | P1 | None | Development debugging |
| O12 | Monitoring | Performance Metrics Collector | Track startup time, buffer health | S | High | Low | P1 | O1 | Emit metrics |
| O13 | Error | Error Detection & Reporting | Detect errors, emit events, graceful failure | M | Medium | Medium | P2 | O1, O7 | Basic error handling |

**Total Orchestration Items:** 13
**Estimated Total:** ~7 Small, ~5 Medium, ~1 Large

---

## Category 3: Feature Integration

*Full user-facing features. Depend on pure functionality + orchestration.*

| ID | Feature | Feature/Task | Description | Size | Impact | Effort | Priority | Dependencies | Notes |
|----|---------|--------------|-------------|------|--------|--------|----------|--------------|-------|
| F1 | Playlist | Playlist Resolution Flow | Unresolved presentation → fetch/parse → resolved | M | High | Medium | P0 | P1, P2, P3, P4, O1, O3, O5 | Full feature |
| F2 | Playlist | Initial Track Selection | When presentation resolved → select initial track | S | High | Medium | P0 | F1, P7, O3 | Part of ABR |
| F3 | Playlist | Track Resolution Flow | Unresolved track → fetch media playlist → resolved | M | High | Medium | P0 | F2, P2, P4, O3 | Full feature |
| F4 | Buffering | Segment Fetch Pipeline | Fetch segments based on buffer needs | M | High | Medium | P0 | F3, P4, P13, O1 | Ongoing buffer fill |
| F5 | Buffering | Forward Buffer Management | Maintain buffer ahead using calculator | M | High | Medium | P0 | F4, P8 or P9, O1 | Active buffering |
| F6 | Buffering | Back Buffer Management | Flush old segments using strategy | S | Medium | Medium | P1 | F4, P10 or P11, P14, O1 | Memory management |
| F7 | Seeking | Seek Orchestration | Handle seeking event → flush → fetch | M | High | Medium | P0 | F4, P14, O6 | Full seek flow |
| F8 | ABR | Bandwidth Tracking | Update bandwidth estimates from fetches | S | High | Low | P0 | F4, P6, O1 | Wire up estimator |
| F9 | ABR | Quality Switching | Switch tracks based on bandwidth | L | High | High | P0 | F8, P7, P13, O1, O3 | Complex - smooth switching |
| F10 | ABR | Manual Quality API | Allow manual track selection, disable ABR | M | Medium | Medium | P1 | F9, O8 | Stretch for V1 |
| F11 | Playback | Play/Pause Handling | React to play/pause events from media element | S | High | Low | P0 | O6 | Event-driven |
| F12 | Playback | Playback Rate Handling | React to ratechange (if needed) | XS | Medium | Low | P0 | O6 | May not need logic |
| F13 | Captions | Caption Loading Flow | Load VTT via <track>, handle mode changes | S | High | Low | P0 | P15, F1, O1 | Integrate POC |
| F14 | Integration | Startup Orchestration | Load → parse → select → fetch → play flow | M | High | Medium | P0 | F1, F2, F3, F4, F5 | End-to-end |
| F15 | Integration | Playback State Machine | Loading, buffering, playing, paused, seeking states | L | High | High | P0 | F11, F7, F4, O1 | High-level state |
| F16 | Integration | Video.js Events Integration | Emit Video.js-compatible events | M | Medium | Medium | P1 | O8, O7, O12 | Event mapping |
| F17 | DX | Demo Application | Simple demo showing CMAF playback | S | High | Low | P1 | O8, F14 | Mux-hosted stream |
| F18 | DX | Minimal Documentation | Basic API reference, Video.js integration guide | M | Medium | Medium | P2 | O8 | Docs for V1 |

**Total Feature Integration Items:** 18
**Estimated Total:** ~8 Small, ~8 Medium, ~2 Large

---

## Testing Infrastructure

*Production-ready testing. Separate bucket as discussed.*

| ID | Component | Feature/Task | Description | Size | Impact | Effort | Priority | Dependencies | Notes |
|----|-----------|--------------|-------------|------|--------|--------|----------|--------------|-------|
| T1 | Unit | Unit Test Infrastructure | Vitest setup, mocks for MSE/fetch | M | High | Medium | P0 | None | Foundation |
| T2 | Unit | Test Utilities | Helpers for creating test fixtures | S | High | Low | P0 | T1 | Test helpers |
| T3 | Integration | Integration Test Framework | Multi-component test scenarios | M | High | Medium | P0 | T1 | Simulate workflows |
| T4 | E2E | Playwright Setup | Browser automation infrastructure | L | High | High | P0 | None | Cross-browser |
| T5 | E2E | Browser Test Helpers | Utilities for E2E test scenarios | M | Medium | Medium | P1 | T4 | Test helpers |
| T6 | Streams | Test Stream Setup | Curated Mux + Apple test streams | M | High | Medium | P0 | None | Reliable content |
| T7 | CI | CI/CD Pipeline | GitHub Actions, run tests on PR | M | High | Medium | P0 | T1, T3, T4 | Automation |
| T8 | CI | Bundle Size Tracking | Track size, fail on growth | S | High | Low | P0 | T7 | PRIMARY METRIC |
| T9 | CI | Coverage Tracking | ≥80% requirement, prevent regressions | S | High | Low | P1 | T1, T7 | Quality gate |
| T10 | Perf | Performance Benchmarks | Automated startup/seek/memory tests | M | Medium | Medium | P1 | T4, T7 | Track over time |

**Total Testing Items:** 10
**Estimated Total:** ~3 Small, ~5 Medium, ~2 Large

---

## Summary Statistics

| Category | Total Items | XS | S | M | L | XL |
|----------|-------------|----|----|----|----|-----|
| Pure/Isolated | 19 | 6 | 13 | 0 | 0 | 0 |
| Orchestration | 13 | 0 | 7 | 5 | 1 | 0 |
| Feature Integration | 18 | 1 | 8 | 8 | 2 | 0 |
| Testing | 10 | 2 | 3 | 5 | 2 | 0 |
| **TOTAL** | **60** | **9** | **31** | **18** | **5** | **0** |

## Key Insights

### Parallelization Opportunities
- **Pure/Isolated** items (19) can mostly be built in parallel
- Many are XS/S (quick wins, can be knocked out fast)

### Critical Path
1. **O1** (State Container) → foundational for everything
2. **O10** (Module Structure) → architectural decisions
3. **O3** (Resolvables Pattern) → core orchestration
4. **F1** (Playlist Resolution) → first end-to-end feature
5. **F14** (Startup Orchestration) → full playback flow

### Alternative Choices
Must choose ONE of each pair:
- **P8** (Dynamic Forward Buffer) OR **P9** (Simple Forward Buffer)
- **P10** (Smart Back Buffer) OR **P11** (Simple Back Buffer)

### Testing Strategy
- Each **P*** item gets unit tests (included in estimate)
- Each **F*** item gets integration + E2E tests (included in estimate)
- **T*** items are testing infrastructure (separate)

---

## Notes on Alternatives

Items marked as alternatives (e.g., P8 vs P9, P10 vs P11) represent **different implementation approaches**, not runtime fallbacks. We will choose ONE approach based on:
- Time constraints
- Complexity assessment during implementation
- Priority/impact

---

## T-Shirt Size Reference

- **XS** (1-2 days) - Single function, minimal dependencies
- **S** (2-5 days) - Small feature, straightforward
- **M** (1-2 weeks) - Medium feature, some complexity
- **L** (2-4 weeks) - Large feature, requires design
- **XL** (1-2 months) - Major feature, significant architecture
- **XXL** (2+ months) - Epic, needs breakdown
