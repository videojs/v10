---
status: decided
date: 2026-03-31
---

# Actor and Reactor Factories

Design for `createActor` and `createReactor` — the declarative factory functions that replace
bespoke Actor classes and function-based Reactors in SPF.

Motivated by the text track architecture spike (see `.claude/plans/foamy-finding-quasar.md`),
which produced the first proper `SignalActor` class implementations and surfaced the need for
shared, principled primitives.

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
type ActorDefinition<UserStatus extends string, Context, Message extends { type: string }> = {
  runner?: () => RunnerLike;      // factory — called once at createActor() time
  initial: UserStatus;
  context: Context;
  states: {
    [S in UserStatus]: {
      onSettled?: UserStatus;     // when runner settles in this state → transition here
      on?: {
        [M in Message as M['type']]?: (
          message: M,
          ctx: {
            transition: (to: UserStatus) => void;
            runner: RunnerLike;
            context: Context;
            setContext: (next: Context) => void;
          }
        ) => void;
      };
    };
  };
};
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
type ReactorDefinition<UserStatus extends string> = {
  initial: UserStatus;
  states: {
    [S in UserStatus]: Array<
      (ctx: { transition: (to: UserStatus) => void }) => (() => void) | void
    >;
  };
};
```

Each array element becomes one independent `effect()` call gated on that state. Multiple entries
for the same state produce multiple effects — each with independent dependency tracking and
cleanup. This is the mechanism that replaces multiple named `cleanupX` variables in the current
function-based reactors.

### Example — `syncTextTracks`

```typescript
const syncTextTracksDef = {
  initial: 'preconditions-unmet' as const,
  states: {
    'preconditions-unmet': [
      ({ transition }) => {
        if (preconditionsMet.get()) transition('setting-up');
      }
    ],
    'setting-up': [
      ({ transition }) => {
        setupTextTracks(mediaElement.get()!, modelTextTracks.get()!);
        transition('set-up');
      }
    ],
    'set-up': [
      // Effect #1 — guards state; exit cleanup tears down track elements
      ({ transition }) => {
        if (!preconditionsMet.get()) { transition('preconditions-unmet'); return; }
        const el = untrack(() => mediaElement.get()!);
        return () => teardownTextTracks(el);
      },
      // Effect #2 — mode sync + DOM change listener (independent tracking/cleanup)
      () => {
        syncModes(mediaElement.textTracks, selectedId.get());
        const unlisten = listen(mediaElement.textTracks, 'change', onChange);
        return () => unlisten();
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

---

## Open Questions

### `settled` on `ConcurrentRunner`

`SerialRunner` exposes `.settled` (the current promise chain tail). `ConcurrentRunner` does not.
`onSettled` at the state level implies the runner has a way to signal completion.

Options:
- Add `settled` to `ConcurrentRunner` (resolves when `#pending` map empties — same concept)
- Define a `SettledRunner` interface and make `onSettled` only valid for runners that implement it

Leaning toward the former: `settled` is a generally useful concept for any runner.

### Reactor `context`

The current design gives Reactors no context (no non-finite state). This matches the current
function-based reactors. If a Reactor needs to track something across effect re-runs (e.g.,
`prevInputs` in `loadSegments`), it currently uses a closure variable.

Open: should `createReactor` support an optional `context` field, or should Reactor context
always be held via closure? Closure is simpler; a formal context field would make Reactor
snapshots richer and more inspectable.

### Handler context API stability

The second argument to message handlers is currently sketched as
`{ transition, runner, context, setContext }`. The exact shape — including whether `runner` is
always present (or `undefined` when no runner is declared) and whether `context` is the full
snapshot context or a subset — is to be finalized during implementation.

---

### Reactor per-state effect semantics: entry vs. reactive

In practice, per-state effects fall into two distinct categories:

- **Enter-once effects** — run once on state entry, do setup work, return a cleanup. Signal reads
  inside these should generally be wrapped in `untrack()` to prevent accidental re-runs. Example:
  creating `<track>` elements, starting a fetch.
- **Reactive-within-state effects** — intentionally re-run when a signal changes while the state
  is active. Example: `syncTextTracks` effect 2, which re-runs whenever `selectedTextTrackId`
  changes to re-apply mode sync.

Currently both categories use the same `effect()` mechanism, and the distinction is enforced by
convention (explicit `untrack()` calls) rather than by the API. The `always` array is the primary
mechanism for reactive condition monitoring, but reactive-within-state effects are also a
legitimate use case.

A possible future direction: distinguish these in the definition shape — e.g., `entry` for
enter-once effects (automatically untracked) and `on` (signal-keyed or otherwise) for
reactive-within-state effects. This would make intent explicit and prevent accidental tracking
bugs in entry effects. Worth revisiting once more examples of the reactive-within-state pattern
accumulate.
