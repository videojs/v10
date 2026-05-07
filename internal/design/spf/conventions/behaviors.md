---
status: draft
date: 2026-05-07
---

# Behaviors

> **Behaviors are the unit of composition in SPF — almost all functionality lives in one.** A Behavior may be "simple" (using only signals from core) or "primitive-augmented" (reaching for a Reactor, Actor, Task + Runner, or other primitive under its setup). The questions this doc answers are *how much primitive infrastructure does this behavior need*, *should this be one behavior or several*, and *what does it look like when a behavior wants refactoring* — not "should this be a behavior at all," because it almost always should.
>
> For how Behaviors and the primitives they use work under the hood see [`../primitives.md`](../primitives.md), [`../architecture.md`](../architecture.md), [`../actor-reactor-factories.md`](../actor-reactor-factories.md), and [`packages/spf/src/core/composition/create-composition.ts`](../../../../packages/spf/src/core/composition/create-composition.ts).

## Behaviors are the universal unit

Engines are composed from a list of Behaviors. Anything that contributes to playback — DOM bindings, MSE/SourceBuffer orchestration, ABR, segment loading, track selection, end-of-stream detection — is encapsulated in (at least) one Behavior. Actors, Reactors, Tasks, and other primitives live **inside** behaviors as implementation tools, not alongside them at the composition layer.

The right shape question is not "Behavior vs Actor" but "Behavior with what underneath?"

## Simple vs primitive-augmented behaviors

A **simple** behavior reaches only for `signal` / `computed` / `effect` from `core/signals`. The body is short, effect-shaped, and stateless beyond what the composition's signal map already gives it. `syncPreloadAttribute` is the canonical example: a single `effect` that mirrors a context value into a state slot when no explicit value has been set.

A **primitive-augmented** behavior pulls in additional infrastructure under its setup — instantiating an Actor, registering a Reactor, queueing Tasks against a Runner, or capturing references that span multiple effects. `loadVideoSegments` is at the far end of this spectrum: it composes a `SegmentLoaderActor`, a `SourceBufferActor`, bandwidth-state signals, and a `ChunkedStreamIterable`-backed fetch pipeline.

Decision criterion: **the shape of the work, not its importance.** A trivial-feeling behavior can warrant an Actor (ownership of a stateful resource is the deciding factor), and an important-feeling behavior can be three lines of `effect` (`syncPreloadAttribute` is load-bearing despite being tiny).

The set of primitives below describes **today's** options. SPF's primitive set isn't closed — when a behavior's shape doesn't fit either simple or any existing primitive, the right answer may be to surface a missing primitive rather than force-fit. See [Sniffs that say "no good fit yet"](#sniffs-that-say-no-good-fit-yet).

### Sniffs that say "reach past simple"

SPF has four primitive shapes a behavior can reach for under its setup. Pick by the shape of the work, not by importance:

- **Task + Runner** — discrete async work units with status, cancellation, and scheduling.
- **`createTransitionActor`** — reducer-shaped Actor: `(context, message) => context`, side effects allowed in the reducer. The simplest Actor shape; correct when the unit processes messages serially over a context but has no per-state behavior.
- **`createMachineActor`** — finite-state-machine Actor with per-state effects and entry handlers. Correct when the unit owns a resource *and* its behavior varies by state (e.g. MediaSource lifecycle: `idle` → `attaching` → `open` → `tearing-down`).
- **`createMachineReactor`** — finite-state-machine Reactor with reactive state derivation, per-state effects, and entry handlers. Correct when the work is *observe-and-react* (no resource ownership), with behavior gated on a derived state.

See [`../actor-reactor-factories.md`](../actor-reactor-factories.md) and [`../primitives.md`](../primitives.md) for the factory shapes and underlying implementation.

| Sniff | Reach for |
| ----- | --------- |
| Multi-step async work with status, cancellation, or scheduling | **Task + Runner** |
| Stateful unit that owns a resource and processes messages serially — no FSM, just a reducer over context | **`createTransitionActor`** |
| Stateful unit with per-state behavior (entry handlers, distinct effects per state, valid-transition rules) | **`createMachineActor`** |
| "Observe signal, dispatch message to actor" repeated several times — translation only | A Reactor; reach for **`createMachineReactor`** when the dispatch depends on a derived state |
| Hand-rolled FSM in the behavior body (nested `effect`s + flag-shaped `computed` signals like `canSetup` / `shouldSetup` / `isXing`) | **`createMachineReactor`** if observe-and-react; **`createMachineActor`** if the work owns a resource and processes messages |
| Body manually serializes work via flags (`isLoading`, `pending`, `inFlight`) | **`createTransitionActor`** — Actor message handling already serializes; the flag is reinventing the queue |

When the body is short, signal-only, and effect-shaped, simple is correct. Reaching for a Reactor when an `effect` would do is overkill on **D — Simplicity** without buying anything.

## One behavior or several

The decomposition question. The default leans toward **split until merging is required** — narrow slot maps are how `defineBehavior` exhaustiveness pulls its weight, and small behaviors compose more flexibly across engine variants (axis A — Reusability).

### Sniffs that say "split"

- `stateKeys` / `contextKeys` cluster into two disjoint groups touched by disjoint code paths in the body.
- The cleanup function has two unrelated halves (one tearing down a subscription, another disposing a resource).
- Two concerns happen to be wired together but don't share state — one reads a slot, another writes a different slot, and the only connection is "we set them up at the same time."
- The body has multiple lifecycle phases with different cleanup timing.
- Some keys in `stateKeys` / `contextKeys` are read only by some code paths in the body, never together.

### Sniffs that say "merge"

- Two behaviors share most of their slot map and always run together.
- One behavior is only meaningful when ordered immediately after another.
- Both are setting up against the same Actor and have to coordinate handoff through context to do it.
- Splitting required introducing a new "coordination" slot whose only purpose is bridging the two.

### Anti-pattern: split-by-domain instead of split-by-shape

A behavior named *after a domain concept* ("everything about audio") is often a merged version of three real behaviors (track selection, segment loading, sync). Conversely, a behavior named *after a small mechanical task* ("update the duration when buffered ranges change") is more likely to stay correctly sized. The split that matters is the slot-map split, not the conceptual one.

## How to write a behavior — code sniffs

When you're inside a behavior body and something feels off, the question is usually one of:

1. *Is this behavior fighting its shape?* (refactor in place)
2. *Should this reach for a primitive underneath?* (augment with an existing primitive)
3. *Is this two behaviors pretending to be one?* (split)
4. *Is the right primitive missing?* (no good fit yet — surface a gap, hold the sniff visibly)

The sniffs below map to those answers. The fourth bucket is the most easily mistaken for one of the others — it's worth being explicit when an existing primitive is being stretched past its fit.

### Sniffs that say "fix in place"

- Lots of `if (signal.get() === undefined) return` guards at the top of an `effect`. Either the slot annotation is wrong (`Signal` should be `ReadonlySignal` from a writer that hasn't fired yet, suggesting the consumer should treat the value as eventually-arriving), or the guard is really a Reactor *predicate* — see "fight the shape" below.
- Imperative wiring of multiple subscriptions that all want to be torn down together. Reach for an `AbortController` (see CLAUDE.md "Cleanup Pattern") rather than tracking individual unsubscribes.
- Repeated `.get()` on the same signal across an `effect` body. Lift to a `computed` once and read the computed — clearer dependency, easier to reason about.

### Sniffs that say "augment with a primitive"

- Setup body grows past ~50 lines of imperative effect code. Almost always a Reactor or Actor wants to live underneath.
- The behavior creates a resource (SourceBuffer, MediaSource, fetch reader) that has its own lifecycle and needs disposing in cleanup. Move resource ownership to an Actor whose lifecycle the behavior orchestrates.
- The behavior captures **long-lived references** it didn't get from context. Those references want to be in context, written by another behavior or via `shareSignals`. A behavior that creates *and stashes* a reference is doing two jobs.
- Body branches on `config.type` at runtime. Split into per-type specializations (see [Per-type specialization](#per-type-specialization)).

### Sniffs that say "fight the shape"

This bucket is for cases where an existing primitive is the right answer and the body just isn't using it.

- Nested `effect` calls where the inner `effect` is gated by a flag the outer set up. Almost always wants a `createMachineReactor` (or a `createMachineActor` if the work also owns a resource).
- Hand-rolled FSM via flag-shaped `computed` signals (`canSetup`, `shouldSetup`, `isAttached`, `isTearingDown`) feeding a single `effect`. Same conversion targets as above — the FSM shape *is* what the machine factories provide.
- Imperative `addEventListener` plumbing for events that should drive a signal. Wire the events into a context-held signal (often via another behavior), then react to the signal.
- Subscribe/unsubscribe bookkeeping inside the body that an Actor or Reactor's lifecycle would handle.
- Reaching for a raw Actor (or hand-rolled message-and-context bookkeeping) when the work fits one of the factories. Use `createTransitionActor` or `createMachineActor`; the raw Actor primitive is below the convention layer.

### Sniffs that say "no good fit yet"

This bucket is for cases where neither simple nor any existing primitive fits cleanly — and forcing the work into the closest existing primitive degrades it. The honest answer is to surface the gap.

**Before declaring this bucket, check the factory inventory.** It's easy to write off a sniff as "no good fit" while overlooking an existing primitive — the case in `setup-mediasource.ts:63` (a comment about needing "Reactors with internal finite state") was almost certainly written before `createMachineReactor` shipped, and is now better classified as a fight-the-shape sniff. When you suspect a gap, name the existing primitives you considered and *why* each is a stretch, not just "doesn't quite fit."

Genuine signals that you're really in this bucket (not just unfamiliar with the inventory):

- A primitive-augmented behavior whose body is mostly *coordinating between* multiple primitives (an Actor's lifecycle gated on a Task's status gated on a signal), where the coordination logic itself is the bulk of the body. The coordination shape may want a name and a primitive of its own.
- A pattern that recurs across multiple Behaviors but isn't quite the same as any existing primitive — three Behaviors all hand-rolling the same scaffold with minor variations is a signal the scaffold wants extracting. Could be a helper or factory; sometimes a new primitive.
- A piece of the work doesn't fit *anywhere* in the existing primitive set — the body genuinely needs something not covered by signals, Tasks, the Actor factories, or the Reactor factory.

What to do when you've confirmed the gap:

- **Hold the sniff visibly in code.** A `// NOTE` or `// TODO` comment naming the missing primitive (or the conjectured shape of one) is more useful than a clean-looking force-fit, because it prevents the next reader from "fixing" the misshapen wiring without addressing the actual gap.
- **Surface the gap up the stack.** Add an entry to the cleanup plan or a relevant design doc (`internal/design/spf/`), or open an RFC if the missing primitive affects the public composition surface. Don't let the sniff live only in code.
- **Don't force-fit.** Reaching for the closest existing primitive when the shape genuinely doesn't fit costs **D** + **C** (more elaborate than the problem requires *and* a pattern violation that future readers will have to either decode or undo).
- **Convert when the primitive lands.** When a missing primitive is added, the held sniffs become migration targets — they're already self-documenting.

### Worked example: where `setup-mediasource.ts` falls today

- Augmented (it owns lifecycle of a MediaSource it creates), so not a simple behavior.
- Currently a single behavior — splitting would create two halves that have to coordinate through a new "ms ready" slot, which the merge-sniffs argue against.
- Has a fight-the-shape sniff: the `canSetup` / `shouldSetup` / nested-effect pattern is a hand-rolled FSM. The file's own comments hint at two refactor candidates — `createMachineActor` (treating MediaSource as a resource the Actor owns) or `createMachineReactor` (if the work is observe-and-react). Both already provide internal finite state. The older "if/when Reactors have internal finite state" comment likely predates `createMachineReactor` and should be reconciled when the cleanup is executed; the deciding factor between machine-Actor and machine-Reactor is whether MediaSource ownership belongs in this behavior or a longer-lived unit.

**Counterpoint** already shipped: `setupTrackResolution` in `packages/spf/src/playback/behaviors/resolve-track.ts` (commit series ending at `f707b0e9`) followed the same fight-the-shape sniff to a `createMachineReactor` migration with `entry: () => () => runner.abortAll()` for source-change cancellation. See the current file for the worked example of source-identity states + the entry-returns-state-exit-cleanup idiom; see [`reactors.md`](reactors.md) for the convention guidance.

The example is illustrative and may decay — read the code first when applying these sniffs to it.

## Source-reset handling (playback-engine behaviors)

Behaviors composed into a playback engine almost always have an implicit dependency on a current source — typically `state.presentation`. Source reset (URL change, presentation cleared, behavior destroyed mid-stream) is a first-class concern: every playback-engine behavior should be designed with explicit semantics for it.

Three categories of source-dependence, each with its own reset contract:

### 1. Async work tied to a source

The behavior schedules tasks (fetches, parses, transforms) whose result is meaningful only for the source they were scheduled against.

**Reset contract**: cancel in-flight work; do not let it commit.

**Pattern**: `createMachineReactor` with source-identity states; `entry: () => () => runner.abortAll()` on the active state. See [`reactors.md`](reactors.md) → "Source-identity states for source-driven work." `setupTrackResolution` in `packages/spf/src/playback/behaviors/resolve-track.ts` is the canonical worked example.

**Hazard**: the spec-defined fetch signal abort cancels in-flight body reads, so tasks awaiting fetch completion fail-fast on signal abort. Behaviors that bypass the signal (e.g., manual `addEventListener('updateend')` plumbing) need explicit teardown in the same cleanup.

### 2. State derived from a source

The behavior holds derived state (closure flags, computed projections, accumulated counters) computed against the current source.

**Reset contract**: reset the derived state when the source changes.

**Pattern**: don't carry derived state in closure-mutable variables; either compute it via `computed` (auto-tracks the source signal) or scope it to a state-machine state so it's freshly initialized on each entry. Closure-mutable state (`let lastUpgradeTime`, `let hasEnded`) survives source resets and produces stale answers.

**Hazard**: the easy bug. `quality-switching`'s closure-state flags, `end-of-stream`'s `hasEnded`, `update-duration`'s `running` flag are all instances surfaced by the assessment as candidates for this category.

### 3. Resources owned per source

The behavior creates a resource (MediaSource, SourceBuffer, Actor, listener) whose lifecycle is bound to the source.

**Reset contract**: dispose the resource when the source changes; create fresh on the new source.

**Pattern**: state-machine state-exit cleanup or behavior-level cleanup. For MediaSource-shaped resources where the lifecycle has multiple states (idle / attaching / open / tearing-down), `createMachineActor` is often the right primitive — the resource owns its own state machine.

**Hazard**: mid-flight teardown vs. late commits. If the resource is being torn down while in-flight work referencing it is completing, the work must short-circuit. `setup-mediasource`'s nested-effect-via-flags pattern is an instance.

### Source-reset checklist

When designing or reviewing a playback-engine behavior:

- What does this behavior depend on from the source?
- On `set source → unset → set new`: does the behavior recover correctly? (Common URL-change path.)
- On `set source → set new` directly (no unset intermediate): is this assumed not to occur, or is there defense in depth?
- On `behavior destroyed mid-async`: is teardown clean? Does in-flight work bail or leak?
- Is any state that should reset on source change carried in closure variables instead of state-machine state or signal-derived computed?

The cleanup pass should re-audit each behavior through this lens; the symptom-level findings in the assessment (closure flags, manual cleanup, hand-rolled FSMs) cluster around source-reset gaps.

## Behavior shape

Always construct via `defineBehavior` rather than building the behavior object literal manually. `defineBehavior` enforces single-behavior key/param consistency: declared `stateKeys` must equal `keyof S` inferred from the setup's state-param type. Drift between the declared keys and the body's reads/writes becomes a type error at the definition site.

```ts
export const syncPreloadAttribute = defineBehavior({
  stateKeys: ['preload'],
  contextKeys: ['mediaElement'],
  setup: syncPreloadAttributeSetup,
});
```

The narrow exception is `makeShareSignals` (and any future zero-key behavior factory): empty key arrays trip the `defineBehavior` exhaustiveness check, so a `Behavior<>` literal is correct there. If you find yourself reaching for the literal form for any other reason, pause — there's probably a missing key declaration.

### Setup-param typing (read/write intent)

Type the `setup` deps with `Signal<T>` for slots the body **writes** and `ReadonlySignal<T>` for slots the body only **reads**. This is a real contract enforced by the type system — `Signal<T>` permits `.set()`, `ReadonlySignal<T>` does not. See [`signals.md`](signals.md) for the broader treatment.

```ts
function syncPreloadAttributeSetup({
  state,
  context,
}: {
  state: { preload: Signal<State['preload']> };          // body writes
  context: { mediaElement: ReadonlySignal<...> };        // body only reads
}): () => void { ... }
```

### Narrow the slice with `Pick`

When a behavior touches only a few keys of a wider state shape (`PresentationState`, `EngineContext`, etc.), narrow the slice with `Pick` rather than typing against the wide shape. This makes the read/write contract visible at the definition and lets `defineBehavior`'s exhaustiveness check do its job.

```ts
type State = Pick<PresentationState, 'preload'>;
```

### Cleanup contract

Return one of:

- `() => void` — most common; an unsubscribe-style cleanup (often the return value of `effect(...)`).
- `void` — when the behavior only registers handlers that are owned by something with its own lifecycle.
- `{ destroy(): void | Promise<void> }` — when cleanup is multi-step or async.

Use `AbortController` internally when there are multiple cleanups to coordinate (see CLAUDE.md "Cleanup Pattern"). If a behavior owns an Actor, the cleanup should call the Actor's `destroy()` (or equivalent) — leaving an Actor running past its parent behavior's teardown is a leak.

## Per-type specialization

When a behavior's logic varies by media type (video / audio / text), prefer **separate exports per type** over a single behavior with a `config.type` discriminant.

```ts
// good — narrow per-type keys, no runtime discriminant, dead code drops out
export const selectVideoTrack = defineBehavior({ ... });
export const selectAudioTrack = defineBehavior({ ... });
export const selectTextTrack = defineBehavior({ ... });
```

Engines opt into specific tracks (e.g. an audio-only engine uses `selectAudioTrack` only). This wins on **A — Reusability** (engines aren't forced to carry video logic), **C — Patternability** (call sites read the same shape regardless of type), and **E — Size** (unused specializations tree-shake out).

The runtime cost is shared body code. Three modules currently share via a typed helper (`resolve-track`'s `setupTrackResolution`, `select-tracks`'s now-fully-inlined bodies, `load-segments`'s `setupSegmentLoading`); the trade-off is documented in `.claude/plans/spf/discrete-signals-and-behavior-objects.md` under "Code-reuse compromise" and is a pending follow-up — see [Helpers and behavior factories](#helpers-and-behavior-factories) below.

## Helpers and behavior factories

Decomposition tools used *within* the Behavior shape, not alternatives to it. **This section is expected to iterate** as the cleanup pass surfaces real cases. Three forms are recognized.

### Inline helper

A function operating on already-resolved values, called from inside a Behavior body. Has no setup/cleanup of its own; the Behavior owns its lifecycle. Lives near its caller (same file, or a sibling module if shared across a small group).

When to extract an inline helper:

- A piece of pure logic in a Behavior body is reused by another Behavior in the same module (or sibling).
- A computation that's pure given its inputs and is verbose enough to obscure the surrounding `effect` / `computed` body.
- The same predicate or projection appears in two `computed` definitions.

When **not** to extract an inline helper:

- The code is used only once and reads naturally inline.
- The helper needs to read or write composition signals. That's a setup-shape helper (see below), not an inline helper.

### Setup-shape helper

A function whose signature matches `Behavior.setup` — `({ state, context, config }) => cleanup` — called from inside a behavior's setup. Operates on signals (state/context), owns its own setup/cleanup contract, and bakes per-type or per-export parameterization into `config` at the call site (each per-type export adapts the call inline).

`setupTrackResolution` (in `resolve-track.ts`, commit `54707e59`) is the canonical example: three per-type behaviors (`resolveVideoTrack`, `resolveAudioTrack`, `resolveTextTrack`) each call it from their `defineBehavior` setup, supplying their per-type config (`selectedKey`, `findTrackToResolve`) inline.

When to use a setup-shape helper:

- The orchestration shape repeats across 2+ Behaviors with per-type parameterization (selected key, finder fn, type discriminant).
- The reuse is at the composition layer (touches signals), but each per-type export should keep its own `defineBehavior` declaration — for visibility of `stateKeys` at the call site, for the exhaustiveness check to run per export, or because each export has its own JSDoc / test boundary.
- You want a uniform "helpers shaped like setup" convention reproducible across many shared helpers without each becoming a wrapper around `defineBehavior`.

When **not** to use a setup-shape helper:

- The reuse is pure logic over already-resolved values — that's an inline helper.
- The lightest call sites are the priority and you're willing to hide `defineBehavior` inside a wrapper — that's a behavior factory.

Trade-off: per-export call sites carry the `defineBehavior` boilerplate plus an inline `config` object (~3 extra lines per export vs. a factory). Acceptable when the shape uniformity is reproducible across many helpers and you want each export's slot intent legible at the export site.

### Behavior factory

A function that *returns* a Behavior, parameterized by the type/keys/config the caller cares about. The product is a Behavior; the factory captures the parameterization. `makeShareSignals<S, C>()` is the canonical example.

When to use a behavior factory:

- The same Behavior shape applies to multiple keys, and you want the lightest call sites — each export is a single-line factory invocation, no `defineBehavior` boilerplate per export.
- A Behavior is parameterized by something that varies *across compositions but is fixed within one* — pass it via factory args rather than via runtime `config`, so each composition gets a Behavior with the parameterization baked in (and dead branches drop out).
- The `stateKeys`/`contextKeys` themselves are parameterized in a way the factory can express but a setup-shape helper can't (e.g. `makeShareSignals` declares zero keys regardless of `S`/`C`).

When **not** to use a behavior factory:

- The shape is reproducible without wrapping `defineBehavior` — a setup-shape helper is lighter.
- `config` already does the job. A factory parameter that ends up rebroadcast as `config` adds a layer for no gain.
- When parameters vary at runtime within a single composition. That's `config`'s domain, not the factory's.

### Inline helper, setup-shape helper, factory, or another behavior?

The decision pivots on *what's shared*, *what's parameterized*, and *whether you want each export to keep its own `defineBehavior` declaration*.

| Shared shape | Parameterized over | Reach for |
| ------------ | ------------------ | --------- |
| Inline computation, used by one Behavior body | (nothing — inline) | Inline code |
| Pure logic over already-resolved values, shared by 2+ Behaviors | Their inputs | **Inline helper** |
| Setup orchestration over signals, shared by 2+ Behaviors with per-type config; keep `defineBehavior` per export | Per-type config (passed via `config`) | **Setup-shape helper** |
| Same as above, but lightest call sites preferred over per-export `defineBehavior` visibility | Slot-map types (`S`, `C`, …) or per-type opts | **Behavior factory** |
| Behavior shape shared, but slot intent or set of touched keys varies per type | Per-type structure | **Per-type specialization** (separate exports), often combined with a setup-shape helper or factory |
| Same problem solved twice in two unrelated places | (none — coincidence) | Leave as two |

The "abstracted helpers should look like Behaviors" goal is satisfiable through either the setup-shape helper or the behavior factory pattern. Pick by which trade-off you want: setup-shape preserves per-export `defineBehavior` (and its exhaustiveness check) at the cost of slightly verbose call sites; factory hides `defineBehavior` for lighter call sites at the cost of an extra wrapping layer. The follow-up on `select-tracks` and `load-segments` is to apply this distinction case by case (per `54707e59`, `resolve-track` adopted the setup-shape helper form).

## File placement

Per [`packages/spf/src/CLAUDE.md`](../../../../packages/spf/src/CLAUDE.md):

- DOM-free Behaviors live in `playback/behaviors/` (e.g. `select-tracks.ts`, `quality-switching.ts`).
- DOM-bound Behaviors live in `playback/behaviors/dom/` (e.g. `setup-mediasource.ts`, `load-segments.ts`).

The split is enforced by tsconfig `lib` settings — a non-DOM behavior that imports `HTMLMediaElement` will fail typecheck, not just lint. If a Behavior currently lives outside `dom/` but reaches into DOM types, that's a placement bug, not a style nit.

Actor factories the Behaviors instantiate live alongside in `playback/actors/` (or `playback/actors/dom/`). Cross-imports between sibling Behaviors and Actors are expected; reaching across `media/`, `network/`, or `core/` follows the dependency rules in CLAUDE.md.

## Naming

- Behaviors are named as **descriptive verbs**: `syncPreloadAttribute`, `selectVideoTrack`, `loadVideoSegments`, `endOfStream`. No `*Behavior` suffix.
- Files match the exported name in kebab-case: `sync-preload-attribute.ts` exports `syncPreloadAttribute`.
- Per-type specializations co-locate in one module: `select-tracks.ts` exports `selectVideoTrack` / `selectAudioTrack` / `selectTextTrack`.
- Behavior factories are named `make*`: `makeShareSignals`. The factory's product is a Behavior; the prefix distinguishes the factory from a Behavior export.
- Setup-shape helpers are named `setup*`: `setupTrackResolution`. The shape is a `Behavior.setup`-style function called from inside a per-type behavior's setup.

## Testing

Tests live in `tests/` next to the source (`packages/spf/src/playback/behaviors/tests/sync-preload-attribute.test.ts`). The vitest project assignment is automatic by path:

- `playback/behaviors/**/*.test.ts` (non-DOM) → `behaviors` project (Node).
- `playback/behaviors/dom/**/*.test.ts` (DOM) → `dom` project (Chromium).

Use `describe('<exact exported name>', ...)`. For per-type specializations, prefer one `describe` per export rather than a single shared `describe` block — call sites read the same shape regardless of type, and tests should too.

When a Behavior is augmented with an Actor, the Actor's own tests live in `playback/actors/tests/`. The Behavior's tests should cover the wiring (slot reads/writes, cleanup ordering, lifecycle); they shouldn't re-test the Actor's internals.

## Anti-patterns

- **Building behavior objects without `defineBehavior`** outside the `makeShareSignals` exception. Drops the exhaustiveness check and lets `stateKeys` / body drift.
- **Typing setup deps against the full state/context shape** instead of `Pick`'d slices. Hides the read/write contract; makes wide-to-narrow casts necessary inside the body.
- **Runtime `config.type` discriminants** for per-media-type behaviors. Costs all three of A/C/E for a small body-reuse gain.
- **Behaviors that mutate slots they didn't declare** in `stateKeys` / `contextKeys`. The type system stops most of this, but mutating a slot via a captured ref obtained from `shareSignals`-style channels can still slip past — convention: write to your own declared slots only, even when a wider ref is in scope.
- **Reaching for a Reactor or Actor when a simple behavior would do.** The dual of the augment-sniffs above. If the body is short, signal-only, and effect-shaped, leave it.
- **Force-fitting a "no good fit" sniff into the closest existing primitive** to make the body look conventional. Hold the sniff visibly with a comment and surface the gap; a clean-looking force-fit hides the real signal.
- **Declaring "no good fit yet" without naming what you considered.** The factory inventory has grown; what looked like a gap a year ago may have a real primitive now. Name the candidates you ruled out and why before flagging a missing primitive.
- **Reaching for the raw Actor primitive when one of the factories (`createTransitionActor`, `createMachineActor`) fits.** The factories are the convention layer; the raw Actor is below it.
- **Behaviors that own an Actor without disposing it in cleanup.** Always a leak; usually a sign the Actor's lifecycle should be expressed through context (so cleanup ordering is explicit) rather than captured locally.
- **Splitting by domain rather than by shape.** A "video" Behavior that's really three Behaviors (selection, loading, sync) glued together is harder to reuse in audio-only contexts than three small Behaviors with overlapping slot maps.
- **Defense-in-depth checks without an articulated failure mode.** Every guard added "just in case" should name the specific thing it protects against. When the architecture changes, revisit the guard — it may have become unreachable. Carrying unreachable guards is technical debt that obscures the real safety properties of the surrounding code. (Concrete instance from this branch: a commit-time presentation id check in `setupTrackResolution` that became redundant once the reactor's state-exit abort + spec-compliant fetch signal propagation handled the same race; removed in commit `5456d9db`.)
- **Closure-mutable state that should reset on source change.** See "Source-reset handling" — closure variables survive source resets. Express the state in a `createMachineReactor` state or a signal-derived `computed` so reset happens structurally.
