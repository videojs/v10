---
status: draft
date: 2026-05-18
---

# Actors

> **Actors are message-driven units that own serial async work over a resource they wrap.** They receive typed messages, run handlers (often via a runner that serializes async tasks), and expose a reactive `snapshot` so downstream observers can read their current state without coupling to the message channel. The canonical factories are `createMachineActor` (FSM + runner + per-state handlers), `createTransitionActor` (pure reducer over context), and the manual `CallbackActor` shape. This doc covers *when to reach for an Actor* and the composition patterns that come with it; for the factory shapes themselves see [`../actor-reactor-factories.md`](../actor-reactor-factories.md) and [`../primitives.md`](../primitives.md).

## When to reach for an Actor

An Actor is the right shape when **all** of these are true:

- The unit *owns* a resource (wraps an external API like `SourceBuffer`, `addTextTrack`/`addCue`; or owns long-lived bookkeeping like a cue cache).
- Work on that resource is **serial** — appends to a `SourceBuffer` can't overlap; cue additions need to honor add-order; segment fetches against a single bandwidth-tracker need to interleave correctly.
- Inputs arrive as **discrete events / decisions** ("load this range," "append these bytes," "clear all"), not as a continuous signal-derived value.
- You want a stable identity downstream consumers can reference (the actor's `snapshot`, its `send()` channel).

If the unit's job is "observe these signals and react when they change," that's a [Reactor](reactors.md), not an Actor. The two-line decision rule:

| Driven by | Reach for |
| --------- | --------- |
| Messages | Actor |
| Signals | Reactor |

A behavior almost always *composes* both: the dispatcher reactor reads signals and `send()`s messages; the actor receives, serializes, executes. Don't try to make one of them do the other's job.

### What about a plain `effect`?

For a mirror behavior with no resource ownership, no async work, and no message channel — read a signal, write a signal — neither Actor nor Reactor is needed; an `effect` is the right shape (see [`behaviors.md`](behaviors.md) → "Simple vs primitive-augmented").

## The three actor shapes

| Shape | Factory | States | Reactive snapshot | Runner | Reach for |
| ----- | ------- | ------ | ----------------- | ------ | --------- |
| `MessageActor` | `createMachineActor` | User-defined FSM | Yes | Optional | Per-state message handling, async work serialization, `onSettled` transitions, continue-vs-preempt logic |
| `TransitionActor` | `createTransitionActor` | `'active'` / `'destroyed'` | Yes | No | Pure reducer over context; snapshot is the public surface; no async work |
| `CallbackActor` | manual (no factory) | None | No | Manual | Fire-and-forget dispatch; no observable state; lightest possible shape |

The factory choice follows the work shape, not the message count. Two messages with rich serial async work behind them want `MessageActor`; ten messages that just mutate a context map want `TransitionActor`.

### Reach for `MessageActor` when

- Async work needs serialization (a runner) and per-message-type behavior depends on what's currently in-flight.
- States carry meaning — `'idle'` vs `'updating'` for a `SourceBuffer`; `'idle'` vs `'loading'` for a segment loader. The state determines which messages are valid and what they do.
- Continue-vs-preempt logic is needed: a new message arrives while work is in flight, and the handler must decide whether to keep, abort, or schedule on top.
- `SourceBufferActor` and `SegmentLoaderActor` are the canonical worked examples. `TextTrackSegmentLoaderActor` (post-`b3f44efe`) is the third — the FSM made room for continue-vs-preempt against a `<track>`-mounted cue cache.

### Reach for `TransitionActor` when

- The actor's job is bookkeeping: maintain reactive context (a map, a list, a cache) that downstream readers consume via `snapshot`.
- Messages are pure reducers: `(context, message) => context`. No FSM, no async, no runner.
- The reactive snapshot is the *whole point* — consumers read it via `actor.snapshot.get()` and react.
- `TextTracksActor` is the canonical worked example: maintains `cuesByTrackId` + `segmentsByTrackId` for duplicate-add detection and load planning. Messages (`'add-cues'`, `'clear'`) are reducer updates.

### Reach for `CallbackActor` when

- No reactive snapshot is needed.
- The actor is just a `send()` + `destroy()` shape — fire-and-forget.
- Adding a factory's machinery would be ceremony with one state.

Note: a `CallbackActor` upgraded to a `MessageActor` is a common migration as continue-vs-preempt logic becomes worth the bytes. `TextTrackSegmentLoaderActor`'s `b3f44efe` migration is the worked example — went from `CallbackActor` to `MessageActor` so the `idle`/`loading` FSM could track `inFlight*` context and decide continue-vs-preempt rather than abort-everything-on-every-`send`.

## One actor or two?

When a pipeline needs both **resource serialization** (mechanism — append to this `SourceBuffer`; add cues to this `<track>`) and **policy decisions** (which segments to fetch given current time + preload + selected track), prefer **two actors over one unified actor**.

The split is along the line "what to do" (policy) vs "how to do it" (mechanism):

- **Mechanism actor** wraps the external resource. Knows how to serialize append/remove/abort operations on it. Doesn't decide *what* to append.
- **Policy actor** plans the work. Decides which segments to fetch in what order; handles continue-vs-preempt across overlapping load requests. Doesn't directly touch the external resource — it `send()`s into the mechanism actor.

Why two:

- **Composition.** A `SegmentLoaderActor` (policy) needs to talk to *some* `SourceBufferActor` (mechanism). The split lets the loader exist with one interface, regardless of whether the buffer wraps an MSE `SourceBuffer`, an in-memory test stub, or a future alternative target.
- **Independent reasoning.** The mechanism actor's correctness is local — it serializes its API correctly. The policy actor's correctness is local — given the mechanism's contract, it plans the right work. A bug in one doesn't require re-reasoning about the other.
- **Reactive snapshots at the right grain.** Mechanism's snapshot is "what bytes are buffered, am I currently updating"; policy's snapshot is "what segments are in flight, what's queued." Downstream consumers read whichever they need — observers don't have to filter through one combined snapshot.

The two canonical pairs:

| Pipeline | Mechanism actor | Policy actor |
| -------- | --------------- | ------------ |
| Video / audio MSE | `SourceBufferActor` (wraps `SourceBuffer`; serializes appends via `SerialRunner`) | `SegmentLoaderActor` (plans + fetches segments; FSM with continue-vs-preempt) |
| Text tracks | `TextTracksActor` (`TransitionActor` over cues-by-track + segments-by-track) | `TextTrackSegmentLoaderActor` (`MessageActor` with `idle`/`loading` + `inFlightTrackId` + `inFlightSegmentId`) |

### When *not* to split

The split isn't free — two actors means two lifecycles, two snapshots, two destroy contracts. Don't split if:

- The "policy" half is trivially "send whatever message arrives to the mechanism." There's no planning, no continue-vs-preempt, no state worth modeling. A `CallbackActor` upstream of a `MessageActor` is two actors playing one role.
- The two halves can't be reasoned about independently — every policy decision needs the mechanism's full internal state, and the mechanism's correctness requires knowing the policy's intent. That's not actually two responsibilities; it's one responsibility that hasn't been factored cleanly.

### When to merge that *did* exist (and shouldn't recur)

Earlier text-track work briefly considered merging `TextTracksActor` + `TextTrackSegmentLoaderActor` into one. It was rejected: the cue-cache reducer (TransitionActor shape) and the load planner (MessageActor shape) have different state-machine needs. Merging would have either forced the cache into an FSM it doesn't need, or stripped the planner of the FSM it does need.

## Where actors are created: the per-type setup-actor convention

**A per-type setup-actor behavior owns the full per-type actor cluster.** When two actors form a writer-publisher unit (mechanism + policy bound to the same lifetime), they're created together in one setup behavior's `entry` body, and destroyed together in that body's exit cleanup. Downstream dispatcher behaviors read the policy actor from context and `send()` — they don't create either actor themselves.

Canonical worked examples on this branch:

- **`setupVideoBufferActors`** — entry body creates `SourceBuffer` → `SourceBufferActor` → `SegmentLoaderActor` in one synchronous block; publishes `videoBufferActor` + `videoSegmentLoaderActor` to context. Exit destroys in reverse (loader → buffer-actor) and clears slots. `loadVideoSegments` is pure-consumer: reads `videoSegmentLoaderActor`, dispatches.
- **`setupAudioBufferActors`** — mirrors video. `loadAudioSegments` mirrors `loadVideoSegments`.
- **`setupTextTrackActors`** — creates `TextTracksActor` + `TextTrackSegmentLoaderActor` together; publishes both. `loadTextTrackSegments` reads `textTrackSegmentLoaderActor`, dispatches. (Note `textTracksActor` is also published — it has a separate reader, `syncTextTracks`, which mounts `<track>` DOM nodes from its snapshot.)

The rule's diagnostic question: *which behavior currently calls `createXActor`?* If a dispatcher behavior is calling `createXActor` inside its own `setup` (i.e., creates the actor it consumes), that's the "creates and stashes its own consumed actor" sniff — extract the creation to a sibling setup-actor behavior; have the dispatcher read it from context.

### Why co-locate the cluster

- **Lifetime coupling is structural, not coordinated-through-signals.** `SegmentLoaderActor` *requires* a `SourceBufferActor` to construct; they have identical lifetimes (both come up when the source buffer is ready; both go down when it tears down). Co-locating their creation in one atomic `entry` body encodes the contract via call order, not via two reactors observing the same upstream signal and racing to see which goes up first.
- **The dispatcher's role becomes clean: pure-consumer.** Reading `xSegmentLoaderActor` from context and calling `send()` is the whole job. No "is the loader ready?" guard nested inside an effect that also created the loader.
- **Destroy order is naturally correct.** Reverse-order destroy in a single exit-cleanup closure: policy actor first (aborts in-flight work), then mechanism actor (tears down the underlying resource). Splitting creation across two behaviors makes destroy ordering depend on which behavior tears down first — fragile.

### Single-reader context publication is *not* a sniff

A context slot read by exactly one downstream behavior is the natural integration mechanism between a writer-behavior (the setup-actor) and a reader-behavior (the dispatcher) whose lifetimes coordinate through it. Earlier framing treated single-reader slots as gratuitous publication — the reframe: the slot's role is being the *integration channel between two cooperating behaviors*, not "broadcasting to N consumers." One reader is enough.

The sniff that *does* matter is the inverse: a slot published with no readers (dead context entry). Drop those.

### When the cluster splits across behaviors (legitimate exceptions)

The co-location rule has principled exceptions when the actor's lifetimes legitimately diverge:

- **Different upstream dependencies.** If actor A's lifetime is bound to the `MediaSource` attachment and actor B's lifetime is bound to the `mediaElement` (which outlives many `MediaSource`s on a player that swaps sources), they can't share an `entry` body — their setup behaviors have different gating. `TextTracksActor` is mediaElement-bound (DOM `<track>` slots can't be removed) and survives source resets; its segment-loader sibling is also mediaElement-bound, so they happen to co-locate; but a per-source actor and a per-element actor would not.
- **Different consumers want to swap one independently.** If a future shape lets engines swap the policy actor (e.g., a different segment-loader strategy) while keeping the mechanism actor, the split into two setup behaviors would be the right shape. Not exercised today.

The convention is "co-locate by default when lifetimes match"; the exceptions are real but rare. Don't split prophylactically — the cost of unnecessary splitting (lifecycle coordination through signals, destroy-order fragility) is the same as the cost of the original anti-pattern, just at a different layer.

## Lifecycle binding

An actor's lifetime is bound to the most ephemeral of its dependencies. Encode the binding through the setup-actor behavior's state machine:

| Actor | Lifetime bound to | Encoded in |
| ----- | ----------------- | ---------- |
| `SourceBufferActor` | `mediaSource` attached + selected track present with codecs | `setupVideoBufferActors` / `setupAudioBufferActors` `'buffer-ready'` state |
| `SegmentLoaderActor` | Same as `SourceBufferActor` (constructed from it) | Same — created and destroyed in the same `'buffer-ready'` entry/exit |
| `TextTracksActor` | `mediaElement` in scope | `setupTextTrackActors`'s `effect` (no FSM needed — single-resource gate) |
| `TextTrackSegmentLoaderActor` | Same as `TextTracksActor` | Same — created/destroyed in the same effect |

The destroy contract:

- **Synchronous and idempotent.** Calling `destroy()` twice is safe; calling it during in-flight work aborts.
- **Reverse-order in a cluster.** Policy actor first, mechanism actor second. Policy's destroy aborts in-flight work and prevents new dispatches; mechanism's destroy then tears down the underlying resource safely.
- **State-exit cleanup is the natural site.** `entry: () => { /* create */; return () => { /* reverse-destroy */ }; }` binds the cluster's lifetime to its setup-actor behavior's state machine. No closure flag, no `if (alreadyDestroyed)` guard.

## Composition: dispatcher reads, doesn't create

The full pipeline for one type:

```text
setupXBufferActors                          ←  actor cluster owner (writer)
  └─ entry on `'buffer-ready'`:
      ├─ creates SourceBuffer
      ├─ creates SourceBufferActor      ─→  context.xBufferActor
      └─ creates SegmentLoaderActor     ─→  context.xSegmentLoaderActor

loadXSegments                               ←  dispatcher (reader)
  └─ reads context.xSegmentLoaderActor
  └─ on signal changes: send({ type: 'load', ... })
```

The dispatcher's setup never calls `createSegmentLoaderActor`. It reads the slot, encodes its policy modes as reactor states (see [`reactors.md`](reactors.md) → "Policy modes as states"), and dispatches. Lifecycle concerns — actor creation, actor destroy, slot publication — belong upstream.

**Config threading:** actor factories accept a config arg at construction (e.g. `createSegmentLoaderActor(actor, fetch, { forwardBuffer, backBuffer })`). The setup-actor behavior is the natural place to thread engine config into the actor, because it's where the actor is created. See [`config.md`](config.md) → "Threading paths" → "Actor factories" for the full pattern.

## Anti-patterns

- **Actor that reads signals directly.** Actors are message-driven, not signal-driven. If an actor needs to react to a signal, the dispatcher behavior should observe the signal and `send()` a message. The reverse coupling makes the actor's behavior depend on a reactive context the actor itself doesn't expose, hiding causality from readers.
- **Dispatcher that creates its own consumed actor.** "Creates and stashes" sniff. Pull the creation up into a sibling setup-actor behavior; have the dispatcher read from context. See [Where actors are created](#where-actors-are-created-the-per-type-setup-actor-convention).
- **One actor playing two roles.** A `MessageActor` whose handlers do both serial-resource work *and* high-level planning is two responsibilities behind one snapshot. Split mechanism from policy.
- **Two actors playing one role.** A `CallbackActor` upstream of a `MessageActor` that just forwards every message is ceremonial decomposition. If the upstream isn't doing planning, continue-vs-preempt, or any state-dependent work, merge it into the downstream — or remove it.
- **Closure-mutable state in a handler that should be in `context`.** The factory provides `getContext` / `setContext` / `transition` precisely so handlers don't need closure state. `let lastFoo` parallel to a context field is double-bookkeeping and survives nothing the context doesn't already track.
- **`untrack`'d-but-actually-tracked snapshot reads from handler bodies invoked inside a tracked dispatcher.** When a dispatcher reactor calls `actor.send()` from inside an `effects:` body, the handler runs synchronously inside the reactor's tracking scope. A bare `actor.snapshot.get()` inside the handler then leaks the handler-actor's snapshot into the dispatcher's dep set, causing the dispatcher to re-fire on every handler-actor state change. Use `peek(actor.snapshot)` inside handlers when the dispatcher is the caller. (Worked example: `TextTrackSegmentLoaderActor.planTasks`'s `peek(textTracksActor.snapshot)` fix in `b3f44efe`; the same latent issue exists in `createSegmentLoaderActor.getBufferedSegments` and will surface when v/a's `loadingInputsEq` dedup is removed.)
- **Forgetting to destroy in reverse order in a cluster.** Mechanism-first destroy can race against the policy actor's in-flight work. Always policy-actor-destroy → mechanism-actor-destroy in cluster exit cleanups.
- **Publishing actors with no readers.** A `context.fooActor` slot that no dispatcher reads is dead weight in the engine context type — drop it. (Sniff that *does not* apply: a single-reader slot, which is the writer-reader integration channel by design.)
