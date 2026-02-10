# [O1] Reactive State Container

**Type:** Infrastructure
**Size:** M (8 story points)
**Priority:** P0 - CRITICAL (Blocks 40+ items)
**Wave:** Wave 1 (Feb 3-10)
**Category:** Orchestration & Integration

---

## Description

Build the foundational reactive state management system based on the spike at `/Users/cpillsbury/dev/experiments/xstate-concepts-experiments/src/vjs/store/state.ts`.

This is a lightweight state container with:
- `patch()` for updating state
- `subscribe()` for reactive listeners
- Batched updates (microtask flush)
- Immutable state snapshots

**This is the #1 priority item - everything else depends on it.**

---

## User Story

As a developer building SPF features, I need a reactive state management system so that I can coordinate between modules without tight coupling.

---

## Acceptance Criteria

- [ ] `createState<T>(initial: T): WritableState<T>` factory function
- [ ] `WritableState` interface with `current`, `patch()`, `subscribe()`
- [ ] State updates are immutable (frozen objects)
- [ ] Subscribers are notified on state changes
- [ ] Updates are batched via microtask (queueMicrotask)
- [ ] Multiple patches in same tick only trigger one notification
- [ ] `flush()` function for manual batching control
- [ ] Type-safe state access and updates
- [ ] Unit tests with ≥80% coverage
- [ ] JSDoc documentation for public API

---

## Technical Notes

**Reference Implementation:**
- `/Users/cpillsbury/dev/experiments/xstate-concepts-experiments/src/vjs/store/state.ts`

**Key Implementation Details:**
- Use `Object.freeze()` for immutable snapshots
- Use `Object.is()` for change detection
- Use `queueMicrotask()` for batched flush
- Use `Set<StateChange>` for subscriber management

**Files to Create:**
- `packages/spf/src/core/state/create-state.ts` - Main implementation
- `packages/spf/src/core/state/types.ts` - Type definitions
- `packages/spf/src/core/state/tests/create-state.test.ts` - Unit tests

**API Design:**
```typescript
export type StateChange = () => void;

export interface State<T> {
  readonly current: Readonly<T>;
  subscribe(callback: StateChange): () => void;
}

export interface WritableState<T> extends State<T> {
  patch(partial: Partial<T>): void;
}

export function createState<T>(initial: T): WritableState<T>;
export function flush(): void;
```

**Example Usage:**
```typescript
const state = createState({ count: 0, name: 'foo' });

const unsub = state.subscribe(() => {
  console.log('State changed:', state.current);
});

state.patch({ count: 1 }); // Batched
state.patch({ count: 2 }); // Batched
// Both patches flush in next microtask, subscriber called once

flush(); // Manual flush if needed
```

---

## Definition of Done

- [ ] Implementation complete and matches spike pattern
- [ ] Unit tests pass with ≥80% coverage
- [ ] Type definitions exported
- [ ] JSDoc documentation complete
- [ ] Code reviewed
- [ ] Merged to main
- [ ] No bundle size regression

---

## Dependencies

**Blocks:**
- O2 (State Batching - enhancement)
- O3 (Resolvables Pattern)
- O5 (Preload Orchestrator)
- O6 (Media Event Orchestrator)
- O7 (Event Bus)
- O8 (Video.js Adapter)
- O9 (Resource Cleanup)
- O12 (Performance Metrics)
- O13 (Error Detection)
- F1-F16 (All feature integration items)

**Blocked by:** None - **START DAY 1**

---

## Risks & Considerations

- **Risk:** This blocks everything else - any delay cascades
- **Mitigation:** Assign most experienced engineer, start immediately
- **Risk:** Over-engineering could delay
- **Mitigation:** Keep scope minimal for V1, can refine later

---

## Testing Strategy

**Unit Tests:**
- Create state with initial values
- Patch updates state immutably
- Subscribers notified on changes
- Batching works (multiple patches = one notification)
- Unsubscribe removes listener
- Manual flush triggers immediately
- Type safety validated

**Integration Tests:**
- Use in actual feature (F1) to validate real-world usage

---

## Bundle Size Impact

**Target:** <1KB minified+gzipped
**Justification:** Core primitive, must be tiny

---

## Notes

- Based on proven spike implementation
- Similar to React's state management primitives
- Simpler than Redux/MobX but sufficient for SPF needs
- Foundation for all orchestration patterns
