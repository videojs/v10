# SPF Fundamentals

SPF is a general-purpose composition framework. It provides composable primitives — reactive state, actors, reactors, and tasks — that let you assemble a composition from independent, decoupled features.

The framework doesn't know about your domain. It provides the composition model; you provide the features.

---

## The Composition

Everything starts with `createComposition`. A composition combines **features** — functions that each handle one concern — and wires them together through shared reactive state.

```ts
import { createComposition } from '@videojs/spf/playback-engine';

const composition = createComposition([featureA, featureB]);
```

The composition creates shared reactive channels, passes them to each feature, and returns:

```ts
composition.state     // reactive state signal (application data)
composition.owners    // reactive owners signal (platform resources)
composition.destroy() // tear down the composition and all features
```

The rest of this document builds up from the simplest possible composition, introducing one concept at a time.

---

## State

A feature is a function that receives `{ state, owners, config }` and optionally returns a cleanup function. The simplest feature reads state and config:

```ts
import { createComposition } from '@videojs/spf/playback-engine';
import { update } from '@videojs/spf';

const composition = createComposition(
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

composition.state.get(); // { count: 0 }
// ... after ~1 second
composition.state.get(); // { count: 1 }

await composition.destroy(); // clears the interval
```

`update()` shallow-merges a partial object into the current state; `state.set()` replaces the whole thing. The feature reads `config.interval` with a fallback for when no config is provided. `initialState` seeds the state signal — without it, state starts as `{}` and the `?? 0` default handles the first tick. The composition collects cleanup functions and calls them on `destroy()`.

---

## Owners

A composition has two reactive channels: **state** for application data and **owners** for platform resources. State and owners are both built on [TC39 Signals](https://github.com/tc39/proposal-signals) — reactive values that automatically notify dependents when they change. Use `effect()` to react to changes in either channel:

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

const composition = createComposition(
  [counter, render],
  {
    initialState: { count: 0 },
    config: { interval: 250, defaultText: '--' },
    initialOwners: { renderElement: document.getElementById('counter') },
  }
);
```

`effect()` runs its callback immediately, tracks which signals were read, and re-runs whenever those signals change. The `render` feature reads from both channels — `state` for the count value and `owners` for the DOM element — so it re-runs when either changes. The guard (`if (!renderElement) return`) handles the case where owners hasn't been populated yet.

This is also the first example with two features. They don't know about each other — `counter` writes state, `render` reads it. Both return cleanup: `counter` clears its interval; `render` returns the stop function from `effect()`. The composition collects these and calls them on `destroy()`.

The separation between state and owners signals intent. State is data that flows through the composition — counts, selections, timestamps. Owners are platform resources that features operate on — elements, buffers, connections. Both are reactive signals with the same API.

---

## Tasks

Sometimes a feature needs to do async work — save data, fetch a resource, process a chunk. You could use a Promise directly, but Promises start executing immediately and can't be cancelled. A **Task** is an async unit of work that:

- Exists before it runs — it can be inspected, queued, or aborted while still `'pending'`
- Can be **aborted** from outside at any point
- Exposes its **status** synchronously (`'pending'`, `'running'`, `'done'`, `'error'`)

A **SerialRunner** schedules tasks one at a time — the next task waits until the current one finishes. This is useful when operations must not overlap (saving state, writing to a database, etc.).

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

const composition = createComposition(
  [counter, render, persist],
  {
    initialState: { count: 0 },
    config: { interval: 250, defaultText: '--', saveEvery: 5 },
    initialOwners: { renderElement: document.getElementById('counter') },
  }
);

// Saves at count 5, 10, 15, 20...
// On destroy, saves whatever the final count is
await composition.destroy();
```

The `persist` feature introduces several concepts:

- **Task** — each save is a `new Task(...)` that receives an `AbortSignal`. The runner can cancel it if needed.
- **SerialRunner** — ensures saves run one at a time. If the counter hits 5 and then 10 before the first save completes, the second save queues behind the first.
- **Async cleanup** — the cleanup function is `async`. It stops the effect, schedules one final save, waits for the runner to settle, then destroys it. `composition.destroy()` awaits this.

---

## Reactors

So far, features have used `effect()` to react to state changes. Effects work well for simple observation, but they re-run on _every_ change to their dependencies. What if a feature needs lifecycle — setup when a condition becomes true, teardown when it becomes false, and the ability to distinguish "just entered this state" from "still in this state"?

A **reactor** is a state machine driven by signal observation. Its `monitor` function derives the target state from signals. When the state changes, the reactor transitions — running `entry` effects on the new state and cleaning up the old one.

Let's make our counter pausable and resettable. We'll add button features that toggle pause and reset the count via owners:

```ts
import { createComposition, effect } from '@videojs/spf/playback-engine';
import { createMachineReactor, update } from '@videojs/spf';
import { listen } from '@videojs/utils/dom';

// Feature: a counter that can be paused
function counter({ state, config }) {
  return createMachineReactor({
    initial: 'paused',
    monitor: () => (state.get().paused ? 'paused' : 'running'),
    states: {
      paused: {},
      running: {
        // entry runs once when transitioning to 'running'.
        // Its return value is cleanup — called on exit (pause or destroy).
        entry: () => {
          const interval = setInterval(() => {
            update(state, { count: (state.get().count ?? 0) + 1 });
          }, config.interval ?? 1000);
          return () => clearInterval(interval);
        },
      },
    },
  });
}

// Feature: wires up a pause/unpause button
function pauseButton({ state, owners }) {
  // Update button text reactively
  effect(() => {
    const { pauseBtn } = owners.get();
    if (!pauseBtn) return;
    pauseBtn.textContent = state.get().paused ? 'Start' : 'Pause';
  });

  // listen() adds an event listener and returns a cleanup function.
  // Returning it from effect() means the listener is removed when the
  // button is replaced or the composition is destroyed.
  return effect(() => {
    const { pauseBtn } = owners.get();
    if (!pauseBtn) return;
    return listen(pauseBtn, 'click', () => {
      update(state, { paused: !state.get().paused });
    });
    // Equivalent to:
    // const handler = () => update(state, { paused: !state.get().paused });
    // pauseBtn.addEventListener('click', handler);
    // return () => pauseBtn.removeEventListener('click', handler);
  });
}

// Feature: wires up a reset button
function resetButton({ state, owners }) {
  return effect(() => {
    const { resetBtn } = owners.get();
    if (!resetBtn) return;
    return listen(resetBtn, 'click', () => update(state, { count: 0 }));
  });
}

// Feature: renders count to a DOM element
function render({ state, owners, config }) {
  return effect(() => {
    const { renderElement } = owners.get();
    if (!renderElement) return;
    renderElement.textContent = String(state.get().count ?? config.defaultText ?? 'N/A');
  });
}

const composition = createComposition(
  [counter, pauseButton, resetButton, render],
  {
    initialState: { count: 0, paused: true },
    config: { interval: 250, defaultText: '--' },
    initialOwners: {
      renderElement: document.getElementById('counter'),
      pauseBtn: document.getElementById('pause'),
      resetBtn: document.getElementById('reset'),
    },
  }
);

await composition.destroy();
```

The `counter` feature is now a reactor with two states:

- **`paused`** — no effects. The counter does nothing.
- **`running`** — the `entry` effect starts the interval. When the reactor exits this state (pause or destroy), the cleanup clears it.

The `monitor` function reads `state.get().paused` and returns the target state. The framework handles the transition — `counter` never calls `transition()` itself. When `paused` changes from `true` to `false`, the reactor moves to `running` and the interval starts. When it changes back, the reactor moves to `paused` and the interval is cleaned up.

The `pauseButton` and `resetButton` features are plain effects — they wire up DOM event handlers that write directly to state. When a button is clicked, state changes, and the reactor (and render feature) respond automatically. No feature coordinates with another; they all communicate through shared state.

Key concepts:
- **`monitor`** — a reactive function that derives the target state. Re-evaluates when its signal dependencies change.
- **`entry`** — runs once on state entry, automatically untracked. Return a cleanup function (or an object with `abort()`).
- **`effects`** — (not shown here) re-run when tracked signals change. Use for reactive sync within a state.

Not everything needs a reactor. Use a reactor when you need distinct states with setup/teardown lifecycles. Use an effect when you just need to respond to changes.

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

SPF chose signals over observables because all SPF state is **state-over-time** — a current value that changes, not a stream of discrete events. Signals give you automatic dependency tracking for derived state, synchronous reads, and a lower barrier to entry than observable pipelines.

### Reactors

A reactor observes reactive state and responds to changes. It has its own finite state machine and can run per-state effects. Reactors don't receive messages — they're driven entirely by signal observation.

```ts
const reactor = createMachineReactor({
  initial: 'waiting',
  monitor: () => isReady(state.get()) ? 'processing' : 'waiting',
  states: {
    waiting: {},
    processing: {
      entry: () => {
        // Run once on state entry (automatically untracked)
        const ac = new AbortController();
        processData(state, ac.signal);
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
  context: { items: [], processedCount: 0 },
  states: {
    idle: {
      on: {
        'process-item': (msg, { transition, runner, setContext }) => {
          transition('processing');
          const task = makeProcessTask(msg);
          runner.schedule(task).then(setContext);
        },
      },
    },
    processing: {
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

A reactor observes state, decides something needs to happen, and sends a message to an actor. The actor does the work and updates its snapshot. Other reactors (or the composition) observe the actor's snapshot and react.

```
state changes → reactor observes → actor.send({ type: 'process', data })
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
- **SerialRunner** — one task at a time, queued in order
- **ConcurrentRunner** — parallel execution with deduplication by ID

---

## Open Questions

> These are areas where the design direction is clear but implementation details are still being worked through.

- **Task `aborted` as a distinct terminal state** — Currently abort lands in `error`. Should be first-class: `pending → running → done | error | aborted`.
- **Effect scheduling semantics** — Effects are deferred via `queueMicrotask`. The exact behavior under compound state changes (multiple signal writes in one turn) is behavioral, not formally specified.
- **Reactor lifecycle ownership** — Currently the composition explicitly creates and destroys everything. With signals, reactors could self-scope to a reactive context and auto-dispose.
