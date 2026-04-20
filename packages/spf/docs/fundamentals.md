# SPF Fundamentals

SPF is a general-purpose composition framework. It provides composable primitives — reactive state, reactors, tasks, and actors — that let you assemble a composition from independent, decoupled behaviors.

The framework doesn't know about your domain. It provides the composition model; you provide the behaviors.

---

## Compositions

A composition is SPF's unit of assembly. `createComposition` takes a list of **behaviors** — functions that each handle one concern — wires them to shared reactive channels, and returns a small API for reading state and tearing everything down.

**What it is** — a factory that wires independent behaviors to shared reactive channels and returns a handle for reading state and tearing everything down.

**When to use it** — when a problem has multiple concerns that share data and lifecycle. Each concern stays a standalone function; shared values flow through signals; cleanup happens together.

### A composition in action

A composition with one stand-in behavior, driven entirely from outside:

```ts
import { createComposition, effect } from '@videojs/spf/playback-engine';
import { update, computed, type Signal } from '@videojs/spf';

function defineCount({ state }: { state: Signal<{ count?: number }> }) {
  // no logic yet — this behavior exists to carry the type
}

const composition = createComposition([defineCount]);

composition.state.get(); // { count?: number }

const stopLogging = effect(() => {
  console.log(composition.state.get().count);
});

const doubled = computed(() => (composition.state.get().count ?? 0) * 2);

const id = setInterval(() => {
  update(composition.state, { count: (composition.state.get().count ?? 0) + 1 });
}, 250);

await composition.destroy();
stopLogging();
clearInterval(id);
```

### Creating a composition

`createComposition` takes an array of behaviors and returns a small handle:

```ts
const composition = createComposition([defineCount]);

composition.state;     // Signal<{ count?: number }>
composition.owners;    // Signal<{}>
composition.destroy(); // Promise<void>
```

Those three properties — `state`, `owners`, `destroy` — are the composition's entire public API.

> [!NOTE]
> The set of reactive channels a composition exposes may grow. Additional channels — for example an event stream, either as another TC39 signal or an `EventTarget` — are under consideration. Treat `state` and `owners` as the current primitives, not a closed set.

`state` and `owners` are [TC39 Signals](https://github.com/tc39/proposal-signals): reactive values that you read with `.get()` and write with `.set()`. SPF adds one convenience — `update(signal, partial)` shallow-merges a partial object into the current value, so behaviors can write one field without spreading the whole object.

### Giving state a shape

`defineCount` is the smallest useful behavior: a function that does nothing except declare the shape of state it expects.

```ts
function defineCount({ state }: { state: Signal<{ count?: number }> }) {
  // no logic yet — this behavior exists to carry the type
}
```

A behavior's parameter type is its contract with the composition. Because `defineCount` annotates its state as `Signal<{ count?: number }>`, the composition inherits that shape — and anything that tries to misuse it is caught at compile time:

```ts
composition.state.get(); // { count?: number }

// @ts-expect-error — count must be a number
composition.state.set({ count: 'not a number' });
```

Without a behavior, none of that shape exists. `createComposition([])` resolves `state` and `owners` to `Signal<object>` — permissive on writes, useless on reads:

```ts
const empty = createComposition([]);

empty.state.set({ anythingAtAll: true }); // accepted
empty.state.get().count;                   // ❌ Property 'count' does not exist on type 'object'
```

Types come from behaviors.

> [!NOTE]
> The exact error messages and inference rules are still evolving. The guarantee that conflicts are caught at compile time is stable; how they surface in your editor is not.

When you pass multiple behaviors, their declarations are combined — incompatible ones fail at compile time. That story is demonstrated in [Owners](#owners), where multiple behaviors first appear organically.

`defineCount` is a placeholder. Real behaviors do work — run timers, wire up listeners, manage resources, return cleanup.

### Using the composition from outside

From outside the composition — wherever your code called `createComposition` — you interact with its signals directly. Reading is synchronous:

```ts
composition.state.get(); // { count?: number }
```

Observation uses `effect`: it runs its callback immediately, tracks every signal the callback reads, and re-runs the callback whenever any of those signals change. It returns a cleanup function.

```ts
const stopLogging = effect(() => {
  console.log(composition.state.get().count);
});
```

Derived values use `computed`: a read-only signal whose value is a function of other signals. It recomputes lazily — only when something reads it after a dependency has changed.

```ts
const doubled = computed(() => (composition.state.get().count ?? 0) * 2);

doubled.get(); // whatever `(count ?? 0) * 2` is
```

Writes from outside are uncommon — ongoing work almost always belongs in a behavior. Driving `count` on an interval from outside, for example, means you own the interval's lifecycle yourself:

```ts
const id = setInterval(() => {
  update(composition.state, { count: (composition.state.get().count ?? 0) + 1 });
}, 250);
```

Destroying the composition runs each behavior's cleanup and awaits any async work — but anything you started out here is on you:

```ts
await composition.destroy(); // behaviors are torn down
stopLogging();                // the effect is on you
clearInterval(id);            // the interval is on you
```

---

## State

The `setInterval` and the logger that drove `count` from outside both work, but their lifecycles sit apart from the composition's. Moved inside as behaviors, each gets typed access to state, cleanup ties into `destroy()`, and they coordinate with each other through the shared signal.

State is the surface those behaviors share. A single reactive signal holding a plain object, shared across every behavior in a composition and visible from the outside through `composition.state`. Behaviors write to it when something happens; behaviors read it to know what's going on; the outside world subscribes when it needs to react. Because it's a signal, changes flow automatically — nobody coordinates, nobody wires things up.

**What it is** — a reactive signal holding an object, shared across every behavior in a composition.

**When to use it** — for any value two or more behaviors (or the outside world) need to observe or drive. Counts, selections, flags, timestamps — anything that flows *through* the composition over time.

### A counter behavior

A counter that ticks on an interval paired with a logger that reads the count as it changes — two behaviors coordinating entirely through shared state:

```ts
import { createComposition, effect } from '@videojs/spf/playback-engine';
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

function logCount({ state }: { state: Signal<{ count?: number }> }) {
  // effect() returns its own cleanup; handing it back here ties
  // the effect's lifecycle to composition.destroy()
  return effect(() => {
    console.log(state.get().count);
  });
}

const composition = createComposition([counter, logCount], {
  initialState: { count: 0 },
  config: { interval: 250 },
});
// logs: 0, 1, 2, 3, ...

await composition.destroy(); // clears the interval and stops the effect
```

Neither behavior knows the other exists. `counter` writes to state; `logCount` reads it. They coordinate through the shared signal, and each hands back the cleanup that belongs to its own lifecycle — a `clearInterval` closure for `counter`, the function `effect()` returned for `logCount`. One call to `composition.destroy()` unwinds both.

### `initialState`

`initialState` sets the starting value of the state signal:

```ts
createComposition([counter], { initialState: { count: 0 } });
composition.state.get(); // { count: 0 }
```

Its type is derived from the behaviors. Because `counter` annotates `state: Signal<{ count?: number }>`, TypeScript requires `initialState` to be assignable to `{ count?: number }`:

```ts
// ✅ matches the behavior's declared state
createComposition([counter], { initialState: { count: 0 } });

// @ts-expect-error — count must be a number
createComposition([counter], { initialState: { count: 'zero' } });
```

If you omit `initialState`, the signal starts as `{}` — which is why `counter` falls back with `state.get().count ?? 0` on its first tick.

### `config`

`config` is static configuration, passed once at composition time. Unlike state, config never changes and isn't reactive.

```ts
createComposition([counter], { config: { interval: 250 } });
```

Its shape is inferred from the behaviors:

```ts
// @ts-expect-error — interval must be a number
createComposition([counter], { config: { interval: 'fast' } });
```

Behaviors read config directly (`config.interval`), usually with a fallback. Use config for values a behavior *needs to know at construction time* and wouldn't expect to change — thresholds, URLs, feature flags. Put values that change over time in state.

---

## Owners

A ticking counter and a console log aren't much of an application. What you'd actually want is to render the count somewhere — say, into an element on the page. That needs access to the element itself: a `<div>`, a buffer, an open socket. These are **resources** — platform objects with imperative interfaces that don't fit cleanly into plain application data, and the **owners** channel is where they live.

An owner is something behaviors observe and operate on, not something they derive. The composition holds a signal whose value is a plain object mapping keys to resources. Behaviors read the keys they care about; `effect()` re-runs when a key appears, is replaced, or is cleared. The element itself is still the element — owners don't wrap or proxy it, they just make its lifecycle reactive.

**What it is** — a reactive signal holding a map of named resources, shared across every behavior in a composition.

**When to use it** — for values that have identity and behavior, not just data — DOM elements, buffers, long-lived connections. If you'd pass the thing around by reference, it probably belongs in owners.

> [!NOTE]
> The name "owners" is provisional. The concept — a channel for mutable resources that behaviors observe and act on — is stable; the label itself may change, and "resources" is one candidate under consideration.

### A DOM-renderer behavior

A behavior that renders the counter to a DOM element, paired with the counter from the previous section:

```ts
import { createComposition, effect } from '@videojs/spf/playback-engine';
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

function render({
  state,
  owners,
  config,
}: {
  state: Signal<{ count?: number }>;
  owners: Signal<{ renderElement?: HTMLElement }>;
  config: { defaultText?: string };
}) {
  return effect(() => {
    const { renderElement } = owners.get();
    if (!renderElement) return;
    renderElement.textContent = String(state.get().count ?? config.defaultText ?? 'N/A');
  });
}

const composition = createComposition([counter, render], {
  initialState: { count: 0 },
  config: { interval: 250, defaultText: '--' },
  initialOwners: { renderElement: document.getElementById('counter') },
});

await composition.destroy();
```

`render` reads from both channels. `effect()` tracks every signal the callback reads and re-runs when any of them change — so when `count` ticks up, or when `renderElement` is swapped out or cleared, the render function runs again. The guard `if (!renderElement) return` handles the case where the element isn't in owners yet (for example, if `initialOwners` was omitted or the DOM wasn't ready).

### `initialOwners`

`initialOwners` seeds the owners signal, the same way `initialState` seeds state:

```ts
createComposition([counter, render], {
  initialOwners: { renderElement: document.getElementById('counter') },
});
```

Its type is derived from the behaviors. Because `render` annotates `owners: Signal<{ renderElement?: HTMLElement }>`, TypeScript requires `initialOwners` to be assignable to that shape:

```ts
// @ts-expect-error — renderElement expects an HTMLElement, not a number
createComposition([render], { initialOwners: { renderElement: 42 } });
```

If you omit `initialOwners`, the signal starts as `{}` — which is why `render` uses the optional annotation `renderElement?: HTMLElement` and guards the read.

### Updating owners from outside

Owners is just a signal, so you can write to it the same way you write to state — usually from inside a behavior, occasionally from outside when orchestrating resources that live beyond the composition's scope.

Swapping the element mid-composition updates what `render` is rendering into. Because `effect()` tracks `owners`, the swap re-runs the callback and the new element starts receiving updates immediately:

```ts
const anotherDiv = document.getElementById('other-counter');
update(composition.owners, { renderElement: anotherDiv });
```

Unsetting back to `undefined` is also fine — the guard (`if (!renderElement) return`) turns the absence into a no-op:

```ts
update(composition.owners, { renderElement: undefined }); // render stops writing to the DOM
update(composition.owners, { renderElement: anotherDiv }); // and picks back up
```

The same pattern covers creation time: if you omit `initialOwners`, the signal starts as `{}`, the first effect run bails on the guard, and `render` comes alive the moment a behavior (or outside code) attaches the element.

This is the loose-coupling payoff. `render` doesn't need to know *when* `renderElement` will exist, only what to do when it does. Resources can arrive late, be swapped, or disappear — the behavior adjusts.

### Composing behaviors

When you pass more than one behavior to `createComposition`, their declarations are combined and the compiler catches conflicts. The rule differs by channel.

**State and config** use intersection: if two behaviors declare the same key with incompatible types, the intersection collapses and the composition is rejected.

```ts
const expectsNumber = (_deps: { state: Signal<{ value: number }> }) => {};
const expectsString = (_deps: { state: Signal<{ value: string }> }) => {};

// @ts-expect-error — behaviors have conflicting state types
createComposition([expectsNumber, expectsString]);
```

**Owners** use subtype compatibility, because owner values are concrete platform objects whose class hierarchy matters. Two behaviors can share an owner key if one type extends the other — the composition picks the more specific one:

```ts
const wantsElement = (_deps: { owners: Signal<{ el?: HTMLElement }> }) => {};
const wantsVideo   = (_deps: { owners: Signal<{ el?: HTMLVideoElement }> }) => {};

// ✅ HTMLVideoElement extends HTMLElement — fine
createComposition([wantsElement, wantsVideo]);
```

Sibling types with no `extends` relationship are rejected:

```ts
const wantsCanvas = (_deps: { owners: Signal<{ el?: HTMLCanvasElement }> }) => {};
const wantsVideo  = (_deps: { owners: Signal<{ el?: HTMLVideoElement }> }) => {};

// @ts-expect-error — neither HTMLCanvasElement nor HTMLVideoElement extends the other
createComposition([wantsCanvas, wantsVideo]);
```

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
