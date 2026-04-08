---
status: draft
date: 2026-04-02
---

# Text Track Architecture

The text track implementation is the **reference implementation** for the
`createMachineActor` / `createMachineReactor` factories in SPF. It was built as part of a
deliberate spike (videojs/v10#1158) to prove out the Actor/Reactor primitives
described in [primitives.md](primitives.md) and [actor-reactor-factories.md](actor-reactor-factories.md).

This document records:
1. The architecture of the implementation itself
2. An assessment of the spike against its stated goals
3. Points of friction encountered during the spike
4. Possible future improvements the spike surfaces
5. Still-open questions
6. Implications for migrating the video/audio segment loading path

---

## Architecture Overview

Four components, two layers:

```
  ┌─────────────────────────────────────────────────────┐
  │  Reactors (dom/features/)                           │
  │                                                     │
  │  syncTextTracks           — DOM <track> lifecycle   │
  │      │                      + bidirectional sync    │
  │      │ shares state/owners signal                   │
  │  loadTextTrackCues        — cue loading FSM         │
  │      │                      + actor lifecycle       │
  └──────┼──────────────────────────────────────────────┘
         │ send()
  ┌──────▼──────────────────────────────────────────────┐
  │  Actors (dom/features/)                             │
  │                                                     │
  │  TextTracksActor          — cue deduplication       │
  │      ▲                      + context snapshot      │
  │      │ send('add-cues')                             │
  │  TextTrackSegmentLoaderActor — VTT fetch            │
  │                               + serial execution    │
  └─────────────────────────────────────────────────────┘
```

The two reactors share a `state` signal (playback state) and an `owners` signal
(platform dependencies including the actors). Both are passed in at construction
time — neither reactor has any global state.

---

## State Machines

### `syncTextTracks`

Manages `<track>` element lifecycle and bridges DOM `TextTrackList` changes back
to `selectedTextTrackId` in state.

```
'preconditions-unmet' ──── mediaElement + tracks available ────→ 'set-up'
       ↑                                                              │
       └──────────────── preconditions lost (exit cleanup) ───────────┘

any state ──── destroy() ────→ 'destroying' ────→ 'destroyed'
```

**`'set-up'` owns two independent effects:**
- Effect 1 — creates `<track>` elements on entry; exit cleanup removes them and
  clears `selectedTextTrackId`
- Effect 2 — syncs `mode` on entry (reactive: re-runs when `selectedTextTrackId`
  changes) + attaches `'change'` listener to bridge DOM back to state

**`'preconditions-unmet'`** has no effects — the `monitor` handles the
exit transition.

---

### `loadTextTrackCues`

Orchestrates cue loading. Owns actor lifecycle across states.

```
'preconditions-unmet' ──── mediaElement + presentation ────→ 'setting-up'
       ↑               + text tracks present                       │
       │                                                     actors created
       │                                                     in owners
       │                                                           ↓
       ├────────── preconditions lost ──────────────────── 'pending'
       │                                                           │
       │                                   selectedTrack resolved + in DOM
       │                                                           ↓
       └────────── preconditions lost ──────── 'monitoring-for-loads'

any state ──── destroy() ────→ 'destroying' ────→ 'destroyed'
```

State effects:
- **`'preconditions-unmet'`** — entry effect: destroy any stale actors in owners (no-op if already `undefined`)
- **`'setting-up'`** — entry effect: destroy stale actors, create fresh `TextTracksActor` + `TextTrackSegmentLoaderActor`, write to owners
- **`'pending'`** — no effects (neutral waiting state)
- **`'monitoring-for-loads'`** — reactive effect: re-runs on `currentTime` / `selectedTrack` changes, sends `load` to `segmentLoaderActor`

All transitions are driven by a single `monitor` that evaluates a `deriveState()`
computed signal.

---

### `TextTrackSegmentLoaderActor`

Fetches VTT segments and delegates cue management to `TextTracksActor`.

A lightweight `CallbackActor` — no FSM states, no `createMachineActor`. Receives
`load` messages, plans which segments to fetch (skipping those already recorded in
`TextTracksActor`'s context), and schedules fetches on a `SerialRunner`. Each new
`load` preempts in-flight work via `abortAll()` before scheduling fresh tasks.

Uses a `SerialRunner` — segments are fetched one at a time.

---

### `TextTracksActor`

Wraps a `HTMLMediaElement`'s `textTracks`, owns cue deduplication and
the cue record snapshot.

```
'active' ──── add-cues ────→ 'active'  (reducer; context updated per message)
```

Uses `createTransitionActor` — a reducer-style factory with no FSM states.
`snapshot.value` is `'active' | 'destroyed'`; the interesting state is entirely
in the context (`loaded` cues and `segments` records). No runner — all message
handling is synchronous.

---

## Key Patterns

### 1. `deriveState` + `monitor`

Complex multi-condition transition logic lives in a pure function that is memoized
into a `computed()` signal *outside* any effect body. The `monitor` field reads
the signal — the framework compares to the current state and drives the transition:

```typescript
// Hoist outside the reactor — computed() inside an effect creates a new node
// on every re-run with no memoization.
const derivedStateSignal = computed(() => deriveState(state.get(), owners.get()));

createMachineReactor({
  monitor: () => derivedStateSignal.get(),
  states: { ... },
});
```

`deriveState` is a plain function, independently testable. The `monitor` returns the
target state — the framework handles the comparison and transition call.

---

### 2. Entry-reset pattern

States that are "reset points" (entered when preconditions are lost) explicitly destroy
any stale actors on every entry. `teardownActors` is a guarded no-op when actors are
already `undefined`, preventing spurious signal writes on initial startup:

```typescript
function teardownActors(owners: Signal<TextTrackCueLoadingOwners>) {
  const { textTracksActor, segmentLoaderActor } = untrack(() => owners.get());
  if (!textTracksActor && !segmentLoaderActor) return; // no-op guard
  textTracksActor?.destroy();
  segmentLoaderActor?.destroy();
  update(owners, { textTracksActor: undefined, segmentLoaderActor: undefined });
}

// Called in BOTH reset states:
'preconditions-unmet': { entry: () => { teardownActors(owners); } },
'setting-up': {
  entry: () => {
    teardownActors(owners);  // defensive — same guard
    // ... create fresh actors
  },
},
```

The duplication is intentional: both states are entry points from which actors might
have been left in owners, and both must be safe to enter from any predecessor.

---

### 3. Actors in owners

Actors created by `loadTextTrackCues` are written to the shared `owners` signal.
The engine's `destroy()` loops over owners and destroys any value that has a
`destroy()` method:

```typescript
// engine.ts destroy():
for (const value of Object.values(owners.get())) {
  if (typeof (value as { destroy?: unknown }).destroy === 'function') {
    (value as { destroy(): void }).destroy();
  }
}
```

**Implication:** Actors in owners are destroyed by the engine, not by the reactor's
own `destroy()`. Callers using `loadTextTrackCues` outside the engine must destroy
actors explicitly before destroying the reactor:

```typescript
const { textTracksActor, segmentLoaderActor } = owners.get();
textTracksActor?.destroy();
segmentLoaderActor?.destroy();
reactor.destroy();
```

---

### 4. `untrack()` for non-reactive reads

When an effect must read a signal value *without* creating a reactive dependency,
wrap the read with `untrack()`. The two main cases:

**Entry effects are automatically untracked** — reading `owners` or `state` in an
`entry` effect does not create reactive dependencies. No `untrack()` wrapper needed:

```typescript
'setting-up': {
  // entry is automatically untracked — no need for untrack() here.
  entry: () => {
    const mediaElement = owners.get().mediaElement!;
    const textTracksActor = createTextTracksActor(mediaElement);
    // ...
  },
},
```

**Preventing feedback loops in `reactions`** — reading actor snapshot in a reactive
effect. `segmentLoaderActor.snapshot` changes every time the actor processes a message.
Without `untrack()`, the reactive effect would re-run on every snapshot change,
creating a tight feedback loop:

```typescript
'monitoring-for-loads': {
  // reactions: re-runs whenever currentTime or selectedTrack changes.
  // owners is read with untrack() — actor presence is guaranteed by
  // deriveState when in this state; actor snapshot changes must not
  // re-trigger this effect.
  reactions: () => {
    const currentTime = currentTimeSignal.get();  // tracked
    const track = selectedTrackSignal.get()!;     // tracked
    const { segmentLoaderActor } = untrack(() => owners.get());
    segmentLoaderActor!.send({ type: 'load', track, currentTime });
  },
},
```

---

### 5. Multiple effects per state — independent tracking and cleanup

Each entry in a state's effect array becomes one independent `effect()` call with
its own dependency tracking and cleanup. `syncTextTracks`'s `'set-up'` uses two
effects so that:
- Effect 1's cleanup (removing `<track>` elements) is not entangled with Effect 2's
  cleanup (removing the DOM listener)
- Effect 2 can re-run reactively when `selectedTextTrackId` changes without
  triggering Effect 1 (which uses `untrack()` for its reads)

If both behaviors were merged into one effect, either the `<track>` elements would
be recreated on every mode change, or mode sync would stop reacting after the first
run.

---

### 6. Bidirectional sync — the `change` event bridge

`syncTextTracks` bridges DOM → state by listening to `TextTrackList`'s `'change'`
event. The browser fires this event when track modes change, including when SPF
itself sets modes via `syncModes()`.

A `setTimeout(..., 0)` guard distinguishes SPF-initiated mode changes from
user/browser-initiated ones. During the settling window (immediately after initial
mode sync), `'change'` events re-apply the intended modes rather than writing back
to state. After the window closes, a `'change'` event is treated as external
selection and updates `selectedTextTrackId`:

```typescript
let syncTimeout: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
  syncTimeout = undefined;
}, 0);

const onChange = () => {
  if (syncTimeout) {
    // Inside settling window: browser auto-selection overriding modes.
    // Re-apply without touching state.
    syncModes(mediaElement.textTracks, untrack(() => selectedTextTrackIdSignal.get()));
    return;
  }
  // Outside settling window: treat as user selection, write back to state.
  const showingTrack = Array.from(mediaElement.textTracks)
    .find(t => t.mode === 'showing' && (t.kind === 'subtitles' || t.kind === 'captions'));
  const newId = showingTrack?.id;
  if (newId === untrack(() => selectedTextTrackIdSignal.get())) return;
  update(state, { selectedTextTrackId: newId });
};
```

---

## Spike Goal Assessment

Evaluated against the goals from videojs/v10#1158:

| Goal | Result | Notes |
|------|--------|-------|
| **Finite state machine** | ✓ | Both `createMachineReactor` and `createMachineActor` produce explicit FSMs with named states |
| **Non-finite context** | ✓ | `TextTracksActor.context` holds unbounded `loaded` + `segments` maps; observable via snapshot |
| **Teardown / abort propagation** | ✓ | `destroy()` fires effect cleanups; `SerialRunner.abortAll()` aborts in-flight Tasks; actors in owners destroyed by engine |
| **Message → task IoC** | ✓ | `createMachineActor` decouples message dispatch from task execution; `SerialRunner` handles scheduling |
| **Observable snapshots** | ✓ | Both factories expose `snapshot: ReadonlySignal<{ status, context }>` |
| **Bidirectional sync** | ✓ | `syncTextTracks` Effect 2 bridges `TextTrackList` `'change'` events back to state |

**What was harder than expected:**

- **Reactor actor lifecycle is implicit**, not self-contained. Actors live in `owners`, and
  destruction depends on the engine's generic loop. Callers using these reactors outside the
  engine must manage actor destruction explicitly.
- **The monitor-before-state ordering guarantee** requires care — it's an implementation
  guarantee of `createMachineReactor`, not a formal TC39 Signals guarantee. It cannot be assumed
  outside `createMachineReactor`.
- **Entry vs. reactive effect intent** was initially invisible in the definition shape —
  addressed by the `entry` / `reactions` split adopted after the spike.

---

## Points of Friction

### Inline computed anti-pattern

`computed()` inside an effect body creates a new `Computed` node on every re-run — no
memoization, no deduplication. `Computed`s that gate re-runs must be hoisted outside the
effect body. This is easy to miss because the code looks correct:

```typescript
// WRONG — new Computed on every re-run, no memoization
states: {
  'monitoring-for-loads': {
    reactions: () => {
      const trackSignal = computed(() => findSelectedTrack(state.get())); // new node each time!
      const track = trackSignal.get();
      segmentLoaderActor.send({ type: 'load', track, currentTime });
    },
  }
}

// CORRECT — hoist outside createMachineReactor()
const trackSignal = computed(() => findSelectedTrack(state.get()));
createMachineReactor({ states: { 'monitoring-for-loads': {
  reactions: () => {
    const track = trackSignal.get();
    segmentLoaderActor.send({ type: 'load', track, currentTime });
  },
} } });
```

### `untrack()` in `reactions` effects

The `entry` / `reactions` split eliminated the most common footgun (accidental tracking
in enter-once effects). However, `reactions` effects still require `untrack()` for reads
that should not create reactive dependencies. Missing it produces unexpected re-runs when
the read signal changes. The discipline is narrower now — only needed in `reactions`, not
in all effects — but it remains a convention rather than API enforcement.

### Actor lifecycle ownership split

The reactor creates actors but does not destroy them — the engine (or caller) does.
This is a deliberate design choice (see actors-in-owners pattern), but it creates an
implicit contract: callers using `loadTextTrackCues` outside the engine must remember
to destroy the actors before destroying the reactor. There is no API enforcement.

### Entry-reset required in both reset states

`teardownActors()` must be called in *both* `'preconditions-unmet'` and `'setting-up'`
because both are entry points that could be reached after actors were created. Missing
the defensive call in either state creates a window where actors leak on rapid
precondition cycling. This is a footgun that is easy to overlook when adding new states.

### Bidirectional sync timing depends on a `setTimeout` guard

The `setTimeout(..., 0)` window in `syncTextTracks` is a Chromium workaround for
browser auto-selection behavior. It is a best-effort heuristic, not a robust solution.
The `'change'` event is dispatched as a task (async, after the current script), so the
guard fires before the event under normal conditions — but this is not formally guaranteed.
Alternative approaches (e.g., tracking which modes SPF set, comparing before/after) were
not explored during the spike.

---

## Possible Future Improvements

### ~~`entry` vs. `reactive` distinction in the definition shape~~ (Implemented)

Adopted as `entry` / `reactions` in the `createMachineReactor` definition shape. `entry`
effects are automatically untracked; `reactions` effects re-run when tracked signals change.
See [actor-reactor-factories.md](actor-reactor-factories.md) for the decided design.

### Self-contained actor lifecycle in Reactor

Rather than writing actors to `owners` and relying on the engine's generic destroy loop,
a Reactor could own actor lifecycle directly — creating actors on state entry and
destroying them on state exit as part of the definition. The entry-reset pattern is already
approximating this behavior imperatively; formalizing it would eliminate the split
ownership contract.

One way to express this: state `exit` callbacks alongside effect cleanup:

```typescript
'setting-up': {
  entry: () => {
    const textTracksActor = createTextTracksActor(mediaElement);
    return { actors: { textTracksActor } };  // framework manages lifecycle
  }
}
```

This is speculative — the entry-reset pattern works today and the cost of the split
ownership is manageable. Revisit if the pattern spreads to video/audio.

### Formal `context` field on Reactor

Reactors do not have a `context` field — non-finite state is held in closures and the
`owners` signal. `owners` is externally visible (other features can observe actor state);
closure variables are not inspectable from outside. Whether a formal Reactor `context`
(observable via `snapshot`) would be worthwhile depends on what debugging and testing
patterns emerge as more Reactors are written.

### Cue deduplication: open design question in `TextTracksActor`

`TextTracksActor` currently silently gates on a missing or disabled `TextTrack` (early
return if `textTrack` is not found). A comment in the source (text-tracks-actor.ts:52–57)
identifies four possible approaches but does not resolve the choice:
- Silent gating (current behavior)
- Console warning + early return
- Domain-specific error
- Assume it can't happen and let it throw

The right answer likely depends on whether this case is expected in practice (i.e., can
the segment loader send `add-cues` for a track that isn't yet in the DOM?) and whether
that constitutes a recoverable error or a programming bug.

---

## Still Open Questions

### Monitor-before-state ordering: guarantee or implementation detail?

The ordering relies on `Signal.subtle.Watcher`'s `getPending()` returning computeds in
insertion order. This is the behavior of the TC39 `signal-polyfill`, but it is not a
formal guarantee of the TC39 Signals proposal specification. If a future implementation
changes this ordering (e.g., for optimization), FSMs built on the monitor-before-state
pattern would silently break.

Options: (a) document it as a polyfill-specific implementation guarantee and accept the
risk, (b) add an explicit mechanism to enforce ordering (e.g., `monitor` effects check
state and no-op if already transitioning), or (c) redesign to not rely on ordering
(e.g., per-state effects always re-check conditions themselves).

### Effect scheduling: what happens under compound state changes?

When multiple signals change in the same microtask batch (e.g., `state.patch()` touches
both `selectedTextTrackId` and `currentTime`), do effects see them as one update or two?

The current implementation defers effects via `queueMicrotask`, batching at the microtask
checkpoint — so compound changes in the same synchronous turn should produce one flush.
But the exact semantics under `owners.patch()` calls interleaved with `state.patch()` calls
have not been formally characterized or tested.

### Error handling in Actors

If a `Task` inside an Actor throws an unaborted error, what should happen? `TextTrackSegmentLoaderActor` catches fetch errors and logs them (graceful degradation per segment). `TextTracksActor` silently gates on missing track IDs. Neither has a formal error state.

The right answer differs by Actor and error type — some errors are recoverable (missing
segment, transient network failure), others are not (SourceBuffer in error state, MSE
closed). No general policy has been established.

---

## Implications for Video/Audio Migration

The text track spike establishes patterns that apply directly to the video/audio path:

**`loadSegments` → reactor migration**: `loadSegments` currently uses a `loadingInputsEq`
equality function to gate re-runs — the `deriveState` + `monitor` pattern is the direct
equivalent. The equality function's conditions map to the FSM's state conditions.

**`prevState` tracking**: `loadSegments` detects track switches by comparing
`prevState.track.id !== curState.track.id`. In the reactor model, the reactor
re-entering a state IS the "previous state" signal — state entry is the transition event.

**`SourceBufferActor`**: Now uses `createMachineActor` with `idle`/`updating` states,
`onSettled`, and a `cancel` message. `SegmentLoaderActor` also uses `createMachineActor`
with the continue/preempt pattern proved out by the text track spike.

**Actors in owners**: The video/audio actors should follow the same actors-in-owners
pattern — reactors create them, engine destroys them generically. `videoBufferActor` and
`audioBufferActor` already follow this (manually); the text track pattern formalizes it.

**Bandwidth bridge**: `loadSegments` currently writes `bandwidthState` back to shared
state via an `onSample` callback (a temporary migration artifact). The reactor model
should absorb this — the reactor observes bandwidth signals directly rather than writing
back through state.
