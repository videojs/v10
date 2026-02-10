# SPF Dependency Graph (Visual)

## Critical Path Visualization

```mermaid
graph TD
    %% Foundation
    O1[O1: State Container<br/>M - CRITICAL]:::critical
    O10[O10: Module Structure<br/>M]:::high

    %% Core Orchestration
    O3[O3: Resolvables Pattern<br/>M - CRITICAL]:::critical
    O5[O5: Preload Orchestrator<br/>M - CRITICAL]:::critical

    %% Pure Functions (Parallel)
    P1[P1: Multivariant Parser<br/>S]:::pure
    P2[P2: Media Parser<br/>S]:::pure
    P4[P4: Fetch Wrapper<br/>S]:::pure
    P7[P7: Quality Selection<br/>S]:::pure
    P12[P12: MediaSource Setup<br/>S]:::pure
    P13[P13: Segment Appender<br/>S]:::pure

    %% Feature Integration (Critical Path)
    F1[F1: Playlist Resolution<br/>M - CRITICAL]:::critical
    F2[F2: Track Selection<br/>S - CRITICAL]:::critical
    F3[F3: Track Resolution<br/>M - CRITICAL]:::critical
    F4[F4: Segment Fetch Pipeline<br/>M - CRITICAL]:::critical
    F5[F5: Forward Buffer Mgmt<br/>M - CRITICAL]:::critical
    F8[F8: Bandwidth Tracking<br/>S - CRITICAL]:::critical
    F9[F9: Quality Switching<br/>L - CRITICAL HIGH RISK]:::critical
    F14[F14: Startup Orchestration<br/>M - CRITICAL]:::critical

    %% Video.js Integration
    O8[O8: Video.js Adapter<br/>L - HIGH RISK]:::high
    F17[F17: Demo App<br/>S]:::high

    %% Critical Path Dependencies
    O1 --> O3
    O3 --> O5
    O5 --> F1
    P1 --> F1
    P2 --> F1
    P4 --> F1
    F1 --> F2
    P7 --> F2
    F2 --> F3
    F3 --> F4
    P13 --> F4
    P12 --> P13
    F4 --> F5
    F5 --> F8
    F8 --> F9
    F9 --> F14
    F14 --> F17
    O8 --> F17
    O1 --> O8

    %% Styling
    classDef critical fill:#ff6b6b,stroke:#c92a2a,stroke-width:3px,color:#fff
    classDef high fill:#ffa94d,stroke:#fd7e14,stroke-width:2px
    classDef pure fill:#51cf66,stroke:#2f9e44,stroke-width:1px
```

## Parallel Work Streams

```mermaid
graph LR
    subgraph "Stream 1: Critical Path"
    direction LR
    CP1[O1] --> CP2[O3] --> CP3[O5] --> CP4[F1] --> CP5[F2] --> CP6[F3]
    CP6 --> CP7[F4] --> CP8[F5] --> CP9[F8] --> CP10[F9] --> CP11[F14]
    end

    subgraph "Stream 2: Pure Functions"
    direction LR
    P[P1-P19<br/>19 items<br/>Highly Parallel]
    end

    subgraph "Stream 3: Playback Controls"
    direction LR
    O6[O6] --> F11[F11] & F12[F12] & F7[F7]
    end

    subgraph "Stream 4: Video.js"
    direction LR
    O7[O7] --> O8A[O8] --> F16[F16]
    end

    subgraph "Stream 5: Testing"
    direction LR
    T1[T1] --> T7[T7] --> T8[T8] & T9[T9]
    end

    style CP1 fill:#ff6b6b
    style CP10 fill:#ff6b6b
    style CP11 fill:#ff6b6b
```

## Risk Matrix

```mermaid
quadrantChart
    title Risk vs Impact Assessment
    x-axis Low Impact --> High Impact
    y-axis Low Risk --> High Risk
    quadrant-1 Monitor Closely
    quadrant-2 Manage Actively
    quadrant-3 Low Priority
    quadrant-4 Easy Wins

    O1 State Container: [0.9, 0.85]
    O3 Resolvables: [0.85, 0.75]
    F9 Quality Switch: [0.95, 0.90]
    O8 VJS Adapter: [0.90, 0.85]
    F14 Startup Orch: [0.85, 0.70]
    F15 State Machine: [0.80, 0.75]
    P1-P19 Pure Fns: [0.70, 0.20]
    F13 Captions: [0.75, 0.30]
```

## Timeline Gantt Chart (6-Week Plan)

```mermaid
gantt
    title SPF V1 Development Timeline (Feb 27 Target)
    dateFormat YYYY-MM-DD
    section Foundation
    O1 State Container           :crit, o1, 2026-02-03, 5d
    O10 Module Structure         :o10, 2026-02-03, 3d
    O3 Resolvables Pattern       :crit, o3, after o1, 5d
    section Pure Functions
    P1-P5 Parsing/Network        :p1, 2026-02-03, 7d
    P6-P9 ABR Algorithms         :p2, 2026-02-03, 7d
    P12-P14 MediaSource          :p3, 2026-02-03, 5d
    P15 Captions                 :p4, 2026-02-03, 3d
    section Core Features
    O5 Preload Orch              :crit, o5, after o3, 5d
    F1 Playlist Resolution       :crit, f1, after o5, 5d
    F2 Track Selection           :crit, f2, after f1, 3d
    F3 Track Resolution          :crit, f3, after f2, 5d
    F4 Segment Fetch             :crit, f4, after f3, 5d
    F5 Forward Buffer            :crit, f5, after f4, 5d
    F8 Bandwidth Tracking        :crit, f8, after f5, 3d
    F9 Quality Switching         :crit, f9, after f8, 7d
    section Parallel Work
    O6 Media Events              :o6, after o1, 5d
    F11-F12 Playback Controls    :f11, after o6, 5d
    F7 Seek Orchestration        :f7, after f4, 5d
    O8 Video.js Adapter          :o8, after o6, 7d
    section Integration
    F14 Startup Orch             :crit, f14, after f9, 5d
    F15 State Machine            :f15, after f14, 7d
    F17 Demo                     :f17, after o8, 3d
    section Testing
    T1 Unit Test Setup           :t1, 2026-02-03, 5d
    T7 CI/CD                     :t7, after t1, 5d
    T8 Bundle Size Track         :t8, after t7, 2d
```

---

## Key Findings

### Critical Path (Must Complete Sequentially)
**15 items:** O1 → O3 → O5 → F1 → F2 → F3 → F4 → F5 → F8 → F9 → F14

**Bottleneck Items:**
- 🔴 **F9 (Quality Switching)** - L complexity, on critical path
- 🔴 **O8 (Video.js Adapter)** - L complexity, needed for demo
- 🟡 **O1 (State Container)** - M complexity, blocks 40+ items

### Parallelization Potential
- ✅ **19 Pure items** can be done simultaneously (Week 1-2)
- ✅ **5 parallel streams** can run concurrently after O1
- ✅ **~40% of work** is highly parallelizable

### Risk Mitigation
1. **Start O1 immediately** - Everything depends on it
2. **Assign best engineer to F9** - Highest complexity on critical path
3. **Spike O8 early** - Unknown integration complexity
4. **Parallelize Pure functions** - Quick wins, unblock later work

### Flexibility for Feb 27
If running behind, these can slip to March:
- F6 (Back Buffer), F10 (Manual Quality), F18 (Docs)
- O4 (Deduplication), O9 (Cleanup), O13 (Error Handling)
- T10 (Perf Benchmarks), P16 (Caption Validator)

**~9 items (15%)** can be deferred without breaking core functionality.
