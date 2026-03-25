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
export function stateToSignal<T>(state: WritableState<T>): [Signal<T>, () => void]
```

Bidirectional: WritableState → Signal (forward) and Signal → WritableState (reverse diff patch), with shallow-equal guard to prevent feedback loops.

### `signalToState` — Signal → WritableState

```ts
export function signalToState<T, S>(
  signal: ReadonlySignal<S>,
  state: WritableState<T>,
  map: (value: S) => T extends object ? Partial<T> : T
): () => void
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
  stateSignal: Signal<PlaybackEngineState>;   // mirror for migrated reactors
  ownersSignal: Signal<PlaybackEngineOwners>; // mirror for migrated reactors
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
  state: Signal<MyState>;
  owners: Signal<MyOwners>;
}): () => void
```

### Translation table

All signal primitives are imported from `core/signals/primitives` — do **not** import from `signal-polyfill` directly. Only `core/signals/effect.ts` and `core/signals/primitives.ts` touch the polyfill.

| Before (WritableState) | After (Signals) |
|---|---|
| `state.subscribe(cb)` | `effect(() => { const s = state.get(); ... })` |
| `owners.subscribe(cb)` | `effect(() => { const o = owners.get(); ... })` |
| `combineLatest([state, owners]).subscribe(cb)` | `effect(() => { state.get(); owners.get(); ... })` — reads both in one effect |
| `subscribe(selector, listener, { equalityFn })` | `computed(() => selector(state.get()), { equals: equalityFn })` + `effect()` |
| `createState(x)` (local intermediate state) | `signal(x)` |
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
const canSetupSignal = computed(() => !!owners.get().mediaElement && !!state.get().presentation?.url);
// DOM-observable "already done" guard (avoids internal boolean flag)
const shouldSetupSignal = computed(() => !owners.get().mediaElement?.src);

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

`createState` used for local derived values within a reactor becomes `computed()`
(if purely derived) or `signal()` (if independently writable):

```ts
// Before
const segmentsCanLoad = createState<boolean>(false);
combineLatest([state, segmentLoader]).subscribe(([s, loader]) => {
  segmentsCanLoad.patch(isResolvedTrack(getSelectedTrack(s, type)) && !!loader);
});

// After — no subscription, no local patch: just a computed
const segmentsCanLoad = computed(() =>
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
  abortSignal: AbortSignal
): ReadonlySignal<MediaSource['readyState']> {
  const readyState = signal<MediaSource['readyState']>(mediaSource.readyState);
  const update = () => readyState.set(mediaSource.readyState);
  const options = { signal };
  mediaSource.addEventListener('sourceopen', update, options);
  mediaSource.addEventListener('sourceended', update, options);
  mediaSource.addEventListener('sourceclose', update, options);
  return readyState;
}
```

Returns `ReadonlySignal` (no cleanup needed — `AbortSignal` removes listeners).

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

### ✅ Step 7 — `setupSourceBuffer`

- **What changed**: replaced `combineLatest + subscribe + setupDone` with `computed() + effect()`.
  Track types derived from `presentation.selectionSets` via `presentationTypesSignal` — no
  hardcoded `['video', 'audio']`. Removed `canSetupBuffer` and `shouldSetupBuffer` helpers.
  Coordination guarantee (all buffers created synchronously) preserved in effect body.
- **Write-back**: `owners.set(Object.assign({}, o, patch) as O)` from effect
- **Complexity**: medium

### ✅ Step 8 — `trackPlaybackRate`

- **What changed**: single effect with cleanup return — `return listen(mediaElement, 'ratechange', ...)`.
  Removed `canTrackPlaybackRate` helper. Uses named `computed()` nodes for `mediaElement` and guard.
- **Write-back**: `state.patch({ playbackRate })`
- **Complexity**: low
- **Note**: this migration validated that `effect()` cleanup return values are called before re-run
  and on disposal (now implemented, matching Preact/Maverick/Svelte 5).

### ✅ Step 9 — `syncTextTrackModes`

- **What changed**: `combineLatest + subscribe` → `effect()` with named `computed()` nodes for
  `textTracks` and `selectedTextTrackId`. Guard checks `textTracks.size` only — not `selectedTextTrackId`
  (so deselection still hides all tracks). Removed `canSyncTextTrackModes` helper.
- **Write-back**: none — writes DOM `.mode` directly
- **Complexity**: low

### ✅ Step 10 — `setupTextTracks`

- **What changed**: `combineLatest + subscribe + hasSetup` → `computed() + effect()`. Custom `equals`
  on `modelTextTracksSignal` prevents re-runs when unrelated state (e.g. `selectedTextTrackId`) changes
  but tracks haven't changed. `shouldSetup = !owners.get().textTracks` replaces `hasSetup` flag.
  Cleanup uses `owners.get().textTracks?.forEach(el => el.remove())` at teardown — no closure array.
- **Write-back**: `owners.set({ ...owners.get(), textTracks: trackMap })` from effect
- **Complexity**: low–medium
- **Key pattern**: for one-shot effects, DOM cleanup belongs in the **outer disposal function**, not
  returned from the effect body (which runs on every re-run). Return-from-effect is for repeatable
  cleanup (e.g. `listen()` in `trackPlaybackRate`).

### ✅ Side-quest — signals primitives module

- **New**: `core/signals/primitives.ts` — single file that imports from `signal-polyfill` and
  re-exports factory functions + types: `signal()`, `computed()`, `Signal<T>`, `Computed<T>`,
  `ReadonlySignal<T>`, `SignalOptions<T>`.
- **Rule**: only `core/signals/effect.ts` and `core/signals/primitives.ts` may import from
  `signal-polyfill`. All other files use `core/signals/primitives`.
- **Removed**: `declare module 'signal-polyfill'` augmentation for `ReadonlyState` — replaced
  by `ReadonlySignal<T>` exported from `primitives.ts`.
- **Bundle impact**: zero — factory wrappers are just thin callsites, tree-shaken away.

### ✅ Step 11 — `trackPlaybackInitiated`

- **Why**: dual subscriptions + event dispatch bridge; interesting because it responds to
  two independent signals firing in sequence
- **Write-back**: `state.set({ ...current, playbackInitiated })` via version-counter computed
- **Complexity**: medium → explored two approaches; both committed for reference
- **Approach A — local signal + merge effect** (commit `fd5bd911`):
  - A local `signal<boolean | undefined>` is written by the reset effect (false) and the
    play listener (true). A third merge effect reads it and patches state at merge time,
    reading `state.get()` fresh so the spread is not stale.
  - `undefined` sentinel suppresses the merge effect on startup.
  - Hit an async bridge race condition: the forward bridge fires asynchronously, so a
    `true` written by the play listener could be overwritten by a stale `false` from the
    bridge flush before the merge effect ran.
- **Approach B — version-counter computed** (commit `a1fe1557`, current HEAD):
  - `resetVersion` bumps on URL change or element swap; `playVersion` is set to
    `resetVersion.get()` when play fires. `playbackInitiated = computed(() => playVersion.get() >= resetVersion.get())`.
  - Pure computed — no writes on init, no race condition possible.
  - Merge effect only writes on genuine transitions (idempotent guard preserved).
- **Key pattern (version counters)**: encode "last write wins" / merge-of-two-streams
  semantics as a counter pair. The computed is pure; the only imperative writes are the
  counter increments, which happen in well-defined reactive contexts.

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
`Signal<T>` directly instead of `WritableState`.

This is explicitly **out of scope** for this migration phase — the goal here is to prove
the pattern and migrate the DOM feature reactors, not to retire `WritableState`.
