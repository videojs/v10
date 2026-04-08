---
status: draft
date: 2026-03-11
---

# SPF Primitives

The five foundational building blocks of SPF. Each section tracks what is decided, what is the current approach, and what remains open — the balance has shifted significantly as the text track spike (videojs/v10#1158) settled the factory designs and committed the signals primitive.

---

## 1. Tasks

An ephemeral unit of async work. Promise-inspired but with more structure: a Task has an inspectable status, is abortable, and transitions through a well-defined finite set of states.

### Concept

A Task represents a single operation — a fetch, a SourceBuffer append, a remove — with a defined lifecycle. Unlike a raw `Promise`, a Task:

- Starts in a **pending state** before it runs — it exists before execution begins, which means it can be inspected, queued, replaced, or aborted before any work starts
- Can be **aborted** from outside at any point, with that signal propagated inward
- Exposes its **status synchronously** (callers can ask "is this running?" without awaiting)
- Carries a typed **`value`** and **`error`**, readable synchronously once the Task settles — no need to await the promise
- Has a **finite, well-known set of states**: `pending → running → done | error`

Calling **`run()`** transitions the Task from `pending` to `running` and returns a `Promise<TValue>`. A Task can be run directly, or via a TaskRunner — a helpful abstraction for aggregating and scheduling groups of related Tasks (see §2).

This is the core relationship between a Task and a plain async function. The Task interface defines `run()` as the boundary where execution begins. The primary class implementation expresses this by accepting a `(signal: AbortSignal) => Promise<TValue>` at construction time — a convenient way to define the work without subclassing — but any implementation of the Task interface is valid.

The pending state is one of the key distinctions from `Promise`. A Promise begins executing the moment it is created; a Task can be created, passed around, and queued without any work starting until a Runner decides to execute it.

`value` and `error` have an explicit **ordering guarantee**: `value` is written before `status` transitions to `done`; `error` is written before `status` transitions to `error`. Any reader observing a terminal status is guaranteed the corresponding field is already populated.

Currently, abort is not a separate terminal state — aborting causes the run function to throw, which lands the Task in `error`. See Open Questions for the tentative plan to change this.

Tasks can theoretically be composed in the same ways Promises can — sequentially (A's output becomes B's input), in parallel, or as a pipeline of transformations. This isn't currently done at the Task level; composition today happens at the function-and-Promise level, where one async function's result is passed into the next. Lifting that pattern to Tasks would make the composition explicit and give each step its own status, value, and abort handle.

A Task is ephemeral: once it reaches a terminal state, it stays there. It is not restarted.

### Relationship to Actors

A Task is the unit of work *inside* an Actor or Reactor. Actors plan and execute Tasks; they don't expose Tasks externally. A Task's status may or may not be part of the Actor's observable snapshot — that's a design choice for the Actor, not the Task.

### Current approach

`core/task.ts` — thin wrapper around a function with an `AbortController`. The shape is approximately right; the question is how much structure to add.

> **See also:** [actor-reactor-factories.md](actor-reactor-factories.md) — decided design for `createMachineActor` / `createMachineReactor`, including how runners are declared and lifecycle-managed.

### Open questions

- **`aborted` as a distinct terminal state** — currently a Task that is aborted throws and lands in `error`, losing the distinction between "cancelled" and "failed". Tentatively, `aborted` should be a first-class terminal state: `pending → running → done | error | aborted`. The mechanism is straightforward — when `run()` catches a rejection, it checks whether the Task's abort signal is already aborted; if so, it transitions to `aborted` rather than `error`. This keeps the abort/error distinction out of the error value and makes it inspectable via `status` alone.
- **Where does "queued" state live?** A Task knows it is `pending`; a Runner knows which pending Tasks it holds. Whether "this Task is currently queued in Runner X" should be formally surfaced — on the Runner, on the Actor, or not at all — is an open question that spans §2 (TaskRunners) and §3 (Actors).
- **Task as Actor** — Tasks already have `status`, `value`, and `error`. Normalizing these into a single `snapshot` object would make a Task's shape closer to an Actor's. Tentatively, keep them separate: Tasks are ephemeral work units, Actors are long-lived stateful things, and collapsing that distinction adds complexity without clear benefit. Revisit if a unification becomes necessary or valuable. A related sub-question: even short of full unification, should `status + value + error` be grouped into a `snapshot` for consistency? Tentatively no, for the same reason — hold off unless a concrete need emerges.

---

## 2. TaskRunners

An abstraction that separates *what* runs (a Task) from *when and how* it runs. Different Runner strategies produce different scheduling and concurrency behaviors.

### Concept

A Runner accepts Tasks and decides when to execute them. The caller submits work without knowing when it will start. This decoupling makes it easy to swap scheduling strategies — for example, swapping serial execution for concurrent without changing the Task definition.

Known useful strategies:

- **Serial** — one Task at a time; queue the rest. Each Task runs independently — an error or abort in one does not prevent subsequent Tasks from running. (Contrast with a hypothetical *chained* runner, where Tasks would be linked and a failure would break the chain.)
- **Concurrent with deduplication** — run Tasks in parallel, but drop or replace if a Task with the same ID is already in-flight or queued.
- Others (priority, throttled, etc.) may emerge.

### Relationship to Tasks and Actors

Runners are internal to Actors and Reactors. An Actor may own one or more Runners (e.g., one serial Runner per SourceBuffer). Runners are not exposed externally; they're an implementation detail of how an Actor executes its work.

### Current approach

`SerialRunner` and `ConcurrentRunner` in `core/task.ts`. The core abstraction is right.

### Open questions

- **Runner state modeling and observability** — should a Runner formally model its pending and running Tasks (beyond just tracking them internally for `abortAll`)? If so, should that state be observable — and if observable, does it belong on the Runner itself or only surfaced via the owning Actor's snapshot? A related sub-question: should a Task briefly remain visible in a terminal state (`done` or `error`) before being removed, giving subscribers a notification window? Or are terminal Tasks removed immediately, with callers expected to observe results through other means (e.g., the Task's own `value`/`error`, or the Actor's snapshot)?
- **Runner composition** — can Runners be nested (a serial Runner of concurrent Runners)? Probably not needed now, but worth keeping in mind.

---

## 3. Actors

Long-lived instances that own state over time, receive messages, and use Tasks and Runners to execute work. The primary stateful workers in SPF.

### Concept

An Actor:

- Has an observable **snapshot** — a typed record of its current context (what's been buffered, what track is loaded, etc.) plus a **status** drawn from a finite state machine
- Receives **messages** via an explicit `send(message)` method — imperative input
- Executes work in response to messages using Tasks and Runners
- Is the sole owner and writer of its own state — reads and writes flow through the Actor's own snapshot; external state is not directly accessed

The snapshot is observable: other things (Reactors, `endOfStream`, the engine) can subscribe to Actor state changes without polling.

Actors are created via **factory functions** (`createMachineActor`, `createTransitionActor`) that take a declarative definition object. The factory owns all mechanics (snapshot signal, runner lifecycle, `'destroyed'` guard); the definition owns behavior.

### Relationship to Reactors

An Actor does not know about state outside itself. It receives messages and produces state changes. Reactors observe external state and decide when and what to `send()` to Actors — the coordination layer lives in the Reactor, not the Actor.

### Current approach

`createMachineActor` in `core/create-machine-actor.ts` — a declarative factory replacing bespoke closures.
Actors define state, context, message handlers per state, and an optional runner factory in
a definition object. The factory manages the snapshot signal, runner lifecycle, and
`'destroyed'` terminal state. See [actor-reactor-factories.md](actor-reactor-factories.md).

`SourceBufferActor` and `SegmentLoaderActor` both use `createMachineActor`. Actors without
FSM states (e.g., `TextTracksActor`) use `createTransitionActor` — a reducer-style factory
with observable context but no per-state behavior. Lightweight callback actors (e.g.,
`TextTrackSegmentLoaderActor`) implement the `CallbackActor` interface directly.

### Decided

- **Snapshot as signal** — Actors expose `snapshot` as a `ReadonlySignal`, making current state synchronously readable and tracked in reactive contexts without polling.
- **Message validity per state** — Actors define valid messages per state via a per-state `on` map in the definition. Messages sent in a state with no handler for that type are silently dropped. `'destroyed'` always drops all messages.
- **Factory function, not base class** — `createMachineActor(definition)` rather than `extends BaseActor`. See [actor-reactor-factories.md](actor-reactor-factories.md).
- **`'destroyed'` is always implicit** — the framework adds it as the terminal state; user status types never include it.
- **Actor dependencies are explicit** — Actors receive dependencies at construction time (via the factory call site) and interact with peer Actors via `send()`. No global state access.

### Open questions

- **Error handling** — if a Task inside an Actor throws an unaborted error, does the Actor die, recover to an error state, or retry? No answer yet; depends on which Actors exist and what errors are recoverable.

---

## 4. Reactors

Long-lived instances that *react* to observable state changes rather than receiving explicit messages. Like Actors, they have an observable snapshot with status and use Tasks and Runners for async work.

### Concept

A Reactor:

- Has an observable **snapshot** with **status** (same structure as an Actor)
- Is **driven by subscriptions** to external state — when observed state changes in a relevant way, the Reactor decides whether and how to respond
- Uses Tasks and Runners to execute work, just like an Actor
- Has **no `send()` method** — it cannot receive imperative messages

The key distinction from a plain effect or subscription: a Reactor has its own state machine and is a first-class observable thing. Other parts of the system can observe a Reactor's status ("is the segment loader currently loading?") without coupling to its internals.

Most of what currently lives in `dom/features/` as top-level functions are conceptually Reactors — they subscribe to state, do async work, and produce side effects. The missing piece is the formal status/snapshot structure.

### Relationship to Actors

A Reactor is typically the bridge between observable state and one or more Actors. It observes state, decides what message to send, and calls `actor.send(message)`. The Actor handles execution; the Reactor handles coordination.

### Current approach

`createMachineReactor` in `core/create-machine-reactor.ts` — a declarative factory. The first Reactor
implementations are in `dom/features/` as part of the text track spike (videojs/v10#1158):
`syncTextTracks` and `loadTextTrackCues`. See [text-track-architecture.md](text-track-architecture.md)
for the reference implementation.

Older features in `dom/features/` (e.g., `loadSegments`, `endOfStream`) are still
function-based with no formal status or snapshot — they remain to be migrated.

### Decided

- **Snapshot as signal** — same decision as Actors. `snapshot` is a `ReadonlySignal<{ status, context }>`.
- **Factory function, not base class** — `createMachineReactor(definition)`. Per-state effect arrays; each element becomes one independent `effect()` call. See [actor-reactor-factories.md](actor-reactor-factories.md).
- **Reactors do not send to other Reactors** — coordination flows through state or via `actor.send()`.
- **`monitor` for cross-cutting state derivation** — a `monitor` function (or array) returns the target state; the framework drives the transition. Registered before per-state effects — the ordering guarantee ensures transitions fire before per-state effects re-evaluate. See [actor-reactor-factories.md](actor-reactor-factories.md).
- **`entry` / `effects` per-state split** — `entry` runs once on state entry, automatically untracked. `effects` re-run when tracked signals change. This makes reactive intent explicit in the definition shape rather than relying on `untrack()` conventions.
- **Context via closure (tested approach)** — the text track spike used closure variables for Reactor non-finite state throughout. Reactors do not have a formal `context` field — non-finite state is held in closures and the `owners` signal.

### Open questions

- **Effect scheduling** — when observed state changes, does a Reactor's response fire synchronously within the same update batch, or always deferred? The current implementation defers via `queueMicrotask`; the exact semantics under compound state changes are not fully characterized.
- **Lifecycle ownership** — who creates and destroys Reactors? Currently the engine owns this explicitly. With a signal-based state primitive, Reactors could self-scope to a signal context and auto-dispose.
- **Reactor context — what belongs where** — non-finite state is held in closures and `owners`, not in a formal Reactor `context` field. The right answer depends on what debugging and testing patterns emerge.

---

## 5. Observable State

The reactive primitive that drives everything. State that can be observed over time, derived
from other state, and composed in complex ways.

The choice of signals as this primitive is a **committed architectural direction** — not an
open question. See [signals.md](signals.md) for the full decision rationale, tradeoffs,
and known friction. The sections below preserve the original conceptual comparison for
context; the "Current approach" and "Open questions" sections reflect the current state.

### Concept

Observable state needs to support:

- **(a) Mapping, filtering, distinctness** — deriving new state from existing state; only propagating when the value meaningfully changed
- **(b) Composition** — combining multiple state sources into derived state; expressing complex conditions as first-class values
- **(c) Subscriptions vs effects** — a clean distinction between "observe this value" and "run a side effect when this changes"
- **(d) Scheduling control** — not forcing async assumptions; ideally supporting different schedulers for different contexts
- **(e) Cacheable derived state** — computing a derived value once and reusing it until dependencies change (memoization)
- **(f) Abort/cleanup integration** — a natural way to cancel in-flight work when a subscription ends or a scope is destroyed
- **(g) Custom comparators** — controlling what counts as "changed" per-value rather than relying only on reference equality

### Signals

A **signal** is a value-over-time: it always has a current value, and subscribers are notified when that value changes. `computed()` (or `memo()`) creates derived signals with automatic dependency tracking and caching. `effect()` runs a side effect whenever accessed signals change and returns a cleanup.

**Addressing each requirement:**
- **(a)** `computed()` derives new state with automatic dependency tracking; filtering is expressed via conditional logic inside the computation. Distinctness is built in — computed values only propagate when the result changes.
- **(b)** `computed(() => fn(signalA(), signalB()))` — composition is natural and automatic; no explicit wiring of dependencies.
- **(c)** Reading a signal is observation; `effect()` is explicitly a side effect. The distinction is enforced at the call site.
- **(d)** Synchronous by default; how easily scheduling can be externalized varies by library. The TC39 Signals proposal separates "signal becomes dirty" from "effect re-runs" via a low-level `Watcher` API, leaving scheduling entirely to the caller. Libraries like `@preact/signals-core` run effects synchronously with `batch()` as the only grouping primitive, with limited room for a custom scheduler. Others (e.g. Vue's `watchEffect`) make scheduler policy configurable per-effect. This has direct implications for Reactors: synchronous effects fire mid-batch and require careful re-entrancy management; deferred scheduling is safer but less immediate.
- **(e)** `computed()` is lazy and automatically cached — re-evaluates only when a dependency changes. Sharing that cache across multiple use sites requires sharing the reference: a `computed()` defined once (e.g., at module scope or passed in at construction) and used in many places computes once. Two independently defined but structurally identical `computed()` calls are two independent nodes. A **shareable selector** pattern — exporting named derivations rather than defining inline anonymous functions at each use site — solves this, but is a convention rather than something the primitive enforces.
- **(f)** `effect()` returns a disposal function; wiring that to an `AbortController` is manual but straightforward.
- **(g)** Most implementations expose an `equals` option at signal or computed creation time.

**Overall:**
- **Always having a current value** forces explicit modeling of uninitialized state (e.g., `signal<TrackId | undefined>(undefined)`). Reading a signal that holds `undefined` in a context that doesn't handle it silently succeeds with the wrong value.
- **Reading outside a reactive context** silently returns the current value without setting up tracking — a footgun that requires discipline.
- **Shared derived state requires shared references** — the shareable selector pattern (define once, share the reference) works cleanly, but inline anonymous functions at each use site silently create independent computations. This is a convention concern: the primitive won't warn you, and the cost is redundant recomputation rather than correctness failures.
- Actor/Reactor snapshots as signals would make synchronous inspection (e.g., "is this actor idle right now?") natural.

### Observables

An **observable** is a sequence of values pushed to a subscriber over time. Composition uses operators (`map`, `filter`, `distinctUntilChanged`, `combineLatest`, etc.).

**An important framing note:** Looking at how SPF actually uses reactive state, every case is a *state over time* use case — current track, buffer state, bandwidth estimate, playback position. There are no pure event-stream use cases (actor message queues and network streams live inside Actors and Tasks, not in the observable state layer). This means in practice, observable state in SPF would be `BehaviorSubject`-based throughout — not cold streams. That reframes several of the concerns below.

**Addressing each requirement:**
- **(a)** `map()`, `filter()`, and `distinctUntilChanged()` — explicit and composable. `distinctUntilChanged()` accepts a custom comparator, similar to signals' `equals` option.
- **(b)** `combineLatest()`, `merge()`, `switchMap()`, etc. — powerful but requires explicit dependency wiring.
- **(c)** `tap()` inserts a side effect into a pipeline. It works, but the side effect is embedded within the composition rather than standing alongside it as `effect()` does — a different mental model that may feel awkward.
- **(d)** RxJS provides Schedulers for controlling delivery timing and backpressure strategies for handling fast producers. Customization depth warrants further investigation.
- **(e)** Derived state requires explicit `shareReplay(1)` + `distinctUntilChanged()` for caching, and must be carefully composed to avoid multiple independent upstream subscriptions. The same **shareable selector** pattern applies: a derived observable defined once and shared by reference is computed once; defined inline at each use site, it is computed independently each time. The cost of getting this wrong is higher than with signals since there is no automatic caching to fall back on — a carelessly duplicated `pipe()` chain creates multiple upstream subscriptions with no warning.
- **(f)** Unsubscribing cancels the chain; `takeUntil` is idiomatic for lifetime scoping. Mid-flight task concerns (e.g., aborting an in-flight fetch) live inside Actors and TaskRunners rather than in the observable composition itself, so this is largely a non-issue at the state layer.
- **(g)** `distinctUntilChanged(comparator)` accepts a custom equality function — comparable ergonomics to signals' `equals` option.

**Overall:**
- If SPF's observable state is always a `ReplaySubject(1)` with an initial value — functionally a `BehaviorSubject` — then "no current value" and "cold vs hot" are non-issues by design. Current value is always present; sources are always hot and shared. These concerns only apply if that convention breaks down, which is itself a discipline/enforcement question.
- **(e) Derived state caching** remains the sharpest concern. Base state is cached by the `ReplaySubject(1)`, but derived observables still require explicit `shareReplay(1)` + `distinctUntilChanged()`. The shareable selector pattern applies here too — but a duplicated `pipe()` chain doesn't just recompute: it creates multiple upstream subscriptions, which is a correctness concern rather than just an efficiency one.
- **Ergonomics** — `tap()` for effects and `shareReplay(1)` + `distinctUntilChanged()` for derived state are available but represent more ceremony than their signals equivalents. Contributors unfamiliar with RxJS idioms may find this harder to follow.
- TC39 Observable proposal is Stage 2 — closer to native than Signals (Stage 1).

### Mixing concerns

Using both signals and observables in the same system is possible but introduces friction at every boundary:

- **Signal → Observable**: wrap `effect()` in an Observable constructor. Loses synchronous scheduling guarantees; the observable subscriber sees updates asynchronously.
- **Observable → Signal**: subscribe in a side effect, write to a signal. Imports an async event into the synchronous reactive graph. Can cause "glitches" if the signal updates during a batch.

The risk is not that bridging is impossible — it's that every bridge is a potential source of subtle timing bugs, and bridges tend to multiply once the pattern is established. A system that uses both heavily will spend significant effort managing the boundary.

A disciplined hybrid could work: signals for state (current values, derived values, effects), observables only for event sequences where they're clearly superior (e.g., Actor message queues, network streams). The boundary must be explicitly defined and consistently enforced.

### Current approach

The TC39 `signal-polyfill` with a thin effect layer in `core/signals/effect.ts`. SPF wraps
this as `signal()`, `computed()`, `untrack()`, `update()`, and `effect()` in `core/signals/`.

This is a committed architectural direction. The text track spike (videojs/v10#1158) proved
that Actors and Reactors can be cleanly built on top of signals. The pre-existing
`core/state/` observable layer is no longer used for new code and should be treated as legacy.

See [signals.md](signals.md) for full decision rationale, TC39 risks and mitigations,
points of friction, and future directions.

### Open questions

- **Scheduling model for Reactors** — effects are currently deferred via `queueMicrotask`.
  The exact semantics under compound state changes (multiple signal writes in the same turn)
  are not fully characterized. SPF controls the scheduler via the `Watcher` API; whether
  different parts of the system ever need different scheduling is open.
- **How does abort/cleanup compose with the state primitive?** Cleanup today is manual
  (`effect()` returns a disposal function, wired by hand). A more principled integration
  with `AbortController` or signal-scoped lifetimes could reduce boilerplate.
- **Reading outside reactive context** — is this a discipline problem or a design problem?
  Currently discipline (`untrack()` conventions). The `entry`/`reactive` split in
  `createMachineReactor` would address the most common case structurally.

---

## Composition & Interop

How the five primitives fit together and the cross-cutting concerns that don't belong to any one of them.

### The dependency graph

```
Observable State
      ↑ reads/subscribes
  Reactors ──send()──→ Actors
      ↑ both use         ↑ both use
  TaskRunners ←── Tasks
```

- **Tasks** have no dependencies on the other primitives — they're pure async work units.
- **TaskRunners** depend only on Tasks.
- **Actors** depend on TaskRunners and Tasks. They may expose their snapshot via Observable State (signal or subscribable).
- **Reactors** depend on Observable State (they subscribe to it) and on Actors (they send messages to them). They also use TaskRunners and Tasks for their own async work.
- **Observable State** is the substrate — everything else either reads from it, writes to it, or both.

### Lifecycle ownership

Currently the `PlaybackEngine` explicitly creates, wires, and destroys every Actor and Reactor in a defined order. This works but is imperative and order-sensitive.

An alternative: if Reactors self-scope to the reactive graph (e.g., signal effects are owned by a context that the engine controls), destroying the engine's reactive scope could automatically dispose all Reactors. Actors would still need explicit lifecycle management since they hold external resources (SourceBuffer, MediaSource).

The signals primitive is now committed, so this is a real option — but it has not been evaluated against the explicit engine ownership model. See Open Questions.

### Scheduling coordination

The current `patch()` + `flush()` model exists because batching is needed for correctness (multiple synchronous patches shouldn't fire N subscriber callbacks), but immediate propagation is sometimes needed (bandwidth sampling must reach ABR before the next fetch starts).

With signals as the committed primitive, SPF still needs an explicit answer for: *when does a state change propagate to subscribers?* Options:

- **Always synchronous** (within batch): predictable, but requires careful batch discipline
- **Always deferred** (microtask): safe default, but requires explicit "flush" for time-sensitive paths
- **Configurable per-subscription**: most flexible, most complex

### Open questions

- **Engine as wiring vs engine as scope** — does the engine explicitly wire everything (current approach), or does it define a reactive scope that Reactors and Actors self-register into?
- **Consistent snapshot shape** — should Actors and Reactors share a base snapshot interface (both have `status`, both are subscribable)? This would let the engine treat them uniformly for lifecycle and observability.
- **Cross-Reactor state** — when a Reactor needs to know about another Reactor's status (e.g., "don't load segments if the media source isn't open yet"), does it read that Reactor's snapshot directly, or does all coordination flow through the shared state? Direct reads are simpler; state-mediated coordination is more decoupled.
