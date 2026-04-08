---
status: decided
date: 2026-04-03
---

# Actor and Reactor Factories

Design for `createMachineActor` and `createMachineReactor` — the declarative factory functions that replace
bespoke Actor classes and function-based Reactors in SPF.

Motivated by the text track architecture spike (videojs/v10#1158), which produced the first
`createMachineActor` / `createMachineReactor`-based implementations in SPF and surfaced the need for
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
const actor = createMachineActor(actorDefinition);
const reactor = createMachineReactor(reactorDefinition);
```

Both return instances that implement `SignalActor` and expose `snapshot` and `destroy()`.

A third factory, `createTransitionActor`, handles actors with reactive context but no
FSM. Lightweight callback actors implement the `CallbackActor` interface directly.

### Actor and Reactor Types

| Factory | States | Reactive? | Runner | Use when |
|---|---|---|---|---|
| `createMachineActor` | User-defined FSM | Yes (`snapshot`) | Optional | Per-state message dispatch, `onSettled`, async work |
| `createTransitionActor` | `active` / `destroyed` | Yes (`snapshot`) | No | Reactive context via reducer, no FSM needed |
| `CallbackActor` (manual) | None | No | Manual | Fire-and-forget messages, minimal overhead |
| `createMachineReactor` | User-defined FSM | Yes (`snapshot`) | No | Signal-driven transitions, per-state effects |

**Actors** (message-driven):
- **`MessageActor`** — returned by `createMachineActor`. Has finite states, per-state
  handlers, optional runner, and reactive `snapshot` with `value` + `context`.
  Used by: `SourceBufferActor`, `SegmentLoaderActor`.
- **`TransitionActor`** — returned by `createTransitionActor`. Pure reducer model:
  `(context, message) => context`. No finite states — `snapshot.value` is always
  `'active' | 'destroyed'`. Reactive context for downstream consumers.
  Used by: `TextTracksActor`.
- **`CallbackActor`** — manual implementation. `send()` + `destroy()`, no snapshot.
  Used when the actor needs no reactive state and the overhead of a factory isn't
  warranted. Used by: `TextTrackSegmentLoaderActor`.

**Reactors** (signal-driven):
- **`Reactor`** — returned by `createMachineReactor`. Has finite states, `monitor` for
  state derivation, and `entry`/`effects` per-state effects. No `send()` — driven
  entirely by signal observation.
  Used by: `syncTextTracks`, `loadTextTrackCues`, `resolvePresentation`, `trackPlaybackInitiated`.

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
  runner?: RunnerFactory;    // factory — called once at createMachineActor() time
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
  context: Context;          // snapshot at dispatch time — stale after any setContext call
  getContext: () => Context; // live untracked read — always current
  setContext: (next: Context) => void;
} & (RunnerFactory extends () => infer R ? { runner: R } : object);
```

### Example — `SourceBufferActor`

Serializes SourceBuffer operations. Shows `onSettled` for auto-return, an `onMessage`
helper to deduplicate handlers, `batch` for atomic multi-message dispatch, and `cancel`
in the work state. Tasks return the next context — `getContext` threading ensures each
task reads the context committed by the previous task.

```typescript
const onMessage = (msg: IndividualSourceBufferMessage, { transition, setContext, getContext, runner }: Ctx): void => {
  transition('updating');
  const task = messageToTask(msg, { getContext, sourceBuffer, setContext });
  runner.schedule(task).then(setContext, handleError);
};

return createMachineActor<UserState, SourceBufferActorContext, SourceBufferMessage, () => SerialRunner>({
  runner: () => new SerialRunner(),
  initial: 'idle',
  context: { segments: [], bufferedRanges: [], initTrackId: undefined },
  states: {
    idle: {
      on: {
        'append-init': onMessage,
        'append-segment': onMessage,
        remove: onMessage,
        batch: (msg, { transition, setContext, getContext, runner }) => {
          if (msg.messages.length === 0) return;
          transition('updating');
          msg.messages.forEach((m) => {
            const task = messageToTask(m, { getContext, sourceBuffer, setContext });
            runner.schedule(task).then(setContext, handleError);
          });
        },
      },
    },
    updating: {
      onSettled: 'idle',
      on: {
        cancel: (_, { runner }) => { runner.abortAll(); },
      },
    },
  },
});
```

### Example — `SegmentLoaderActor`

Plans and executes segment fetches. Shows context threading (`inFlightInitTrackId`,
`inFlightSegmentId`), continue/preempt decision in the `loading` handler, and
`abortPending()` vs `abortAll()` for fine-grained runner control.

```typescript
return createMachineActor<UserState, SegmentLoaderActorContext, SegmentLoaderMessage, () => SerialRunner>({
  runner: () => new SerialRunner(),
  initial: 'idle',
  context: { inFlightInitTrackId: null, inFlightSegmentId: null },
  states: {
    idle: {
      on: {
        load: (msg, ctx) => {
          const allTasks = planTasks(msg);
          if (allTasks.length === 0) return;
          ctx.transition('loading');
          scheduleAll(allTasks, ctx);
        },
      },
    },
    loading: {
      onSettled: 'idle',
      on: {
        load: (msg, ctx) => {
          const { context, runner } = ctx;
          const allTasks = planTasks(msg);
          const inFlightStillNeeded = /* check context against new plan */;

          if (inFlightStillNeeded) {
            runner.abortPending();                        // continue in-flight
            scheduleAll(excludeInFlight(allTasks), ctx);  // schedule remainder
          } else {
            runner.abortAll();                            // preempt everything
            sourceBufferActor.send({ type: 'cancel' });
            scheduleAll(allTasks, ctx);
          }
        },
      },
    },
  },
});
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
  effects?: ReactorEffectFn | ReactorEffectFn[];
};

type ReactorEffectFn = () => (() => void) | { abort(): void } | void;
```

### Example — `syncTextTracks`

Two states (`preconditions-unmet` ↔ `set-up`), one `monitor`, and one `entry` + one
`effects` effect in `set-up` with independent tracking and cleanup.

```typescript
const reactor = createMachineReactor<'preconditions-unmet' | 'set-up'>({
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

      // effects: re-runs when selectedId changes. el is read with untrack()
      // since element changes go through the monitor (preconditions-unmet path).
      effects: () => {
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

const reactor = createMachineReactor<LoadTextTrackCuesState>({
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
      // effects: re-runs whenever currentTime or selectedTrack changes.
      // owners is read with untrack() — actor presence is guaranteed by
      // deriveState when in this state; actor snapshot changes must not
      // re-trigger this effect.
      effects: () => {
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

**Decision:** `createMachineActor(def)` and `createMachineReactor(def)` rather than `extends BaseActor` /
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

### Separate `createMachineActor` and `createMachineReactor`

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
`createMachineActor()` is called. The runner lives for the actor's full lifetime and is destroyed
when the actor is destroyed.

**Alternatives considered:**
- **Magic strings** (`runner: 'serial'`) — requires a string-to-class registry and introduces an
  extra import layer. Deferred to a possible future XState-style definition-vs-implementation
  split.
- **Constructor reference** (`runner: SerialRunner`) — `new def.runner()`. Slightly less explicit
  than a factory; doesn't compose as naturally when construction needs configuration.
- **State-lifetime runners** — runner created on state entry, destroyed on state exit. Naturally
  eliminates the generation-token problem (`onSettled` always refers to the fresh chain), and
  aligns with XState's `invoke` model where async work is tied to the state that started it.
  Not adopted as the default because `TextTrackSegmentLoaderActor` intentionally persists runner
  state across idle/loading cycles. But this is worth revisiting per-actor — see
  [Open Questions](#state-scoped-runner).

**Rationale:** Actor-lifetime scope matches the current pattern and is the most flexible default.
A factory function (`() => new X(options)`) handles configured runners without changing the
framework. The generation-token problem (`onSettled` must refer to the latest chain, not a
stale one) is handled by the framework internally rather than by runner scope.

---

### `monitor`-before-state ordering guarantee

**Decision:** `monitor` effects are registered before per-state effects in `createMachineReactor`.
This ordering is **load-bearing**: per-state effects can rely on invariants established by
`monitor` having already run.

**How it works:** The effect scheduler drains pending computeds into an insertion-ordered
`Set` before executing them. Because `monitor` effects are registered first, they are
guaranteed to execute before per-state effects in every flush.

**What this enables:** When a `monitor` fn returns a new state, `createMachineReactor` calls
`transition()` immediately and updates the snapshot signal. By the time per-state effects run,
the reactor is already in the new state — so a per-state effect gated on
`snapshot.value !== state` correctly no-ops without needing to re-check conditions that the
`monitor` just resolved.

**Important caveat:** This guarantee is specific to `createMachineReactor`'s registration order.
It is not a formal guarantee of the TC39 Signals proposal — it depends on the polyfill's
`Watcher` implementation preserving insertion order in `getPending()`. Do not assume this
ordering holds outside of `createMachineReactor`. See [signals.md § Effect Execution Order](signals.md)
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

**Rationale:** The framework owns the generation-token logic — re-subscribing to
`runner.whenSettled()` each time the handler returns so that `abortAll()` + reschedule
correctly supersedes the previous settled callback. Both `SourceBufferActor` and
`SegmentLoaderActor` use `onSettled: 'idle'` to auto-return from their work states.

---

### `entry` vs `effects` per-state effects

Per-state effects fall into two distinct categories, each with its own key in the state definition:

- **`entry`** — run once on state entry, **automatically untracked**. No `untrack()` needed inside
  the fn body. Use for one-time setup: creating DOM elements, reading `owners`, starting a fetch.
  Return a cleanup function or `AbortController` to run on state exit (or re-entry if the effect
  runs again).
- **`effects`** — intentionally re-run when a tracked signal changes while the state is active.
  Use for effects that must stay in sync with reactive data: mode sync, message dispatch.

Signals that should not trigger re-runs in a `effects` effect must be wrapped with `untrack()`.
Signal reads inside `entry` are automatically untracked — the fn body runs inside `untrack()`.

**Inline computed anti-pattern:** `computed()` inside an effect body creates a new `Computed`
node on every re-run with no memoization. `Computed`s that gate effect re-runs must be hoisted
*outside* the effect body (typically at the factory function scope, before `createMachineReactor()`).

---

## XState Comparison

### Definition vs. Implementation

The current design uses a single definition object that contains both structure (states, runner
type, initial state) and behavior (handler functions). XState v5 separates these:

```typescript
// Definition — pure structure, no runtime dependencies
const def = setup({ actors: { fetcher: fetchActor } }).createMachine({ ... });

// Implementation — runtime wiring
const actor = createMachineActor(def, { input: { ... } });
```

This separation enables serialization, visualization, and testing the definition without
instantiation. SPF's current factory approach is compatible with this future direction:
`runner: () => new SerialRunner()` today becomes a named reference resolved against a provided
implementation map later. The migration path is additive — no existing definitions need to change.

#### Handler context API

The second argument to Actor message handlers is:
```typescript
{
  transition: (to: UserState) => void;
  context: Context;      // snapshot at dispatch time — stale after any setContext call
  getContext: () => Context; // live untracked read — always current
  setContext: (next: Context) => void;
}
  & (RunnerFactory extends () => infer R ? { runner: R } : {})
```

`runner` is present and typed as the exact runner instance *only* when the definition
declares a `runner` factory. When no runner is declared, `runner` is absent from the type
entirely (not `undefined` — it simply doesn't exist). This is enforced at the type level via
conditional intersection.

`context` vs `getContext`: use `context` for synchronous logic that runs in the handler body
itself (dispatch time). Use `getContext` when passing it to tasks scheduled on the runner —
async tasks execute after the handler returns, by which point `context` may be stale (e.g. a
previous task in a batch has already called `setContext`). Passing `getContext` ensures each
task reads the context committed by the task before it, making `workingCtx` threading
unnecessary for sequential operations.

---

### Async Work Model: Where Does Work "Belong"?

This is the most significant behavioral divergence from XState, with real tradeoffs in both
directions.

#### The SPF pattern

In SPF, when an actor like `SourceBufferActor` receives an `append-init` message while `idle`,
the `idle` handler does three things: transitions to `updating`, schedules the work on the
runner, and registers callbacks to update context and settle back to `idle` via `onSettled`.

```typescript
idle: {
  on: {
    'append-init': (msg, { transition, setContext, runner }) => {
      transition('updating');                   // 1. route
      const task = makeTask(msg);
      runner.schedule(task).then(setContext);   // 2. start work
      // 3. onSettled: 'idle' in updating handles the return
    }
  }
},
updating: { onSettled: 'idle' }
```

The work starts in the `idle` handler and finishes in `updating` via `onSettled`. Two things
happen in separate microtasks: `setContext` (from the task's `.then()`), then `transition('idle')`
(from `onSettled`). Observers see two emissions: `{ value: 'updating', context: newCtx }` followed
by `{ value: 'idle', context: newCtx }`.

#### The XState pattern

In XState, `idle` *only routes* — the work belongs to the state that is doing it:

```typescript
idle: {
  on: { 'append-init': { target: 'updating' } }  // just routing
},
updating: {
  invoke: {
    src: 'executeMessage',
    input: ({ event }) => event,     // the triggering event travels with the transition
    onDone: {
      target: 'idle',
      actions: assign(({ event }) => event.output)  // context + state update, atomically
    }
  }
}
```

`updating` invokes the work on entry, using the event that caused the transition as input.
When the work completes, `onDone` updates context and transitions state in one atomic step —
one emission: `{ value: 'idle', context: newCtx }`.

#### Consequences

**Atomicity.** XState's `onDone` updates context and state together; SPF does it in two
microtasks. Currently harmless — all consumers wait for `idle` before reading context — but
it's load-bearing discipline rather than a model guarantee.

**Lifecycle scoping.** In XState, when the machine leaves `updating` for any reason (a
`cancel` event, `destroy()`, etc.), the invoked service is cancelled automatically. In SPF, the
runner outlives any particular state. Cancellation is handled explicitly — via
`runner.abortAll()` / `runner.abortPending()` in message handlers and a first-class `cancel`
message on `SourceBufferActor`. `SegmentLoaderActor`'s `loading.on.load` handler encodes the
preempt/continue decision explicitly rather than through automatic state-exit cleanup.

**Partial / streaming updates.** SPF calls `setContext` — a closure callback that writes
context directly from inside the task, bypassing the event system. XState's equivalent is the
invoked service sending intermediate events back to the machine
(`sendBack({ type: 'CHUNK', data })`), which trigger context-updating transitions while the
machine stays in `updating`. More ceremony, but each intermediate state is a proper
event-driven transition — observable, testable, guarded.

**State graph scalability.** With two states the differences are manageable. If the actor grew
to handle `errored`, `draining`, or `quota-exceeded` states, the XState model scales cleanly —
each state owns its behavior, and leaving any state cancels its work. The SPF model requires
increasingly careful manual management as the graph grows.

#### Tradeoffs of adopting the XState model

The XState approach is not strictly better. The costs:

- **The runner doesn't go away.** `SerialRunner`'s serial queuing and abort semantics don't
  exist in XState's `invoke` primitive. The runner would move inside the invoked service rather
  than being eliminated. The benefit is lifecycle scoping, not simplification.
- **The dispatch table is the same either way.** Whether messages are routed in the `idle`
  handler or via `input: ({ event }) => event` in `updating`'s invoke, the `messageToTask`
  dispatch exists in both models. Location changes, not complexity.
- **Partial updates as events adds ceremony for a narrow case.** `setContext` fires once
  per streaming segment when the first chunk lands. Modeling it as machine events means the
  `updating` state handles task-internal events alongside external messages, with every chunk
  going through the full dispatch loop. Heavy machinery for one operation type.
- **TypeScript complexity.** With multiple message types all targeting `updating`, the invoke
  `input` type is a union and the service must discriminate on `event.type`.

#### Middle ground: state-scoped runner

The most targeted improvement would be making the runner *state-scoped* — created on entry to
`updating`, destroyed on exit — without adopting the full `invoke` model. This was explored
and deferred; see [Open Questions](#state-scoped-runner).

---

## Open Questions

### State-scoped runner {#state-scoped-runner}

The current actor-lifetime runner means work scheduled in `updating` completes regardless of
subsequent state transitions. For `SourceBufferActor`, this is intentional (a physical
SourceBuffer write must be reflected in the model even if a signal fires mid-operation). For
other actors, it's accidental — there's no mechanism to say "if the actor leaves this state,
abandon in-flight work."

A state-scoped runner would close this gap, but the investigation concluded it requires more
than convention:

- **Scheduling happens in `idle`, not `updating`.** `idle` handlers transition to `updating`
  and then schedule tasks — in the same function body, on the same runner reference. For the
  runner to be state-scoped, either `transition()` must return the new state's runner (magic,
  rejected), or task inputs must travel through context so that an `onEnter` hook on `updating`
  can drain them and do the scheduling there.
- **`onEnter` is a real API addition.** The "entry hook drains context" model is essentially
  a lightweight `invoke` — it requires `onEnter` in `ActorStateDefinition`, a per-state
  runner factory, and the framework to wire them up on state entry and exit. That's a meaningful
  framework change, not a convention.
- **Context as side channel is awkward.** Task inputs (message payloads) traveling through
  reactive actor context leaks internal scheduling details into the public snapshot.

**Decision:** Keep actor-lifetime runners for now. The generation-token problem is already
handled by the framework. The cancellation gap (work outliving its state) is real but not
currently exploited — no actor today has a non-settle path out of its work state. Revisit if
a new actor needs explicit cancellation on state exit, or if the framework grows `onEnter`
support for other reasons (at which point state-scoped runners become straightforward).
