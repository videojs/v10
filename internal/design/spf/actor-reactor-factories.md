---
status: decided
date: 2026-03-31
---

# Actor and Reactor Factories

Design for `createActor` and `createReactor` — the declarative factory functions that replace
bespoke Actor classes and function-based Reactors in SPF.

Motivated by the text track architecture spike (videojs/v10#1158), which produced the first
`createActor` / `createReactor`-based implementations in SPF and surfaced the need for
shared, principled primitives. See [text-track-architecture.md](text-track-architecture.md)
for the reference implementation and spike assessment.

---

## Decision

Actors and Reactors are defined via a **declarative definition object** passed to a factory
function. The factory constructs the live instance — managing the status signal, runner
lifecycle, and `'destroyed'` terminal state. Consumers define behavior; the framework handles
mechanics.

Two separate factories:

```typescript
const actor = createActor(actorDefinition);
const reactor = createReactor(reactorDefinition);
```

Both return instances that implement `SignalActor` and expose `snapshot` and `destroy()`.

---

## Actor Definition

### Shape

```typescript
type ActorDefinition<
  UserStatus extends string,
  Context extends object,
  Message extends { type: string },
  RunnerFactory extends (() => RunnerLike) | undefined = undefined,
> = {
  runner?: RunnerFactory;    // factory — called once at createActor() time
  initial: UserStatus;
  context: Context;
  states: Partial<Record<UserStatus, {
    onSettled?: UserStatus;  // when runner settles in this state → transition here
    on?: {
      [M in Message as M['type']]?: (
        message: Extract<Message, { type: M['type'] }>,
        ctx: HandlerContext<UserStatus, Context, RunnerFactory>
      ) => void;
    };
  }>>;
};

// runner is present and typed as the exact runner only when runner: is declared.
// When omitted, runner is absent from the type entirely (not undefined).
type HandlerContext<UserStatus, Context, RunnerFactory> = {
  transition: (to: UserStatus) => void;
  context: Context;
  setContext: (next: Context) => void;
} & (RunnerFactory extends () => infer R ? { runner: R } : object);
```

### Example — `TextTrackSegmentLoaderActor`

```typescript
import { SerialRunner, Task } from '../../core/task';
import { parseVttSegment } from '../text/parse-vtt-segment';

const textTrackSegmentLoaderDef = {
  runner: () => new SerialRunner(),
  initial: 'idle' as const,
  context: {} as Record<string, never>,
  states: {
    idle: {
      on: {
        load: (msg, { transition, runner }) => {
          const segments = plan(msg);
          if (!segments.length) return;
          segments.forEach(s => runner.schedule(new Task(async (signal) => {
            const cues = await parseVttSegment(s.url);
            if (!signal.aborted) textTracksActor.send({ type: 'add-cues', ... });
          })));
          transition('loading');
        }
      }
    },
    loading: {
      onSettled: 'idle',
      on: {
        load: (msg, { runner }) => {
          runner.abortAll();
          plan(msg).forEach(s => runner.schedule(new Task(...)));
          // stays 'loading' — onSettled handles → 'idle'
        }
      }
    }
  }
};
```

### Example — `TextTracksActor` (no runner, synchronous)

```typescript
const textTracksActorDef = {
  // runner: omitted — no async work
  initial: 'idle' as const,
  context: { loaded: {}, segments: {} } as TextTracksActorContext,
  states: {
    idle: {
      on: {
        'add-cues': (msg, { context, setContext }) => {
          setContext(applyAddCues(context, msg));
        }
      }
    }
  }
};
```

---

## Reactor Definition

### Shape

```typescript
type ReactorDefinition<UserStatus extends string, Context extends object> = {
  initial: UserStatus;
  context: Context;
  /**
   * Cross-cutting effects that run in every non-terminal state.
   * Each element becomes one independent effect() call. The current status is
   * available in ctx, allowing a single effect to monitor conditions and drive
   * transitions from any state without duplicating guards in every state block.
   *
   * ORDERING GUARANTEE: always effects run before per-state effects in every flush.
   * This is load-bearing — see the "always-before-state ordering" decision below.
   */
  always?: ReactorAlwaysEffectFn<UserStatus, Context>[];
  /**
   * Per-state effect arrays. Every valid status must be declared (use [] for
   * states with no effects). Each element becomes one independent effect() call
   * gated on that state, with its own dependency tracking and cleanup lifecycle.
   */
  states: Record<UserStatus, ReactorEffectFn<UserStatus, Context>[]>;
};

type ReactorEffectFn<UserStatus extends string, Context extends object> = (ctx: {
  transition: (to: UserStatus) => void;
  context: Context;
  setContext: (next: Context) => void;
}) => (() => void) | { abort(): void } | void;

type ReactorAlwaysEffectFn<UserStatus extends string, Context extends object> = (ctx: {
  status: UserStatus;  // current status — not available in per-state effects
  transition: (to: UserStatus) => void;
  context: Context;
  setContext: (next: Context) => void;
}) => (() => void) | { abort(): void } | void;
```

Each array element becomes one independent `effect()` call. `always` entries run in every
non-terminal state and fire *before* per-state entries — see the `always`-before-state
ordering guarantee below. Multiple entries for the same state produce multiple effects —
each with independent dependency tracking and cleanup. This is the mechanism that replaces
multiple named `cleanupX` variables in the current function-based reactors.

### Example — `syncTextTracks`

Two states (`preconditions-unmet` ↔ `set-up`), one `always` monitor, two independent
effects in `set-up` with separate tracking and cleanup.

```typescript
const syncTextTracksDef = {
  initial: 'preconditions-unmet' as const,
  context: {},
  // Single always effect drives all transitions from one place.
  always: [
    ({ status, transition }) => {
      const target = preconditionsMetSignal.get() ? 'set-up' : 'preconditions-unmet';
      if (target !== status) transition(target);
    }
  ],
  states: {
    'preconditions-unmet': [],  // no effects — always monitor handles exit

    'set-up': [
      // Effect 1 — enter-once: create <track> elements, return teardown cleanup.
      // untrack() prevents re-runs on mediaElement/modelTextTracks changes.
      () => {
        const el = untrack(() => mediaElementSignal.get()!);
        const tracks = untrack(() => modelTextTracksSignal.get()!);
        tracks.forEach(t => el.appendChild(createTrackElement(t)));
        return () => {
          el.querySelectorAll('track[data-src-track]').forEach(t => t.remove());
          update(state, { selectedTextTrackId: undefined });
        };
      },

      // Effect 2 — reactive-within-state: re-runs when selectedId changes.
      // Independent tracking and cleanup from Effect 1.
      () => {
        const el = untrack(() => mediaElementSignal.get()!);
        const selectedId = selectedIdSignal.get();  // tracked — re-run on change
        syncModes(el.textTracks, selectedId);
        const unlisten = listen(el.textTracks, 'change', onChange);
        return () => unlisten();
      }
    ]
  }
};
```

### Example — `loadTextTrackCues`

Four states with actor lifecycle managed across states, the `deriveStatus` pattern for
complex multi-condition transitions, and `untrack()` for non-reactive owner reads.

```typescript
// Hoist computeds outside effects — computed() inside an effect body
// creates a new Computed node on every re-run with no memoization.
const derivedStatusSignal = computed(() => deriveStatus(state.get(), owners.get()));
const currentTimeSignal = computed(() => state.get().currentTime ?? 0);
const selectedTrackSignal = computed(() => findSelectedTrack(state.get()));

const loadTextTrackCuesDef = {
  initial: 'preconditions-unmet' as const,
  context: {},
  always: [
    ({ status, transition }) => {
      const target = derivedStatusSignal.get();
      if (target !== status) transition(target);
    }
  ],
  states: {
    'preconditions-unmet': [
      () => {
        // Entry-reset: destroy any stale actors; no-op if already undefined.
        // Runs on every entry, handling all paths back from active states.
        teardownActors(owners);
      }
    ],
    'setting-up': [
      () => {
        teardownActors(owners);  // defensive — same as preconditions-unmet
        const mediaElement = untrack(() => owners.get().mediaElement!);
        const textTracksActor = createTextTracksActor(mediaElement);
        const segmentLoaderActor = createTextTrackSegmentLoaderActor(textTracksActor);
        update(owners, { textTracksActor, segmentLoaderActor });
        // No return — deriveStatus drives the onward transition automatically.
      }
    ],
    pending: [],  // neutral waiting state — no effects
    'monitoring-for-loads': [
      () => {
        const currentTime = currentTimeSignal.get();   // tracked — re-run on advance
        const track = selectedTrackSignal.get()!;      // tracked — re-run on change
        // untrack owners — actor snapshot changes must not re-trigger this effect.
        const { segmentLoaderActor } = untrack(() => owners.get());
        segmentLoaderActor!.send({ type: 'load', track, currentTime });
      }
    ]
  }
};
```

---

## Key Design Decisions

### Factory functions, not base classes

**Decision:** `createActor(def)` and `createReactor(def)` rather than `extends BaseActor` /
`extends Reactor`.

**Alternatives considered:**
- **Base class + subclass** — `class TextTracksActor extends BaseActor<...>`. Familiar OO pattern,
  explicit contract. But inheritance couples the consumer to the framework's class hierarchy,
  limits composition, and makes the definition implicit (spread across the constructor body).
- **Interface only** — each Actor/Reactor implements `SignalActor` directly. No boilerplate
  reduction; every implementation reimplements the same snapshot/signal/destroy mechanics.

**Rationale:** A definition object is pure data — inspectable, serializable, testable in isolation
without instantiation. The factory owns all mechanics (snapshot signal, runner lifecycle,
`'destroyed'` guard); the definition owns behavior. Aligns with the XState model and keeps the
door open for a future definition-vs-implementation separation (see below).

---

### Separate `createActor` and `createReactor`

**Decision:** Two distinct factories with distinct definition shapes.

**Alternatives considered:**
- **Unified `createMachine`** — one factory for both, distinguishing by definition shape (Actors
  have `on`/`runner`; Reactors have effect arrays). XState does this.

**Rationale:** Actors and Reactors have genuinely different input shapes and internal mechanics.
A unified factory would produce a definition type with optional properties for both cases,
losing type-level guarantees (e.g., a Reactor definition shouldn't have `runner` or `on`).
The shared core — status signal, `'destroyed'` terminal, `destroy()` — is thin enough to
extract as an internal `createMachineCore` without a unified public API. XState unifies because
its actors ARE the reactive graph; in SPF, the separation between reactive observation (Reactor)
and message dispatch (Actor) is intentional and worth preserving in the API surface.

---

### `'destroyed'` is implicit and always enforced

**Decision:** User-defined status types never include `'destroyed'`. The framework always adds it
as the terminal state. `destroy()` on any Actor or Reactor always transitions to `'destroyed'`
and calls exit cleanup for the currently active state.

```typescript
// User defines:
type LoaderUserStatus = 'idle' | 'loading';
// Framework produces:
type LoaderStatus = 'idle' | 'loading' | 'destroyed';
```

**Rationale:** `'destroyed'` is universal — every Actor and Reactor has it. Making it implicit
ensures it can't be accidentally omitted or given a custom behavior that breaks framework
guarantees (e.g., `send()` being a no-op in the destroyed state). Users only define their
domain-meaningful states.

---

### Runner as a factory function, actor-lifetime scope

**Decision:** `runner: () => new SerialRunner()` — a factory function called once when
`createActor()` is called. The runner lives for the actor's full lifetime and is destroyed
when the actor is destroyed.

**Alternatives considered:**
- **Magic strings** (`runner: 'serial'`) — requires a string-to-class registry and introduces an
  extra import layer. Deferred to a possible future XState-style definition-vs-implementation
  split.
- **Constructor reference** (`runner: SerialRunner`) — `new def.runner()`. Slightly less explicit
  than a factory; doesn't compose as naturally when construction needs configuration.
- **State-lifetime runners** — runner created on state entry, destroyed on state exit. Naturally
  eliminates the generation-token problem (`onSettled` always refers to the fresh chain).
  Rejected because it prevents runner state from persisting across state transitions — the
  current `TextTrackSegmentLoaderActor` intentionally keeps its runner across idle/loading cycles.

**Rationale:** Actor-lifetime scope matches the current pattern and is the most flexible default.
A factory function (`() => new X(options)`) handles configured runners without changing the
framework. The generation-token problem (`onSettled` must refer to the latest chain, not a
stale one) is handled by the framework internally rather than by runner scope.

---

### `always`-before-state ordering guarantee

**Decision:** `always` effects are registered before per-state effects in `createReactor`.
This ordering is **load-bearing**: per-state effects can rely on invariants established by
`always` monitors having already run.

**How it works:** The effect scheduler drains pending computeds into an insertion-ordered
`Set` before executing them. Because `always` effects are registered first, they are
guaranteed to execute before per-state effects in every flush.

**What this enables:** When an `always` monitor calls `transition(newState)`, the snapshot
signal updates immediately. By the time per-state effects run, the reactor is already in
`newState` — so a per-state effect gated on `snapshot.status !== state` correctly no-ops
without needing to re-check conditions that the `always` monitor just resolved.

**Important caveat:** This guarantee is specific to `createReactor`'s registration order.
It is not a formal guarantee of the TC39 Signals proposal — it depends on the polyfill's
`Watcher` implementation preserving insertion order in `getPending()`. Do not assume this
ordering holds outside of `createReactor`.

---

### Per-state `on` handlers

**Decision:** Message handlers are declared per state. The same message type can appear in
multiple states with different behavior.

```typescript
states: {
  idle:    { on: { load: (msg, ctx) => { /* plan + schedule; transition → loading */ } } },
  loading: { on: { load: (msg, ctx) => { /* abort + replan; stay loading */ } } }
}
```

**Alternatives considered:**
- **Top-level `on`** with internal state guard — one handler per message type, branches on
  `context.status` internally. More compact for simple cases, but hides state-dependent
  behavior in imperative branches rather than making it explicit in the definition.

**Rationale:** Matches XState's model. State-scoped handlers make valid message/state combinations
explicit and inspectable from the definition alone — no need to trace imperative branches.

---

### `onSettled` at the state level

**Decision:** Each state can declare `onSettled: 'targetStatus'`. When the actor's runner settles
(all scheduled tasks have completed) while the actor is in that state, the framework automatically
transitions to `targetStatus`.

**Rationale:** This replaces the manual `runner.settled` reference-equality pattern in
`TextTrackSegmentLoaderActor`. The framework owns the generation-token logic — re-subscribing to
`runner.settled` each time tasks are scheduled so that `abortAll()` + reschedule correctly
cancels the previous settled callback.

---

## XState-style Definition vs. Implementation

The current design uses a single definition object that contains both structure (states, runner
type, initial status) and behavior (handler functions). XState v5 separates these:

```typescript
// Definition — pure structure, no runtime dependencies
const def = setup({ actors: { fetcher: fetchActor } }).createMachine({ ... });

// Implementation — runtime wiring
const actor = createActor(def, { input: { ... } });
```

This separation enables serialization, visualization, and testing the definition without
instantiation. SPF's current factory approach is compatible with this future direction:
`runner: () => new SerialRunner()` today becomes a named reference resolved against a provided
implementation map later. The migration path is additive — no existing definitions need to change.

### Handler context API

The second argument to Actor message handlers is:
```typescript
{ transition: (to: UserStatus) => void; context: Context; setContext: (next: Context) => void }
  & (RunnerFactory extends () => infer R ? { runner: R } : {})
```

`runner` is present and typed as the exact runner instance *only* when the definition
declares a `runner` factory. When no runner is declared, `runner` is absent from the type
entirely (not `undefined` — it simply doesn't exist). This is enforced at the type level via
conditional intersection.

---

### Entry vs. reactive per-state effects

Per-state effects fall into two distinct categories:

- **Enter-once effects** — run once on state entry, do setup work, return a cleanup.
  Signal reads inside these should be wrapped in `untrack()` to prevent accidental re-runs.
  Example: creating `<track>` elements, reading `mediaElement` from owners, starting a fetch.
- **Reactive-within-state effects** — intentionally re-run when a tracked signal changes while
  the state is active. Example: `syncTextTracks` Effect 2, which re-runs whenever
  `selectedTextTrackId` changes to re-apply mode sync.

Both categories use the same `effect()` mechanism. The distinction is enforced by convention
(`untrack()` for enter-once reads) rather than by the API — nothing in the definition shape
prevents an enter-once effect from accidentally tracking a signal and re-running.

**Inline computed anti-pattern:** `computed()` inside an effect body creates a new `Computed`
node on every re-run with no memoization. `Computed`s that gate effect re-runs must be hoisted
*outside* the effect body (typically at the factory function scope, before `createReactor()`).
This applies regardless of whether the effect is enter-once or reactive.

**Future direction:** Distinguish these in the definition shape — e.g., `entry` for enter-once
effects (automatically untracked) and `reactive` (or signal-keyed `on`) for reactive-within-state
effects. Revisit once more reactive-within-state examples accumulate.

---

## Open Questions

### `settled` on `ConcurrentRunner`

`SerialRunner` exposes `.whenSettled()`. `ConcurrentRunner` does not. `onSettled` at the
state level implies the runner has a way to signal completion.

Options:
- Add `whenSettled()` to `ConcurrentRunner` (triggers when `#pending` map empties)
- Define a `SettledRunner` interface and make `onSettled` only valid for runners that implement it

Leaning toward the former: `whenSettled` is a generally useful concept for any runner.

### Reactor `context` — what belongs where

`createReactor` accepts a `context` field, and effects receive `context` + `setContext`.
Reactor context is non-finite state visible in the snapshot.

In practice, the text track spike used empty `context: {}` throughout — reactor state was
held via closure variables and the `owners` signal. The formal `context` field is available
but its usage patterns are not yet settled.

Open: what belongs in Reactor `context` vs. closure variables vs. the `owners` signal?
Tradeoffs: observability (context is in the snapshot; closure is not) vs. simplicity
(closure is zero API surface). Revisit as more Reactors are written.
