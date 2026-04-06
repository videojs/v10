---
status: decided
date: 2026-04-03
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
function. The factory constructs the live instance — managing the state signal, runner
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
  UserState extends string,
  Context extends object,
  Message extends { type: string },
  RunnerFactory extends (() => RunnerLike) | undefined = undefined,
> = {
  runner?: RunnerFactory;    // factory — called once at createActor() time
  initial: UserState;
  context: Context;
  states: Partial<Record<UserState, {
    onSettled?: UserState;  // when runner settles in this state → transition here
    on?: {
      [M in Message as M['type']]?: (
        message: Extract<Message, { type: M['type'] }>,
        ctx: HandlerContext<UserState, Context, RunnerFactory>
      ) => void;
    };
  }>>;
};

// runner is present and typed as the exact runner only when runner: is declared.
// When omitted, runner is absent from the type entirely (not undefined).
type HandlerContext<UserState, Context, RunnerFactory> = {
  transition: (to: UserState) => void;
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
type ReactorDefinition<State extends string> = {
  initial: State;
  /**
   * Cross-cutting monitor — returns the target state. The framework compares
   * to the current state and drives the transition. Registered before per-state
   * effects — see the monitor-before-state ordering guarantee below.
   *
   * Accepts a single function or an array of functions.
   */
  monitor?: ReactorDeriveFn<State> | ReactorDeriveFn<State>[];
  /**
   * Per-state definitions. States with no effects use `{}`.
   */
  states: Record<State, ReactorStateDefinition>;
};

/** Returns the target state. Framework drives the transition. */
type ReactorDeriveFn<State extends string> = () => State;

type ReactorStateDefinition = {
  /**
   * Entry effects — run once on state entry, automatically untracked.
   * No untrack() needed inside the fn body. Return a cleanup function or
   * AbortController to run on state exit.
   */
  entry?: ReactorEffectFn | ReactorEffectFn[];
  /**
   * Reactive effects — re-run whenever a tracked signal changes while
   * this state is active. Return a cleanup to run before each re-run
   * and on state exit.
   */
  reactions?: ReactorEffectFn | ReactorEffectFn[];
};

type ReactorEffectFn = () => (() => void) | { abort(): void } | void;
```

### Example — `syncTextTracks`

Two states (`preconditions-unmet` ↔ `set-up`), one `monitor`, and one `entry` + one
`reactions` effect in `set-up` with independent tracking and cleanup.

```typescript
const reactor = createReactor<'preconditions-unmet' | 'set-up'>({
  initial: 'preconditions-unmet',
  // monitor returns the target state; framework drives the transition.
  monitor: () => preconditionsMetSignal.get() ? 'set-up' : 'preconditions-unmet',
  states: {
    'preconditions-unmet': {},  // no effects — monitor handles exit

    'set-up': {
      // entry: automatically untracked — runs once on state entry.
      // Reading mediaElement and modelTextTracks here does NOT create dependencies.
      entry: () => {
        const el = mediaElementSignal.get() as HTMLMediaElement;
        const tracks = modelTextTracksSignal.get() as PartiallyResolvedTextTrack[];
        tracks.forEach(t => el.appendChild(createTrackElement(t)));
        return () => {
          el.querySelectorAll('track[data-src-track]').forEach(t => t.remove());
          update(state, { selectedTextTrackId: undefined });
        };
      },

      // reactions: re-runs when selectedId changes. el is read with untrack()
      // since element changes go through the monitor (preconditions-unmet path).
      reactions: () => {
        const el = untrack(() => mediaElementSignal.get() as HTMLMediaElement);
        const selectedId = selectedIdSignal.get(); // tracked — re-run on change
        syncModes(el.textTracks, selectedId);
        const unlisten = listen(el.textTracks, 'change', onChange);
        return () => unlisten();
      },
    },
  },
});
```

### Example — `loadTextTrackCues`

Four states with actor lifecycle managed across states, the `deriveState` pattern for
complex multi-condition transitions, and `untrack()` for non-reactive owner reads.

```typescript
// Hoist computeds outside the reactor — computed() inside an effect body
// creates a new Computed node on every re-run with no memoization.
const derivedStateSignal = computed(() => deriveState(state.get(), owners.get()));
const currentTimeSignal = computed(() => state.get().currentTime ?? 0);
const selectedTrackSignal = computed(() => findSelectedTrack(state.get()));

const reactor = createReactor<LoadTextTrackCuesState>({
  initial: 'preconditions-unmet',
  monitor: () => derivedStateSignal.get(),
  states: {
    'preconditions-unmet': {
      // entry: defensive actor reset on state entry (no-op if already undefined).
      // Handles all paths back from active states.
      entry: () => { teardownActors(owners); },
    },

    'setting-up': {
      entry: () => {
        teardownActors(owners);  // defensive — same as preconditions-unmet
        const mediaElement = owners.get().mediaElement as HTMLMediaElement;
        const textTracksActor = createTextTracksActor(mediaElement);
        const segmentLoaderActor = createTextTrackSegmentLoaderActor(textTracksActor);
        update(owners, { textTracksActor, segmentLoaderActor });
        // No return — deriveState drives the onward transition automatically.
      },
    },

    pending: {},  // neutral waiting state — no effects

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
  },
});
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
The shared core — state signal, `'destroyed'` terminal, `destroy()` — is thin enough to
extract as an internal `createMachineCore` without a unified public API. XState unifies because
its actors ARE the reactive graph; in SPF, the separation between reactive observation (Reactor)
and message dispatch (Actor) is intentional and worth preserving in the API surface.

---

### `'destroyed'` is implicit and always enforced

**Decision:** User-defined state types never include `'destroyed'`. The framework always adds it
as the terminal state. `destroy()` on any Actor or Reactor always transitions to `'destroyed'`
and calls exit cleanup for the currently active state.

```typescript
// User defines:
type LoaderUserState = 'idle' | 'loading';
// Framework produces:
type LoaderState = 'idle' | 'loading' | 'destroyed';
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

### `monitor`-before-state ordering guarantee

**Decision:** `monitor` effects are registered before per-state effects in `createReactor`.
This ordering is **load-bearing**: per-state effects can rely on invariants established by
`monitor` having already run.

**How it works:** The effect scheduler drains pending computeds into an insertion-ordered
`Set` before executing them. Because `monitor` effects are registered first, they are
guaranteed to execute before per-state effects in every flush.

**What this enables:** When a `monitor` fn returns a new state, `createReactor` calls
`transition()` immediately and updates the snapshot signal. By the time per-state effects run,
the reactor is already in the new state — so a per-state effect gated on
`snapshot.value !== state` correctly no-ops without needing to re-check conditions that the
`monitor` just resolved.

**Important caveat:** This guarantee is specific to `createReactor`'s registration order.
It is not a formal guarantee of the TC39 Signals proposal — it depends on the polyfill's
`Watcher` implementation preserving insertion order in `getPending()`. Do not assume this
ordering holds outside of `createReactor`. See [signals.md § Effect Execution Order](signals.md)
for the general principle.

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
  `context.state` internally. More compact for simple cases, but hides state-dependent
  behavior in imperative branches rather than making it explicit in the definition.

**Rationale:** Matches XState's model. State-scoped handlers make valid message/state combinations
explicit and inspectable from the definition alone — no need to trace imperative branches.

---

### `onSettled` at the state level

**Decision:** Each state can declare `onSettled: 'targetState'`. When the actor's runner settles
(all scheduled tasks have completed) while the actor is in that state, the framework automatically
transitions to `targetState`.

**Rationale:** This replaces the manual `runner.settled` reference-equality pattern in
`TextTrackSegmentLoaderActor`. The framework owns the generation-token logic — re-subscribing to
`runner.settled` each time tasks are scheduled so that `abortAll()` + reschedule correctly
cancels the previous settled callback.

---

### `entry` vs `reactions` per-state effects

Per-state effects fall into two distinct categories, each with its own key in the state definition:

- **`entry`** — run once on state entry, **automatically untracked**. No `untrack()` needed inside
  the fn body. Use for one-time setup: creating DOM elements, reading `owners`, starting a fetch.
  Return a cleanup function or `AbortController` to run on state exit (or re-entry if the effect
  runs again).
- **`reactions`** — intentionally re-run when a tracked signal changes while the state is active.
  Use for effects that must stay in sync with reactive data: mode sync, message dispatch.

Signals that should not trigger re-runs in a `reactions` effect must be wrapped with `untrack()`.
Signal reads inside `entry` are automatically untracked — the fn body runs inside `untrack()`.

**Inline computed anti-pattern:** `computed()` inside an effect body creates a new `Computed`
node on every re-run with no memoization. `Computed`s that gate effect re-runs must be hoisted
*outside* the effect body (typically at the factory function scope, before `createReactor()`).

---

## XState-style Definition vs. Implementation

The current design uses a single definition object that contains both structure (states, runner
type, initial state) and behavior (handler functions). XState v5 separates these:

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
{ transition: (to: UserState) => void; context: Context; setContext: (next: Context) => void }
  & (RunnerFactory extends () => infer R ? { runner: R } : {})
```

`runner` is present and typed as the exact runner instance *only* when the definition
declares a `runner` factory. When no runner is declared, `runner` is absent from the type
entirely (not `undefined` — it simply doesn't exist). This is enforced at the type level via
conditional intersection.

---

## Open Questions

_No open questions._
