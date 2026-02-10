# SPF Development Waves

**Target Date:** February 27, 2026
**Duration:** ~24 days (3.5 weeks from Feb 3)
**Strategy:** Aggressive parallel execution with focus on critical path

---

## Wave 1: Foundation & Pure Functions
**Dates:** Feb 3-10 (Week 1)
**Goal:** Build foundation and all parallelizable pieces
**Team Strategy:** Everyone works in parallel

### Critical Path (Sequential - Assign Best Engineer)
- [ ] **O1** - Reactive State Container (M) - **MUST START DAY 1**
- [ ] **O10** - Module Structure Design (M) - **START DAY 1**
- [ ] **O3** - Resolvables Pattern (M) - **START AFTER O1 (~Day 3-4)**

### Parallel Track A: HLS Parsing & Network (Engineer 1)
- [ ] **P1** - Multivariant Playlist Parser (S)
- [ ] **P2** - Media Playlist Parser (S)
- [ ] **P3** - Playlist URL Resolution (XS)
- [ ] **P4** - HTTP Fetch Wrapper (S)
- [ ] **P5** - Fetch-Parse Pattern (S)

### Parallel Track B: ABR Algorithms (Engineer 2)
- [ ] **P6** - Bandwidth Estimator (S)
- [ ] **P7** - Quality Selection Algorithm (S)
- [ ] **P9** - Forward Buffer Calculator - Simple (S) *(Choose simple for V1)*
- [ ] **P11** - Back Buffer Strategy - Simple (XS) *(Choose simple for V1)*

### Parallel Track C: MediaSource & Types (Engineer 3)
- [ ] **P12** - MediaSource Setup (S)
- [ ] **P13** - Segment Appender (S) - *depends on P12*
- [ ] **P14** - Buffer Flusher (XS) - *depends on P12*
- [ ] **P17** - Core Type Definitions (S)
- [ ] **P18** - Preload State Reader (XS)
- [ ] **P19** - Media Event Helpers (XS)

### Parallel Track D: Captions & Testing (Engineer 4)
- [ ] **P15** - Track Element Manager (S) *(POC done, implement)*
- [ ] **T1** - Unit Test Infrastructure (M)
- [ ] **T4** - Playwright Setup (L) *(Start early, takes time)*
- [ ] **T6** - Test Stream Setup (M)

### Parallel Track E: Logging & Event System (Engineer 5)
- [ ] **O11** - Structured Logging System (S)
- [ ] **O2** - State Batching/Flush (S) - *depends on O1*

**Wave 1 Deliverables:**
- ✅ State management foundation ready (O1, O3)
- ✅ All pure functions implemented (P1-P19)
- ✅ Testing infrastructure started (T1, T4, T6)
- ✅ ~25 items complete

---

## Wave 2: Core Features & Orchestration
**Dates:** Feb 10-17 (Week 2)
**Goal:** Build core playback pipeline
**Team Strategy:** Focus on critical path + parallel orchestration

### Critical Path (Sequential - Priority 1)
- [ ] **O5** - Preload Orchestrator (M) - *depends on O1, O3, P18*
- [ ] **F1** - Playlist Resolution Flow (M) - *depends on O5, P1-P4*
- [ ] **F2** - Initial Track Selection (S) - *depends on F1, P7, O3*
- [ ] **F3** - Track Resolution Flow (M) - *depends on F2, P2, P4, O3*
- [ ] **F4** - Segment Fetch Pipeline (M) - *depends on F3, P4, P13, O1*
- [ ] **F5** - Forward Buffer Management (M) - *depends on F4, P9, O1*
- [ ] **F8** - Bandwidth Tracking (S) - *depends on F4, P6, O1*

### Parallel Track A: Playback Controls (Engineer 1)
- [ ] **O6** - Media Event Orchestrator (M) - *depends on O1, P19*
- [ ] **F11** - Play/Pause Handling (S) - *depends on O6*
- [ ] **F12** - Playback Rate Handling (XS) - *depends on O6*
- [ ] **F7** - Seek Orchestration (M) - *depends on F4, P14, O6*

### Parallel Track B: Video.js Integration (Engineer 2)
- [ ] **O7** - Event Bus / Pub-Sub (S) - *depends on O1*
- [ ] **O8** - Video.js Adapter (L) - *depends on O1, O6* **HIGH RISK**
- [ ] **O9** - Resource Cleanup Manager (S) - *depends on O1*

### Parallel Track C: Monitoring & Captions (Engineer 3)
- [ ] **O12** - Performance Metrics Collector (S) - *depends on O1*
- [ ] **F13** - Caption Loading Flow (S) - *depends on P15, F1, O1*

### Parallel Track D: Testing Infrastructure (Engineer 4)
- [ ] **T2** - Test Utilities (S) - *depends on T1*
- [ ] **T3** - Integration Test Framework (M) - *depends on T1*
- [ ] **T5** - Browser Test Helpers (M) - *depends on T4*
- [ ] **T7** - CI/CD Pipeline (M) - *depends on T1, T3, T4*

**Wave 2 Deliverables:**
- ✅ Core playback pipeline working (F1-F5, F8)
- ✅ Video.js integration layer done (O8)
- ✅ Playback controls functional (F11, F12, F7)
- ✅ Testing infrastructure operational (T1-T7)
- ✅ ~20 items complete

---

## Wave 3: ABR, Integration & Polish
**Dates:** Feb 17-24 (Week 3)
**Goal:** Complete ABR, integrate everything, start testing
**Team Strategy:** Critical path + final integration

### Critical Path (Sequential - Priority 1)
- [ ] **F9** - Quality Switching (L) - *depends on F8, P7, P13, O1, O3* **HIGH RISK**
- [ ] **F14** - Startup Orchestration (M) - *depends on F1-F5*
- [ ] **F15** - Playback State Machine (L) - *depends on F11, F7, F4, O1*

### Parallel Track A: Video.js Events (Engineer 1)
- [ ] **F16** - Video.js Events Integration (M) - *depends on O8, O7, O12*
- [ ] **F17** - Demo Application (S) - *depends on O8, F14*

### Parallel Track B: Testing & Quality Gates (Engineer 2)
- [ ] **T8** - Bundle Size Tracking (S) - *depends on T7* **PRIMARY METRIC**
- [ ] **T9** - Coverage Tracking (S) - *depends on T1, T7*
- [ ] **P16** - Caption Sync Validator (XS) - *depends on P15*

### Parallel Track C: Optional/Stretch (If Time Permits)
- [ ] **F6** - Back Buffer Management (S) - *depends on F4, P11, P14, O1*
- [ ] **F10** - Manual Quality API (M) - *depends on F9, O8*
- [ ] **O4** - Task Deduplication (S) - *depends on O3*
- [ ] **O13** - Error Detection & Reporting (M) - *depends on O1, O7*

**Wave 3 Deliverables:**
- ✅ ABR fully functional (F9)
- ✅ End-to-end startup working (F14, F15)
- ✅ Demo application running (F17)
- ✅ CI/CD with bundle size gates (T8, T9)
- ✅ ~10-15 items complete

---

## Wave 4: Final Testing & Documentation
**Dates:** Feb 24-27 (Final Days)
**Goal:** Production readiness
**Team Strategy:** All hands on testing, docs, polish

### Must Complete
- [ ] **F18** - Minimal Documentation (M) - *depends on O8*
- [ ] **T10** - Performance Benchmarks (M) - *depends on T4, T7*
- [ ] End-to-end testing across browsers
- [ ] Bug fixes and polish
- [ ] Performance validation
- [ ] Bundle size verification

### Can Defer to March (If Needed)
- F6 (Back Buffer Management) - P1
- F10 (Manual Quality API) - P1 stretch
- O4 (Task Deduplication) - P1 optimization
- O13 (Error Detection) - P2
- T10 (Performance Benchmarks) - P1

**Wave 4 Deliverables:**
- ✅ Production-ready V1
- ✅ Documentation complete
- ✅ All tests passing
- ✅ Bundle size validated
- ✅ Demo working across browsers

---

## Summary by Wave

| Wave | Dates | Focus | Items | Complexity |
|------|-------|-------|-------|------------|
| 1 | Feb 3-10 | Foundation & Pure Functions | ~25 | 2M + 23S/XS |
| 2 | Feb 10-17 | Core Features & Orchestration | ~20 | 2L + 8M + 10S |
| 3 | Feb 17-24 | ABR & Integration | ~10-15 | 2L + 5M + 8S |
| 4 | Feb 24-27 | Testing & Polish | ~5 | 2M + 3S |
| **Total** | **24 days** | **All** | **60** | **5L + 18M + 37S/XS** |

---

## Critical Milestones

### Milestone 1: Foundation Complete (Feb 10)
- ✅ O1, O3, O10 done (state management working)
- ✅ All pure functions implemented (P1-P19)
- ✅ Testing infrastructure setup (T1, T4, T6)
- **Risk:** If O1 slips, everything slips

### Milestone 2: Basic Playback Working (Feb 17)
- ✅ Can load HLS and play video (F1-F5)
- ✅ Video.js integration functional (O8)
- ✅ Captions working (F13)
- **Risk:** O8 complexity unknown

### Milestone 3: ABR & Full Integration (Feb 24)
- ✅ Quality switching operational (F9)
- ✅ End-to-end startup flow (F14, F15)
- ✅ Demo application working (F17)
- **Risk:** F9 is complex and on critical path

### Milestone 4: Production Ready (Feb 27)
- ✅ All tests passing
- ✅ Bundle size validated
- ✅ Documentation complete
- **Risk:** Testing may uncover issues

---

## Team Allocation Recommendation

### Week 1 (Foundation)
- **Engineer 1 (Senior):** O1, O3 (critical path)
- **Engineer 2:** P1-P5 (parsing/network)
- **Engineer 3:** P6-P9, P11 (ABR algorithms)
- **Engineer 4:** P12-P14, P17-P19 (MediaSource, types)
- **Engineer 5:** P15, T1, T4, T6 (captions, testing)

### Week 2 (Core Features)
- **Engineer 1 (Senior):** O5, F1, F2, F3, F4, F5, F8 (critical path)
- **Engineer 2:** O8 (Video.js adapter - complex)
- **Engineer 3:** O6, F11, F12, F7 (playback controls)
- **Engineer 4:** T2, T3, T5, T7 (testing infrastructure)
- **Engineer 5:** O12, F13, O7 (monitoring, captions, events)

### Week 3 (Integration)
- **Engineer 1 (Senior):** F9, F14 (ABR + startup - critical)
- **Engineer 2:** F15, F16 (state machine, events)
- **Engineer 3:** F17, F18 (demo, docs)
- **Engineer 4:** T8, T9, T10 (CI gates, benchmarks)
- **Engineer 5:** F6, F10, O4, O13 (stretch goals)

### Week 4 (Polish)
- **All hands:** Testing, bug fixes, polish

---

## Risk Mitigation Strategies

### For F9 (Quality Switching) - HIGH RISK
- Assign most experienced engineer
- Start spike/research early (during Wave 1)
- Have fallback to "basic" switching if needed
- Budget extra time (L = 2-4 weeks)

### For O8 (Video.js Adapter) - UNKNOWN RISK
- Spike early to understand integration surface
- Involve Video.js v10 expert
- Document assumptions early
- Test integration continuously

### For O1 (State Container) - BLOCKS EVERYTHING
- Start Day 1, no exceptions
- Peer review immediately
- Get working version ASAP (refine later)
- Minimize scope for V1

### For Feb 27 Deadline - TIMELINE RISK
- Track progress daily against milestones
- Identify slippage early (by Feb 10)
- Use defer list if needed (~9 items can slip)
- Maintain quality over features

---

## Daily Standups Should Track

1. **Critical path progress:** O1 → O3 → O5 → F1-F9 → F14
2. **Blockers:** What's blocking critical path?
3. **Risks:** F9, O8 status?
4. **Milestone dates:** On track for Feb 10, 17, 24, 27?
5. **Defer decisions:** What can we push to March if needed?

---

## Success Criteria by Feb 27

### Must Have (P0)
- ✅ Load Mux-hosted CMAF HLS stream
- ✅ Play, pause, seek functionality
- ✅ Basic ABR with quality switching
- ✅ WebVTT captions display
- ✅ Video.js v10 integration
- ✅ Demo application working
- ✅ Bundle size < target (PRIMARY METRIC)
- ✅ Cross-browser testing passing (Chrome, Safari, Firefox, Edge)

### Nice to Have (P1 - Can Defer)
- Back buffer management
- Manual quality selection API
- Comprehensive error handling
- Performance benchmarks
- Detailed documentation

### Out of Scope (March+)
- Live streaming
- DASH support
- DRM
- Advanced ABR algorithms
- Multi-CDN
