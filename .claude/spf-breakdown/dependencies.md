# SPF Dependency Graph & Critical Path Analysis

This document maps dependencies between all 60 work items and identifies the critical path.

## Dependency List

### Pure/Isolated Functionality (P1-P19)

**No Dependencies (Can Start Immediately):**
- P1: Multivariant Playlist Parser
- P2: Media Playlist Parser
- P3: Playlist URL Resolution
- P4: HTTP Fetch Wrapper
- P6: Bandwidth Estimator
- P7: Quality Selection Algorithm
- P8: Forward Buffer Calculator (dynamic)
- P9: Forward Buffer Calculator (simple)
- P10: Back Buffer Strategy (smart)
- P11: Back Buffer Strategy (simple)
- P12: MediaSource Setup
- P15: Track Element Manager
- P17: Core Type Definitions
- P18: Preload State Reader
- P19: Media Event Helpers

**With Dependencies:**
- P5: Fetch-Parse Pattern → depends on P4
- P13: Segment Appender → depends on P12
- P14: Buffer Flusher → depends on P12
- P16: Caption Sync Validator → depends on P15

---

### Orchestration & Integration (O1-O13)

**No Dependencies (Foundation):**
- O1: Reactive State Container
- O10: Module Structure Design
- O11: Structured Logging System

**With Dependencies:**
- O2: State Batching/Flush → depends on O1
- O3: Resolvables Pattern → depends on O1
- O4: Task Deduplication → depends on O3
- O5: Preload Orchestrator → depends on O1, P18
- O6: Media Event Orchestrator → depends on O1, P19
- O7: Event Bus / Pub-Sub → depends on O1
- O8: Video.js Adapter → depends on O1, O6
- O9: Resource Cleanup Manager → depends on O1
- O12: Performance Metrics Collector → depends on O1
- O13: Error Detection & Reporting → depends on O1, O7

---

### Feature Integration (F1-F18)

**Dependencies (Complex):**
- F1: Playlist Resolution Flow → depends on P1, P2, P3, P4, O1, O3, O5
- F2: Initial Track Selection → depends on F1, P7, O3
- F3: Track Resolution Flow → depends on F2, P2, P4, O3
- F4: Segment Fetch Pipeline → depends on F3, P4, P13, O1
- F5: Forward Buffer Management → depends on F4, (P8 or P9), O1
- F6: Back Buffer Management → depends on F4, (P10 or P11), P14, O1
- F7: Seek Orchestration → depends on F4, P14, O6
- F8: Bandwidth Tracking → depends on F4, P6, O1
- F9: Quality Switching → depends on F8, P7, P13, O1, O3
- F10: Manual Quality API → depends on F9, O8
- F11: Play/Pause Handling → depends on O6
- F12: Playback Rate Handling → depends on O6
- F13: Caption Loading Flow → depends on P15, F1, O1
- F14: Startup Orchestration → depends on F1, F2, F3, F4, F5
- F15: Playback State Machine → depends on F11, F7, F4, O1
- F16: Video.js Events Integration → depends on O8, O7, O12
- F17: Demo Application → depends on O8, F14
- F18: Minimal Documentation → depends on O8

---

### Testing Infrastructure (T1-T10)

**No Dependencies (Can Build in Parallel):**
- T1: Unit Test Infrastructure
- T4: Playwright Setup
- T6: Test Stream Setup

**With Dependencies:**
- T2: Test Utilities → depends on T1
- T3: Integration Test Framework → depends on T1
- T5: Browser Test Helpers → depends on T4
- T7: CI/CD Pipeline → depends on T1, T3, T4
- T8: Bundle Size Tracking → depends on T7
- T9: Coverage Tracking → depends on T1, T7
- T10: Performance Benchmarks → depends on T4, T7

---

## Critical Path Analysis

### Longest Dependency Chain (Critical Path)

```
O1 (State Container)
  ↓
O3 (Resolvables Pattern)
  ↓
O5 (Preload Orchestrator) + P1, P2, P3, P4
  ↓
F1 (Playlist Resolution Flow)
  ↓
F2 (Initial Track Selection) + P7
  ↓
F3 (Track Resolution Flow)
  ↓
F4 (Segment Fetch Pipeline) + P13 (depends on P12)
  ↓
F5 (Forward Buffer Management) + P8/P9
  ↓
F8 (Bandwidth Tracking) + P6
  ↓
F9 (Quality Switching)
  ↓
F14 (Startup Orchestration)
  ↓
F17 (Demo Application) + O8 (Video.js Adapter)
```

**Critical Path Length:** ~15 items (including prerequisites)

**Estimated Critical Path Complexity:**
- O1 (M), O3 (M), O5 (M), F1 (M), F2 (S), F3 (M), F4 (M), F5 (M), F8 (S), F9 (L), F14 (M), O8 (L), F17 (S)
- **Total:** 2L + 8M + 3S = High complexity chain

---

## Parallel Work Streams

### Stream 1: Playlist → Buffering (Critical Path)
```
O1 → O3 → O5 → F1 → F2 → F3 → F4 → F5 → F8 → F9 → F14
```
**Must be done sequentially, blocks everything**

### Stream 2: Media & Captions (Parallel to Stream 1 after O1)
```
P12 → P13 → P14
P15 → F13 (depends on F1)
```
**Can work in parallel once O1 is done**

### Stream 3: Playback Controls (Parallel after O6)
```
O6 → F11, F12, F7
O6 → F15 (also needs F4, F11, F7)
```
**Can work in parallel once O6 is done**

### Stream 4: Video.js Integration (Needs O1, O6, O7)
```
O7 → O8 → F16, F10
O12 → F16
```
**Can work in parallel with features once orchestration is done**

### Stream 5: Testing (Mostly Parallel)
```
T1 → T2, T3 → T7 → T8, T9
T4 → T5 → T7 → T10
T6 (independent)
```
**Can build alongside feature work**

### Stream 6: Pure Functions (Highly Parallel)
```
P1, P2, P3, P4, P5 (parsing & network)
P6, P7, P8/P9, P10/P11 (ABR & buffer)
P17, P18, P19 (types & utils)
```
**Can all be done in parallel, minimal dependencies**

---

## Risk Analysis

### High-Risk Items (On Critical Path + Complex)

1. **O1 (State Container) - M** - Blocks everything, foundational
2. **O3 (Resolvables Pattern) - M** - Core orchestration pattern
3. **F9 (Quality Switching) - L** - Complex, on critical path
4. **O8 (Video.js Adapter) - L** - Integration complexity unknown
5. **F14 (Startup Orchestration) - M** - Brings everything together
6. **F15 (Playback State Machine) - L** - High-level coordination

### Medium-Risk Items

- **O5 (Preload Orchestrator) - M** - On critical path
- **F1 (Playlist Resolution) - M** - First end-to-end feature
- **F4 (Segment Fetch Pipeline) - M** - Core buffering logic

---

## Parallelization Opportunities

### Week 1-2: Foundation Phase

**Must Do First (Sequential):**
- O1 (State Container)
- O10 (Module Structure)

**Can Do in Parallel (Once O1 Done):**
- All Pure/Isolated items (P1-P19) - 19 items, mostly XS/S
- O11 (Logging)
- T1, T4, T6 (Testing infrastructure)

**Team Distribution Example:**
- Person 1: O1, O3 (critical path)
- Person 2: P1, P2, P3, P4, P5 (parsing & network)
- Person 3: P6, P7, P8/P9 (ABR algorithms)
- Person 4: P12, P13, P14 (MediaSource operations)
- Person 5: T1, T4, T6 (testing setup)

### Week 2-4: Core Features Phase

**Critical Path (Sequential):**
- O5 → F1 → F2 → F3 → F4 → F5 → F8 → F9

**Parallel Work:**
- O6 → F11, F12, F7
- P15 → F13 (once F1 done)
- O7, O8, O12, O13
- T2, T3, T5, T7

### Week 4-6: Integration & Polish Phase

**Final Integration:**
- F14 (Startup Orchestration) - needs F1-F5 done
- F15 (Playback State Machine) - needs F4, F7, F11
- F16 (Video.js Events) - needs O8, O7, O12
- F17 (Demo) - needs O8, F14
- F18 (Docs) - needs O8

**Testing Completion:**
- T8, T9, T10 (once T7 done)

---

## Items NOT on Critical Path (Lower Risk, Can Slip)

These can be deferred to March if needed:

- **F6** (Back Buffer Management) - P1, nice to have
- **F10** (Manual Quality API) - P1, stretch goal
- **F12** (Playback Rate Handling) - P0 but simple, can do last
- **F18** (Minimal Documentation) - P2, can be minimal for Feb
- **O4** (Task Deduplication) - P1, optimization
- **O9** (Resource Cleanup) - P1, can refine later
- **O13** (Error Handling) - P2, basic for Feb
- **P16** (Caption Sync Validator) - P1, testing utility
- **T10** (Performance Benchmarks) - P1, can come after launch

---

## Recommended Sequence

### Phase 1: Foundation (Week 1-2)
**Sequential (Critical):**
1. O1 (State Container)
2. O10 (Module Structure)
3. O3 (Resolvables Pattern)

**Parallel (High Priority):**
- P1, P2, P3, P4, P5 (HLS parsing & network)
- P6, P7, P8 or P9 (ABR algorithms)
- P12, P13, P14 (MediaSource)
- P15 (Captions)
- P17, P18, P19 (Types & utils)
- T1, T4, T6 (Testing setup)

### Phase 2: Core Features (Week 2-4)
**Sequential (Critical):**
1. O5 (Preload Orchestrator)
2. F1 (Playlist Resolution)
3. F2 (Track Selection)
4. F3 (Track Resolution)
5. F4 (Segment Fetch Pipeline)
6. F5 (Forward Buffer)
7. F8 (Bandwidth Tracking)
8. F9 (Quality Switching)

**Parallel (High Priority):**
- O6 → F11, F12, F7 (Playback controls)
- F13 (Captions - once F1 done)
- O7, O8 (Video.js integration)
- O12 (Metrics)
- T2, T3, T5, T7 (Testing)

### Phase 3: Integration & Polish (Week 4-6)
**Sequential (Critical):**
1. F14 (Startup Orchestration)
2. F15 (Playback State Machine)
3. F17 (Demo)

**Parallel:**
- F16 (Video.js Events)
- T8, T9 (CI gates)
- F18 (Docs - minimal)

**Can Defer to March:**
- F6, F10, O4, O9, O13, T10

---

## Key Insights

1. **O1 is the biggest blocker** - 40+ items depend on it (directly or transitively)
2. **19 Pure items are highly parallel** - Can be done simultaneously
3. **F9 (Quality Switching) is high risk** - Large, complex, on critical path
4. **O8 (Video.js Adapter) is unknown risk** - Integration complexity unclear
5. **~9 items can slip to March** if needed without breaking core functionality

---

## Next Steps

1. ✅ Dependencies mapped
2. ⏭️ Organize into waves with dates
3. ⏭️ Create all 60 GitHub issues with dependencies linked
