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

**Single-positive-state reactors** are a legitimate degenerate case for the lightest verb shape ("set X when Y resolves") when the four band criteria in [`behaviors.md` → "Where both shapes are legitimate"](behaviors.md#where-both-shapes-are-legitimate-the-light-reactor--simple-effect-band) hold. A reactor with one positive state and `entry`-only handlers can be the right answer over a guarded `effect()` when lifecycle naming and structural state-exit cleanup are load-bearing for sibling consistency or future-state headroom. If neither is load-bearing, the simple-effect form is also legitimate — pick by local factors.

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

**Default to extracting** — every reactor-using behavior in the codebase (`resolve-track`, `sync-text-tracks`, `track-playback-initiated`, `resolve-presentation`, `load-text-track-segments`) uses the `derivedStateSignal` form. Inline `monitor` is only correct for the narrowest case: a single direct signal read with no conjuncts, e.g. `monitor: () => state.foo.get() ? 'on' : 'off'`. As soon as the derivation involves two predicates, a helper function call, or any composition, extract to `derivedStateSignal` — the stable-identity and testability wins outweigh the small body-saving, and matching the sibling shape is load-bearing for grep-ability.

## Transition-driven vs state-driven work

Per-state behavior comes in two shapes; choosing between them is a primary design decision when structuring a Reactor:

- **Transition-driven** (`entry`) — work that fires *once* when the state is entered, with an optional cleanup that fires once on state exit. The body runs untracked; signal changes inside the state don't re-fire the entry. Use when the work is "do X at the moment of becoming this state."
- **State-driven** (`effects`) — work that fires on state entry *and* re-runs whenever signals read inside it change. Each `effects` array entry becomes its own `effect()` gated on the active state. Use when the work is "while we're in this state, react to inner signal changes."

Concrete examples:

| Work | Transition or state? | Where to put it |
| ---- | -------------------- | --------------- |
| Pick a default selection on entering `'presentation-resolved'` | **Transition** | `entry` — fires once per entry; doesn't re-fire as other slots change. |
| Clear stale selection on entering `'presentation-unresolved'` | **Transition** | `entry` |
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

### Effects-based cleanup for within-state identity changes

`effects`-based cleanup is the right tool — not an anti-pattern — when the cleanup should fire on *both* state exit *and* within-state identity changes that the state machine can't transition through.

The motivating case: a state machine where the positive state is gated on `signal.truthy()` rather than `signal.value`. A change from `value_a` to `value_b` (both truthy) doesn't transition the state machine — `deriveState` returns the same state — but downstream effects bound to the old value still need cleanup.

`trackLoadTriggers` is the worked example. The positive state `'load-active'` is entered when `mediaElement + presentation.url + loadActivated` are all truthy. A URL-identity swap `url_a → url_b` (both truthy) doesn't transition the state, but `loadActivated` should reset for the new source:

```ts
'load-active': {
  // effects (not entry) so the cleanup fires on within-state identity
  // change in addition to state exit. The tracked reads make the effect
  // re-fire on either URL or element identity change; the cleanup writes
  // loadActivated = false → deriveState returns 'monitoring' → state
  // transitions and re-attaches listeners for the new source.
  effects: () => {
    context.mediaElement.get();
    state.presentation.get()?.url;
    return () => state.loadActivated.set(false);
  },
},
```

The mechanism only closes when `deriveState` also reads the slot — see [Slot-driven state derivation](#slot-driven-state-derivation) below. Without that link, the cleanup writes the slot but no state transition follows.

The combinatorial advantage: state-exit *and* within-state identity change get the same cleanup, expressed once. The dual mistake — putting this in `entry` because exit-cleanup-in-entry is the usual convention — would leave URL/element-identity changes within `'load-active'` unhandled.

### Slot-driven state derivation

`deriveState` reading a slot the behavior writes is *not* double-bookkeeping when the slot IS the canonical externally-observable state of the concern.

Distinguish from the [state-scoped closure mutable state](#anti-patterns) anti-pattern: closure-state is *parallel* to the state machine (the reactor IS the state, plus some `let lastFoo` next to it — two things claiming to be the truth). Slot-driven derivation has *one* canonical truth (the slot, observable to other behaviors and the API surface); the state machine simply observes it alongside other inputs to gate per-state work.

When applicable: the behavior writes a slot in response to events, the slot has external observers (other behaviors, adapter writes, the API surface), and the per-state effects/cleanup structure helps express the contract.

`trackLoadTriggers` is the worked example. The slot `loadActivated` drives the `'monitoring'` ↔ `'load-active'` transition:

```ts
function deriveState(presentation, mediaElement, loadActivated) {
  if (!mediaElement || !presentation?.url) return 'preconditions-unmet';
  if (loadActivated) return 'load-active';
  return 'monitoring';
}
```

The behavior writes the slot (from DOM events or external writers); `deriveState` reading the slot is observing the same canonical truth from the other side. This pattern pairs naturally with [effects-based cleanup for within-state identity changes](#effects-based-cleanup-for-within-state-identity-changes) — the cleanup writes the slot, the slot drives `deriveState`, the state transitions, and the next state's setup re-attaches for the new source.

### Bind cleanup to its setup, not to the next state's entry

When state X's entry "does Y" and the inverse "undoes Y" should fire on state exit, **return the cleanup from X's entry**. Don't define the undo as the *next* state's entry. The latter form is *almost* mechanically equivalent but has two real downsides:

- **Cohesion**: a reader has to look at two states to understand a single logical operation. The setup is in one entry; the teardown is in another state's entry. Operations and their cleanups belong together.
- **Destroy correctness**: a reactor's destroy transitions `current → 'destroying' → 'destroyed'` *without* passing through arbitrary intermediate states. If state X's cleanup is expressed as state Y's entry, destroying mid-X never enters Y, so the cleanup is missed. The entry-returns-cleanup form fires on *any exit from X*, including via destroy.

Concrete example: `select-tracks` enters `'presentation-resolved'` to pick a default and clears the selection on exit. Both belong in `'presentation-resolved'.entry`:

```ts
states: {
  'presentation-unresolved': {},
  'presentation-resolved': {
    entry: () => {
      // setup: pick default if not already selected
      if (!state[selectedKey].get()) {
        const id = picker(state.presentation.get());
        if (id) state[selectedKey].set(id);
      }
      // cleanup: runs on src unload (presentation-resolved →
      // presentation-unresolved) and on behavior destroy
      // (presentation-resolved → destroying → destroyed)
      return () => state[selectedKey].set(undefined);
    },
  },
},
```

Splitting the clear into `'presentation-unresolved'.entry` would work for the src-unload path but silently miss the destroy path.

## Source-identity states for source-driven work

Pattern for behaviors that schedule async work tied to an external source. The canonical playback case is `state.presentation`:

```ts
const derivedStateSignal = computed(() =>
  isResolvedPresentation(state.presentation.get())
    ? 'presentation-resolved'
    : 'presentation-unresolved'
);

return createMachineReactor({
  initial: 'presentation-unresolved',
  monitor: () => derivedStateSignal.get(),
  states: {
    'presentation-unresolved': {},
    'presentation-resolved': {
      entry: () => () => runner.abortAll(),
      effects: [/* schedule tasks against runner */],
    },
  },
});
```

The `'presentation-unresolved'` ↔ `'presentation-resolved'` transitions encode source-identity changes. Source resets (URL change, source cleared) drive the reactor through `'presentation-unresolved'`; the `entry` exit-cleanup aborts in-flight tasks. Internal updates within the same source (e.g., segments added by sibling tasks) preserve the state and don't disturb in-flight work.

Source-change cancellation binds to the state machine **structurally** — there's no closure-state tracking "what was the prior source id." See `setupTrackResolution` in `packages/spf/src/playback/behaviors/resolve-track.ts` for the canonical worked example. See also `behaviors.md` → Source-reset handling for the broader concern.

## Policy modes as states (replace hand-rolled input-tuple dedup)

Pattern for dispatcher reactors that send messages to a downstream consumer (actor, runner, side-effecting sink) under a small set of discrete *policy modes* — modes that change *what* the dispatcher sends, or *whether* it sends anything at all, on top of finer-grained signal-driven refinements within each mode.

The sniff: a single `effect()` reads N signals, packs them into a `currentInputs` tuple, compares against a closure-held `prevInputs`, and branches on the current values to decide whether to fire and which message shape to send. The equality function inevitably grows nested `if (mode === X) { ... } else if (...)` clauses — that's the hand-rolled state machine asking to become a real one.

Each policy mode becomes a reactor state. State transitions handle mode flips; tracked signal reads inside `effects:` handle within-mode refinements; signal-polyfill's `Object.is` dedup on a `computed` handles within-mode noise that shouldn't re-fire (e.g., `currentTime` ticks that don't cross a meaningful boundary).

### Canonical worked example: `loadTextTrackSegments`

Three policy modes for text-track segment fetching: `'preconditions-unmet'` (no loader actor / no resolved track), `'dormant'` (`!loadActivated && preload !== 'auto'`), `'full-range'` (`loadActivated || preload === 'auto'`).

```ts
const derivedStateSignal = computed<LoadTextTrackSegmentsState>(() => {
  if (!context.textTrackSegmentLoaderActor.get() || !selectedTrackSignal.get()) {
    return 'preconditions-unmet';
  }
  return state.loadActivated.get() || state.preload.get() === 'auto'
    ? 'full-range'
    : 'dormant';
});

// `segmentStartForTime` returns the same number while `currentTime` stays
// inside one segment, so signal-polyfill's `Object.is` equality on this
// computed dedups within-segment ticks. The `'full-range'` effect tracks
// this signal (rather than `currentTime` directly) so it only re-fires on
// boundary crossings.
const segmentBoundarySignal = computed(() => {
  const track = selectedTrackSignal.get();
  if (!track) return undefined;
  return segmentStartForTime(state.currentTime.get() ?? 0, track.segments);
});

return createMachineReactor<LoadTextTrackSegmentsState>({
  initial: 'preconditions-unmet',
  monitor: () => derivedStateSignal.get(),
  states: {
    'preconditions-unmet': {},
    dormant: {},
    'full-range': {
      effects: () => {
        const track = selectedTrackSignal.get()!;
        segmentBoundarySignal.get();          // tracked: boundary crossings
        const currentTime = peek(state.currentTime) ?? 0;
        peek(context.textTrackSegmentLoaderActor)!.send({ type: 'load', track, currentTime });
      },
    },
  },
});
```

What the encoding accomplishes:

| Concern | Old (hand-rolled) | New (state-encoded) |
| ------- | ----------------- | ------------------- |
| Mode flip (`preload`, `loadActivated`) fires once | `prevInputs.preload !== cur.preload \|\| ...` branch in equality fn | State transition; new state's `entry`/`effects` fires once on entry |
| Within-mode track change re-fires | tracked read inside the flat effect; equality compares `track.id` | tracked `selectedTrackSignal.get()` inside the state's `effects:` re-fires |
| Within-mode boundary crossing re-fires; tick noise doesn't | tracked `currentTime.get()` + `segmentStartForTime(prev, cur)` in equality fn | `segmentBoundarySignal` (a `computed` over `segmentStartForTime(currentTime, segments)`) — signal-polyfill's `Object.is` dedups the unchanged boundary value |
| Dormant means "don't fire" | early-return inside the effect after the equality check passes | `'dormant'` state has no `effects:` — nothing fires structurally |
| Message shape varies by mode | branching `if (fullMode) loader.send({range, ...}) else loader.send({...})` inside the effect | each state's `effects:` constructs its own message |

The `prevInputs` closure variable, the custom equality function, and the "did the inputs actually change in a way worth firing for?" branching all dissolve. What remains is per-state effects that read exactly the signals their mode cares about.

### When this pattern applies

The pattern fits when *all* of these hold:

- The dispatcher has a small, fixed set of *discrete* policy modes (typically 2–4) — `'dormant'` / `'metadata-only'` / `'full-range'` are mode names; a continuous `playbackRate` value is not.
- The modes differ in either *what* gets sent (different message shapes) or *whether* anything gets sent at all — not just numeric tuning of the same operation.
- The mode-flipping inputs are a strict subset of the within-mode inputs; the rest are within-mode refinements that should re-fire the effect *within* the active mode, not change which mode is active.
- Within-mode noise that shouldn't re-fire (e.g., sub-segment `currentTime` ticks) can be dedup'd via a `computed` whose output is `Object.is`-stable across the noise.

The fourth point is load-bearing — without computed-dedup over the noisy input, you'd be back to per-state hand-rolled dedup, and the pattern wins nothing over the flat effect. The `segmentStartForTime(currentTime, segments)` computed is the canonical shape: a pure projection from a noisy continuous input to a discrete identity that only changes at meaningful boundaries.

### v/a's near-future variant: 4 states with `'metadata-only'`

The video/audio segment-loading variant adds a fourth state `'metadata-only'` between `'dormant'` and `'full-range'`:

```text
'preconditions-unmet' — no upstream actor OR no resolved track
'dormant'             — preload === 'none' && !loadActivated
'metadata-only'       — !loadActivated && preload === 'metadata' (init-segment only, no range)
'full-range'          — loadActivated || preload === 'auto'
```

The shape is the same; the per-state `effects:` construct different message shapes (`'metadata-only'` sends `{type: 'load', track}` with no `range`; `'full-range'` sends `{type: 'load', track, range}`). Text skips `'metadata-only'` because VTT has no init-segment concept — the manifest already exposes per-cue duration / language.

### Anti-pattern: encoding modes as flags inside one state

The half-fix is keeping a single positive state (`'has-loader'`) and writing per-mode branching inside its `effects:` body — same as the flat effect, just gated. That misses the entire structural win: state-exit doesn't run between mode flips, so per-mode `entry`/`exit` cleanup is unavailable; transitions don't fire `effects` re-init at mode boundaries, so the equality fn comes back to dedup intra-mode noise that should be a state-transition. If the modes are real, encode them as states.

State names describe *facts about the world that the reactor is responding to*, not *what this behavior does in that state*. The behavior's work lives in the file-level JSDoc and the `entry`/`effects` body — it doesn't need to be in the state name.

The rules:

1. **Single-condition gate (typically 2-state)** → name *both* states by the condition.
   - The canonical case: presentation resolution. Use `'presentation-unresolved'` ↔ `'presentation-resolved'`.
   - Behaviors gated on the same upstream condition share a vocabulary; a reader recognizes the gate at a glance. The `entry` body says *what happens in the resolved state* — e.g., schedule fetch tasks (`resolve-track`), pick a default + run ABR (`quality-switching`), pick a default (`select-tracks`).
   - Avoid action verbs like `'evaluating'`, `'resolving'`, `'monitoring'` on the positive side when there's only one positive state — they describe the behavior, not the condition, and force readers to learn behavior-specific vocabulary for the same gate.

2. **Compound gate** → use `'preconditions-unmet'` for the negative state.
   - Use when the negative state bundles multiple inputs (e.g., element + actors + tracks, or context + state). There's no single named upstream signal to mirror, so the generic name is the honest one.
   - Examples: `load-text-track-cues`, `track-playback-initiated`, `sync-text-tracks`.

3. **Multi-state machines (3+ states)** → action/availability verbs are *load-bearing* on the positive side because they distinguish sub-states. Use them.
   - Example: `resolve-presentation`'s `'preconditions-unmet' → 'idle' → 'resolving' → 'resolved'` — `'idle'` and `'resolving'` both sit on the "URL exists, not yet resolved" side and must be distinguished.

The trade-off the convention makes: reading a 2-state diagram in isolation no longer tells you "this behavior does ABR" or "this behavior resolves tracks" from the state names alone. That information lives in the file header and the entry body, where it already lives. What you gain in exchange is uniform vocabulary — anyone reading a new behavior recognizes `'presentation-unresolved' ↔ 'presentation-resolved'` as "one of those" rather than decoding a new pair of verbs per file.

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

### Entry bodies are already untracked — don't `peek` there

`entry` bodies run auto-untracked (see [Transition-driven vs state-driven work](#transition-driven-vs-state-driven-work)) — every `.get()` inside an `entry` body is functionally identical to a `peek`. Writing `peek(signal)` inside `entry` adds no behavior; it just looks like the `effects:` convention copied into the wrong place.

Use plain `.get()` inside `entry` bodies. Reserve `peek` for contexts where it actually suppresses a subscription: `effects:` blocks, `computed` callbacks, signal-tracked code elsewhere.

The sniff: a `peek` inside `entry` is dead weight. A reader can't distinguish "this `peek` is load-bearing" from "this `peek` is noise" by inspection — both look like a deliberate untracking choice. Standardizing on `.get()` inside `entry` makes the genuine `peek` calls (in `effects:` and `computed`) self-documenting.

The same principle applies in the inverse direction: a `peek` *inside* `entry`'s cleanup function (the returned `() => { ... }`) is also dead weight, because the cleanup body runs outside any reactive context.

## Anti-patterns

- **Reaching for a Reactor when an `effect` would do.** If the work is single-shape signal-driven mirroring (no states), an `effect` is simpler. The threshold: if you have only one branch of behavior and no per-state cleanup distinction, you don't need a state machine. **Corollary**: bidirectional dataflow expressed as two `effect`s in one behavior isn't a Reactor candidate either — the directions aren't states, just two effect-shaped concerns sharing a slot surface. See [`behaviors.md`](behaviors.md) → "Multi-effect behaviors."
- **Inlining `monitor` past the single-signal-read case.** Inline is only correct for a direct read with no composition (`monitor: () => state.foo.get() ? 'on' : 'off'`). Two predicates, a helper call, or any conjunction → extract to `derivedStateSignal`. Hurts testability, re-creates the closure on every read, and breaks consistency with every other reactor-using behavior in the codebase.
- **Hand-rolled FSM via `computed` flags + nested effects** when `createMachineReactor` was the answer. (See `behaviors.md` fight-the-shape sniffs.)
- **Tracking a source signal again inside per-state effects** when the reactor's `monitor` already tracks it. Use `peek` for non-state reads inside the state.
- **`peek` reads inside an `entry` body** (or inside `entry`'s returned cleanup). `entry` runs auto-untracked, so `peek` and `.get()` are functionally identical — the `peek` adds no behavior and falsely implies the choice is load-bearing. See [Entry bodies are already untracked — don't `peek` there](#entry-bodies-are-already-untracked--dont-peek-there).
- **Putting state-exit cleanup in an `effects` callback's return** instead of `entry`'s return — *when you want exit-only behavior*. `effects` cleanups run between effect re-runs *and* on state exit. For exit-only cleanup, use `entry`. For cleanup that should fire on both state exit *and* within-state identity changes, `effects`-based cleanup is the right tool — see [Effects-based cleanup for within-state identity changes](#effects-based-cleanup-for-within-state-identity-changes).
- **Putting an operation's cleanup in a different state's `entry`** instead of returning it from the operation's own `entry`. Mechanically *almost* equivalent for normal transitions, but fragments the operation across two states (cohesion loss) and silently misses the destroy path (destroy goes `current → 'destroying' → 'destroyed'` without passing through arbitrary intermediate states). See [Bind cleanup to its setup](#bind-cleanup-to-its-setup-not-to-the-next-states-entry).
- **State-scoped closure mutable state** (`let lastFoo`) instead of expressing the state in the state machine. The reactor *is* the state — adding parallel mutable closure state is double-bookkeeping.
- **Calling `effect()` inside `entry`'s body** to do state-driven work. Use the `effects:` array — bypassing it hand-manages a lifecycle the reactor was designed to handle. The failure mode is invisible at the test level (both forms produce the same observable behavior), which is why the anti-pattern needs explicit doc coverage. If a reviewer sees `effect(...)` inside an `entry` body, that's a sniff that the work belongs in `effects:` instead.
- **Helpers with conditional branches around optional state-scoped work**, e.g. `const cleanup = optionEnabled ? doOptionalThing() : undefined;` inside the helper's `entry`. The helper is now parameterized by something it shouldn't know about — the optional sub-concern leaks into the lifecycle helper's contract. Better: the helper accepts the work (or doesn't) from the variant; variants compose what they need without the helper having to handle the optional case. (Specific composition shape TBD per-case — what matters is that the helper doesn't carry the conditional.)
