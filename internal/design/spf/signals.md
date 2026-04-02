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

### Lower barrier to entry

Signals have a shallower learning curve than observables, even for contributors with
little or no prior reactive programming experience. The core mental model is immediately
graspable: a signal is a value that changes over time; reading it inside a `computed()`
or `effect()` makes that computation react when the value changes.

The progression from basic to advanced is natural:
1. `signal(value)` / `signal.get()` / `signal.set(value)` — read and write a value
2. `computed(() => derive(signal.get()))` — derive new state automatically
3. `effect(() => { sideEffect(signal.get()); return cleanup; })` — react to changes
4. `untrack(() => signal.get())` — read without creating a dependency

Each step adds one concept. No prior knowledge of cold vs. hot streams, subscription
lifetime management, operator composition, or the subject/observable distinction is
required to be productive.

Observables demand more upfront. Even basic usage — a `BehaviorSubject` with a
derived observable — requires understanding `.pipe()`, `shareReplay(1)`,
`distinctUntilChanged()`, subscription lifecycle, and the difference between multicasting
and unicasting. Contributors unfamiliar with RxJS will need to internalize these idioms
before they can write or review reactive code confidently.

This is not a knock on observables — the power they provide is real. But for a framework
that needs to be readable and maintainable by a broad community of contributors, including
those coming from non-reactive backgrounds, the lower entry cost of signals is meaningful.

### Flexibility: no paradigm overhead

Signals support both reactive and imperative usage, and the two compose freely. A signal
can be written from anywhere — a DOM event handler, a Promise callback, an actor message
handler, an async Task — and read reactively inside `computed()` or `effect()`, or
imperatively via `signal.get()` outside those contexts. There is no boundary between the
two modes; they are the same API used in different contexts.

This matters in three directions:

**Authoring new behaviors**: With observables, every reactive behavior — including one-off
cases — must be expressed within the operator/pipeline paradigm. When standard operators
cover the scenario, the pipeline is elegant; when they don't, the options are creative
composition or a custom operator. Either way, the pipeline shape is non-negotiable. With
signals, a new behavior can be expressed ad-hoc in an effect body — reactive reads and
imperative writes mixed as needed — without conforming to any operator shape. Reusable
patterns can be extracted into utilities when they prove recurring (`update()` and
`teardownActors` both emerged this way), but that extraction is a choice, not a
requirement. The code without the abstraction works and reads reasonably.

**Internal actor/reactor integration**: SPF's Actors are inherently imperative —
message handlers call `setContext()`, `transition()`, and `runner.schedule()`, not
observable operators. Imperative writes to signals immediately update the reactive graph;
Reactors pick them up on the next microtask. There is no impedance mismatch at the
boundary between the actor layer and the reactive layer.

**External integration surface**: Third-party integrators and higher-level abstractions
built on SPF can interact with engine state without adopting the full reactive model.
`state.get()` reads current values imperatively; `owners.patch()` writes imperatively;
wrapping a read in `effect()` opts into reactivity. The signal is a value container first;
the reactive graph is opt-in. With observables, integration requires working within the
observable paradigm or bridging out explicitly at every boundary.

### Community validation

Discussions with engineers from adjacent projects in the streaming and playback space
reinforced this direction. Specifically:

- **Luke Curley** (Media over QUIC / MoQ) — reviewed the approach and preferred signals
  over observables, particularly after seeing the Actor/Reactor layering built on top.
- **Casey Occhialini** (Common Media Library maintainer; principal player engineer,
  Paramount) — independently preferred signals, citing readability and the lower mental
  overhead compared to RxJS-style observable pipelines.

Neither of these is a proof of correctness, but they represent relevant signal (no pun
intended) from engineers who work on similar problems and have considered both options.

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

One approach is to accept the ambient context and compensate through conventions:
`untrack()` at every non-reactive read site, comments naming effect intent, code review
attention to accidental tracking. This keeps the API surface minimal but relies on
discipline.

Another approach — more relevant to abstractions built on signals than to direct signal
usage — is to make reactive participation explicit at the API surface. An abstraction that
distinguishes "run once on entry" from "re-run reactively" in its definition shape
encodes the intent structurally, removing the need for `untrack()` in the common case.
The tradeoff is more API surface in exchange for fewer footguns. See
[actor-reactor-factories.md](actor-reactor-factories.md) for how this applies to
`createReactor` specifically.

---

## Points of Friction

### Inline computed anti-pattern

`computed()` inside an effect body creates a new `Computed` node on every re-run — no
memoization, no shared cache. This is a general signals footgun that applies anywhere
`computed()` and `effect()` are combined directly:

```typescript
// Wrong — new Computed on every effect re-run, no memoization
effect(() => {
  const trackSignal = computed(() => findSelectedTrack(state.get())); // new each time
  const track = trackSignal.get();
  // ...
});

// Correct — hoist computed to the same scope as the effect
const trackSignal = computed(() => findSelectedTrack(state.get()));
effect(() => {
  const track = trackSignal.get();
  // ...
});
```

The mistake produces incorrect behavior (no memoization, no shared cache) rather than an
error, and the incorrect code looks structurally reasonable. With observable pipelines,
the equivalent mistake (constructing a new `.pipe()` chain inside a subscription callback)
creates extra upstream subscriptions — a more visible correctness failure, easier to catch
in review.

Abstractions built on signals compound this subtly. When an abstraction hides the effect
boundary — as `createReactor` does, where each array entry in `states[S]` becomes an
`effect()` — the author does not see the `effect(() => { ... })` wrapper at the call site.
The anti-pattern is easier to miss when the reactive boundary is implicit in a definition
shape rather than explicit at the point of use.

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

This is fundamentally temporal / sequential reasoning. An RxJS-style observable version
expresses it directly:

```typescript
function trackPlaybackInitiated({ state$, owners$, events }) {
  const url$     = state$.pipe(map(s => s.presentation?.url), distinctUntilChanged());
  const element$ = owners$.pipe(map(o => o.mediaElement ?? null), distinctUntilChanged());

  return state$.pipe(
    map(s => !!s.playbackInitiated),
    distinctUntilChanged(),
    switchMap(initiated =>
      initiated
        ? // true → watch for the next qualifying reset
          merge(url$, element$).pipe(
            withLatestFrom(element$),
            filter(([, el]) => !el || el.paused),
            take(1),
            mapTo(false as const)
          )
        : // false → watch for the next play on the current element
          element$.pipe(
            switchMap(el => el ? fromEvent(el, 'play').pipe(take(1)) : EMPTY),
            tap(() => events.next({ type: 'play' })),
            mapTo(true as const)
          )
    ),
    tap(playbackInitiated => state$.next({ playbackInitiated }))
  );
}
```

`switchMap` alternates between the two subscription modes declaratively. `distinctUntilChanged`
handles change detection implicitly. `withLatestFrom` samples the current element at reset
time. `take(1)` expresses "wait for the next qualifying event" naturally. The structure of
the logic maps directly onto the structure of the code.

The current signals version must simulate the same structure with more moving parts: a
local intermediate signal as a scratch pad, closure variables (`lastPresentationUrl`,
`lastMediaElement`) that manually implement what `distinctUntilChanged` does implicitly,
and three coordinated effects whose relationships are harder to follow than a single
pipeline:

```typescript
// Local signal: written by the URL effect (false) and the play listener (true).
// undefined = not yet initialized (suppresses the merge effect on startup).
const playbackInitiated = signal<boolean | undefined>(undefined);

let lastPresentationUrl: string | undefined;
let lastMediaElement: HTMLMediaElement | undefined;

// False stream: reset on URL change or element swap.
effect(() => {
  const url = presentationUrl.get();
  const el  = mediaElement.get();
  const urlChanged = url !== lastPresentationUrl;
  const elChanged  = el  !== lastMediaElement;
  if ((urlChanged && lastPresentationUrl !== undefined) ||
      (elChanged  && lastMediaElement    !== undefined)) {
    playbackInitiated.set(false);
  }
  lastPresentationUrl = url;
  lastMediaElement    = el;
});

// True stream: set on play event.
effect(() => {
  const el = mediaElement.get();
  if (!el) return;
  return listen(el, 'play', () => playbackInitiated.set(true));
});

// Merge effect: bridge local signal → state.
effect(() => {
  const pi = playbackInitiated.get();
  if (pi === undefined) return;
  if (state.get().playbackInitiated !== pi) update(state, { playbackInitiated: pi });
});
```

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

## Effect Execution Order: Behavioral, Not Guaranteed

The TC39 Signals proposal specifies *that* effects re-run when their dependencies change;
it does not specify the *order* in which multiple effects re-run relative to one another.
Execution order among concurrent effects is an implementation detail of the scheduler, not
a formal commitment of the spec.

This matters whenever an abstraction relies on one effect running before another. The
current `core/signals/effect.ts` scheduler drains pending effects via `queueMicrotask`,
collecting dirty effects into an insertion-ordered `Set` before draining. This produces
a predictable execution order: effects registered first run first. But that is a property
of the polyfill's `Watcher` implementation and the scheduler's use of `Set` — not
something the TC39 proposal guarantees.

`createReactor` takes a load-bearing dependency on this property. The `always`-before-state
ordering guarantee — that `always` effects always run before per-state effects — is an
explicit guarantee of `createReactor`'s own API, documented in source and tested in
practice. But it depends on the underlying scheduler preserving insertion order. A future
polyfill version or native implementation that reordered effects for optimization would
silently break every Reactor FSM that relies on this ordering.

This is worth naming as a general principle: **any abstraction that requires ordered effect
execution takes an implicit dependency on the scheduler's behavioral properties, not on a
spec guarantee.** For SPF this is currently manageable — the polyfill is pinned and the
dependency is documented — but it is a constraint that would need attention if the TC39
proposal's scheduling semantics changed substantially.

---

## Future Directions

### Making reactive participation explicit at abstraction boundaries

The ambient reactive context concern — and the `untrack()` discipline it requires — is a
property of direct signal usage. Abstractions built on signals have an additional option:
encode reactive intent in their API surface, removing the burden from callers.

An abstraction that distinguishes "run once on entry" from "re-run reactively" in its
definition shape makes reactive participation a declaration rather than a runtime property
of call-site context:

```typescript
// Hypothetical: intent encoded in definition shape
states: {
  'set-up': {
    entry: [/* automatically untracked — run once */],
    reactive: [/* tracked — re-run when dependencies change */],
  }
}
```

For `createReactor`, this would make `untrack()` unnecessary in the common case of
enter-once effects, eliminate the class of bugs where accidental tracking causes unexpected
re-runs, and make the author's intent visible in the definition rather than in `untrack()`
calls buried inside effect bodies.

The principle generalizes: any abstraction built on signals can choose to make reactive
context explicit at its API boundary, trading more surface area for fewer footguns and more
readable intent. The tradeoff favors explicitness as abstraction complexity grows — the
ambient context concern that is manageable with a small number of direct `effect()` calls
becomes harder to track when effects are hidden inside a factory definition.

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
