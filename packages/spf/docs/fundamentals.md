# SPF Fundamentals

SPF is a general-purpose composition framework. It provides composable primitives — reactive state, reactors, tasks, and actors — that let you assemble a composition from independent, decoupled behaviors.

The framework doesn't know about your domain. It provides the composition model; you provide the behaviors.

---

## The Composition

Everything starts with `createComposition`. A composition combines **behaviors** — functions that each handle one concern — and wires them together through shared reactive state.

```ts
import { createComposition } from '@videojs/spf/playback-engine';

const composition = createComposition([behaviorA, behaviorB]);
```

The composition creates shared reactive channels, passes them to each behavior, and returns:

```ts
composition.state     // reactive state signal (application data)
composition.owners    // reactive owners signal (platform resources)
composition.destroy() // tear down the composition and all behaviors
```

The rest of this document builds up from the simplest possible composition, introducing one concept at a time.

---

## State

**What it is.** State is the reactive data layer of a composition — a single signal holding an object that any behavior can read, subscribe to, or update. It's where application data lives.

**When to use it.** Reach for state whenever two behaviors need to agree on the same value, or whenever the outside world needs to observe or drive a value the composition manages. Counts, selections, flags, timestamps — data that flows *through* the composition over time.

### Signals: a one-minute primer

SPF's state and owners channels are both built on [TC39 Signals](https://github.com/tc39/proposal-signals). A signal is a reactive value with a tiny surface:

- **Writable signal** — read with `.get()`, write with `.set()`. State and owners are both of this kind.
- **`computed(fn)`** — a read-only signal whose value is derived from other signals. Recomputes lazily when any dependency changes.
- **`effect(fn)`** — runs `fn` immediately, tracks which signals it reads, and re-runs `fn` whenever any of those change. Returns a cleanup function. If `fn` itself returns a function, that inner cleanup runs before each re-run and on teardown.

On top of standard signal semantics, SPF adds one convenience: `update(signal, partial)` shallow-merges a partial object into the signal's current value, so behaviors don't have to spread manually.

> A dedicated signals guide is coming. For now, `.get()`, `.set()`, `update()`, `effect()`, and `computed()` are the full working vocabulary.

### Your first behavior

Here's a complete composition with one behavior — a counter that ticks on an interval:

```ts
import { createComposition } from '@videojs/spf/playback-engine';
import { update, type Signal } from '@videojs/spf';

function counter({
  state,
  config,
}: {
  state: Signal<{ count?: number }>;
  config: { interval?: number };
}) {
  const id = setInterval(() => {
    update(state, { count: (state.get().count ?? 0) + 1 });
  }, config.interval ?? 1000);

  return () => clearInterval(id);
}

const composition = createComposition([counter], {
  initialState: { count: 0 },
  config: { interval: 250 },
});

composition.state.get(); // { count: 0 }
// ~250 ms later...
composition.state.get(); // { count: 1 }

await composition.destroy();
```

That tiny example touches every core piece of SPF composition. The rest of this section walks through it.

### The `createComposition` factory

`createComposition` takes an array of behaviors and an options object. It creates the shared reactive channels, hands them to each behavior, and returns the composition:

```ts
const composition = createComposition([counter], options);

composition.state;     // Signal<{ count?: number }>
composition.owners;    // Signal<{}> — covered in the next section
composition.destroy(); // Promise<void> — tears down every behavior's cleanup
```

Those three properties — `state`, `owners`, `destroy` — are the composition's entire public API.

### Behaviors: functions that receive shared channels

A behavior is just a function. The composition calls it once with `{ state, owners, config }` and optionally collects a cleanup handle:

```ts
function counter({ state, config }: {
  state: Signal<{ count?: number }>;
  config: { interval?: number };
}) {
  // ... read/write state, subscribe, run timers, etc.
  return () => { /* cleanup */ };
}
```

A behavior can read from any channel, write to `state` or `owners`, and return cleanup — or nothing at all.

The important detail: **a behavior declares the shape of the state, owners, and config it needs by annotating its parameter type**. `counter` tells the composition it expects state with an optional `count: number` and config with an optional `interval: number`. `createComposition` combines every behavior's declaration to derive the composition's own types — which means `composition.state.get()` is typed from what the behaviors ask for, not from whatever you happen to pass as `initialState`.

### `initialState`: seed for the state signal

`initialState` sets the starting value:

```ts
createComposition([counter], { initialState: { count: 0 } });
composition.state.get(); // { count: 0 }
```

Its type is derived from the behaviors. Because `counter` annotates `state: Signal<{ count?: number }>`, TypeScript requires `initialState` to be assignable to that shape:

```ts
// ✅ matches the behavior's declared state
createComposition([counter], { initialState: { count: 0 } });

// @ts-expect-error — count must be a number
createComposition([counter], { initialState: { count: 'zero' } });
```

If you omit `initialState`, the signal starts as `{}` — which is why `counter` falls back with `state.get().count ?? 0` on the first tick.

### `config`: definitional values a behavior reads

`config` is static configuration, passed once at composition time. Unlike state, config never changes after creation and isn't reactive.

```ts
createComposition([counter], { config: { interval: 250 } });
```

Its shape, like state's, is inferred from the behaviors:

```ts
// @ts-expect-error — interval must be a number
createComposition([counter], { config: { interval: 'fast' } });
```

Behaviors read config directly (`config.interval`), usually with a fallback. Use config for values a behavior *needs to know at construction time* and wouldn't expect to change — thresholds, URLs, feature flags. Put values that change over time in state instead.

### Reading and writing state inside a behavior

Inside a behavior, the state signal supports three update styles:

```ts
state.get();                                // read current value
state.set({ count: 5 });                    // replace entire value
update(state, { count: 5 });                // shallow-merge a partial
update(state, (s) => ({ ...s, count: 5 })); // updater function
```

`update()` is the common case: change one field without touching the others. Use `state.set()` when you genuinely want to replace the whole value.

### Using the composition from the outside

Everything above happens *inside* a behavior. From outside — wherever your code called `createComposition` — you interact through the composition's public API:

```ts
import { effect } from '@videojs/spf/playback-engine';
import { update } from '@videojs/spf';

// Read
composition.state.get(); // { count: 3 }

// Observe
const stop = effect(() => {
  console.log(composition.state.get().count);
});

// Write (rare — prefer letting behaviors own writes)
update(composition.state, { count: 0 });

// Tear down — awaits every behavior's cleanup
await composition.destroy();
```

Because `composition.state` is typed from the behaviors, TypeScript catches mistakes at the boundary too:

```ts
// @ts-expect-error — 'unknown' is not a key of { count?: number }
update(composition.state, { unknown: true });

// @ts-expect-error — count must be a number
composition.state.set({ count: 'not a number' });
```

### TypeScript guardrails across behaviors

When you compose multiple behaviors, `createComposition` intersects their state declarations. Compatible declarations merge; incompatible ones are rejected at compile time:

```ts
const expectsNumber = (_deps: { state: Signal<{ value: number }> }) => {};
const expectsString = (_deps: { state: Signal<{ value: string }> }) => {};

// @ts-expect-error — behaviors have conflicting state types
createComposition([expectsNumber, expectsString]);
```

This is the core safety net of the composition model: as you pull behaviors together from different places, the compiler guarantees they're talking about the same state shape.

> **Stability note** — the error messages and the exact inference rules may still evolve. The guarantee that conflicts are caught at compile time is stable; how they surface in your editor is not.

### When to reach for state

Use state for any data that:
- Two or more behaviors need to read or write.
- The outside world needs to observe or drive.
- Changes over the lifetime of the composition.

If a value is a *resource* — a mutable platform object like a DOM element or a buffer — use [owners](#owners) instead. If it's a *setting* that never changes after construction, use [config](#config-definitional-values-a-behavior-reads).

---

## Owners

A composition has two reactive channels: **state** for application data and **owners** for platform resources. State and owners are both built on [TC39 Signals](https://github.com/tc39/proposal-signals) — reactive values that automatically notify dependents when they change. Use `effect()` to react to changes in either channel:

```ts
import { createComposition, effect } from '@videojs/spf/playback-engine';
import { update } from '@videojs/spf';

// Behavior: increments a counter
function counter({ state, config }) {
  const interval = setInterval(() => {
    update(state, { count: (state.get().count ?? 0) + 1 });
  }, config.interval ?? 1000);
  return () => clearInterval(interval);
}

// Behavior: renders count to a DOM element
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

`effect()` runs its callback immediately, tracks which signals were read, and re-runs whenever those signals change. The `render` behavior reads from both channels — `state` for the count value and `owners` for the DOM element — so it re-runs when either changes. The guard (`if (!renderElement) return`) handles the case where owners hasn't been populated yet.

This is also the first example with two behaviors. They don't know about each other — `counter` writes state, `render` reads it. Both return cleanup: `counter` clears its interval; `render` returns the stop function from `effect()`. The composition collects these and calls them on `destroy()`.

The separation between state and owners signals intent. State is data that flows through the composition — counts, selections, timestamps. Owners are platform resources that behaviors operate on — elements, buffers, connections. Both are reactive signals with the same API.

---

## Reactors

So far, behaviors have used `effect()` to react to state changes. Effects work well for simple observation, but they re-run on _every_ change to their dependencies. What if a behavior needs lifecycle — setup when a condition becomes true, teardown when it becomes false, and the ability to distinguish "just entered this state" from "still in this state"?

A **reactor** is a state machine driven by signal observation. Its `monitor` function derives the target state from signals. When the state changes, the reactor transitions — running `entry` effects on the new state and cleaning up the old one.

Let's make our counter pausable and resettable. We'll add button behaviors that toggle pause and reset the count via owners:

```ts
import { createComposition, effect } from '@videojs/spf/playback-engine';
import { createMachineReactor, update } from '@videojs/spf';
import { listen } from '@videojs/utils/dom';

// Behavior: a counter that can be paused
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

// Behavior: renders count to a DOM element
function render({ state, owners, config }) {
  return effect(() => {
    const { renderElement } = owners.get();
    if (!renderElement) return;
    renderElement.textContent = String(state.get().count ?? config.defaultText ?? 'N/A');
  });
}

// Behavior: wires up a pause/unpause button
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

// Behavior: wires up a reset button
function resetButton({ state, owners }) {
  return effect(() => {
    const { resetBtn } = owners.get();
    if (!resetBtn) return;
    return listen(resetBtn, 'click', () => update(state, { count: 0 }));
  });
}

const composition = createComposition(
  [counter, render, pauseButton, resetButton],
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

The `counter` behavior is now a reactor with two states:

- **`paused`** — no effects. The counter does nothing.
- **`running`** — the `entry` effect starts the interval. When the reactor exits this state (pause or destroy), the cleanup clears it.

The `monitor` function reads `state.get().paused` and returns the target state. The framework handles the transition — `counter` never calls `transition()` itself. When `paused` changes from `true` to `false`, the reactor moves to `running` and the interval starts. When it changes back, the reactor moves to `paused` and the interval is cleaned up.

The `pauseButton` and `resetButton` behaviors are plain effects — they wire up DOM event handlers that write directly to state. When a button is clicked, state changes, and the reactor (and `render`) respond automatically. No behavior coordinates with another; they all communicate through shared state.

Key concepts:
- **`monitor`** — a reactive function that derives the target state. Re-evaluates when its signal dependencies change.
- **`entry`** — runs once on state entry, automatically untracked. Return a cleanup function (or an object with `abort()`).
- **`effects`** — (not shown here) re-run when tracked signals change. Use for reactive sync within a state.

Not everything needs a reactor. Use a reactor when you need distinct states with setup/teardown lifecycles. Use an effect when you just need to respond to changes.

---

## Tasks

Sometimes a behavior needs to do async work — save data, fetch a resource, process a chunk. You could use a Promise directly, but Promises start executing immediately and can't be cancelled. A **Task** is an async unit of work that:

- Exists before it runs — it can be inspected, queued, or aborted while still `'pending'`
- Can be **aborted** from outside at any point
- Exposes its **status** synchronously (`'pending'`, `'running'`, `'done'`, `'error'`)

A **SerialRunner** schedules tasks one at a time — the next task waits until the current one finishes. This is useful when operations must not overlap (saving state, writing to a database, etc.).

Let's add a `persist` behavior that saves the count to a server every 5 ticks, and does one final save on destroy:

```ts
import { createComposition, effect } from '@videojs/spf/playback-engine';
import { createMachineReactor, Task, SerialRunner, update } from '@videojs/spf';
import { listen } from '@videojs/utils/dom';

// Behavior: a counter that can be paused
function counter({ state, config }) {
  return createMachineReactor({
    initial: 'paused',
    monitor: () => (state.get().paused ? 'paused' : 'running'),
    states: {
      paused: {},
      running: {
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

// Behavior: persists count at a configurable interval
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

// Behavior: renders count to a DOM element
function render({ state, owners, config }) {
  return effect(() => {
    const { renderElement } = owners.get();
    if (!renderElement) return;
    renderElement.textContent = String(state.get().count ?? config.defaultText ?? 'N/A');
  });
}

// Behavior: wires up a pause/unpause button
function pauseButton({ state, owners }) {
  effect(() => {
    const { pauseBtn } = owners.get();
    if (!pauseBtn) return;
    pauseBtn.textContent = state.get().paused ? 'Start' : 'Pause';
  });

  return effect(() => {
    const { pauseBtn } = owners.get();
    if (!pauseBtn) return;
    return listen(pauseBtn, 'click', () => {
      update(state, { paused: !state.get().paused });
    });
  });
}

// Behavior: wires up a reset button
function resetButton({ state, owners }) {
  return effect(() => {
    const { resetBtn } = owners.get();
    if (!resetBtn) return;
    return listen(resetBtn, 'click', () => update(state, { count: 0 }));
  });
}

const composition = createComposition(
  [counter, persist, render, pauseButton, resetButton],
  {
    initialState: { count: 0, paused: true },
    config: { interval: 250, defaultText: '--', saveEvery: 5 },
    initialOwners: {
      renderElement: document.getElementById('counter'),
      pauseBtn: document.getElementById('pause'),
      resetBtn: document.getElementById('reset'),
    },
  }
);

// Saves at count 5, 10, 15, 20...
// On destroy, saves whatever the final count is
await composition.destroy();
```

The `persist` behavior introduces several concepts:

- **Task** — each save is a `new Task(...)` that receives an `AbortSignal`. The runner can cancel it if needed.
- **SerialRunner** — ensures saves run one at a time. If the counter hits 5 and then 10 before the first save completes, the second save queues behind the first.
- **Async cleanup** — the cleanup function is `async`. It stops the effect, schedules one final save, waits for the runner to settle, then destroys it. `composition.destroy()` awaits this.

---

## Actors

Signals and reactors are declarative — state is derived, effects react. But some resources are inherently imperative: a network request in progress, a database transaction, a file being written. You can't re-derive the right action from signals alone — you need to _tell_ the resource what to do, track where it is in that process, and handle interruptions.

An **actor** is a message-driven state machine that owns a mutable resource. It receives messages via `send()`, manages work through a task runner, and exposes its current state as a reactive `snapshot`.

Let's refactor our `persist` behavior. Currently it manages saves internally — other behaviors have no way to know if a save is in progress or what was last saved. With an actor, the save lifecycle becomes a first-class, observable part of the composition.

```ts
import { createComposition, effect } from '@videojs/spf/playback-engine';
import { createMachineActor, createMachineReactor, Task, SerialRunner, update } from '@videojs/spf';
import { listen } from '@videojs/utils/dom';

// Actor: manages saving count to a server
function createSaveActor() {
  function makeSaveTask(count) {
    return new Task(async (signal) => {
      await fetch('/api/count', {
        method: 'POST',
        body: JSON.stringify({ count }),
        signal,
      });
      return { lastSaved: count };
    });
  }

  return createMachineActor({
    runner: () => new SerialRunner(),
    initial: 'idle',
    context: { lastSaved: undefined as number | undefined },
    states: {
      idle: {
        on: {
          save: (msg, { transition, runner, setContext }) => {
            transition('saving');
            runner.schedule(makeSaveTask(msg.count)).then(setContext);
          },
        },
      },
      saving: {
        onSettled: 'idle',
        on: {
          // New save while one is in-flight: cancel pending, schedule new
          save: (msg, { runner, setContext }) => {
            runner.abortPending();
            runner.schedule(makeSaveTask(msg.count)).then(setContext);
          },
          cancel: (_msg, { transition, runner }) => {
            runner.abortAll();
            transition('idle');
          },
        },
      },
    },
  });
}

// Behavior: a counter that can be paused
function counter({ state, config }) {
  return createMachineReactor({
    initial: 'paused',
    monitor: () => (state.get().paused ? 'paused' : 'running'),
    states: {
      paused: {},
      running: {
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

// Behavior: creates a save actor and sends save messages on an interval
function persist({ state, owners, config }) {
  const actor = createSaveActor();
  update(owners, { saveActor: actor });

  const stopEffect = effect(() => {
    const { count } = state.get();
    if (count > 0 && count % (config.saveEvery ?? 5) === 0) {
      actor.send({ type: 'save', count });
    }
  });

  return async () => {
    stopEffect();
    actor.send({ type: 'save', count: state.get().count });
    await actor.snapshot.get().value === 'idle'
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          effect(() => {
            if (actor.snapshot.get().value === 'idle') resolve();
          });
        });
    actor.destroy();
  };
}

// Behavior: renders count and save status to DOM elements
function render({ state, owners, config }) {
  return effect(() => {
    const { renderElement, saveActor } = owners.get();
    if (!renderElement) return;

    const count = state.get().count;
    const saving = saveActor?.snapshot.get().value === 'saving';
    renderElement.textContent = saving
      ? `${count ?? config.defaultText ?? 'N/A'} (saving...)`
      : String(count ?? config.defaultText ?? 'N/A');
  });
}

// Behavior: wires up pause button
function pauseButton({ state, owners }) {
  effect(() => {
    const { pauseBtn } = owners.get();
    if (!pauseBtn) return;
    pauseBtn.textContent = state.get().paused ? 'Start' : 'Pause';
  });

  return effect(() => {
    const { pauseBtn } = owners.get();
    if (!pauseBtn) return;
    return listen(pauseBtn, 'click', () => {
      update(state, { paused: !state.get().paused });
    });
  });
}

// Behavior: wires up reset button — also cancels pending saves
function resetButton({ state, owners }) {
  return effect(() => {
    const { resetBtn, saveActor } = owners.get();
    if (!resetBtn) return;
    return listen(resetBtn, 'click', () => {
      saveActor?.send({ type: 'cancel' });
      update(state, { count: 0 });
    });
  });
}

const composition = createComposition(
  [counter, persist, render, pauseButton, resetButton],
  {
    initialState: { count: 0, paused: true },
    config: { interval: 250, defaultText: '--', saveEvery: 5 },
    initialOwners: {
      renderElement: document.getElementById('counter'),
      pauseBtn: document.getElementById('pause'),
      resetBtn: document.getElementById('reset'),
    },
  }
);
```

The save actor encapsulates the imperative reality of network saves:

- **Message-driven** — behaviors `send()` messages (`save`, `cancel`) rather than calling functions directly. The actor decides how to handle each message based on its current state.
- **Stateful** — the actor tracks whether a save is in-flight and what was last saved. Incoming `save` messages during the `saving` state abort pending work and schedule fresh saves — the caller doesn't manage this.
- **Observable** — `actor.snapshot` is a reactive signal. The `render` behavior reads it to show "(saving...)" without `persist` explicitly publishing status. The `resetButton` behavior reads `saveActor` from owners to send `cancel`.
- **`onSettled`** — when the runner's tasks complete, the actor automatically transitions back to `idle`. No manual bookkeeping.

The pattern: **reactors decide _when_ something should happen** (by observing signals), **actors handle _how_ it happens** (by managing imperative work). The reactor sends a message; the actor owns the execution.
