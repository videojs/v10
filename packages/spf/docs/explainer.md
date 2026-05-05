# SPF — Stream Processing Framework

SPF is a general-purpose framework for building streaming playback engines. It provides a small set of composable primitives — reactive state, actors, reactors, and tasks — that let you assemble a playback engine from independent, decoupled features.

SPF keeps its opinions as localized as possible. The framework doesn't know about HLS, DASH, or any specific protocol. It provides the composition model; you provide the features.

---

## The Engine

A playback engine is a composition of **features** — functions that each handle one concern (manifest resolution, segment loading, ABR, etc.). The engine wires them together with shared reactive state and runs them.

```ts
import { createPlaybackEngine } from '@videojs/spf';

const engine = createPlaybackEngine([
  resolvePresentation,
  selectVideoTrack,
  loadVideoSegments,
  endOfStream,
]);
```

`createPlaybackEngine` is generic. It:

1. Creates shared **state** and **owners** signals
2. Passes them (along with **config**) to each feature
3. Returns the engine interface: `{ state, owners, destroy() }`

```ts
function createPlaybackEngine(
  features: Feature[],
  options?: {
    config?: C;
    initialState?: S;
    initialOwners?: O;
  }
): PlaybackEngine;
```

All options are optional. The simplest engine is just `createPlaybackEngine([myFeature])`.

### State, Owners, and Config

An engine has three shared channels:

| Channel | What it holds | Lifecycle |
|---------|--------------|-----------|
| **state** | Application state (selected tracks, bandwidth estimates, current time, etc.) | Reactive signal — read and written throughout the engine's lifetime |
| **owners** | Platform objects (media elements, SourceBuffers, actors) | Reactive signal — populated by features as resources are created |
| **config** | Static configuration (initial bandwidth, preferred languages, etc.) | Passed once at creation — not reactive |

None of these have a fixed shape. Their types are determined by the features in the composition — each feature declares what state, owners, and config fields it needs, and the engine's types are the intersection of those requirements.

### Features

A feature is a function that receives `{ state, owners, config }` and optionally returns a cleanup handle:

```ts
type Feature = (deps: { state, owners, config }) => void | (() => void) | { destroy(): void };
```

Features are independent. They don't know about each other — they communicate through shared state. A feature might:

- Observe state changes and react (a **reactor**)
- Own a stateful worker that processes messages (an **actor**)
- Run a one-time side effect on setup
- Do nothing but return a cleanup function

The engine doesn't care which. It calls the feature, collects any cleanup, and moves on.

---

## An HLS Engine

An HLS playback engine is one specific composition of features. There's nothing special about it from SPF's perspective — it's just a list of features and some config.

```ts
import { createPlaybackEngine } from '@videojs/spf';

function createSimpleHlsEngine(config = {}) {
  return createPlaybackEngine(
    [
      // Preload and playback tracking
      syncPreloadAttribute,
      trackPlaybackInitiated,

      // Manifest resolution
      resolvePresentation,

      // Track selection (reads config for initial preferences)
      selectVideoTrackFromConfig,
      selectAudioTrackFromConfig,
      selectTextTrackFromConfig,

      // Resolve selected tracks (fetch media playlists)
      resolveVideoTrack,
      resolveAudioTrack,
      resolveTextTrack,

      // Presentation duration
      calculatePresentationDuration,

      // MSE setup
      setupMediaSource,
      updateDuration,
      setupSourceBuffers,

      // Playback tracking and ABR
      trackCurrentTime,
      switchQualityFromConfig,

      // Segment loading
      loadVideoSegments,
      loadAudioSegments,

      // End of stream coordination
      endOfStream,

      // Text tracks
      syncTextTracks,
      loadTextTrackCues,
    ],
    { config, initialState: { bandwidthState: initialBandwidthState() } }
  );
}
```

Reading top to bottom, the engine tells a story: resolve a manifest, pick tracks, set up MSE, load segments, coordinate end-of-stream. Each line is a feature. To build a different engine — fewer features, different features, different protocol — you change the list.

### Config threading

Features that need configuration read it from `deps.config`. The engine passes config to every feature; each one destructures what it needs:

```ts
// A feature that reads config
const selectVideoTrackFromConfig = ({ config, ...deps }) =>
  selectVideoTrack(deps, {
    type: 'video',
    ...(config.initialBandwidth !== undefined && { initialBandwidth: config.initialBandwidth }),
  });

// A feature that doesn't need config — just ignores it
function resolvePresentation({ state }) {
  // ...
}
```

### Media-type wrappers

Some features are parameterized by media type (video, audio, text). Rather than passing `{ type: 'video' }` as inline config, we define thin wrappers that close over the type:

```ts
const loadVideoSegments = (deps) => loadSegments(deps, { type: 'video' });
const loadAudioSegments = (deps) => loadSegments(deps, { type: 'audio' });
```

This keeps the engine composition readable — a flat list of named features.

---

## The Three Layers

Features are built from three layers of primitives. Data flows in one direction:

```
  Reactive State (signals)
      │ observed by
      ▼
  Reactors (thin subscribers)
      │ send messages to
      ▼
  Actors (stateful workers)
      │ execute
      ▼
  Tasks (async work units)
```

### Reactive State — Signals

All shared state in SPF is built on [TC39 Signals](https://github.com/tc39/proposal-signals). A signal is a reactive value: it always has a current reading, and computations that read it are automatically notified when it changes.

```ts
import { signal, computed, effect } from '@videojs/spf';

const count = signal(0);
const doubled = computed(() => count.get() * 2);

effect(() => {
  console.log(doubled.get()); // re-runs when count changes
});

count.set(5); // logs: 10
```

SPF chose signals over observables because all SPF state is **state-over-time** — current track, buffer contents, bandwidth estimate. These are naturally modeled as "a value that changes" rather than "a stream of events." Signals give you automatic dependency tracking for derived state, synchronous reads, and a lower barrier to entry than observable pipelines.

### Reactors

A reactor observes reactive state and responds to changes. It has its own finite state machine and can run per-state effects. Reactors don't receive messages — they're driven entirely by signal observation.

```ts
const reactor = createMachineReactor({
  initial: 'preconditions-unmet',
  monitor: () => canResolve(state.get()) ? 'resolving' : 'preconditions-unmet',
  states: {
    'preconditions-unmet': {},
    resolving: {
      entry: () => {
        // Run once on state entry (automatically untracked)
        const ac = new AbortController();
        fetchAndParse(state, ac.signal);
        return ac; // cleanup on state exit
      },
    },
  },
});
```

Key concepts:
- **`monitor`** — derives the target state from signals. The framework drives the transition.
- **`entry`** — runs once on state entry, automatically untracked. Return a cleanup.
- **`effects`** — re-run when tracked signals change. For reactive sync.

### Actors

An actor is a long-lived stateful worker that processes messages serially. It owns a reactive snapshot (status + context) and uses tasks and runners to execute work.

```ts
const actor = createMachineActor({
  runner: () => new SerialRunner(),
  initial: 'idle',
  context: { segments: [], initTrackId: undefined },
  states: {
    idle: {
      on: {
        'append-segment': (msg, { transition, runner, setContext }) => {
          transition('updating');
          const task = makeAppendTask(msg);
          runner.schedule(task).then(setContext);
        },
      },
    },
    updating: {
      onSettled: 'idle', // auto-return when runner settles
    },
  },
});
```

Key concepts:
- **`send(message)`** — the only way to communicate with an actor
- **`snapshot`** — reactive read-only state, observable by reactors and other consumers
- **`runner`** — schedules and executes tasks (serial, concurrent, etc.)
- **`onSettled`** — automatic transition when all tasks complete

### How they connect

A reactor observes state, decides something needs to happen, and sends a message to an actor. The actor does the work and updates its snapshot. Other reactors (or the engine) observe the actor's snapshot and react.

```
state changes → reactor observes → actor.send({ type: 'load', track })
                                        ↓
                                   actor executes tasks
                                        ↓
                                   actor.snapshot updates
                                        ↓
                              other reactors observe snapshot
```

This separation means:
- **Actors don't know about external state.** They receive messages and produce state changes.
- **Reactors don't do work.** They observe and coordinate.
- **State is the single source of truth.** Features communicate through it, not through each other.

---

## Tasks

A task is an ephemeral unit of async work with lifecycle tracking. Unlike a Promise, a task:

- Starts in a **pending** state before it runs — it can be inspected, queued, or aborted before any work begins
- Can be **aborted** from outside at any point
- Exposes its **status synchronously** (`pending`, `running`, `done`, `error`)
- Carries a typed **value** and **error**, readable once settled

Tasks are the unit of work inside actors. They're not exposed externally — actors plan and execute tasks, and the task's status may or may not surface in the actor's snapshot.

**Task runners** control scheduling:
- **SerialRunner** — one task at a time (used for SourceBuffer operations, which are inherently serial)
- **ConcurrentRunner** — parallel with deduplication by ID

---

## Open Questions

> These are areas where the design direction is clear but implementation details are still being worked through.

- **`presentation?: any`** — The engine-level state type uses `any` for the presentation field because it transitions from unresolved (`{ url }`) to resolved (`Presentation`) at runtime. Individual features narrow the type themselves. Signal invariance prevents using a union type here. A cleaner pattern is needed.
- **Feature state interfaces and Signal invariance** — More broadly, how should features declare their state requirements given that `Signal<T>` is invariant? The current pattern (features use generic constraints, engine state uses `any` where types conflict) works but has rough edges.
- **Task `aborted` as a distinct terminal state** — Currently abort lands in `error`. Should be first-class: `pending → running → done | error | aborted`.
- **Effect scheduling semantics** — Effects are deferred via `queueMicrotask`. The exact behavior under compound state changes (multiple signal writes in one turn) is behavioral, not formally specified.
- **Reactor lifecycle ownership** — Currently the engine explicitly creates and destroys everything. With signals, reactors could self-scope to a reactive context and auto-dispose.
