# SPF Spike - Quick Reference Guide

**Local Archive:** `.archive/spf-xstate-poc/` (local only, not in git)
**Git History:** Branch `feat/spf-xstate-poc-spike`
**External Experiments:** `/Users/cpillsbury/dev/experiments/xstate-concepts-experiments`

---

## 📁 Archive Structure (Local)

```
.archive/
├── spf-xstate-poc/          # Full spike package
│   ├── src/core/            # Core logic (runtime-agnostic)
│   ├── src/dom/             # DOM/browser bindings
│   ├── tests/               # Unit and E2E tests
│   ├── docs/                # Spike documentation
│   └── REFERENCE.md         # Detailed file mapping
└── spf-examples/            # Demo applications
    ├── spf-compare.html
    ├── spf-test.html
    └── src/
```

---

## 🎯 Issue → Spike File Mapping

Quick reference for which spike files relate to which GitHub issues:

### State & Orchestration
- **#388 (O1)** → `.archive/spf-xstate-poc/src/core/engine/context-store.ts`
- **#390 (O3)** → `.archive/spf-xstate-poc/src/core/engine/orchestrator/resolver.ts`
- **#413 (O5)** → `.archive/spf-xstate-poc/src/dom/engine/preload.ts`
- **#414 (O6)** → `.archive/spf-xstate-poc/src/dom/engine/monitors/media-element-monitor.ts`

### HLS Parsing
- **#391 (P1)** → `.archive/spf-xstate-poc/src/core/hls/parse-multivariant.ts`
- **#392 (P2)** → `.archive/spf-xstate-poc/src/core/hls/parse-media-playlist.ts`
- **#393 (P3)** → `.archive/spf-xstate-poc/src/core/streaming/resolve-url.ts`

### ABR & Buffering
- **#396 (P6)** → `.archive/spf-xstate-poc/src/core/engine/abr/bandwidth-estimator.ts`
- **#397 (P7)** → `.archive/spf-xstate-poc/src/core/engine/abr/select-video-track.ts`
- **#398 (P8)** → `.archive/spf-xstate-poc/src/dom/engine/metrics/smart-buffer.ts`

### Network & Fetching
- **#394 (P4)** → `.archive/spf-xstate-poc/src/core/streaming/fetch-segment.ts`
- **#395 (P5)** → `.archive/spf-xstate-poc/src/core/streaming/fetch-text.ts`

### MediaSource
- **#400 (P10)** → `.archive/spf-xstate-poc/src/dom/media-source.ts`
- **#401 (P11)** → `.archive/spf-xstate-poc/src/dom/source-buffer.ts`

### Captions
- **#403 (P13)** → `.archive/spf-xstate-poc/src/dom/engine/text-track/track-manager.ts`

### Testing
- **#410 (T1)** → `.archive/spf-xstate-poc/vitest.config.ts`
- **#411 (T4)** → `.archive/spf-xstate-poc/tests/e2e/playwright.config.ts`
- **#412 (T6)** → `.archive/spf-xstate-poc/test-fixtures/`

---

## 🔧 How to Use During Implementation

### When Starting an Issue:

1. **Check the mapping above** for related spike files
2. **Read the spike file:**
   ```bash
   # From repo root
   cat .archive/spf-xstate-poc/src/core/hls/parse-multivariant.ts
   ```
3. **Extract the pattern/algorithm** (not the XState wrapper)
4. **Rebuild cleanly** in `packages/spf/`
5. **Add proper tests and documentation**

### Example Workflow (O1 - State Container):

```bash
# Read spike implementation
Read .archive/spf-xstate-poc/src/core/engine/context-store.ts

# Extract pattern:
# - patch() for updates
# - subscribe() for listeners
# - Batched flush via queueMicrotask
# - Immutable snapshots via Object.freeze

# Rebuild in packages/spf/src/core/state/create-state.ts
# Add tests in packages/spf/src/core/state/tests/
```

---

## 🚫 What NOT to Do

- ❌ Copy entire files wholesale
- ❌ Include XState dependency or patterns
- ❌ Keep manual deduplication flags (`isResolving`)
- ❌ Repeat fetch-parse logic (use P5 abstraction)
- ❌ Commit `.archive/` to git (it's local-only)

---

## 📚 Additional References

### External Experiments
`/Users/cpillsbury/dev/experiments/xstate-concepts-experiments/`
- State management patterns
- Event-driven pipeline explorations
- Comparison with other approaches

### Git History
```bash
# View spike branch
git log feat/spf-xstate-poc-spike

# Checkout specific file from spike
git show feat/spf-xstate-poc-spike:packages/spf/src/core/hls/parse-multivariant.ts
```

---

**Remember:** `.archive/` is for reference only. Extract patterns, rebuild cleanly.
