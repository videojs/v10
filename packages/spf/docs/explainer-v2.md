# SPF — Stream Processing Framework

SPF is a general-purpose framework for building streaming playback engines. It provides composable primitives — reactive state, actors, reactors, and tasks — that let you assemble a playback engine from independent, decoupled features.

The framework doesn't know about HLS, DASH, or any specific protocol. It provides the composition model; you provide the features.

---

## The Engine

Everything starts with `createComposition`. An engine composes **features** — functions that each handle one concern — and wires them together through shared reactive state.

```ts
import { createComposition } from '@videojs/spf/playback-engine';

const engine = createComposition([featureA, featureB]);
```

The engine creates shared reactive channels, passes them to each feature, and returns:

```ts
engine.state     // reactive state signal (application data)
engine.owners    // reactive owners signal (platform resources)
engine.destroy() // tear down the engine and all features
```

The rest of this document builds up from the simplest possible engine to the full HLS playback engine that ships with SPF.

---

## State

A feature is a function that receives `{ state, owners, config }` and optionally returns a cleanup function. The simplest feature reads state and config:

```ts
import { createComposition } from '@videojs/spf/playback-engine';
import { update } from '@videojs/spf';

const engine = createComposition(
  ({ state, config }) => {
    const interval = setInterval(() => {
      // update() shallow-merges into current state
      update(state, { count: (state.get().count ?? 0) + 1 });
      // state.set() replaces the entire value:
      // state.set({ ...state.get(), count: (state.get().count ?? 0) + 1 });
    }, config.interval ?? 1000);

    return () => clearInterval(interval);
  },
  { initialState: { count: 0 }, config: { interval: 250 } }
);

engine.state.get(); // { count: 0 }
// ... after ~1 second
engine.state.get(); // { count: 1 }

await engine.destroy(); // clears the interval
```

`update()` shallow-merges a partial object into the current state; `state.set()` replaces the whole thing. The feature reads `config.interval` with a fallback for when no config is provided. `initialState` seeds the state signal — without it, state starts as `{}` and the `?? 0` default handles the first tick. The engine collects cleanup functions and calls them on `destroy()`.

---

## Owners

An engine has two reactive channels: **state** for application data and **owners** for platform resources. State and owners are both built on [TC39 Signals](https://github.com/tc39/proposal-signals) — reactive values that automatically notify dependents when they change. Use `effect()` to react to changes in either channel:

```ts
import { createComposition, effect } from '@videojs/spf/playback-engine';
import { update } from '@videojs/spf';

// Feature: increments a counter
function counter({ state, config }) {
  const interval = setInterval(() => {
    update(state, { count: (state.get().count ?? 0) + 1 });
  }, config.interval ?? 1000);
  return () => clearInterval(interval);
}

// Feature: renders count to a DOM element
function render({ state, owners, config }) {
  return effect(() => {
    const { renderElement } = owners.get();
    if (!renderElement) return;
    renderElement.textContent = String(state.get().count ?? config.defaultText ?? 'N/A');
  });
}

const engine = createComposition(
  [counter, render],
  {
    initialState: { count: 0 },
    config: { interval: 250, defaultText: '--' },
    initialOwners: { renderElement: document.getElementById('counter') },
  }
);
```

`effect()` runs its callback immediately, tracks which signals were read, and re-runs whenever those signals change. The `render` feature reads from both channels — `state` for the count value and `owners` for the DOM element — so it re-runs when either changes. The guard (`if (!renderElement) return`) handles the case where owners hasn't been populated yet.

This is also the first example with two features. They don't know about each other — `counter` writes state, `render` reads it. Both return cleanup: `counter` clears its interval; `render` returns the stop function from `effect()`. The engine collects these and calls them on `destroy()`.

The separation between state and owners signals intent. State is data that flows through the engine — counts, selections, timestamps. Owners are platform resources that features operate on — elements, buffers, connections. Both are reactive signals with the same API.

---

## Tasks

Sometimes a feature needs to do async work — save data, fetch a resource, process a chunk. You could use a Promise directly, but Promises start executing immediately and can't be cancelled. A **Task** is an async unit of work that:

- Exists before it runs — it can be inspected, queued, or aborted while still `'pending'`
- Can be **aborted** from outside at any point
- Exposes its **status** synchronously (`'pending'`, `'running'`, `'done'`, `'error'`)

A **SerialRunner** schedules tasks one at a time — the next task waits until the current one finishes. This is useful when operations must not overlap (saving state, appending to a buffer, etc.).

Building on our counter, let's add a `persist` feature that saves the count to a server every 5 ticks, and does one final save on destroy:

```ts
import { createComposition, effect } from '@videojs/spf/playback-engine';
import { Task, SerialRunner, update } from '@videojs/spf';

// Feature: increments a counter
function counter({ state, config }) {
  const interval = setInterval(() => {
    update(state, { count: (state.get().count ?? 0) + 1 });
  }, config.interval ?? 1000);
  return () => clearInterval(interval);
}

// Feature: renders count to a DOM element
function render({ state, owners, config }) {
  return effect(() => {
    const { renderElement } = owners.get();
    if (!renderElement) return;
    renderElement.textContent = String(state.get().count ?? config.defaultText ?? 'N/A');
  });
}

// Feature: persists count at a configurable interval
function persist({ state, config }) {
  const runner = new SerialRunner();

  function save(count) {
    runner.schedule(new Task((signal) =>
      fetch('/api/count', {
        method: 'POST',
        body: JSON.stringify({ count }),
        signal,
      })
    ));
  }

  // Watch count and save at every 5th tick
  const stopEffect = effect(() => {
    const { count } = state.get();
    if (count > 0 && count % (config.saveEvery ?? 5) === 0) {
      save(count);
    }
  });

  // Async cleanup: save the final count, then tear down
  return async () => {
    stopEffect();
    save(state.get().count);
    await runner.settled;
    runner.destroy();
  };
}

const engine = createComposition(
  [counter, render, persist],
  {
    initialState: { count: 0 },
    config: { interval: 250, defaultText: '--', saveEvery: 5 },
    initialOwners: { renderElement: document.getElementById('counter') },
  }
);

// Saves at count 5, 10, 15, 20...
// On destroy, saves whatever the final count is
await engine.destroy();
```

The `persist` feature introduces several concepts:

- **Task** — each save is a `new Task(...)` that receives an `AbortSignal`. The runner can cancel it if needed.
- **SerialRunner** — ensures saves run one at a time. If the counter hits 5 and then 10 before the first save completes, the second save queues behind the first.
- **Async cleanup** — the cleanup function is `async`. It stops the effect, schedules one final save, waits for the runner to settle, then destroys it. `engine.destroy()` awaits this.

---

## An HLS Engine

An HLS playback engine is one specific composition of features. There's nothing special about it from SPF's perspective — it's just a list of features and some config.

```ts
import { createComposition } from '@videojs/spf';

function createHlsPlaybackEngine(config = {}) {
  return createComposition(
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
