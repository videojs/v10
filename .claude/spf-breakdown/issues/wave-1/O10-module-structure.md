# [O10] Module Structure Design

**Type:** Architecture
**Size:** M (8 story points)
**Priority:** P0 - CRITICAL (Architectural foundation)
**Wave:** Wave 1 (Feb 3-10, Day 1)
**Category:** Orchestration & Integration

---

## Description

Define the package structure, module organization, public/internal APIs, and dependency graph for the SPF codebase.

This is an **architectural decision** that informs all development work and must be completed early.

---

## User Story

As a developer building SPF, I need a clear module structure so that I understand where code belongs and how modules interact.

---

## Acceptance Criteria

- [ ] Package structure defined (`packages/spf/src/...`)
- [ ] Module organization documented (core, dom, utils subdirectories)
- [ ] Public API surface identified (what's exported vs internal)
- [ ] Dependency rules established (no circular deps, clear hierarchy)
- [ ] File naming conventions defined
- [ ] Import path conventions established
- [ ] Bundle entry points defined
- [ ] TypeScript project references configured
- [ ] Documentation in `packages/spf/ARCHITECTURE.md`
- [ ] Reviewed and approved by team

---

## Technical Notes

**Proposed Structure:**
```
packages/spf/
├── src/
│   ├── core/               # Runtime-agnostic logic
│   │   ├── state/          # State management (O1, O3)
│   │   ├── orchestration/  # Resolvables, preload (O3, O5)
│   │   ├── hls/            # HLS parsing (P1, P2, P3)
│   │   ├── abr/            # ABR algorithms (P6, P7, P8/P9)
│   │   ├── buffer/         # Buffer strategies (P10/P11)
│   │   └── types/          # Core types (P17)
│   ├── dom/                # DOM/Browser bindings
│   │   ├── media/          # MediaSource (P12, P13, P14)
│   │   ├── captions/       # Captions (P15)
│   │   ├── events/         # Media events (P19, O6)
│   │   ├── network/        # Fetch (P4, P5)
│   │   └── integration/    # Video.js adapter (O8)
│   ├── utils/              # Shared utilities
│   │   ├── preload.ts      # Preload reader (P18)
│   │   └── logging.ts      # Logging (O11)
│   └── index.ts            # Public API exports
├── tests/
│   └── fixtures/           # Test utilities
├── package.json
└── tsconfig.json
```

**Key Decisions Needed:**
1. **Bundle strategy:** Single bundle vs. multiple entry points?
2. **Public API:** What's exported from `@videojs/spf`?
3. **Internal imports:** Use subpath imports or relative paths?
4. **Core vs. DOM:** Strict separation or pragmatic?

**Dependency Hierarchy:**
```
utils (lowest level - no deps)
  ↓
core (depends on utils only)
  ↓
dom (depends on core + utils)
  ↓
integration (depends on everything)
```

**Files to Create:**
- `packages/spf/ARCHITECTURE.md` - Structure documentation
- `packages/spf/src/index.ts` - Public API exports
- `packages/spf/tsconfig.json` - TypeScript configuration
- `packages/spf/package.json` - Package manifest

---

## Definition of Done

- [ ] Directory structure created
- [ ] ARCHITECTURE.md documented
- [ ] TypeScript configuration working
- [ ] Team reviewed and approved
- [ ] All developers understand structure
- [ ] Can build empty package successfully
- [ ] Ready for other teams to start implementing

---

## Dependencies

**Depends on:** None - **START DAY 1**

**Blocks:** All other work (everyone needs to know where to put code)

---

## Risks & Considerations

- **Risk:** Wrong structure means costly refactoring later
- **Mitigation:** Keep it simple for V1, can reorganize in March
- **Risk:** Team disagreement on structure
- **Mitigation:** Document rationale, make decision quickly

---

## Key Questions to Answer

1. **Single vs. multiple bundles?**
   - Single: Simpler, easier tree-shaking
   - Multiple: Better code-splitting (but more complex)
   - **Recommendation:** Single for V1

2. **Public API surface?**
   - Everything? Minimal? Selective?
   - **Recommendation:** Minimal for V1 (via Video.js integration)

3. **Internal structure: feature-based or layer-based?**
   - Feature: `hls/`, `abr/`, `captions/`
   - Layer: `parsers/`, `strategies/`, `orchestration/`
   - **Recommendation:** Hybrid (see proposed structure)

4. **How does SPF integrate with Video.js v10?**
   - Peer dependency? Embedded? Adapter?
   - **Recommendation:** Adapter pattern (O8)

---

## Bundle Size Impact

**Target:** N/A (architecture decision)
**Note:** Structure should enable tree-shaking and code-splitting

---

## Success Criteria

- Clear answer to "where does this code go?"
- No circular dependencies
- Clean separation of concerns
- Enables parallel development
- Supports bundle size optimization
- Simple enough for V1, extensible for future
