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

## Reactor Migration Patterns

### Signature change

```ts
// Before
function myReactor({ state, owners }: {
  state: WritableState<MyState>;
  owners: WritableState<MyOwners>;
}): () => void

// After
function myReactor({ state, owners }: {
  state: Signal.State<MyState>;
  owners: Signal.State<MyOwners>;
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

### Async effects (basic)

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

### Signal.Computed conditions + nested effects (preferred for multi-phase setup)

Introduced in the `setupMediaSource` rewrite. Rather than a single effect with an async
body, derive each condition as a `Signal.Computed` and use a **nested effect** to sequence
dependent phases. This keeps the signal graph explicit and avoids async/flag complexity.

Use this pattern when a reactor has:
- Distinct precondition phase (can we even start?)
- Distinct ready phase (has a side-effect completed and we can proceed?)
- A "don't re-run" guard based on observable DOM state rather than an internal flag

```ts
// Preconditions as computed nodes
const canSetupSignal = new Signal.Computed(() => !!owners.get().mediaElement && !!state.get().presentation?.url);
// DOM-observable "already done" guard (avoids internal boolean flag)
const shouldSetupSignal = new Signal.Computed(() => !owners.get().mediaElement?.src);

const cleanupEffect = effect(() => {
  if (!canSetupSignal.get() || !shouldSetupSignal.get()) return;

  // Phase 1: synchronous setup
  const mediaElement = owners.get().mediaElement as HTMLMediaElement;
  const mediaSource = createMediaSource({ preferManaged: true });
  const mediaSourceReadyState = observeMediaSourceReadyState(mediaSource, abortController.signal);
  attachMediaSource(mediaSource, mediaElement);

  // Phase 2: nested effect waits for async condition before writing back
  const cleanupInner = effect(() => {
    if (mediaSourceReadyState.get() !== 'open') return;
    owners.set({ ...owners.get(), mediaSource, mediaSourceReadyState });
  });

  return () => { cleanupInner(); };
});
```

Key properties:
- Outer effect re-runs when preconditions change; inner effect re-runs when `readyState` changes
- No `settingUp` flag — `shouldSetupSignal` reads observable DOM state (`mediaElement.src`)
- `AbortController` passed to `observeMediaSourceReadyState` for DOM listener cleanup
- Inner cleanup returned from outer effect body (cleaned up on outer re-run or teardown)

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

## MediaSource Reactivity

`mediaSource.readyState` changes via DOM events (`sourceopen`, `sourceended`,
`sourceclose`), which are invisible to the signal graph without explicit bridging.

### `observeMediaSourceReadyState` (in `dom/media/mediasource-setup.ts`)

```ts
export function observeMediaSourceReadyState(
  mediaSource: MediaSource,
  signal: AbortSignal
): Signal.ReadonlyState<MediaSource['readyState']> {
  const readyState = new Signal.State<MediaSource['readyState']>(mediaSource.readyState);
  const update = () => readyState.set(mediaSource.readyState);
  const options = { signal };
  mediaSource.addEventListener('sourceopen', update, options);
  mediaSource.addEventListener('sourceended', update, options);
  mediaSource.addEventListener('sourceclose', update, options);
  return readyState;
}
```

Returns `Signal.ReadonlyState` (no cleanup needed — `AbortSignal` removes listeners).

### `mediaSourceReadyState` in owners

Stored alongside `mediaSource` in `MediaSourceOwners` (and propagated to
`PlaybackEngineOwners`). Consumers use:

```ts
const readyState = owners.mediaSourceReadyState?.get() ?? owners.mediaSource?.readyState;
```

The `??` fallback preserves tests that don't provide the signal. Currently used by:
- `shouldEndStream` in `end-of-stream.ts`
- `shouldUpdateDuration` in `update-duration.ts`

This is the `SourceBufferActor.snapshot` pattern applied to `readyState` — a signal
nested inside an owners object, tracked transitively by `Signal.Computed`/`effect`.

## Migration Order

### ✅ Step 1 — Bridge utilities + engine wiring (infrastructure, no reactor changes)

- **New**: `core/signals/bridge.ts` — `stateToSignal` + `signalToState`
- **Change**: `playback-engine/engine.ts` — create mirrors, expose on `PlaybackEngine`
- All existing tests pass unchanged — un-migrated reactors still receive `WritableState`

### ✅ Step 2 — `endOfStream`

- **Why first**: already uses signals internally with its own 4-line bridge; this just
  moves that bridge to the engine level and simplifies the function signature
- **Write-back**: none — `endOfStream` does not patch state
- **Complexity**: low
- **Note**: updated to use `mediaSourceReadyState?.get() ?? mediaSource?.readyState` pattern

### ✅ Step 3 — `trackCurrentTime`

- **Why next**: simplest full migration; single `owners.subscribe()` → single `effect()`
- **Detail**: `owners` → `Signal.ReadonlyState`; `state` stays `WritableState` (write-back).
  `lastMediaElement` guard still works in local scope. DOM event listeners unchanged.
- **Write-back**: `state.patch({ currentTime })` — direct call from inside effect, no
  bridge needed
- **Complexity**: low

### ✅ Step 4 — `updateDuration`

- **Why**: proves the async-in-effect pattern (`combineLatest + async callback` →
  `effect()` that detects condition then calls async helper with captured snapshot)
- **Write-back**: writes `mediaSource.duration` directly, not to state — no bridge needed
- **Complexity**: medium
- **Note**: updated to use `mediaSourceReadyState?.get() ?? mediaSource?.readyState` pattern

### ✅ Step 5 — `setupMediaSource`

- **What changed**: user rewrote to use the **Signal.Computed conditions + nested effects**
  pattern (see above). Discarded: `settingUp` flag, `waitForSourceOpen`, async body.
- **New additions**:
  - `observeMediaSourceReadyState` added to `mediasource-setup.ts`
  - `mediaSourceReadyState: Signal.ReadonlyState` added to `MediaSourceOwners`
  - `waitForSourceOpen` removed from source, barrel export, and tests
- **Write-back**: `owners.set({ ...owners.get(), mediaSource, mediaSourceReadyState })` from
  inner nested effect when `readyState === 'open'`
- **Complexity**: medium → restructured as multi-phase with nested effect

### ✅ Step 6 — `loadSegments`

- **Why last**: most complex; has selector+equality (`loadingInputsEq`), two local
  `createState` instances (`segmentsCanLoad`, `segmentLoader`), and a write-back to
  `state.bandwidthState` that `switchQuality` depends on
- **Write-back**: `throughput` local signal → `state.bandwidthState` via `signalToState`
  bridge (needed until `switchQuality` is also migrated; see comment in
  `createTrackedFetch`)
- **Complexity**: high

### ⬜ Step 7 — `setupSourceBuffer`

- **Why next**: most direct analogue to the new `setupMediaSource` pattern.
  Has a `setupDone` flag + async `combineLatest` → migrate to `Signal.Computed`
  conditions + nested effect. Important: both audio and video buffers must be created
  synchronously (coordination guarantee) — preserve in inner effect.
- **Write-back**: `owners.patch({ sourceBuffers })` from inner effect
- **Complexity**: medium

### ⬜ Step 8 — `trackPlaybackRate`

- **Why**: trivially mirrors `trackCurrentTime` — single owners subscription → effect
- **Write-back**: `state.patch({ playbackRate })`
- **Complexity**: low

### ⬜ Step 9 — `syncTextTrackModes`

- **Why**: pure reactive loop, no side effects beyond updating DOM text track modes
- **Write-back**: none — writes to DOM directly
- **Complexity**: low

### ⬜ Step 10 — `setupTextTracks`

- **Why**: one-shot setup, similar shape to `setupMediaSource` but simpler (no readyState wait)
- **Write-back**: `owners.patch({ textTracks })`
- **Complexity**: low–medium

### ⬜ Step 11 — `trackPlaybackInitiated`

- **Why**: dual subscriptions + event dispatch bridge; interesting because it responds to
  two independent signals firing in sequence
- **Write-back**: dispatches to `events` stream, no state write-back
- **Complexity**: medium

### ⬜ Step 12 — `syncSelectedTextTrackFromDom`

- **Why**: DOM event listener + feedback loop guard (avoids echo when signal change
  triggers DOM update which fires the event again)
- **Write-back**: `state.patch({ selectedTextTrack })`
- **Complexity**: medium

### ⬜ Step 13 — `loadTextTrackCues`

- **Why last**: async task orchestration per text track, most complex of the remaining;
  coordinates fetch + parse + owners update with per-track abort
- **Write-back**: `owners.patch({ textTrackCues })`
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
