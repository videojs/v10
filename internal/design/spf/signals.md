---
status: draft
date: 2026-04-02
---

# Observable State: Signals

Signals are the reactive substrate of SPF — the primitive on which Actors, Reactors, and
the shared state layer are all built. This document records the decision to adopt signals,
the reasoning behind it, where signals fit in the broader architecture, and an honest
accounting of the tradeoffs and friction encountered so far.

---

## The Decision

SPF uses the TC39 `signal-polyfill` as its reactive primitive, wrapped by a thin layer
in `core/signals/` (`signal()`, `computed()`, `effect()`, `untrack()`, `update()`).

This is a **committed architectural direction**, not a provisional experiment. The text
track spike (videojs/v10#1158) specifically de-risked the question of whether Actors and
Reactors can be cleanly built on top of signals — the answer is yes. There is nothing in
scope or foreseeable on the horizon that would suggest revisiting this choice.

See [primitives.md §5](primitives.md) for the conceptual framing and comparison with
observables. This document focuses on the decision, the tradeoffs, and the friction.

---

## Why Signals for SPF

### All SPF state is state-over-time

The right comparison for SPF's use of reactive state is not "signals vs. cold observables"
— it is "signals vs. `BehaviorSubject`." Every piece of state in SPF is a value that has
a current reading at any moment: selected track, buffer contents, bandwidth estimate,
current time, MediaSource ready state. None of these are naturally modeled as cold,
lazy streams.

Once you commit to `BehaviorSubject` everywhere, you've given up the main ergonomic
advantages of observables (cold, lazy, composable pipelines) while keeping the main costs:
explicit `shareReplay(1)` for caching derived state, `distinctUntilChanged()` for
filtering, `tap()` as the side-effect idiom, and manual subscription management.

Signals give you the same "always has a current value" guarantee as `BehaviorSubject`,
with automatic dependency tracking for derived state and a cleaner model for side effects.

### Automatic dependency tracking

`computed()` derives new state with automatic dependency tracking and built-in caching —
no explicit wiring of dependencies, no `shareReplay(1)`. Two `computed()` calls that read
the same signals share their cache when they share the reference; defining the computed
once and passing the reference around is the natural pattern.

With `BehaviorSubject`, a derived observable requires explicit `.pipe(shareReplay(1))` to
cache, and a duplicated `.pipe()` chain creates multiple upstream subscriptions — a
correctness concern, not just an efficiency one. The signals equivalent of the same mistake
(a `computed()` defined inside an effect body) is only an efficiency concern (redundant
recomputation, no shared cache). Both mistakes should be avoided; only one of them silently
creates extra subscriptions.

### Scheduling control

The TC39 Signals proposal separates "a signal became dirty" from "an effect re-runs"
via the `Signal.subtle.Watcher` API, leaving scheduling entirely to the caller. SPF's
`effect()` uses `queueMicrotask` as its scheduler — effects are deferred to the next
microtask checkpoint, batching all synchronous writes made in a single turn.

This scheduling control is what makes the `always`-before-state ordering guarantee in
`createReactor` possible. The effect scheduler drains pending computeds in an
insertion-ordered `Set`, so registration order determines execution order.

---

## Three Roles in SPF's Architecture

Signals do three distinct jobs in SPF simultaneously. This is a deliberate design choice
rather than an accident — it means contributors learn one primitive and apply it at every
layer.

```
signal-polyfill  (TC39 proposal implementation)
      ↓ wrapped by
core/signals/    signal(), computed(), effect(), untrack(), update()
      ↓ used as

1. Shared state substrate
   PlaybackEngineState  — signal<S>  (presentation, tracks, bandwidth, ...)
   PlaybackEngineOwners — signal<O>  (mediaElement, actors, buffers, ...)

2. Reactor execution model
   createReactor() — always[] and states[][] each become effect() calls
   Transitions fire when a computed signal changes and an always monitor detects it

3. Actor observability
   createActor() — snapshot is a signal<{ status, context }>
   Reactors and the engine observe Actor state without polling or callbacks
```

The tight coupling across all three roles is also the source of the reactive context
tension described below. When signals are doing everything, the signal context is
everywhere — and so is the possibility of accidental tracking.

---

## The Reactive Context Tension

This is the most fundamental tradeoff of the signals model, and the one most worth
understanding clearly.

With **observables**, reactive context is **syntactic**. You explicitly construct a
pipeline. Reading a value inside a `.pipe()` chain is visibly different — in the code,
structurally — from reading a value imperatively. There is no ambiguity about whether
you are subscribing.

With **signals**, reactive context is **ambient**. Whether a read creates a reactive
dependency depends on what is wrapping the call at runtime — not on the call itself.
`signal.get()` inside an `effect()` or `computed()` creates a tracked dependency.
The same `signal.get()` outside those contexts, or inside `untrack()`, does not.
**The call site looks identical either way.**

This has two compounding consequences:

**For authors:** At every signal read inside an effect, you must actively decide: "do I
want this read to be tracked?" Enter-once effects need `untrack()` for reads that are
setup-only. Reactive-within-state effects should track intentionally. Nothing in the API
surface distinguishes these intentions — `untrack()` is a manual opt-out from the ambient
reactive context. Forgetting it produces unexpected re-runs; misusing it produces effects
that stop reacting when they should.

**For readers:** Understanding an effect's actual reactive dependencies requires reading
it carefully and identifying which signal accesses are inside or outside `untrack()`.
The structure gives no syntactic signal of intent. A read that drives re-runs looks
the same as a read that merely samples the current value.

This is a **fundamental tradeoff** of the ambient reactive context model, not a tooling
gap. The observable model makes reactive participation explicit at the cost of pipeline
ceremony. The signal model makes reactive participation implicit at the cost of requiring
discipline (and footgun risk) at every read site.

SPF's current answer: **accept the ambient context, compensate through conventions.**
The conventions are:
- `untrack()` at every enter-once read inside an effect
- Naming effect intent in comments (`// tracked — re-run on change`, `// untrack: ...`)
- The `always` array for reactive condition monitors vs. per-state effects for state-scoped work
- Code review attention to accidental tracking

A future API improvement would encode some of this intent structurally — an `entry` /
`reactive` distinction in the `createReactor` definition shape — so that enter-once
effects are automatically untracked and the distinction is visible in the definition
rather than in the effect body. See [actor-reactor-factories.md](actor-reactor-factories.md).
That improvement would address the "enter-once" category but not the broader ambient
context concern for reactive-within-state effects.

---

## Points of Friction

### Inline computed anti-pattern

`computed()` inside an effect body creates a new `Computed` node on every re-run — no
memoization, no shared cache. `Computed`s that gate effect re-runs must be hoisted outside
the effect body, typically at the factory function scope before `createReactor()`.

```typescript
// Wrong — new Computed on every effect re-run
states: {
  'monitoring-for-loads': [() => {
    const trackSignal = computed(() => findSelectedTrack(state.get())); // new each time
    const track = trackSignal.get();
    // ...
  }]
}

// Correct — hoist to factory scope
const trackSignal = computed(() => findSelectedTrack(state.get()));
createReactor({ states: { 'monitoring-for-loads': [() => {
  const track = trackSignal.get();
  // ...
}] } });
```

This mistake is uniquely hard to detect because it produces incorrect behavior (no
memoization) rather than an error, and the incorrect code looks structurally reasonable.
With observable pipelines, the equivalent mistake (a new `.pipe()` chain inside a
subscription) creates extra upstream subscriptions — a more visible correctness failure.

---

### No native `distinctUntilChanged`

`computed()` propagates updates whenever its dependencies change, unless you provide a
custom `equals` comparator. For derived values that return objects or arrays — where
reference equality is too strict — you need to define `equals` explicitly:

```typescript
const modelTextTracksSignal = computed(() => getModelTextTracks(state.get().presentation), {
  equals(prev, next) {
    if (prev === next) return true;
    if (prev?.length !== next?.length) return false;
    return !!next?.every(t => prev?.some(p => p.id === t.id));
  }
});
```

Forgetting `equals` produces spurious effect re-runs whenever the presentation changes,
even when the track set is logically unchanged. There is no warning — just unexpected
behavior. The custom equality function is also a recurring pattern that should be
factored into a generic utility.

---

### `update()` and deep object spreading

The `update()` helper does shallow merging via `Partial<T>`. For deeply nested context
objects — like `TextTracksActor.context`, which holds `Record<string, CueRecord[]>` per
track — updating a single entry requires nested spreading:

```typescript
setContext({
  ...context,
  loaded: {
    ...context.loaded,
    [trackId]: [...existingCues, ...prunedCues],
  },
});
```

This is verbose, error-prone for deeply nested structures, and feels inelegant. No
general solution has been identified yet. The directions worth exploring: structural
sharing utilities (`updateIn(context, path, updater)`), finer-grained signal decomposition
(one signal per field instead of one signal for a whole object), or an Immer-style
`produce()` pattern for immutable updates. For now, this remains a known cost.

---

### Event-sequence patterns

Signals are a weaker fit when the logic is "react to events in sequence" rather than
"react to the current value of state." The distinction is subtle but real: state-over-time
has a current value that you can read and derive from; an event sequence is about what
happened, in what order, relative to other events.

`trackPlaybackInitiated` is the clearest current example. Its logic is:

> *When not initiated:* listen for the next `play` event on the current element.  
> *When initiated:* listen for the next qualifying reset — url changes, or element swaps
> while paused.

This is fundamentally temporal / sequential reasoning. The Observable equivalent uses
`switchMap` to alternate between two subscription modes, `fromEvent` for the play
listener, `distinctUntilChanged` for change detection, and `withLatestFrom` to sample
current values at event time. These operators compose naturally because they were designed
for event-sequence reasoning.

The signals version must simulate the same structure imperatively: a local intermediate
signal as a scratch pad, closure variables (`lastPresentationUrl`, `lastMediaElement`) to
manually implement change detection, and multiple coordinated effects that are harder to
follow than a single pipeline.

Migrating `trackPlaybackInitiated` to a Reactor would improve legibility — Reactor
states name the two modes explicitly, Reactor context formalizes the "previous value"
storage, and the entry-reset pattern handles cleanup clearly. But the fundamental gap
remains: **signals give you the current value of a thing; they do not give you "did this
value just change since the last time I asked."** Temporal comparison requires storing
the previous value yourself — in context, closure, or otherwise. `distinctUntilChanged`
handles this implicitly; signals require explicit housekeeping.

SPF's surface area for event-sequence patterns is small (nearly everything is
state-over-time). Where these patterns appear, the Reactor abstraction is the recommended
home — it provides the right structure, even if it can't fully match the ergonomics of
a composed observable pipeline.

---

## TC39 and Polyfill Risks

### API stability

The TC39 Signals proposal is at Stage 1 and may evolve. This is acknowledged but is not
a major risk in practice. SPF references the polyfill only through the `core/signals/`
module boundary — a breaking API change in the polyfill would require updating fewer than
50 lines of wrapper code. Options remain open: freeze the polyfill version, diverge from
it, or replace it with a minimal hand-rolled implementation if needed.

Major breaking changes to the core `Signal.State` / `Signal.Computed` / `Watcher` API
surface are unlikely given the proposal's direction, but even if they occurred, the module
boundary contains the blast radius.

### Bundle size and complexity

The more significant risk is if the polyfill grows substantially in size or complexity —
either because the proposal grows in scope, or because conformance requirements expand.
This is harder to hedge against architecturally. It would need to be addressed by
evaluating alternatives (minimal hand-roll, alternative polyfill) at the time.

---

## The `always`-Before-State Ordering: A Polyfill Dependency

The `createReactor` ordering guarantee — `always` effects run before per-state effects —
is load-bearing for all Reactor FSMs. It depends on the `Signal.subtle.Watcher`
implementation returning pending computeds in insertion order, and on the effect scheduler
draining them into an insertion-ordered `Set`.

This is the behavior of the current `signal-polyfill`. It is **not a formal guarantee of
the TC39 proposal specification**. If a future polyfill version or native implementation
chose to deliver pending computeds in a different order (e.g., for optimization), all
Reactor FSMs that rely on `always`-before-state ordering would silently break.

This is worth naming as a known dependency: SPF's Reactor model is correct as implemented,
but correctness depends on a behavioral property of the polyfill, not on a spec guarantee.

---

## Future Directions

### `entry` vs. `reactive` in `createReactor` definition shape

The most impactful near-term improvement would be distinguishing enter-once effects from
reactive-within-state effects in the definition itself:

```typescript
states: {
  'set-up': {
    entry: [/* automatically untracked — run once on state entry */],
    reactive: [/* tracked — re-run when dependencies change */],
  }
}
```

This would make intent visible in the definition, eliminate the class of bugs where an
enter-once effect accidentally tracks a signal, and remove the need for `untrack()` in
the common case. It would not fully resolve the ambient reactive context concern for
reactive effects, but it would address the most frequent footgun.

### Structured update utilities

A `updateIn(signal, path, updater)` or Immer-style `produce()` utility would address the
deep-spreading verbosity for nested context objects. This is a well-understood problem
with a clear solution space; the right answer depends on how frequently deeply nested
mutations appear as more Actors are written.

### Finer-grained signal decomposition

Where context objects have independent fields that update at different rates, splitting
one large signal into multiple per-field signals would reduce the blast radius of each
write — fewer effects would re-run on any given change. The tradeoff is more signals to
manage and coordinate. Worth evaluating once more Actor context shapes are established.
