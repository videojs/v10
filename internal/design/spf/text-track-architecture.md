---
status: draft
date: 2026-04-02
---

# Text Track Architecture

The text track implementation is the **reference implementation** for the
`createActor` / `createReactor` factories in SPF. It was built as part of a
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

**`'preconditions-unmet'`** has no effects — the `always` monitor handles the
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

All transitions are driven by a single `always` monitor that evaluates a `deriveStatus()`
computed signal.

---

### `TextTrackSegmentLoaderActor`

Fetches VTT segments and delegates cue management to `TextTracksActor`.

```
'idle' ──── load (segments to fetch) ────→ 'loading'
  ↑                                            │
  └──── onSettled (runner chain empties) ───────┘
  ↑
  └──── load (nothing to fetch) — stays idle
```

Both states handle `load`. The `idle` handler transitions to `'loading'`;
the `loading` handler stays `loading` (re-plans in place by aborting + rescheduling).
`onSettled: 'idle'` in the `loading` state definition handles the auto-return once
all tasks complete.

Uses a `SerialRunner` — segments are fetched one at a time.

---

### `TextTracksActor`

Wraps a `HTMLMediaElement`'s `textTracks`, owns cue deduplication and
the cue record snapshot.

```
'idle' ──── add-cues ────→ 'idle'  (single state; all messages synchronous)
```

No runner — all message handling is synchronous. `'destroyed'` is the only
other state (implicit, added by `createActor`).

---

## Key Patterns

### 1. `deriveStatus` + `always` monitor

Complex multi-condition transition logic lives in a pure function that is memoized
into a `computed()` signal *outside* any effect body. The `always` monitor reads
the signal and drives the transition:

```typescript
// Hoist outside the reactor — computed() inside an effect creates a new node
// on every re-run with no memoization.
const derivedStatusSignal = computed(() => deriveStatus(state.get(), owners.get()));

createReactor({
  always: [
    ({ status, transition }) => {
      const target = derivedStatusSignal.get();
      if (target !== status) transition(target);
    }
  ],
  // ...
});
```

`deriveStatus` is a plain function, independently testable. The `always` effect is
kept to one comparison and one transition call — no logic lives there.

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
'preconditions-unmet': [() => { teardownActors(owners); }],
'setting-up': [() => {
  teardownActors(owners);  // defensive — same guard
  // ... create fresh actors
}],
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

**Enter-once setup** — reading `owners` or `state` in an enter-once effect. Without
`untrack()`, a change to `owners.mediaElement` would re-run an effect that was only
meant to run once on state entry:

```typescript
'setting-up': [() => {
  // untrack: mediaElement might change later; we only need it at setup time.
  const mediaElement = untrack(() => owners.get().mediaElement!);
  const textTracksActor = createTextTracksActor(mediaElement);
  // ...
}],
```

**Preventing feedback loops** — reading actor snapshot in a monitoring effect.
`segmentLoaderActor.snapshot` changes every time the actor processes a message.
Without `untrack()`, the monitoring effect would re-run on every snapshot change,
creating a tight feedback loop:

```typescript
'monitoring-for-loads': [() => {
  const currentTime = currentTimeSignal.get();  // tracked intentionally
  const track = selectedTrackSignal.get()!;     // tracked intentionally
  // untrack: actor snapshot changes must not re-trigger this effect.
  const { segmentLoaderActor } = untrack(() => owners.get());
  segmentLoaderActor!.send({ type: 'load', track, currentTime });
}],
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
| **Finite state machine** | ✓ | Both `createReactor` and `createActor` produce explicit FSMs with named states |
| **Non-finite context** | ✓ | `TextTracksActor.context` holds unbounded `loaded` + `segments` maps; observable via snapshot |
| **Teardown / abort propagation** | ✓ | `destroy()` fires effect cleanups; `SerialRunner.abortAll()` aborts in-flight Tasks; actors in owners destroyed by engine |
| **Message → task IoC** | ✓ | `createActor` decouples message dispatch from task execution; `SerialRunner` handles scheduling |
| **Observable snapshots** | ✓ | Both factories expose `snapshot: ReadonlySignal<{ status, context }>` |
| **Bidirectional sync** | ✓ | `syncTextTracks` Effect 2 bridges `TextTrackList` `'change'` events back to state |

**What was harder than expected:**

- **Reactor actor lifecycle is implicit**, not self-contained. Actors live in `owners`, and
  destruction depends on the engine's generic loop. Callers using these reactors outside the
  engine must manage actor destruction explicitly.
- **The `always`-before-state ordering guarantee** requires care — it's an implementation
  guarantee of `createReactor`, not a formal TC39 Signals guarantee. It cannot be assumed
  outside `createReactor`.
- **Entry vs. reactive effect intent is invisible in the definition shape.** `untrack()` is
  a convention, not API enforcement. An enter-once effect that accidentally tracks a signal
  produces no error — just unexpected re-runs.

---

## Points of Friction

### Inline computed anti-pattern

`computed()` inside an effect body creates a new `Computed` node on every re-run — no
memoization, no deduplication. `Computed`s that gate re-runs must be hoisted outside the
effect body. This is easy to miss because the code looks correct:

```typescript
// WRONG — new Computed on every re-run, no memoization
states: {
  'monitoring-for-loads': [() => {
    const trackSignal = computed(() => findSelectedTrack(state.get())); // new node each time!
    const track = trackSignal.get();
    segmentLoaderActor.send({ type: 'load', track, currentTime });
  }]
}

// CORRECT — hoist outside createReactor()
const trackSignal = computed(() => findSelectedTrack(state.get()));
createReactor({ states: { 'monitoring-for-loads': [() => {
  const track = trackSignal.get();
  segmentLoaderActor.send({ type: 'load', track, currentTime });
}] } });
```

### `untrack()` — convention without enforcement

Nothing in the API prevents an enter-once effect from tracking signals it shouldn't.
The author must know to use `untrack()` for reads that are setup-only. Missing it
produces unexpected re-runs when the read signal changes, which can cause duplicate
DOM mutations or redundant actor messages.

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

### `entry` vs. `reactive` distinction in the definition shape

The `untrack()` convention for enter-once effects is a footgun. A future definition shape
might distinguish:

```typescript
states: {
  'set-up': {
    entry: [/* automatically untracked, run once */],
    reactive: [/* re-run when tracked signals change */]
  }
}
```

This would make intent explicit and eliminate the class of bugs where an enter-once effect
accidentally tracks a signal. The `always` array already provides the primary reactive
mechanism for cross-cutting monitors; `reactive` within-state effects are a secondary but
real use case. Worth revisiting as more examples accumulate.

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

### Formal `context` field usage on Reactor

`createReactor` accepts `context` + `setContext`, but `loadTextTrackCues` and
`syncTextTracks` both use `context: {}` throughout — reactor non-finite state is held in
closure variables and the `owners` signal instead.

The tradeoff: `owners` is externally visible (other features can observe actor state);
closure variables are not inspectable from outside; Reactor `context` would be observable
via `snapshot` but adds API surface. The right answer likely depends on what debugging
and testing patterns emerge as more Reactors are written.

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

### `always`-before-state ordering: guarantee or implementation detail?

The ordering relies on `Signal.subtle.Watcher`'s `getPending()` returning computeds in
insertion order. This is the behavior of the TC39 `signal-polyfill`, but it is not a
formal guarantee of the TC39 Signals proposal specification. If a future implementation
changes this ordering (e.g., for optimization), FSMs built on the `always`-before-state
pattern would silently break.

Options: (a) document it as a polyfill-specific implementation guarantee and accept the
risk, (b) add an explicit mechanism to enforce ordering (e.g., `always` effects check
`status` and no-op if already transitioning), or (c) redesign to not rely on ordering
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
equality function to gate re-runs — the `deriveStatus` + `always` pattern is the direct
equivalent. The equality function's conditions map to the FSM's state conditions.

**`prevState` tracking**: `loadSegments` detects track switches by comparing
`prevState.track.id !== curState.track.id`. In the reactor model, the reactor
re-entering a state IS the "previous state" signal — state entry is the transition event.

**`SourceBufferActor`**: Already a proper actor with observable snapshot, `SerialRunner`,
and a well-defined message interface. It predates `createActor` and has not been migrated
to the factory, but the behavioral contract is equivalent. Migration would be additive.

**Actors in owners**: The video/audio actors should follow the same actors-in-owners
pattern — reactors create them, engine destroys them generically. `videoBufferActor` and
`audioBufferActor` already follow this (manually); the text track pattern formalizes it.

**Bandwidth bridge**: `loadSegments` currently writes `bandwidthState` back to shared
state via an `onSample` callback (a temporary migration artifact). The reactor model
should absorb this — the reactor observes bandwidth signals directly rather than writing
back through state.
