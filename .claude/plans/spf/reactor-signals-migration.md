---
status: in-progress
branch: poc/spf-signals
---

# SPF Reactor Signals Migration

> **Incremental migration plan.** Follows the completed SourceBufferActor spike
> (`signals-poc.md`). Goal: migrate `dom/features/` reactors from `WritableState`
> subscriptions to `Signal.Computed` + `effect()`, one reactor at a time, without
> breaking anything in flight.

## Background

The SourceBufferActor spike validated:

1. TC39 Signals (`signal-polyfill`) work cleanly for SPF's use cases
2. `Signal.Computed` tracks transitively through owner graphs — no manual re-subscription
3. `effect()` is a natural replacement for `subscribe()` in both sync and async contexts
4. The `WritableState → Signal` bridge is 2 lines and easy to localize

The reactor layer — functions in `dom/features/` that translate state/owners changes
into actor messages or MSE operations — is the next migration target. These currently use
`WritableState.subscribe()`, `combineLatest()`, and selector equality functions. With
signals, these collapse into `computed()` + `effect()`.

## Bridge Utilities

Two helpers in `core/signals/bridge.ts` (alongside `effect.ts`):

### `stateToSignal` — WritableState → Signal

```ts
export function stateToSignal<T>(state: State<T>): [Signal.ReadonlyState<T>, () => void] {
  const signal = new Signal.State(state.current);
  const cleanup = state.subscribe((v) => signal.set(v));
  return [signal, cleanup];
}
```

### `signalToState` — Signal → WritableState

```ts
export function signalToState<T, S>(
  signal: Signal.ReadonlyState<S>,
  state: WritableState<T>,
  map: (value: S) => T extends object ? Partial<T> : T
): () => void {
  return effect(() => state.patch(map(signal.get())));
}
```

Both are **temporary scaffolding**. When all reactors are migrated and `WritableState`
is retired, both helpers are deleted. Do not treat them as permanent infrastructure.

## Engine-Level Bridge

`createPlaybackEngine` creates signal mirrors once and keeps them in sync for the engine
lifetime. Migrated reactors receive the signal versions; un-migrated ones continue
receiving `WritableState`.

```ts
// In createPlaybackEngine, after state/owners are created:
const [stateSignal, cleanupStateSignal] = stateToSignal(state);
const [ownersSignal, cleanupOwnersSignal] = stateToSignal(owners);
```

Exposed on `PlaybackEngine` for testing and inspection:

```ts
export interface PlaybackEngine {
  state: WritableState<PlaybackEngineState>;               // authoritative (unchanged)
  owners: WritableState<PlaybackEngineOwners>;             // authoritative (unchanged)
  stateSignal: Signal.ReadonlyState<PlaybackEngineState>;  // mirror for migrated reactors
  ownersSignal: Signal.ReadonlyState<PlaybackEngineOwners>;// mirror for migrated reactors
  events: EventStream<PlaybackEngineAction>;
  destroy: () => void;
}
```

Bridge cleanups go into `destroy()`:

```ts
destroy: () => {
  cleanups.forEach(c => c());
  cleanupStateSignal();
  cleanupOwnersSignal();
  destroyVttParser();
}
```

## Reactor Migration Pattern

### Signature change

```ts
// Before
function myReactor({ state, owners }: {
  state: WritableState<MyState>;
  owners: WritableState<MyOwners>;
}): () => void

// After
function myReactor({ state, owners }: {
  state: Signal.ReadonlyState<MyState>;
  owners: Signal.ReadonlyState<MyOwners>;
}): () => void
```

### Translation table

| Before (WritableState) | After (Signals) |
|---|---|
| `state.subscribe(cb)` | `effect(() => { const s = state.get(); ... })` |
| `owners.subscribe(cb)` | `effect(() => { const o = owners.get(); ... })` |
| `combineLatest([state, owners]).subscribe(cb)` | `effect(() => { state.get(); owners.get(); ... })` — reads both in one effect |
| `subscribe(selector, listener, { equalityFn })` | `new Signal.Computed(() => selector(state.get()), { equals: equalityFn })` + `effect()` |
| `createState(x)` (local intermediate state) | `new Signal.State(x)` |
| `state.patch(...)` from inside listener | same — call directly from inside `effect()` |
| `combineLatest` + `@@INITIALIZE@@` bootstrap | gone — `computed()` evaluates lazily, no bootstrap needed |

### Async effects

Effects must be synchronous, but many reactors kick off async work. The pattern: the
effect detects the condition synchronously and **captures a snapshot** of current values,
then passes the snapshot to an async function. The async function does not read from
signals — it uses only the captured snapshot.

```ts
let running = false;
let abort: AbortController | null = null;

const cleanupEffect = effect(() => {
  const s = stateSignal.get();
  const o = ownersSignal.get();
  if (!shouldRun(s, o) || running) return;

  running = true;
  abort = new AbortController();
  runAsync(s, o, abort.signal).finally(() => { running = false; });
});

return () => {
  cleanupEffect();
  abort?.abort();
};
```

This mirrors the existing `settingUp`/`abortController` pattern already in
`setupMediaSource` — the migration moves it inside an effect body.

### Local intermediate state

`createState` used for local derived values within a reactor becomes `Signal.Computed`
(if purely derived) or `Signal.State` (if independently writable):

```ts
// Before
const segmentsCanLoad = createState<boolean>(false);
combineLatest([state, segmentLoader]).subscribe(([s, loader]) => {
  segmentsCanLoad.patch(isResolvedTrack(getSelectedTrack(s, type)) && !!loader);
});

// After — no subscription, no local patch: just a computed
const segmentsCanLoad = new Signal.Computed(() =>
  isResolvedTrack(getSelectedTrack(stateSignal.get(), type)) && !!segmentLoaderSignal.get()
);
```

## Migration Order

### Step 1 — Bridge utilities + engine wiring (infrastructure, no reactor changes)

- **New**: `core/signals/bridge.ts` — `stateToSignal` + `signalToState`
- **Change**: `playback-engine/engine.ts` — create mirrors, expose on `PlaybackEngine`
- All existing tests pass unchanged — un-migrated reactors still receive `WritableState`

### Step 2 — `endOfStream`

- **Why first**: already uses signals internally with its own 4-line bridge; this just
  moves that bridge to the engine level and simplifies the function signature
- **Write-back**: none — `endOfStream` does not patch state
- **Complexity**: low

### ✅ Step 3 — `trackCurrentTime`

- **Why next**: simplest full migration; single `owners.subscribe()` → single `effect()`
- **Detail**: `owners` → `Signal.ReadonlyState`; `state` stays `WritableState` (write-back).
  `lastMediaElement` guard still works in local scope. DOM event listeners unchanged.
- **Write-back**: `state.patch({ currentTime })` — direct call from inside effect, no
  bridge needed
- **Complexity**: low

### Step 4 — `updateDuration`

- **Why**: proves the async-in-effect pattern (`combineLatest + async callback` →
  `effect()` that detects condition then calls async helper with captured snapshot)
- **Write-back**: writes `mediaSource.duration` directly, not to state — no bridge needed
- **Complexity**: medium

### Step 5 — `setupMediaSource`

- **Why**: same async pattern as `updateDuration`, slightly more involved (`settingUp`
  flag, `abortController`, `owners.patch({ mediaSource })` write-back)
- **Write-back**: `owners.patch({ mediaSource })` — direct call from async helper
- **Complexity**: medium

### Step 6 — `loadSegments`

- **Why last**: most complex; has selector+equality (`loadingInputsEq`), two local
  `createState` instances (`segmentsCanLoad`, `segmentLoader`), and a write-back to
  `state.bandwidthState` that `switchQuality` depends on
- **Write-back**: `throughput` local signal → `state.bandwidthState` via `signalToState`
  bridge (needed until `switchQuality` is also migrated; see comment in
  `createTrackedFetch`)
- **Complexity**: high

## What Stays the Same During Migration

- `state` and `owners` (`WritableState`) remain the **authoritative source of truth**.
  All external code (sandbox, tests, other packages) continues to use `state.patch()`,
  `owners.patch()`, `state.current`, `state.subscribe()`, etc.
- `events` + `@@INITIALIZE@@` bootstrap — untouched. Only the core orchestrations
  (`resolvePresentation`, `resolveTrack`, `selectTracks`) use events; they are not
  migration targets here.
- Un-migrated reactors receive `WritableState` unchanged, wired the same as today.

## Exit Criteria (Long-term, Out of Scope Here)

When all reactors are migrated, `WritableState` can be retired as an internal primitive.
The bridge helpers and engine-level mirrors are deleted. `PlaybackEngine` exposes
`Signal.State` directly instead of `WritableState`.

This is explicitly **out of scope** for this migration phase — the goal here is to prove
the pattern and migrate the DOM feature reactors, not to retire `WritableState`.
