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

A behavior that renders the counter to a DOM element, joining the counter and logger from the previous section:

```ts
import { createComposition, effect } from '@videojs/spf/playback-engine';
import { type Signal } from '@videojs/spf';

// counter, logCount — unchanged from the previous section

function renderCount({
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

const composition = createComposition([counter, logCount, renderCount], {
  initialState: { count: 0 },
  config: { interval: 250, defaultText: '--' },
  initialOwners: { renderElement: document.getElementById('counter') },
});

await composition.destroy();
```

`renderCount` reads from both channels. `effect()` tracks every signal the callback reads and re-runs when any of them change — so when `count` ticks up, or when `renderElement` is swapped out or cleared, the renderCount function runs again. The guard `if (!renderElement) return` handles the case where the element isn't in owners yet (for example, if `initialOwners` was omitted or the DOM wasn't ready).

### `initialOwners`

`initialOwners` seeds the owners signal, the same way `initialState` seeds state:

```ts
createComposition([counter, logCount, renderCount], {
  initialOwners: { renderElement: document.getElementById('counter') },
});
```

Its type is derived from the behaviors. Because `renderCount` annotates `owners: Signal<{ renderElement?: HTMLElement }>`, TypeScript requires `initialOwners` to be assignable to that shape:

```ts
// @ts-expect-error — renderElement expects an HTMLElement, not a number
createComposition([renderCount], { initialOwners: { renderElement: 42 } });
```

If you omit `initialOwners`, the signal starts as `{}` — which is why `renderCount` uses the optional annotation `renderElement?: HTMLElement` and guards the read.

### Updating owners from outside

Owners is just a signal, so you can write to it the same way you write to state — usually from inside a behavior, occasionally from outside when orchestrating resources that live beyond the composition's scope.

Swapping the element mid-composition updates what `renderCount` is rendering into. Because `effect()` tracks `owners`, the swap re-runs the callback and the new element starts receiving updates immediately:

```ts
const anotherDiv = document.getElementById('other-counter');
update(composition.owners, { renderElement: anotherDiv });
```

Unsetting back to `undefined` is also fine — the guard (`if (!renderElement) return`) turns the absence into a no-op:

```ts
update(composition.owners, { renderElement: undefined }); // renderCount stops writing to the DOM
update(composition.owners, { renderElement: anotherDiv }); // and picks back up
```

The same pattern covers creation time: if you omit `initialOwners`, the signal starts as `{}`, the first effect run bails on the guard, and `renderCount` comes alive the moment a behavior (or outside code) attaches the element.

This is the loose-coupling payoff. `renderCount` doesn't need to know *when* `renderElement` will exist, only what to do when it does. Resources can arrive late, be swapped, or disappear — the behavior adjusts.

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

The counter ticks on an interval whether you want it to or not. If you let users pause it, one approach is to check a `paused` flag inside the interval callback — but that leaves the interval running forever, just idling. What you really want is setup and teardown tied to the transition itself: the interval starts when the counter enters a "running" phase, and stops when it leaves.

An `effect()` can't cleanly model that. It re-runs on every signal change with no sense of phase. That's fine for "render the count into the DOM" — every change should re-render. It's wrong for "start a timer while `paused` is false." What you need is a state machine over signals: a **reactor**.

**What it is** — a state machine whose target state is derived from signals. Transitions run setup on entry and cleanup on exit.

**When to use it** — when a behavior has distinct phases with setup/teardown tied to signal-derived conditions, not just observation.

### A pausable counter

A counter that can be paused and reset from DOM buttons. The counter is now a reactor; the rest are ordinary effect-based behaviors:

```ts
import { createComposition, effect } from '@videojs/spf/playback-engine';
import { createMachineReactor, update, type Signal } from '@videojs/spf';
import { listen } from '@videojs/utils/dom';

// logCount, renderCount — unchanged from the previous section

function counter({
  state,
  config,
}: {
  state: Signal<{ count?: number; paused?: boolean }>;
  config: { interval?: number };
}) {
  return createMachineReactor({
    initial: 'paused',
    monitor: () => (state.get().paused ? 'paused' : 'running'),
    states: {
      paused: {},
      running: {
        // entry runs once on transition; its return value is cleanup,
        // called on exit (pause or destroy)
        entry: () => {
          const id = setInterval(() => {
            update(state, { count: (state.get().count ?? 0) + 1 });
          }, config.interval ?? 1000);
          return () => clearInterval(id);
        },
      },
    },
  });
}

function pauseButton({
  state,
  owners,
}: {
  state: Signal<{ paused?: boolean }>;
  owners: Signal<{ pauseBtn?: HTMLElement }>;
}) {
  // Keep the button label in sync with paused
  const stopLabel = effect(() => {
    const { pauseBtn } = owners.get();
    if (!pauseBtn) return;
    pauseBtn.textContent = state.get().paused ? 'Start' : 'Pause';
  });

  // listen() attaches a click handler and returns a cleanup that removes it
  const stopClick = effect(() => {
    const { pauseBtn } = owners.get();
    if (!pauseBtn) return;
    return listen(pauseBtn, 'click', () => {
      update(state, { paused: !state.get().paused });
    });
  });

  return () => {
    stopLabel();
    stopClick();
  };
}

function resetButton({
  state,
  owners,
}: {
  state: Signal<{ count?: number }>;
  owners: Signal<{ resetBtn?: HTMLElement }>;
}) {
  return effect(() => {
    const { resetBtn } = owners.get();
    if (!resetBtn) return;
    return listen(resetBtn, 'click', () => update(state, { count: 0 }));
  });
}

const composition = createComposition([counter, logCount, renderCount, pauseButton, resetButton], {
  initialState: { count: 0, paused: true },
  config: { interval: 250, defaultText: '--' },
  initialOwners: {
    renderElement: document.getElementById('counter'),
    pauseBtn: document.getElementById('pause'),
    resetBtn: document.getElementById('reset'),
  },
});

await composition.destroy();
```

`counter` is now a reactor with two states, `paused` and `running`. Its `monitor` reads `state.get().paused` and returns the target. When the user clicks the pause button, `pauseButton` writes to state; `monitor` re-derives, and the reactor transitions. `entry` on `running` starts the interval; the cleanup it returns runs on the way back to `paused`. The framework handles the transition — `counter` never calls `transition()` itself.

`pauseButton`, `resetButton`, and `renderCount` are ordinary effect-based behaviors reacting to the same state the reactor derives from. None of them knows a reactor exists. Everything coordinates through the shared signal.

### Monitor, entry, and effects

A reactor is defined with three core pieces:

- **`monitor`** — a reactive function that returns the name of the target state. It re-evaluates when its signal dependencies change; if the result changes, the reactor transitions.
- **`entry`** — runs once when the reactor enters a state. Automatically untracked, so reads don't subscribe. Return a cleanup function (or an object with `abort()`), and it runs on exit.
- **`effects`** (not shown in the example) — live reactive effects scoped to a single state. They run while in that state, track their dependencies, and are cleaned up on exit. Use them when you want live sync *within* a phase, not just on entry.

Not every behavior needs a reactor. When all you need is to react to signal changes, `effect()` is enough. Reach for a reactor when different phases call for different setup and teardown, and the phase itself is derived from signal state.

---

## Tasks

`counter`, `renderCount`, and the buttons all do their work synchronously — read a signal, write a signal, attach a handler. Saving that count to a server is different in kind. It's async, takes time, might fail, and you probably don't want overlapping requests when the count ticks faster than the network responds.

A plain Promise can't express any of that. It starts running the moment you create it, can't be cancelled, and offers no introspection into whether it's still in flight. What you want is an inspectable, abortable, schedulable unit of async work: a **Task**. And when multiple tasks line up behind each other — when `counter` hits 10 before the save at 5 has finished — you want a **SerialRunner** to queue them so they don't overlap.

**What it is** — a Task is an async unit of work with a synchronous lifecycle (`pending` / `running` / `done` / `error`), an `AbortSignal` for cancellation, and no execution until a runner schedules it. A SerialRunner is the simplest scheduler: first in, first out, one at a time.

**When to use it** — async work that needs inspection, cancellation, or ordering. Saves, uploads, chunked parses — anything where "two of these running at once" or "cancel this midway through" are real concerns.

### A persist behavior

Saving the count to a server every five ticks, with one final save on destroy:

```ts
import { createComposition, effect } from '@videojs/spf/playback-engine';
import { Task, SerialRunner, type Signal } from '@videojs/spf';

// counter, logCount, renderCount, pauseButton, resetButton — unchanged from previous sections

function persist({
  state,
  config,
}: {
  state: Signal<{ count?: number }>;
  config: { saveEvery?: number };
}) {
  const runner = new SerialRunner();

  function save(count: number) {
    runner.schedule(
      new Task((signal) =>
        fetch('/api/count', {
          method: 'POST',
          body: JSON.stringify({ count }),
          signal,
        }),
      ),
    );
  }

  // Watch count and save at every Nth tick
  const stopEffect = effect(() => {
    const { count = 0 } = state.get();
    if (count > 0 && count % (config.saveEvery ?? 5) === 0) {
      save(count);
    }
  });

  // Async cleanup: save the final count, let the runner drain, then tear down
  return async () => {
    stopEffect();
    save(state.get().count ?? 0);
    await runner.settled;
    runner.destroy();
  };
}

const composition = createComposition(
  [counter, logCount, persist, renderCount, pauseButton, resetButton],
  {
    initialState: { count: 0, paused: true },
    config: { interval: 250, defaultText: '--', saveEvery: 5 },
    initialOwners: {
      renderElement: document.getElementById('counter'),
      pauseBtn: document.getElementById('pause'),
      resetBtn: document.getElementById('reset'),
    },
  },
);

// Saves at count 5, 10, 15, 20... and once more on destroy.
await composition.destroy();
```

Three things are new. The `save()` closure wraps each network request in `new Task(...)`; the task's body receives an `AbortSignal` that `fetch` understands natively. The `SerialRunner` collects scheduled tasks and runs them one at a time — scheduling a second task while the first is still running queues it behind, with no overlap. And `persist`'s cleanup is `async`: it stops the effect, schedules one last save, `await`s `runner.settled` to let pending work finish, then destroys the runner. `composition.destroy()` awaits this cleanup like any other.

### Task and SerialRunner

A **`Task`** holds the description of a piece of async work without starting it. Its constructor receives a function `(signal: AbortSignal) => Promise<T>`; the work doesn't begin until a runner picks it up. While `'pending'`, the task can be aborted, inspected, or dropped from the queue with no wasted effort. Once `'running'`, the `AbortSignal` fires on cancellation — which `fetch` and any `signal`-aware API handle cleanly.

A **`SerialRunner`** is the simplest scheduler: first in, first out, one at a time. `runner.schedule(task)` returns a promise that resolves to the task's result when it eventually runs. Two useful read points:

- **`runner.settled`** — a promise that resolves once the runner has no pending or running tasks. `await runner.settled` before teardown lets in-flight work finish.
- **`runner.abortPending()` / `runner.abortAll()`** — cancel pending work, or everything including the current task. Useful when a newer request supersedes older ones.

Reach for `Task` when you need control over async work: ordering, cancellation, or the ability to reason about what's in flight. For one-shot async work that you'd be happy to `await` and discard, a plain Promise is still fine.

---

## Actors

`persist` does the job, but it keeps the save lifecycle to itself. If `renderCount` wanted to show "(saving...)" while a save is in flight, or the reset button wanted to cancel an outstanding save, neither could — `persist` owns the runner and the "am I saving?" state internally, without publishing them.

Moving that work into an actor makes the save lifecycle observable. An actor is a message-driven state machine that owns a resource (here, the task runner), processes messages through its own transitions, and publishes its current state as a reactive snapshot that any behavior can subscribe to.

**What it is** — a message-driven state machine that owns a mutable resource. Other behaviors `send()` messages to it; it transitions between states internally; its current state is exposed as a reactive `snapshot` signal.

**When to use it** — when the imperative work a behavior performs is observable state the rest of the composition needs to see or drive. "Is a save in flight?", "Did the last request succeed?", "Please cancel what you're doing" — if any of that should be visible to other behaviors, you've outgrown a plain task.

### A save actor

Refactor `persist`: the runner and save state move into an actor; `persist` sends messages to it; a new `renderSaving` behavior reads the actor's snapshot to surface in-flight status to a dedicated element; a new `cancelOnReset` behavior sends `cancel` when count returns to zero while a save is in flight.

```ts
import { createComposition, effect } from '@videojs/spf/playback-engine';
import { createMachineActor, Task, SerialRunner, update, type Signal } from '@videojs/spf';

// counter, logCount, renderCount, pauseButton, resetButton — unchanged from previous sections

function createSaveActor() {
  function makeSaveTask(count: number) {
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
          // A new save while one is in-flight: drop pending, schedule fresh
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

type SaveActor = ReturnType<typeof createSaveActor>;

function persist({
  state,
  owners,
  config,
}: {
  state: Signal<{ count?: number }>;
  owners: Signal<{ saveActor?: SaveActor }>;
  config: { saveEvery?: number };
}) {
  const actor = createSaveActor();
  update(owners, { saveActor: actor });

  const stopEffect = effect(() => {
    const { count = 0 } = state.get();
    if (count > 0 && count % (config.saveEvery ?? 5) === 0) {
      actor.send({ type: 'save', count });
    }
  });

  return () => {
    stopEffect();
    actor.destroy();
  };
}

function renderSaving({
  owners,
}: {
  owners: Signal<{ savingElement?: HTMLElement; saveActor?: SaveActor }>;
}) {
  return effect(() => {
    const { savingElement, saveActor } = owners.get();
    if (!savingElement) return;
    savingElement.textContent = saveActor?.snapshot.get().value === 'saving' ? 'saving...' : '';
  });
}

function cancelOnReset({
  state,
  owners,
}: {
  state: Signal<{ count?: number }>;
  owners: Signal<{ saveActor?: SaveActor }>;
}) {
  return effect(() => {
    const { count } = state.get();
    const { saveActor } = owners.get();
    if (count === 0 && saveActor?.snapshot.get().value === 'saving') {
      saveActor.send({ type: 'cancel' });
    }
  });
}

const composition = createComposition(
  [counter, logCount, persist, renderCount, renderSaving, cancelOnReset, pauseButton, resetButton],
  {
    initialState: { count: 0, paused: true },
    config: { interval: 250, defaultText: '--', saveEvery: 5 },
    initialOwners: {
      renderElement: document.getElementById('counter'),
      savingElement: document.getElementById('saving'),
      pauseBtn: document.getElementById('pause'),
      resetBtn: document.getElementById('reset'),
    },
  },
);

await composition.destroy();
```

The actor makes the save lifecycle observable. `persist` publishes the actor through owners and forwards save triggers as messages; `renderSaving` reads `saveActor.snapshot.get().value` and writes "saving..." to its own dedicated element when the actor is in the `'saving'` state; `cancelOnReset` reads the same snapshot and sends a `cancel` message when count returns to zero during an in-flight save, aborting the work and transitioning the actor back to `idle`. None of these behaviors knows how a save is performed — they interact with the actor as a black box that happens to expose its current state. And `resetButton` no longer has to know anything about saving: it just writes `{ count: 0 }` to state; `cancelOnReset` handles the rest.

### Messages, transitions, and snapshot

An actor is defined by its states, its message handlers (`on`), and a snapshot signal it publishes.

- **Messages** — `actor.send({ type: 'save', count: 42 })`. Each state declares the messages it accepts under `on`; unhandled messages are ignored. The handler receives the message plus a context exposing `transition`, `setContext`, and the actor's own `runner`.
- **Transitions** — call `transition('saving')` inside a handler to move the actor to another state. Transitions are explicit in the handlers rather than derived the way a reactor's `monitor` is. `onSettled` lets you auto-transition when the runner finishes: here, the `saving` state drops back to `idle` once the scheduled task settles, with no manual bookkeeping.
- **Snapshot** — `actor.snapshot` is a `Signal<{ value: string; context: Context }>` that publishes the actor's current state name and context. Any behavior that reads it inside an `effect()` re-runs on every transition or `setContext` call, which is what lets `renderSaving` write "saving..." without `persist` publishing a separate "am I saving?" flag.

The division of labor:

- **Reactors decide _when_** something should happen, by observing signals.
- **Actors handle _how_** it happens, by managing imperative work and publishing its status.

A reactor might send a message to an actor when a condition goes true; the actor performs the work and publishes its state; other behaviors observe that state through the snapshot signal. Each piece stays in its lane.

---

## Creating owners within behaviors

Behaviors have only ever read from owners so far — consuming resources that callers passed in via `initialOwners`. But behaviors can produce owners too: create a resource, register it in owners, and clean it up on teardown. That keeps resource creation inside the composition, which matters when a single composition needs several related resources that share a lifecycle.

A `mount` behavior takes a single parent — `rootElement` — and creates the rest:

```ts
import { effect } from '@videojs/spf/playback-engine';
import { update, type Signal } from '@videojs/spf';

function mount({
  owners,
}: {
  owners: Signal<{
    rootElement?: HTMLElement;
    renderElement?: HTMLElement;
    pauseBtn?: HTMLElement;
    resetBtn?: HTMLElement;
  }>;
}) {
  return effect(() => {
    const { rootElement } = owners.get();
    if (!rootElement) return;

    const renderElement = document.createElement('div');
    const pauseBtn = document.createElement('button');
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset';

    rootElement.append(renderElement, pauseBtn, resetBtn);
    update(owners, { renderElement, pauseBtn, resetBtn });

    return () => {
      renderElement.remove();
      pauseBtn.remove();
      resetBtn.remove();
      update(owners, {
        renderElement: undefined,
        pauseBtn: undefined,
        resetBtn: undefined,
      });
    };
  });
}

const composition = createComposition(
  [counter, logCount, mount, renderCount, pauseButton, resetButton],
  {
    initialState: { count: 0, paused: true },
    config: { interval: 250, defaultText: '--' },
    initialOwners: { rootElement: document.getElementById('counter') },
  },
);
```

`mount` reads `rootElement`, creates three descendant elements, attaches them to the DOM, and writes them back into owners. The other behaviors — `renderCount`, `pauseButton`, `resetButton` — pick them up through the guards we've already written; none of them knows a mount step happened. When the composition is destroyed (or if `rootElement` is swapped or cleared), the cleanup detaches the descendants and clears them from owners, which re-trips the guards and leaves every downstream behavior quiescent.

The media-engine analog is the same shape. A composition that drives HLS playback takes an `HTMLMediaElement` as its root owner and internally creates a `MediaSource` and one or more `SourceBuffer`s attached to it — resources whose creation, lifetime, and cleanup all belong to the composition. The caller only ever hands in the media element.

---

## Wrapping a composition in a public API

Compositions expose `state`, `owners`, and `destroy` — the right surface for behaviors and internal authors, too much and too low-level for outside consumers. Someone using your counter component doesn't want to write `update(composition.state, { paused: true })`; they want `counter.pause()`. And they don't want to subscribe to a signal; they want to `addEventListener('countchange', ...)`.

A wrapper sits in front of the composition and projects exactly the surface you choose. A `Counter` class that extends `EventTarget` gives consumers a DOM-shaped API:

```ts
import { createComposition, effect, type Composition } from '@videojs/spf/playback-engine';
import { update } from '@videojs/spf';

type CounterState = { count?: number; paused?: boolean };
type CounterOwners = {
  rootElement?: HTMLElement;
  renderElement?: HTMLElement;
  pauseBtn?: HTMLElement;
  resetBtn?: HTMLElement;
};

class Counter extends EventTarget {
  readonly #composition: Composition<CounterState, CounterOwners>;
  readonly #stopBridge: () => void;

  constructor(rootElement: HTMLElement) {
    super();

    this.#composition = createComposition(
      [counter, logCount, mount, renderCount, pauseButton, resetButton],
      {
        initialState: { count: 0, paused: true },
        config: { interval: 250, defaultText: '--' },
        initialOwners: { rootElement },
      },
    );

    // Bridge state changes to events on `this`
    let lastCount: number | undefined;
    let lastPaused: boolean | undefined;
    this.#stopBridge = effect(() => {
      const { count, paused } = this.#composition.state.get();
      if (count !== lastCount) {
        lastCount = count;
        this.dispatchEvent(new CustomEvent('countchange', { detail: count ?? 0 }));
      }
      if (paused !== lastPaused) {
        lastPaused = paused;
        this.dispatchEvent(new Event(paused ? 'pause' : 'play'));
      }
    });
  }

  get count(): number {
    return this.#composition.state.get().count ?? 0;
  }

  get paused(): boolean {
    return this.#composition.state.get().paused ?? true;
  }

  pause(): void {
    update(this.#composition.state, { paused: true });
  }

  resume(): void {
    update(this.#composition.state, { paused: false });
  }

  reset(): void {
    update(this.#composition.state, { count: 0 });
  }

  async destroy(): Promise<void> {
    this.#stopBridge();
    await this.#composition.destroy();
  }
}
```

From outside, consumers see something that looks and feels like a native DOM object:

```ts
const counter = new Counter(document.getElementById('counter-root'));

counter.addEventListener('countchange', (e) => {
  console.log('count:', (e as CustomEvent<number>).detail);
});
counter.addEventListener('play', () => console.log('running'));
counter.addEventListener('pause', () => console.log('paused'));

counter.resume();

console.log(counter.count);   // 3
console.log(counter.paused);  // false

await counter.destroy();
```

No signals in sight. No `composition.state.get()`, no `update(...)`, no `effect()`. The wrapper maps every piece of the composition surface onto a consumer-shaped primitive: getters project current state, methods forward to `update()`, and a single bridging `effect()` translates state transitions into events on `this` (which is an `EventTarget`, so `addEventListener` and `dispatchEvent` just work).

`destroy()` is the one place the wrapper's own cleanup lives. `#stopBridge` stops the bridging effect; `this.#composition.destroy()` tears down every behavior. Consumers get a single `Promise` to await.

More events can be wired the same way — a `saving`/`saved` pair reading `saveActor.snapshot`, a `destroy` event dispatched before teardown, custom events derived from any signal worth surfacing. The pattern scales: every piece of composition state that matters to a consumer gets its own projection.

This is the Adapter shape. For the HLS playback engine, `SpfMedia` (the web-component adapter) wraps `createHlsPlaybackEngine` the same way: consumers interact with a familiar `HTMLMediaElement`-shaped API (`play()`, `pause()`, `currentTime`, `addEventListener('timeupdate', ...)`) while the internal composition runs hidden underneath.
