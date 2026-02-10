# [O3] Resolvables Pattern

**Type:** Infrastructure
**Size:** M (8 story points)
**Priority:** P0 - CRITICAL (Core orchestration)
**Wave:** Wave 1 (Feb 3-10, after O1)
**Category:** Orchestration & Integration

---

## Description

Implement the "resolvables" pattern for reactive orchestration: monitor state for unresolved items → automatically trigger resolution.

This pattern enables:
- Unresolved Presentation `{ url }` → fetch/parse → Resolved Presentation
- Unresolved Track → fetch media playlist → Resolved Track
- Declarative "what" not imperative "how"

**Reference:** `/Users/cpillsbury/dev/experiments/xstate-concepts-experiments/src/vjs/examples/hls-playlist-direct.ts`

---

## User Story

As a developer building SPF features, I need a pattern to automatically resolve unresolved state so that I don't have to manually coordinate async operations.

---

## Acceptance Criteria

- [ ] `createResolvable<T>()` factory for monitoring unresolved state
- [ ] Type predicates for `isResolved()` / `isUnresolved()`
- [ ] Reactive subscription triggers resolve operation
- [ ] Deduplication prevents duplicate resolves
- [ ] AbortController support for cancellation
- [ ] State updates on resolution complete
- [ ] Error handling for failed resolutions
- [ ] Unit tests with ≥80% coverage
- [ ] JSDoc documentation

---

## Technical Notes

**Pattern Explanation:**
```typescript
// Instead of imperative:
if (src && !presentation) {
  fetchAndParsePlaylist(src).then(p => setState({ presentation: p }));
}

// Use resolvable pattern:
createResolvable({
  state,
  selector: (s) => s.presentation,
  isUnresolved: (p) => p && 'url' in p && !('selectionSets' in p),
  resolve: async (unresolved) => {
    const text = await fetch(unresolved.url).then(r => r.text());
    return parsePlaylist(text, unresolved.url);
  },
  onResolved: (resolved) => state.patch({ presentation: resolved }),
});
```

**Files to Create:**
- `packages/spf/src/core/orchestration/resolvable.ts` - Implementation
- `packages/spf/src/core/orchestration/types.ts` - Types
- `packages/spf/src/core/orchestration/tests/resolvable.test.ts` - Tests

**Key Challenges:**
- Deduplication (don't resolve twice)
- Cancellation (abort if state changes)
- Error handling (what if resolve fails?)
- Type safety (TypeScript inference)

---

## Definition of Done

- [ ] Implementation complete
- [ ] Deduplication working (manual flags from spike eliminated)
- [ ] Cancellation via AbortController
- [ ] Unit tests pass with ≥80% coverage
- [ ] Used successfully in F1 (Playlist Resolution)
- [ ] Code reviewed
- [ ] Merged to main

---

## Dependencies

**Depends on:**
- O1 (State Container) - **BLOCKED UNTIL O1 DONE**

**Blocks:**
- F1 (Playlist Resolution)
- F2 (Track Selection)
- F3 (Track Resolution)
- F9 (Quality Switching)
- O4 (Task Deduplication - enhancement)
- O5 (Preload Orchestrator - uses this pattern)

---

## Risks & Considerations

- **Risk:** Pattern might be too abstract/complex
- **Mitigation:** Start simple, enhance based on F1 usage
- **Risk:** Type inference might be tricky
- **Mitigation:** Use explicit type parameters if needed

---

## Testing Strategy

**Unit Tests:**
- Detect unresolved state
- Trigger resolve operation
- Update state on resolution
- Prevent duplicate resolves
- Cancel on abort signal
- Handle resolve errors
- Type safety validated

**Integration Tests:**
- Use in F1 (Playlist Resolution) to validate pattern

---

## Bundle Size Impact

**Target:** <2KB minified+gzipped
**Justification:** Core orchestration pattern, used throughout

---

## Reference from Spike

**Pain Points from Direct Implementation (to solve):**
1. Manual `isResolving` flags → automated deduplication
2. Repeated fetch-parse logic → reusable pattern
3. Verbose reactive conditions → declarative selectors
4. No cancellation support → AbortController integration

**Spike showed need for:**
- Automatic deduplication
- Declarative resolve conditions
- Reusable pattern across features
- Cancellation support
