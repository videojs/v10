---
status: draft
date: 2026-05-07
---

# Reactors

> **Reactors are signal-consumers for finite-state-machine work**: observe one or more signals, derive a current state, run state-specific effects, and clean up on state exit. The canonical factory is `createMachineReactor`. This doc covers *when to reach for a Reactor* and the patterns that come with it; for the implementation see [`../primitives.md`](../primitives.md), [`../actor-reactor-factories.md`](../actor-reactor-factories.md), and [`packages/spf/src/core/reactors/create-machine-reactor.ts`](../../../../packages/spf/src/core/reactors/create-machine-reactor.ts).

## When to reach for a Reactor

A Reactor is the right shape when **all** of these are true:

- The work has distinct *states* — at least two, often more.
- Each state has its own behavior: different effects to run, different derivations from input signals, different teardown.
- You're observing-and-reacting, no resource ownership. For owned resources whose lifecycle includes message-driven serial work, reach for an Actor (see `behaviors.md` "Simple vs primitive-augmented").

If you find yourself writing nested `effect` calls gated by flag-shaped `computed` signals (`canSetup`, `shouldX`, `isAttached`), you're hand-rolling a state machine — `createMachineReactor` is the answer. See `behaviors.md` "fight-the-shape" sniffs.

## The `deriveState` + `monitor` convention

The recurring shape across SPF reactor-using behaviors (`resolve-presentation`, `resolve-track`, `load-text-track-cues`, `track-playback-initiated`, `sync-text-tracks`):

```ts
const deriveState = (state, /* possibly other inputs */): StateName => { ... };

const derivedStateSignal = computed(() => deriveState(/* ... */));

return createMachineReactor({
  initial: '...',
  monitor: () => derivedStateSignal.get(),
  states: { ... },
});
```

Why a separate `deriveState` + `derivedStateSignal`:

- **Testability**: `deriveState` is pure given its inputs; tests don't need to construct a reactor.
- **Stable identity**: the `monitor` callback identity matters for the reactor's tracking; reading a stable computed avoids re-creating closures.
- **Composability**: other code can read `derivedStateSignal` independently if needed.

When the derivation is trivial (one or two terms), inline it in `monitor` directly. The recurring shape is a separate function once it has more than the two-state-from-one-predicate case.

## Transition-driven vs state-driven work

Per-state behavior comes in two shapes; choosing between them is a primary design decision when structuring a Reactor:

- **Transition-driven** (`entry`) — work that fires *once* when the state is entered, with an optional cleanup that fires once on state exit. The body runs untracked; signal changes inside the state don't re-fire the entry. Use when the work is "do X at the moment of becoming this state."
- **State-driven** (`effects`) — work that fires on state entry *and* re-runs whenever signals read inside it change. Each `effects` array entry becomes its own `effect()` gated on the active state. Use when the work is "while we're in this state, react to inner signal changes."

Concrete examples:

| Work | Transition or state? | Where to put it |
| ---- | -------------------- | --------------- |
| Pick a default selection on entering 'resolved' | **Transition** | `entry` — fires once per entry; doesn't re-fire as other slots change. |
| Clear stale selection on entering 'unresolved' | **Transition** | `entry` |
| Schedule a fetch task that updates as `selectedTrackId` changes | **State** | `effects` — re-runs when the tracked id changes. |
| Subscribe to DOM events while in 'playing' | **Transition** | `entry` — register on entry, return unsubscribe; cleanup on exit. |
| Re-derive a "should buffer" decision from `currentTime` | **State** | `effects` — re-runs as currentTime ticks. |
| Abort in-flight async work on leaving the active state | **Transition** (cleanup) | `entry: () => () => abort()` |

The most common mistake is using `effects` for transition-driven work. The body looks the same in both cases — a function that does some work — but `effects` will re-fire on every signal change inside, producing spurious re-runs. If you find yourself adding `if (alreadyDoneThisOnce) return` guards inside an `effects` body, that's a sniff that the work is transition-driven and belongs in `entry`.

The dual mistake — using `entry` for state-driven work — is rarer because entry's untracked body fails fast: the work just doesn't react to signal changes, and the omission is usually obvious in testing.

## The entry-returns-state-exit-cleanup idiom

`entry: () => () => cleanup()` looks opaque. It's:

- **Outer arrow**: the entry function. Runs once on state entry.
- **Inner arrow**: the cleanup function the entry returns. Runs once on state exit.

This is how state-scoped resource cleanup binds to the state machine. Common uses:

- **Aborting in-flight async work**: `entry: () => () => runner.abortAll()` on a state that schedules tasks (see [Source-identity states](#source-identity-states-for-source-driven-work)).
- **Tearing down resources owned per-state**: `entry: () => { const ms = createMediaSource(); return () => detach(ms); }`.
- **Disposing event listeners**: `entry: () => { const c = new AbortController(); listen(el, 'click', fn, { signal: c.signal }); return () => c.abort(); }`.

If the entry has setup work to do beyond registering cleanup, the body runs inline:

```ts
entry: () => {
  // setup work
  return () => /* teardown */;
},
```

The double-arrow form is the minimal case where there's no setup work — just teardown registration.

`entry`'s cleanup runs *only on state exit*. This is distinct from `effects` cleanups, which run *between effect re-runs* (within the state) *and* on state exit. For exit-only behavior, use `entry`. For per-effect-re-run cleanup (e.g., re-attaching a listener as a signal changes), use the cleanup return from `effects`.

### Bind cleanup to its setup, not to the next state's entry

When state X's entry "does Y" and the inverse "undoes Y" should fire on state exit, **return the cleanup from X's entry**. Don't define the undo as the *next* state's entry. The latter form is *almost* mechanically equivalent but has two real downsides:

- **Cohesion**: a reader has to look at two states to understand a single logical operation. The setup is in one entry; the teardown is in another state's entry. Operations and their cleanups belong together.
- **Destroy correctness**: a reactor's destroy transitions `current → 'destroying' → 'destroyed'` *without* passing through arbitrary intermediate states. If state X's cleanup is expressed as state Y's entry, destroying mid-X never enters Y, so the cleanup is missed. The entry-returns-cleanup form fires on *any exit from X*, including via destroy.

Concrete example: `select-tracks` enters `'resolved'` to pick a default and clears the selection on exit. Both belong in `'resolved'.entry`:

```ts
states: {
  unresolved: {},
  resolved: {
    entry: () => {
      // setup: pick default if not already selected
      if (!state[selectedKey].get()) {
        const id = picker(state.presentation.get());
        if (id) state[selectedKey].set(id);
      }
      // cleanup: runs on src unload (resolved → unresolved) and on
      // behavior destroy (resolved → destroying → destroyed)
      return () => state[selectedKey].set(undefined);
    },
  },
},
```

Splitting the clear into `unresolved.entry` would work for the src-unload path but silently miss the destroy path.

### Cleanup as state-machine invariant — when the canonical rule has an exception

The "bind cleanup to its setup" rule above assumes a 1:1 setup-cleanup relationship: one state owns the operation, that state's entry returns its inverse, and the cleanup binds to *that operation's* exit.

It breaks down when the slot's **valid lifespan covers multiple FSM states**. If states X and Y both represent "the slot has a meaningful value" (and only state Z represents "empty"), then there's no single state to bind the clear to: putting it on `X.entry`'s return fires (incorrectly) on every `X → Y` transition and vice versa.

In that case, the clear isn't the cleanup of a specific setup — it's the **invariant of the empty state**. Encode it as `Z.entry` directly:

```ts
states: {
  emptySlotState: {
    entry: () => state.theSlot.set(undefined),  // state invariant
  },
  validStateA: { entry: () => { /* setup if needed */ } },
  validStateB: { entry: () => { /* setup if needed */ }, effects: [/* ... */] },
}
```

This is *almost* the "splitting the clear into `unresolved.entry`" form the canonical rule warns against — but the framing is different. The canonical warning targets cases where one state owns a setup and the inverse logically pairs with it; the inverse should travel with the setup. Here, no single non-empty state owns the slot's setup — both valid states share custodianship of the slot's "valid" invariant — so there's no setup-cleanup pair to keep cohesive in the first place. The clear is the empty state's job, not a setup's cleanup.

**Trade-offs accepted under this pattern**:

- **Destroy doesn't clear**. Destroy goes `current → 'destroying' → 'destroyed'`, bypassing `emptySlotState`. The slot retains its last value post-destroy. Acceptable when (a) downstream consumers don't depend on post-destroy clear (typical — composition teardown releases the signals anyway), or (b) the slot's last value is meaningful enough that retaining it post-destroy is fine or preferable.
- **Initial-entry clear is unconditional**. If `emptySlotState` is the initial state, the clear fires on setup. Pre-seeded values get clobbered. Usually fine — for a slot whose value refers to something inside a not-yet-resolved structure, the pre-seeded value can't be valid anyway.
- **Cohesion split**. Set in valid-state entries, clear in empty-state entry. Worth a code comment explaining the slot-invariant framing so the next reader doesn't "fix" it back to the canonical form.

**When to reach for this carve-out**:

1. The slot's lifecycle is the structural concern of the FSM (not just an incidental side effect of one state's work).
2. The FSM has multiple non-empty states that share the slot's "valid" invariant — at least two states where the slot may be set.
3. Destroy-clear is acceptably moot for this slot.

If your FSM can be reshaped so the slot's valid lifespan is one state, the canonical "bind cleanup to its setup" form is preferred. Reach for this carve-out only when the multi-state slot lifespan is structurally unavoidable.

**Worked example**: `quality-switching.ts` (after the `selectVideoTrack` merge). The behavior owns `selectedVideoTrackId`; the slot is meaningful in both `'disabled'` (manual selection in play) and `'evaluating'` (ABR active). Clearing on `'evaluating'.entry`'s return would clobber the selection on every `abrDisabled` toggle. The canonical rule cannot apply cleanly. The clear lives in `'preconditions-unmet'.entry` as the empty state's invariant.

A future refactor (separating manual selection from ABR selection via a `manualVideoTrackId` / `abrVideoTrackId` split) would collapse the FSM back to two states (`'preconditions-unmet'` ↔ `'evaluating'`), restoring the canonical cleanup-binds-to-setup pattern. The carve-out is the right answer for the *current* shape, not a permanent preference.

## Source-identity states for source-driven work

Pattern for behaviors that schedule async work tied to an external source. The canonical playback case is `state.presentation`:

```ts
const derivedStateSignal = computed(() =>
  isResolvedPresentation(state.presentation.get()) ? 'resolving' : 'unresolved'
);

return createMachineReactor({
  initial: 'unresolved',
  monitor: () => derivedStateSignal.get(),
  states: {
    unresolved: {},
    resolving: {
      entry: () => () => runner.abortAll(),
      effects: [/* schedule tasks against runner */],
    },
  },
});
```

The 'unresolved' ↔ 'resolving' transitions encode source-identity changes. Source resets (URL change, source cleared) drive the reactor through 'unresolved'; the `entry` exit-cleanup aborts in-flight tasks. Internal updates within the same source (e.g., segments added by sibling tasks) preserve the state and don't disturb in-flight work.

Source-change cancellation binds to the state machine **structurally** — there's no closure-state tracking "what was the prior source id." See `setupTrackResolution` in `packages/spf/src/playback/behaviors/resolve-track.ts` for the canonical worked example. See also `behaviors.md` → Source-reset handling for the broader concern.

## Reading non-tracked signals inside effects

Inside a per-state effect, the reactor's `monitor` already tracks the source-identity signal at the state-machine level. Tracking it again inside the effect creates redundant re-runs on every internal update. Use [`peek(signal)`](signals.md) to read the current value without subscribing:

```ts
effects: [
  () => {
    const trackId = state[selectedKey].get();      // tracked
    const presentation = peek(state.presentation); // not tracked — state machine handles relevant changes
    if (!presentation || !trackId) return;
    // ...
  },
],
```

The effect re-runs on state entry and when *its* tracked signals change. `peek` is sugar for `untrack(() => signal.get())`.

When *not* to use `peek` inside an effect: when you need the effect to re-run as that signal changes (mid-state). For source-identity-driven work, the state machine handles those transitions, so `peek` is correct.

## Anti-patterns

- **Reaching for a Reactor when an `effect` would do.** If the work is single-shape signal-driven mirroring (no states), an `effect` is simpler. The threshold: if you have only one branch of behavior and no per-state cleanup distinction, you don't need a state machine.
- **Inlining a non-trivial `deriveState` directly in `monitor`.** Hurts testability and re-creates closures. Trivial inline derivations are fine; multi-line derivations want their own function.
- **Hand-rolled FSM via `computed` flags + nested effects** when `createMachineReactor` was the answer. (See `behaviors.md` fight-the-shape sniffs.)
- **Tracking a source signal again inside per-state effects** when the reactor's `monitor` already tracks it. Use `peek` for non-state reads inside the state.
- **Putting state-exit cleanup in an `effects` callback's return** instead of `entry`'s return. `effects` cleanups run between effect re-runs *and* on state exit. If you want exit-only behavior, put it in `entry`.
- **Putting an operation's cleanup in a different state's `entry`** instead of returning it from the operation's own `entry`. Mechanically *almost* equivalent for normal transitions, but fragments the operation across two states (cohesion loss) and silently misses the destroy path (destroy goes `current → 'destroying' → 'destroyed'` without passing through arbitrary intermediate states). See [Bind cleanup to its setup](#bind-cleanup-to-its-setup-not-to-the-next-states-entry).
- **State-scoped closure mutable state** (`let lastFoo`) instead of expressing the state in the state machine. The reactor *is* the state — adding parallel mutable closure state is double-bookkeeping.
- **Calling `effect()` inside `entry`'s body** to do state-driven work. Use the `effects:` array — bypassing it hand-manages a lifecycle the reactor was designed to handle. The failure mode is invisible at the test level (both forms produce the same observable behavior), which is why the anti-pattern needs explicit doc coverage. If a reviewer sees `effect(...)` inside an `entry` body, that's a sniff that the work belongs in `effects:` instead.
- **Helpers with conditional branches around optional state-scoped work**, e.g. `const cleanup = optionEnabled ? doOptionalThing() : undefined;` inside the helper's `entry`. The helper is now parameterized by something it shouldn't know about — the optional sub-concern leaks into the lifecycle helper's contract. Better: the helper accepts the work (or doesn't) from the variant; variants compose what they need without the helper having to handle the optional case. (Specific composition shape TBD per-case — what matters is that the helper doesn't carry the conditional.)
