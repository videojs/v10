# SPF Fundamentals

SPF is a general-purpose composition framework. It provides composable primitives — reactive state, reactors, tasks, and actors — that let you assemble a composition from independent, decoupled behaviors.

The framework doesn't know about your domain. It provides the composition model; you provide the behaviors.

---

## Compositions

A composition is SPF's unit of assembly. `createComposition` takes a list of **behaviors** — declarative units that each handle one concern and declare which slots they read and write — wires them to shared per-slot signals, and returns a small API for reading state and tearing everything down.

**What it is** — a factory that wires independent behaviors to shared reactive channels and returns a handle for reading state and tearing everything down.

**When to use it** — when a problem has multiple concerns that share data and lifecycle. Each concern stays a standalone unit; shared values flow through signals; cleanup happens together.

### A composition in action

A composition with one stand-in behavior, driven entirely from outside:

```ts
import { createComposition, defineBehavior, effect, computed } from '@videojs/spf';
import type { Signal } from '@videojs/spf';

const defineCount = defineBehavior({
  stateKeys: ['count'],
  contextKeys: [],
  setup: ({ state }: { state: { count: Signal<number | undefined> } }) => {
    // no logic yet — this behavior exists to declare the count slot
  },
});

const composition = createComposition([defineCount]);

composition.state.count.get(); // undefined

const stopLogging = effect(() => {
  console.log(composition.state.count.get());
});

const doubled = computed(() => (composition.state.count.get() ?? 0) * 2);

const id = setInterval(() => {
  composition.state.count.set((composition.state.count.get() ?? 0) + 1);
}, 250);

await composition.destroy();
stopLogging();
clearInterval(id);
```

### Creating a composition

`createComposition` takes an array of behaviors and returns a small handle:

```ts
const composition = createComposition([defineCount]);

composition.state;     // { count: Signal<number | undefined> }
composition.context;   // {}
composition.destroy(); // Promise<void>
```

Those three properties — `state`, `context`, `destroy` — are the composition's entire public API.

> [!NOTE]
> The set of reactive channels a composition exposes may grow. Additional channels — for example an event stream, either as another TC39 signal or an `EventTarget` — are under consideration. Treat `state` and `context` as the current primitives, not a closed set.

`state` and `context` are **maps of signals** — one [TC39 Signal](https://github.com/tc39/proposal-signals) per declared key. You read each with `.get()` and write each with `.set()`. Behaviors only see the slots they asked for in their `stateKeys` / `contextKeys` declarations.

### Giving state a shape

`defineCount` is the smallest useful behavior: a `defineBehavior` call that does nothing except declare a state slot.

```ts
const defineCount = defineBehavior({
  stateKeys: ['count'],
  contextKeys: [],
  setup: ({ state }: { state: { count: Signal<number | undefined> } }) => {
    // no logic yet
  },
});
```

The setup parameter type is the contract. `state.count: Signal<number | undefined>` says: "this composition has a `count` slot that holds a number-or-undefined; this behavior can read and write it." `defineBehavior` enforces that the runtime `stateKeys` array matches exactly what the setup type declares — drift between the two is a compile error at the call site.

When the composition runs, the `count` slot exists, every behavior that asks for it gets the same `Signal<number | undefined>` reference, and:

```ts
composition.state.count.set(3);
composition.state.count.get(); // 3

// @ts-expect-error — count must be a number-or-undefined
composition.state.count.set('not a number');
```

Without behaviors, no slots exist. `createComposition([])` returns a composition with empty `state` and `context`:

```ts
const empty = createComposition([]);
empty.state; // {}
```

Slots come from behaviors.

When you pass multiple behaviors, their declarations are unioned — incompatible ones (two behaviors declaring the same slot with different value types) fail at compile time. That story is demonstrated in [Context](#context), where multiple behaviors first appear organically.

### Per-slot read/write intent

Behaviors declare per-slot intent by typing each setup-param slot as `Signal<T>` (writable) or `ReadonlySignal<T>` (read-only):

```ts
const renderCount = defineBehavior({
  stateKeys: ['count'],
  contextKeys: [],
  setup: ({ state }: { state: { count: ReadonlySignal<number | undefined> } }) =>
    effect(() => console.log(state.count.get())),
});
```

This behavior reads `count` but cannot write it — TS rejects `.set()` on `ReadonlySignal<T>` (which is `Omit<Signal<T>, 'set'>`). Body-level enforcement falls out structurally; nothing extra to remember.

A behavior that writes a slot types it as `Signal<T>`. A behavior that only reads types it as `ReadonlySignal<T>`. The setup signature is self-documenting.

### Using the composition from outside

From outside the composition — wherever your code called `createComposition` — you interact with its signals directly. Reading is synchronous:

```ts
composition.state.count.get(); // current value
```

Observation uses `effect`: it runs its callback immediately, tracks every signal the callback reads, and re-runs the callback whenever any of those signals change. It returns a cleanup function.

```ts
const stopLogging = effect(() => {
  console.log(composition.state.count.get());
});
```

Derived values use `computed`: a read-only signal whose value is a function of other signals. It recomputes lazily — only when something reads it after a dependency has changed.

```ts
const doubled = computed(() => (composition.state.count.get() ?? 0) * 2);

doubled.get(); // whatever `(count ?? 0) * 2` is
```

Writes from outside are uncommon — ongoing work almost always belongs in a behavior. Driving `count` on an interval from outside, for example, means you own the interval's lifecycle yourself:

```ts
const id = setInterval(() => {
  composition.state.count.set((composition.state.count.get() ?? 0) + 1);
}, 250);
```

For external code that needs to drive a composition over its lifetime — set state on user input, swap a media element, etc. — there's a generic pattern using the `shareSignals` behavior; see [shareSignals](#sharesignals).

> [!NOTE]
> Direct writes from outside via `composition.state.x.set(...)` work today but are mostly a pedagogical convenience. For code with a longer lifecycle — a wrapper class, an adapter, anything that drives the composition over time — the canonical pattern is [`shareSignals`](#sharesignals) + `config.onSignalsReady`. A future change may narrow `composition.state` / `composition.context` to read-only views on the public surface, making [`shareSignals`](#sharesignals) the only external write path. Examples below continue to use direct writes where it keeps the focus on the concept being introduced.

Destroying the composition runs each behavior's cleanup and awaits any async work — but anything you started out here is on you:

```ts
await composition.destroy(); // behaviors are torn down
stopLogging();                // the effect is on you
clearInterval(id);            // the interval is on you
```

---

## State

The `setInterval` and the logger that drove `count` from outside both work, but their lifecycles sit apart from the composition's. Moved inside as behaviors, each gets typed access to the slots it needs, cleanup ties into `destroy()`, and they coordinate with each other through the shared signals.

State is the surface those behaviors share. A map of discrete signals — one per declared key — visible from the outside through `composition.state`. Behaviors write to a slot when something happens; behaviors read a slot to know what's going on; the outside world subscribes when it needs to react. Because each slot is a signal, changes flow automatically — nobody coordinates, nobody wires things up.

**What it is** — a map of per-slot signals derived from each behavior's declared `stateKeys`.

**When to use it** — for any value two or more behaviors (or the outside world) need to observe or drive. Counts, selections, flags, timestamps — anything that flows *through* the composition over time.

### A counter behavior

A counter that ticks on an interval paired with a logger that reads the count as it changes — two behaviors coordinating entirely through shared state:

```ts
import { createComposition, defineBehavior, effect } from '@videojs/spf';
import type { ReadonlySignal, Signal } from '@videojs/spf';

const counter = defineBehavior({
  stateKeys: ['count'],
  contextKeys: [],
  setup: ({
    state,
    config,
  }: {
    state: { count: Signal<number | undefined> };
    config: { interval?: number };
  }) => {
    const id = setInterval(() => {
      state.count.set((state.count.get() ?? 0) + 1);
    }, config.interval ?? 1000);

    return () => clearInterval(id);
  },
});

const logCount = defineBehavior({
  stateKeys: ['count'],
  contextKeys: [],
  setup: ({ state }: { state: { count: ReadonlySignal<number | undefined> } }) =>
    // effect() returns its own cleanup; handing it back here ties
    // the effect's lifecycle to composition.destroy()
    effect(() => {
      console.log(state.count.get());
    }),
});

const composition = createComposition([counter, logCount], {
  initialState: { count: 0 },
  config: { interval: 250 },
});
// logs: 0, 1, 2, 3, ...

await composition.destroy(); // clears the interval and stops the effect
```

Neither behavior knows the other exists. `counter` writes to `state.count`; `logCount` reads it. They coordinate through the shared signal, and each hands back the cleanup that belongs to its own lifecycle — a `clearInterval` closure for `counter`, the function `effect()` returned for `logCount`. One call to `composition.destroy()` unwinds both.

Note the read/write split: `counter` types `state.count` as `Signal` (it writes), `logCount` types it as `ReadonlySignal` (it only reads). At compose time, the union allows any behavior to read; only behaviors typed `Signal` can write. If you accidentally `.set()` on a slot you typed `ReadonlySignal`, TS rejects the call.

### `initialState`

`initialState` sets the starting value of each state slot:

```ts
createComposition([counter], { initialState: { count: 0 } });
composition.state.count.get(); // 0
```

Its type is derived from the behaviors. Because `counter` annotates `state.count` as `Signal<number | undefined>`, TypeScript requires `initialState.count` to be assignable to `number | undefined`:

```ts
// ✅ matches the behavior's declared state
createComposition([counter], { initialState: { count: 0 } });

// @ts-expect-error — count must be a number-or-undefined
createComposition([counter], { initialState: { count: 'zero' } });
```

If you omit a key from `initialState`, that slot starts as `undefined` — which is why `counter` falls back with `state.count.get() ?? 0` on its first tick.

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

## Context

A ticking counter and a console log aren't much of an application. What you'd actually want is to render the count somewhere — say, into an element on the page. That needs access to the element itself: a `<div>`, a buffer, an open socket. These are **resources** — platform objects with imperative interfaces that don't fit cleanly into plain application data, and the **context** channel is where they live.

The composition holds a map of signals whose values are resources. Behaviors read the keys they care about and act on the resources directly; `effect()` re-runs when a key appears, is replaced, or is cleared. The element itself is still the element — context doesn't wrap or proxy it, it just makes its lifecycle reactive.

**What it is** — a map of per-slot signals for resources, parallel to state but holding values with identity rather than data.

**When to use it** — for values that have identity and behavior, not just data — DOM elements, buffers, long-lived connections. If you'd pass the thing around by reference, it probably belongs in context.

> [!NOTE]
> The split between `state` and `context` is structural at the framework level — both are signal maps with the same API — but conventional in practice. State is for plain data; context is for resources. The composition treats them identically; the split exists for code clarity.

### A DOM-renderer behavior

A behavior that renders the counter to a DOM element, joining the counter and logger from the previous section:

```ts
import { createComposition, defineBehavior, effect } from '@videojs/spf';
import type { ReadonlySignal } from '@videojs/spf';

// counter, logCount — unchanged from the previous section

const renderCount = defineBehavior({
  stateKeys: ['count'],
  contextKeys: ['renderElement'],
  setup: ({
    state,
    context,
    config,
  }: {
    state: { count: ReadonlySignal<number | undefined> };
    context: { renderElement: ReadonlySignal<HTMLElement | undefined> };
    config: { defaultText?: string };
  }) =>
    effect(() => {
      const renderElement = context.renderElement.get();
      if (!renderElement) return;
      renderElement.textContent = String(state.count.get() ?? config.defaultText ?? 'N/A');
    }),
});

const composition = createComposition([counter, logCount, renderCount], {
  initialState: { count: 0 },
  config: { interval: 250, defaultText: '--' },
  initialContext: { renderElement: document.getElementById('counter') ?? undefined },
});

await composition.destroy();
```

`renderCount` reads from both channels. Both slots are typed `ReadonlySignal` — the behavior only reads, never writes. `effect()` tracks every signal the callback reads and re-runs when any of them change, so when `count` ticks up, or when `renderElement` is swapped out or cleared, the renderCount callback runs again. The guard `if (!renderElement) return` handles the case where the element isn't in context yet (for example, if `initialContext` was omitted or the DOM wasn't ready).

### `initialContext`

`initialContext` seeds the context signals, the same way `initialState` seeds state:

```ts
createComposition([counter, logCount, renderCount], {
  initialContext: { renderElement: document.getElementById('counter') ?? undefined },
});
```

Its type is derived from the behaviors. Because `renderCount` annotates `context.renderElement` as a signal of `HTMLElement | undefined`, TypeScript requires `initialContext.renderElement` to be assignable to that:

```ts
// @ts-expect-error — renderElement expects an HTMLElement, not a number
createComposition([renderCount], { initialContext: { renderElement: 42 } });
```

If you omit a context key, that slot starts as `undefined` — which is why `renderCount` guards with `if (!renderElement) return` before using it.

### Updating context from outside

Context slots are signals like state — you can write to them the same way, usually from inside a behavior, occasionally from outside when orchestrating resources that live beyond the composition's scope.

Swapping the element mid-composition updates what `renderCount` is rendering into. Because `effect()` tracks `context.renderElement`, the swap re-runs the callback and the new element starts receiving updates immediately:

```ts
const anotherDiv = document.getElementById('other-counter');
composition.context.renderElement.set(anotherDiv ?? undefined);
```

Unsetting back to `undefined` is also fine — the guard turns the absence into a no-op:

```ts
composition.context.renderElement.set(undefined); // renderCount stops writing to the DOM
composition.context.renderElement.set(anotherDiv ?? undefined); // and picks back up
```

The same pattern covers creation time: if you omit `initialContext`, the slot starts as `undefined`, the first effect run bails on the guard, and `renderCount` comes alive the moment a behavior (or outside code) attaches the element.

This is the loose-coupling payoff. `renderCount` doesn't need to know *when* `renderElement` will exist, only what to do when it does. Resources can arrive late, be swapped, or disappear — the behavior adjusts.

For a more structured way to do external writes — useful when a wrapper class or adapter needs to drive the composition over its lifetime — see [shareSignals](#sharesignals).

### Composing behaviors

When you pass more than one behavior to `createComposition`, their declarations are unioned and the compiler catches conflicts. State and context are treated identically: each behavior contributes the per-slot types it declares, and slots with conflicting types across behaviors fail at compile time.

```ts
const expectsNumber = defineBehavior({
  stateKeys: ['value'],
  contextKeys: [],
  setup: ({ state }: { state: { value: Signal<number | undefined> } }) => {},
});

const expectsString = defineBehavior({
  stateKeys: ['value'],
  contextKeys: [],
  setup: ({ state }: { state: { value: Signal<string | undefined> } }) => {},
});

// @ts-expect-error — behaviors have conflicting state types
createComposition([expectsNumber, expectsString]);
```

Two behaviors can share a slot if their declared types are compatible — typically the same type, or one being a subtype of the other (e.g. `HTMLVideoElement` vs `HTMLElement`). The compose-time validator picks the most specific type from the intersection.

The same rule applies to context. The framework doesn't distinguish "data slots" from "resource slots" structurally — it just unions the declared shapes per channel.

---

## Reactors

The counter ticks on an interval whether you want it to or not. If you let users pause it, one approach is to check a `paused` flag inside the interval callback — but that leaves the interval running forever, just idling. What you really want is setup and teardown tied to the transition itself: the interval starts when the counter enters a "running" phase, and stops when it leaves.

An `effect()` can't cleanly model that. It re-runs on every signal change with no sense of phase. That's fine for "render the count into the DOM" — every change should re-render. It's wrong for "start a timer while `paused` is false." What you need is a state machine over signals: a **reactor**.

**What it is** — a state machine whose target state is derived from signals. Transitions run setup on entry and cleanup on exit.

**When to use it** — when a behavior has distinct phases with setup/teardown tied to signal-derived conditions, not just observation.

### A pausable counter

A counter that can be paused and reset from DOM buttons. The counter is now a reactor; the rest are ordinary effect-based behaviors:

```ts
import { createComposition, defineBehavior, effect, createMachineReactor } from '@videojs/spf';
import type { ReadonlySignal, Signal } from '@videojs/spf';
import { listen } from '@videojs/utils/dom';

// logCount, renderCount — unchanged from the previous section

const counter = defineBehavior({
  stateKeys: ['count', 'paused'],
  contextKeys: [],
  setup: ({
    state,
    config,
  }: {
    state: {
      count: Signal<number | undefined>;
      paused: ReadonlySignal<boolean | undefined>;
    };
    config: { interval?: number };
  }) =>
    createMachineReactor({
      initial: 'paused',
      monitor: () => (state.paused.get() ? 'paused' : 'running'),
      states: {
        paused: {},
        running: {
          // entry runs once on transition; its return value is cleanup,
          // called on exit (pause or destroy)
          entry: () => {
            const id = setInterval(() => {
              state.count.set((state.count.get() ?? 0) + 1);
            }, config.interval ?? 1000);
            return () => clearInterval(id);
          },
        },
      },
    }),
});

const pauseButton = defineBehavior({
  stateKeys: ['paused'],
  contextKeys: ['pauseBtn'],
  setup: ({
    state,
    context,
  }: {
    state: { paused: Signal<boolean | undefined> };
    context: { pauseBtn: ReadonlySignal<HTMLElement | undefined> };
  }) => {
    // Keep the button label in sync with paused
    const stopLabel = effect(() => {
      const pauseBtn = context.pauseBtn.get();
      if (!pauseBtn) return;
      pauseBtn.textContent = state.paused.get() ? 'Start' : 'Pause';
    });

    // listen() attaches a click handler and returns a cleanup that removes it
    const stopClick = effect(() => {
      const pauseBtn = context.pauseBtn.get();
      if (!pauseBtn) return;
      return listen(pauseBtn, 'click', () => {
        state.paused.set(!state.paused.get());
      });
    });

    return () => {
      stopLabel();
      stopClick();
    };
  },
});

const resetButton = defineBehavior({
  stateKeys: ['count'],
  contextKeys: ['resetBtn'],
  setup: ({
    state,
    context,
  }: {
    state: { count: Signal<number | undefined> };
    context: { resetBtn: ReadonlySignal<HTMLElement | undefined> };
  }) =>
    effect(() => {
      const resetBtn = context.resetBtn.get();
      if (!resetBtn) return;
      return listen(resetBtn, 'click', () => state.count.set(0));
    }),
});

const composition = createComposition([counter, logCount, renderCount, pauseButton, resetButton], {
  initialState: { count: 0, paused: true },
  config: { interval: 250, defaultText: '--' },
  initialContext: {
    renderElement: document.getElementById('counter') ?? undefined,
    pauseBtn: document.getElementById('pause') ?? undefined,
    resetBtn: document.getElementById('reset') ?? undefined,
  },
});

await composition.destroy();
```

`counter` is now a reactor with two states, `paused` and `running`. Its `monitor` reads `state.paused.get()` and returns the target. When the user clicks the pause button, `pauseButton` writes to state; `monitor` re-derives, and the reactor transitions. `entry` on `running` starts the interval; the cleanup it returns runs on the way back to `paused`. The framework handles the transition — `counter` never calls `transition()` itself.

`pauseButton`, `resetButton`, and `renderCount` are ordinary effect-based behaviors reacting to the same state the reactor derives from. None of them knows a reactor exists. Everything coordinates through the shared signals.

The read/write split is visible across the behaviors: `counter` writes `count` (Signal) and only reads `paused` (ReadonlySignal); `pauseButton` writes `paused` (Signal); `resetButton` writes `count` (Signal). `count` and `paused` each have multiple readers but a clear set of writers — visible at each behavior's setup signature without needing to read bodies.

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
import { createComposition, defineBehavior, effect, computed, Task, SerialRunner } from '@videojs/spf';
import type { ReadonlySignal } from '@videojs/spf';

// counter, logCount, renderCount, pauseButton, resetButton — unchanged from previous sections

const persist = defineBehavior({
  stateKeys: ['count'],
  contextKeys: [],
  setup: ({
    state,
    config,
  }: {
    state: { count: ReadonlySignal<number | undefined> };
    config: { saveEvery?: number };
  }) => {
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

    // Isolate count so unrelated re-runs don't fire spurious saves
    const count = computed(() => state.count.get() ?? 0);

    // Watch count and save at every Nth tick
    const stopEffect = effect(() => {
      const c = count.get();
      if (c > 0 && c % (config.saveEvery ?? 5) === 0) {
        save(c);
      }
    });

    // Async cleanup: save the final count, let the runner drain, then tear down
    return async () => {
      stopEffect();
      save(count.get());
      await runner.settled;
      runner.destroy();
    };
  },
});

const composition = createComposition(
  [counter, logCount, renderCount, pauseButton, resetButton, persist],
  {
    initialState: { count: 0, paused: true },
    config: { interval: 250, defaultText: '--', saveEvery: 5 },
    initialContext: {
      renderElement: document.getElementById('counter') ?? undefined,
      pauseBtn: document.getElementById('pause') ?? undefined,
      resetBtn: document.getElementById('reset') ?? undefined,
    },
  },
);

// Saves at count 5, 10, 15, 20... and once more on destroy.
await composition.destroy();
```

Three things are new. The `save()` closure wraps each network request in `new Task(...)`; the task's body receives an `AbortSignal` that `fetch` understands natively. The `SerialRunner` collects scheduled tasks and runs them one at a time — scheduling a second task while the first is still running queues it behind, with no overlap. And `persist`'s cleanup is `async`: it stops the effect, schedules one last save, `await`s `runner.settled` to let pending work finish, then destroys the runner. `composition.destroy()` awaits this cleanup like any other.

`persist` types `count` as `ReadonlySignal` — it observes but doesn't write the slot. The actual save state (in flight, last error, etc.) is internal to the closure. Making *that* observable is what actors are for; see the next section.

### Narrowing what an effect re-runs on

The save effect wraps `count` in a `computed`:

```ts
const count = computed(() => state.count.get() ?? 0);
```

The reason is the shape of the effect that reads it. `save()` is a non-idempotent side effect: it schedules a network request. A signal re-notifies on every write, even when the new value equals the old; reading `state.count.get()` directly inside an effect would re-fire on every write, even no-ops. `computed` caches by value: reading its `.get()` inside an effect only triggers a re-run when that value actually changed.

For the DOM-update effects earlier in the doc — `renderCount` setting `textContent`, `pauseButton`'s label — spurious re-runs are harmless: the assignment just writes the same value already there. The `computed` guardrail matters when the effect's side effect isn't free to repeat.

### Task and SerialRunner

A **`Task`** holds the description of a piece of async work without starting it. Its constructor receives a function `(signal: AbortSignal) => Promise<T>`; the work doesn't begin until a runner picks it up. While `'pending'`, the task can be aborted, inspected, or dropped from the queue with no wasted effort. Once `'running'`, the `AbortSignal` fires on cancellation — which `fetch` and any `signal`-aware API handle cleanly.

A **`SerialRunner`** is the simplest scheduler: first in, first out, one at a time. `runner.schedule(task)` returns a promise that resolves to the task's result when it eventually runs. Two useful read points:

- **`runner.settled`** — a promise that resolves once the runner has no pending or running tasks. `await runner.settled` before teardown lets in-flight work finish.
- **`runner.abortPending()` / `runner.abortAll()`** — cancel pending work, or everything including the current task. Useful when a newer request supersedes older ones.

`SerialRunner` is the simplest scheduler, but not the only one: `ConcurrentRunner` runs tasks in parallel and deduplicates by `task.id`, which fits request batches where "the same thing twice" should collapse. Both accept any `TaskLike`, so building your own runner — rate-limited, priority-ordered, whatever your workload needs — is a supported extension point, not a workaround.

Reach for `Task` when you need control over async work: ordering, cancellation, or the ability to reason about what's in flight. For one-shot async work that you'd be happy to `await` and discard, a plain Promise is still fine.

---

## Actors

`persist` does the job, but it keeps the save lifecycle to itself. If one behavior wanted to show "saving..." while a save is in flight, or another wanted to cancel an outstanding save when the user hits reset, neither could — `persist` owns the runner and the "am I saving?" state internally, without publishing them.

Moving that work into an actor makes the save lifecycle observable. An actor is a message-driven state machine that owns a resource (here, the task runner), processes messages through its own transitions, and publishes its current state as a reactive snapshot that any behavior can subscribe to.

**What it is** — a message-driven state machine that owns a mutable resource. Other behaviors `send()` messages to it; it transitions between states internally; its current state is exposed as a reactive `snapshot` signal.

**When to use it** — when the imperative work a behavior performs is observable state the rest of the composition needs to see or drive. "Is a save in flight?", "Did the last request succeed?", "Please cancel what you're doing" — if any of that should be visible to other behaviors, you've outgrown a plain task.

### A save actor

Refactor `persist`: the runner and save state move into an actor; `persist` sends messages to it; a new `renderSaving` behavior reads the actor's snapshot to surface in-flight status to a dedicated element; a new `cancelOnReset` behavior sends `cancel` when count returns to zero while a save is in flight.

```ts
import {
  createComposition,
  defineBehavior,
  effect,
  computed,
  createMachineActor,
  Task,
  SerialRunner,
} from '@videojs/spf';
import type { ReadonlySignal, Signal } from '@videojs/spf';

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

const persist = defineBehavior({
  stateKeys: ['count'],
  contextKeys: ['saveActor'],
  setup: ({
    state,
    context,
    config,
  }: {
    state: { count: ReadonlySignal<number | undefined> };
    context: { saveActor: Signal<SaveActor | undefined> };
    config: { saveEvery?: number };
  }) => {
    const actor = createSaveActor();
    context.saveActor.set(actor);

    // Isolate count so unrelated re-runs don't fire spurious saves
    const count = computed(() => state.count.get() ?? 0);

    const stopEffect = effect(() => {
      const c = count.get();
      if (c > 0 && c % (config.saveEvery ?? 5) === 0) {
        actor.send({ type: 'save', count: c });
      }
    });

    return () => {
      stopEffect();
      actor.destroy();
    };
  },
});

const renderSaving = defineBehavior({
  stateKeys: [],
  contextKeys: ['savingElement', 'saveActor'],
  setup: ({
    context,
  }: {
    context: {
      savingElement: ReadonlySignal<HTMLElement | undefined>;
      saveActor: ReadonlySignal<SaveActor | undefined>;
    };
  }) =>
    effect(() => {
      const savingElement = context.savingElement.get();
      const saveActor = context.saveActor.get();
      if (!savingElement) return;
      savingElement.textContent = saveActor?.snapshot.get().value === 'saving' ? 'saving...' : '';
    }),
});

const cancelOnReset = defineBehavior({
  stateKeys: ['count'],
  contextKeys: ['saveActor'],
  setup: ({
    state,
    context,
  }: {
    state: { count: ReadonlySignal<number | undefined> };
    context: { saveActor: ReadonlySignal<SaveActor | undefined> };
  }) => {
    // Isolate count so unrelated state changes don't fire spurious cancels
    const count = computed(() => state.count.get());

    return effect(() => {
      const saveActor = context.saveActor.get();
      if (count.get() === 0 && saveActor?.snapshot.get().value === 'saving') {
        saveActor.send({ type: 'cancel' });
      }
    });
  },
});

const composition = createComposition(
  [counter, logCount, renderCount, pauseButton, resetButton, persist, renderSaving, cancelOnReset],
  {
    initialState: { count: 0, paused: true },
    config: { interval: 250, defaultText: '--', saveEvery: 5 },
    initialContext: {
      renderElement: document.getElementById('counter') ?? undefined,
      savingElement: document.getElementById('saving') ?? undefined,
      pauseBtn: document.getElementById('pause') ?? undefined,
      resetBtn: document.getElementById('reset') ?? undefined,
    },
  },
);

await composition.destroy();
```

The actor makes the save lifecycle observable. `persist` publishes the actor through `context.saveActor` and forwards save triggers as messages; `renderSaving` reads `saveActor.snapshot.get().value` and writes "saving..." to its own dedicated element when the actor is in the `'saving'` state; `cancelOnReset` reads the same snapshot and sends a `cancel` message when count returns to zero during an in-flight save, aborting the work and transitioning the actor back to `idle`. None of these behaviors knows how a save is performed — they interact with the actor as a black box that happens to expose its current state. And `resetButton` no longer has to know anything about saving: it just writes `state.count.set(0)`; `cancelOnReset` handles the rest.

`saveActor` lives in `context` — actors fit the shape (imperative resources with identity that behaviors observe and act on). `persist` types it `Signal` because it writes the actor in once at setup; `renderSaving` and `cancelOnReset` type it `ReadonlySignal` because they only read.

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

## shareSignals

Most behaviors above keep their lifecycle inside the composition. But sometimes external code needs to drive a composition over its lifetime — a wrapper class setting `count` from a method call, an adapter forwarding DOM events into state. Reaching directly into `composition.state.count.set(...)` works, but it spreads composition knowledge into the caller and leaves no clear boundary for "the engine's input surface."

`shareSignals` is a generic passthrough behavior that hands the composition's writable signal refs to a consumer-supplied `config.onSignalsReady` callback at composition setup. The consumer captures the refs and writes through them at runtime. The composition itself doesn't change — `shareSignals` just forwards what's already there.

**What it is** — a behavior factory (`makeShareSignals<S, C>()`) that produces a passthrough behavior. The behavior declares no slots of its own; at setup time it invokes `config.onSignalsReady({ state, context })`.

**When to use it** — when external code needs structured access to a composition's slots over its lifetime, especially when the composition will be re-created (e.g. on source change). The pattern is "create composition → capture refs in callback → drive from outside."

### A counter wrapped via `shareSignals`

```ts
import {
  createComposition,
  defineBehavior,
  makeShareSignals,
  type ShareSignalsConfig,
  type StateSignals,
  type ContextSignals,
} from '@videojs/spf';

interface CounterState {
  count?: number;
  paused?: boolean;
}
interface CounterContext {
  renderElement?: HTMLElement;
}

interface CounterEngineConfig extends ShareSignalsConfig<CounterState, CounterContext> {
  interval?: number;
  defaultText?: string;
}

const shareSignals = makeShareSignals<CounterState, CounterContext>();

function createCounterEngine(config: CounterEngineConfig) {
  return createComposition(
    [counter, logCount, renderCount, shareSignals],
    {
      config,
      initialState: { count: 0, paused: true },
    },
  );
}

// Usage from outside
let signals: { state: StateSignals<CounterState>; context: ContextSignals<CounterContext> };

const engine = createCounterEngine({
  interval: 250,
  onSignalsReady: (refs) => {
    signals = refs;
  },
});

// Drive the engine through the captured refs
signals.context.renderElement.set(document.getElementById('counter') ?? undefined);
signals.state.paused.set(false); // start ticking

await engine.destroy();
```

The engine factory exposes a single config option (`onSignalsReady`); the consumer captures the signal refs and drives the engine through them. `shareSignals` is generic — `makeShareSignals<S, C>()` works for any composition, parameterized over the composition's state and context shapes.

For real-world use, place `shareSignals` last in the behaviors array so every other behavior's setup has run by the time the callback fires. Initial state writes will be visible to the consumer immediately.

---

## Advanced: Creating context within behaviors

Up through Actors, the caller had to hand every element the composition uses directly into `initialContext` — `renderElement`, `savingElement`, `pauseBtn`, `resetBtn`, each looked up from the DOM before `createComposition` runs. Adding or renaming any of them means touching the caller too. Behaviors can close that loop: given a single `rootElement`, a behavior creates the descendants itself, registers them in context, and cleans them up on teardown. That keeps resource creation inside the composition, which matters when a single composition needs several related resources that share a lifecycle.

A `mount` behavior takes a single parent — `rootElement` — and creates the rest:

```ts
import { defineBehavior, effect } from '@videojs/spf';
import type { ReadonlySignal, Signal } from '@videojs/spf';

// counter, logCount, renderCount, pauseButton, resetButton, persist, renderSaving, cancelOnReset — unchanged from previous sections

const mount = defineBehavior({
  stateKeys: [],
  contextKeys: ['rootElement', 'renderElement', 'savingElement', 'pauseBtn', 'resetBtn'],
  setup: ({
    context,
  }: {
    context: {
      rootElement: ReadonlySignal<HTMLElement | undefined>;
      renderElement: Signal<HTMLElement | undefined>;
      savingElement: Signal<HTMLElement | undefined>;
      pauseBtn: Signal<HTMLElement | undefined>;
      resetBtn: Signal<HTMLElement | undefined>;
    };
  }) =>
    effect(() => {
      const rootElement = context.rootElement.get();
      if (!rootElement) return;

      const renderElement = document.createElement('div');
      const savingElement = document.createElement('div');
      const pauseBtn = document.createElement('button');
      const resetBtn = document.createElement('button');
      resetBtn.textContent = 'Reset';

      rootElement.append(renderElement, savingElement, pauseBtn, resetBtn);
      context.renderElement.set(renderElement);
      context.savingElement.set(savingElement);
      context.pauseBtn.set(pauseBtn);
      context.resetBtn.set(resetBtn);

      // If this behavior needed cleanup when rootElement is cleared — to
      // .remove() the descendants, or close a socket, observer, or
      // MediaSource — we'd return a cleanup function from the effect here.
    }),
});

const composition = createComposition(
  [counter, logCount, renderCount, pauseButton, resetButton, persist, renderSaving, cancelOnReset, mount],
  {
    initialState: { count: 0, paused: true },
    config: { interval: 250, defaultText: '--', saveEvery: 5 },
    initialContext: { rootElement: document.getElementById('counter') ?? undefined },
  },
);
```

`mount` reads `rootElement`, creates four descendant elements, attaches them to the DOM, and writes them back into context. The other behaviors — `renderCount`, `renderSaving`, `pauseButton`, `resetButton` — pick them up through the guards we've already written; none of them knows a mount step happened. On destroy, the descendants are discarded along with `rootElement`, and the composition clears every signal in context after all behavior cleanups have run — no manual bookkeeping on either side.

The slot map at `mount`'s setup site reads as documentation. `rootElement` is `ReadonlySignal` — it's an input only. The four descendants are `Signal` — `mount` writes them. Per-slot intent is visible at the boundary; reviewers don't have to spelunk the body to learn which way data flows.

Each descendant is registered under its own key in context rather than left for other behaviors to pick out of `rootElement` themselves. The alternative — watch the subtree with a `MutationObserver` and identify elements by selector or data attribute — works mechanically, but trades away most of what context gives you. You lose typed identity (`renderElement: HTMLElement` is not the same contract as "some `<div>` inside `rootElement`"), you swap synchronous guards for coalesced microtask callbacks, and every downstream behavior becomes coupled to whatever DOM layout `mount` happens to produce. Context is a map of named resources; behaviors reading it never have to know where those resources came from, only that they appeared.

This is also where behaviors-as-units pays off. The contract every downstream behavior relies on is typed context plus guards for missing keys — nothing about *how* the context got populated. The same composition supports several equally valid shapes:

- **Omit `mount`.** Pass `renderElement`, `savingElement`, and the buttons through `initialContext` directly, or write them later via `composition.context.renderElement.set(...)`. This is the shape the Actors example uses.
- **Replace `mount` with a different implementation.** A shadow-DOM variant, a React-rendered variant, one that clones a `<template>`, one that adopts pre-existing elements — any of them can slot in as long as they write the same keys.
- **The one above.** `mount` owns subtree creation and teardown itself.

None of the other behaviors change across those permutations. Substitution at the behavior boundary — rather than at the composition boundary — is what makes that possible.

---

## Advanced: Wrapping a composition in a public API

Compositions expose `state`, `context`, and `destroy` — the right surface for behaviors and internal authors, too much and too low-level for outside consumers. Someone using your counter component doesn't want to write `composition.state.paused.set(true)`; they want `counter.pause()`. And they don't want to subscribe to a signal; they want to `addEventListener('countchange', ...)`.

A wrapper sits in front of the composition and projects exactly the surface you choose. A `Counter` class that extends `EventTarget` gives consumers a DOM-shaped API. Here we use `shareSignals` to capture the refs the wrapper needs to drive the composition:

```ts
import {
  createComposition,
  defineBehavior,
  effect,
  computed,
  makeShareSignals,
} from '@videojs/spf';
import type { Composition, ShareSignalsConfig, StateSignals, ContextSignals } from '@videojs/spf';

// counter, logCount, renderCount, pauseButton, resetButton, persist, renderSaving, cancelOnReset, mount — unchanged

interface CounterState {
  count?: number;
  paused?: boolean;
}
interface CounterContext {
  rootElement?: HTMLElement;
  renderElement?: HTMLElement;
  savingElement?: HTMLElement;
  pauseBtn?: HTMLElement;
  resetBtn?: HTMLElement;
}

interface CounterOptions {
  rootElement: HTMLElement;
  initialCount?: number;
  paused?: boolean;
  tickIntervalMs?: number;
  placeholder?: string;
  autoSaveEveryTicks?: number;
}

const shareSignals = makeShareSignals<CounterState, CounterContext>();

class Counter extends EventTarget {
  readonly #options: Required<CounterOptions>;
  readonly #composition: Composition<CounterState, CounterContext>;
  readonly #signals: { state: StateSignals<CounterState>; context: ContextSignals<CounterContext> };
  #teardowns: Array<() => void> | undefined;

  constructor(options: CounterOptions) {
    super();

    this.#options = {
      initialCount: 0,
      paused: true,
      tickIntervalMs: 250,
      placeholder: '--',
      autoSaveEveryTicks: 5,
      ...options,
    };

    let captured!: { state: StateSignals<CounterState>; context: ContextSignals<CounterContext> };

    this.#composition = createComposition(
      [counter, logCount, renderCount, pauseButton, resetButton, persist, renderSaving, cancelOnReset, mount, shareSignals],
      {
        initialState: { count: this.#options.initialCount, paused: this.#options.paused },
        config: {
          interval: this.#options.tickIntervalMs,
          defaultText: this.#options.placeholder,
          saveEvery: this.#options.autoSaveEveryTicks,
          onSignalsReady: (refs) => {
            captured = refs;
          },
        } satisfies ShareSignalsConfig<CounterState, CounterContext> & {
          interval?: number;
          defaultText?: string;
          saveEvery?: number;
        },
        initialContext: { rootElement: this.#options.rootElement },
      },
    );

    this.#signals = captured;

    // One effect per state-derived event. Each reads a single `computed`,
    // so it only re-runs when that specific value changes — no local
    // "what changed this time?" diffing across fields.
    const count = computed(() => this.#signals.state.count.get());
    const paused = computed(() => this.#signals.state.paused.get());

    this.#teardowns = [
      effect(() => {
        this.dispatchEvent(
          new CustomEvent('countchange', {
            detail: count.get() ?? this.#options.initialCount,
          }),
        );
      }),
      effect(() => {
        this.dispatchEvent(new Event(paused.get() ? 'pause' : 'play'));
      }),
    ];
  }

  get count(): number {
    return this.#signals.state.count.get() ?? this.#options.initialCount;
  }

  get paused(): boolean {
    return this.#signals.state.paused.get() ?? this.#options.paused;
  }

  pause(): void {
    this.#signals.state.paused.set(true);
  }

  resume(): void {
    this.#signals.state.paused.set(false);
  }

  reset(): void {
    this.#signals.state.count.set(0);
  }

  async destroy(): Promise<void> {
    if (!this.#teardowns) return;
    for (const stop of this.#teardowns) stop();
    this.#teardowns = undefined;
    await this.#composition.destroy();
  }
}
```

From outside, consumers see something that looks and feels like a native DOM object:

```ts
const counter = new Counter({
  rootElement: document.getElementById('counter-root')!,
  tickIntervalMs: 100,
  paused: false,
});

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

No signals in sight. No `composition.state.count.get()`, no `.set()`, no `effect()`. The wrapper maps every piece of the composition surface onto a consumer-shaped primitive: the constructor takes one flat options bag, getters project current state, methods forward to writes via the captured refs, and a single bridging `effect()` translates state transitions into events on `this` (which is an `EventTarget`, so `addEventListener` and `dispatchEvent` just work).

Two things `shareSignals` is doing here. First, it gives the wrapper a clean place to capture writable refs without spreading composition knowledge across every method — `pause()`, `resume()`, `reset()` all write through `this.#signals`, not through `this.#composition.state`. Second, it makes the boundary explicit: "these are the slots external code is allowed to drive." If a future change makes some slots read-only on the public surface, the `shareSignals` callback's parameter type is the natural place to declare it.

The options shape is also its own translation layer. Consumers don't see the `state` / `config` / `initialContext` split the composition uses internally; they pass one bag of named values. The constructor merges those over defaults into a `#options` object, then splits it across `createComposition` — `initialCount` and `paused` seed state, `tickIntervalMs` / `placeholder` / `autoSaveEveryTicks` become internal config keys (`interval`, `defaultText`, `saveEvery`), and `rootElement` seeds context. `#options` stays around so the getters can reuse those defaulted values — `count` falls through to `this.#options.initialCount` when state is unset. `reset()` keeps its own hard-coded `0`: that value triggers the composition's `cancelOnReset` behavior, so it belongs to the internal contract rather than the caller-facing options.

The bridge is one effect per derivation, not one effect that diffs every field on each run. `count` and `paused` are pulled out as `computed` signals; each gets its own `effect` dispatching the matching event; and the pair of stop functions is held on `#teardowns`. No `lastCount` / `lastPaused` flags to keep in sync, and each effect re-runs only when its own derivation's value changes. The inverse shape — a single `effect` that reads the whole state and compares each field to a local `let last*` — is imperative diffing wearing a reactive costume; it works, but it stops scaling the moment a third or fourth field shows up.

`destroy()` is the one place the wrapper's own cleanup lives. It iterates `#teardowns` to stop every bridging effect, clears the array so a second `destroy()` is a no-op, then awaits `this.#composition.destroy()` to tear down every behavior. Consumers get a single `Promise` to await.

More events can be wired the same way — a `saving`/`saved` pair reading `saveActor.snapshot` (which is reachable via `this.#signals.context.saveActor`), a `destroy` event dispatched before teardown, custom events derived from any signal worth surfacing. Each is another `computed` + `effect` pushed onto `#teardowns`. The pattern scales: every piece of composition state that matters to a consumer gets its own projection.

---

## Bringing it all together

By the end of the last section, we'd built a running counter with an internal tick, a logger, a DOM renderer, two buttons, a save pipeline, a save actor with observable status, automatic cancel-on-reset, a root-creating mount behavior, a `shareSignals` passthrough, and an adapter wrapper with a DOM-shaped public API — eleven behaviors in total, each a small unit, each unaware of the others. Everything above this section taught how that works by doing. This section pulls the patterns out into the open: what holds across every composition, what's always optional, and what the model is really asking of you.

### Additive, not rewriting

Every section added new behaviors without touching the ones that came before. `counter` and `logCount` stayed the same from State onward; `renderCount` stayed the same from Context onward; the buttons from Reactors onward. New capabilities landed as appended behaviors in the composition list, not as edits to existing ones.

The exceptions are informative. `counter` was redefined in Reactors — its internal `setInterval` became a reactor-managed effect so it could enter and leave a `running` state. `persist` was redefined in Actors — its runner and in-flight flag moved into a dedicated actor, and `persist` itself shrank to a message forwarder. Neither rewrite reached outside the behavior being replaced: `counter` still read and wrote `state.count`; `persist` still triggered on the same Nth-tick condition. The contract each behavior exposed stayed stable; the implementation swapped.

That's the normal way to extend a composition. Replace a behavior with a differently-shaped version of itself; add new behaviors for new capabilities; don't reach into existing behaviors to adjust them.

### Use what you need

None of the primitives are mandatory. A composition with one behavior that increments `count` is a real composition — no reactors, no tasks, no actors, no context, no wrapper. Each primitive exists to solve a problem that a simpler shape couldn't:

- **Reactors** earn their keep when lifecycle depends on state — setup runs while a condition holds, teardown fires when it stops, and nothing has to guard "is this still relevant?" on each tick.
- **Tasks** earn their keep when async work needs introspection or cancellation. If a plain Promise works, a plain Promise is fine.
- **Actors** earn their keep when the imperative work a behavior performs is observable state the rest of the composition needs to see or drive.
- **Context-creating behaviors** earn their keep when a composition needs several related resources that share a lifecycle.
- **`shareSignals`** earns its keep when external code needs structured access to drive the composition over its lifetime.
- **Adapter wrappers** earn their keep when the public API shape diverges from the composition's internal signals.

Each is reachable when the problem becomes real, and sits out of the way when it doesn't. The cost of unused primitives is zero — you never imported them.

### Contracts, not couplings

No behavior in this doc imported another. `renderCount` doesn't know `counter` exists; `cancelOnReset` doesn't know `persist` or the actor factory by name. The only interface between behaviors is the shape of their shared signals — state slots, context slots, config keys. If two behaviors agree on a slot and its type, they can coordinate; if they don't share a slot, they're invisible to each other.

That's why additive composition works. A new behavior only needs to declare which slots it reads and writes. The composition-level type system takes care of merging its declarations with everyone else's and fails at compile time if a slot's type disagrees across behaviors. Nothing has to be taught about a new behavior; nothing gets broken by removing one.

### Multi-writer slots are accepted patterns

A given slot can have multiple writers. The framework doesn't enforce a "single writer per slot" rule — it leaves that judgment to the author. Three patterns recur:

- **Pipeline / patch.** Multiple behaviors each write a different aspect of the same logical object, building on each other (e.g. an adapter seeds an initial value; downstream behaviors progressively patch in derived fields).
- **Intent + reactive default.** One writer is the default-pick (e.g. ABR setting `selectedTrack`); another writer is an external override; a mode flag (`abrDisabled`) disambiguates which one is currently in charge.
- **Two-way DOM sync.** A slot is both a DOM observer's output (DOM event → signal) and a controller's input (signal → drives DOM). The slot is a coordination point.

Per-slot read/write annotations keep these patterns visible at each behavior's setup signature. A reviewer can scan the writer set across behaviors without spelunking bodies.

### Conventions we leaned on

A handful of conventions keep showing up because they pay off across every shape a composition can take. All of them surface earlier in this doc; this is just the index.

- **Guard for missing context.** Every behavior that reads a context slot checks `if (!resourceKey) return;` before using it. Resources can arrive late or be cleared, and effects re-run when they do; the guard is what makes that safe.
- **Per-slot read/write annotations.** Setup-param slots are typed as `Signal<T>` (writable) or `ReadonlySignal<T>` (read-only). Body-level enforcement falls out structurally — TS rejects `.set()` on a read-only slot — and the signature documents intent.
- **Isolate dependencies with `computed`.** When an effect's side effect is non-idempotent (scheduling a save, dispatching an event), wrap the specific field the effect cares about in `computed` so an unrelated state write doesn't re-fire it.
- **One effect per derivation.** When a wrapper translates multiple state fields into separate events, each gets its own `effect` reading its own `computed`. Single-effect-with-diff-flags is imperative tracking wearing a reactive costume.
- **Options bag, flat.** Public constructors take one caller-facing options bag; the wrapper splits it across `initialState` / `config` / `initialContext` internally. Consumers never see the split.
- **Capture refs once via `shareSignals`.** Wrappers and adapters use `shareSignals` to capture writable refs at composition setup, not by reaching into `composition.state` per method. Keeps the public surface and the internal composition decoupled.
- **Cleanup returned, not scattered.** Behaviors return their cleanup function (or an object with `destroy()`), and the composition runs them all on destroy. External lifetime management (like the `#teardowns` array in the Counter wrapper) is only for things outside the composition.

Everything in this doc is fundamentals. Real compositions do more — more behaviors, richer state, deeper context graphs, multiple actors — but none of the primitives change shape. Once the composition model is familiar, the rest is your domain.
