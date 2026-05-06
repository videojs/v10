---
status: stages-A-B-C-complete-stage-D-pre-largely-landed
branch: refactor/spf-discrete-signals-and-behavior-objects
---

# SPF: Discrete Signals + Behavior-as-Object

> Captures a meeting follow-up on a coordinated set of architectural shifts in SPF. Stages A, B, and C have landed (the user's plan numbered these as steps 1, 2a, 2b, and 3). Stage D-pre's input mechanism + adapter/harness migration has landed; the reconciler-overlap cases (`selectedVideoTrackId` / `selectedTextTrackId`) are deferred into Stage D proper. Stage D type enforcement is still TBD. Findings feed back into `internal/design/spf/primitives.md` and `packages/spf/docs/hls-engine.md`.

## Status snapshot

- **Branch:** `refactor/spf-discrete-signals-and-behavior-objects` (off `docs/spf-hls-engine-composition`). Renamed from `refactor/spf-discrete-signals-stage-a` once scope expanded beyond Stage A.
- **Stages A + B + C complete** + engine-wrapper revisit + `buildSignalMap` export with tests + Stage D-pre input mechanism. Tests green: 49 files, 759 tests passed.
- **Build clean.** `pnpm typecheck`, `pnpm -F @videojs/spf test`, `pnpm exec biome check`, `pnpm check:workspace`, `pnpm build:packages` all pass.
- **Stage D in-scope for this branch.** Direction picked: read/write enforcement is derived from the setup signature (per-slot `Signal<T>` vs `ReadonlySignal<T>`), no separate `writeKeys` array. Invariant is **0-or-1 writer behaviors per signal** (0-writer keys must be seeded via `initialState`). Composition surface becomes uniformly read-only externally.
- **Stage D-pre largely landed.** The adapter's external writes now flow through a generic `shareSignals` behavior factory: the engine instantiates `makeShareSignals<S, C>()` and the consumer captures writable signal refs via `config.onSignalsReady` at composition setup. Adapter migrated; sandbox harness rebuilt (also fixed: it had been on the pre-Stage-A monolithic API since Stage A landed). The 2-writer overlap cases (`selectedVideoTrackId` from harness rendition picker + `selectVideoTrack` behavior; `selectedTextTrackId` from harness auto-selection + `selectTextTrack` behavior) are **deferred** — the harness still writes those directly into composition state with `TODO(stage-d)` markers. See `### What landed` and `### Deferred to Stage D` in the Stage D section.
- **Not yet:** PR opened; merge to main; doc updates to `hls-engine.md` / `fundamentals.md`; reconciler design + Stage D type machinery.
- **Memory:** `project_spf_stage_a_revisit.md` has the deeper "why we did it this way" notes for Stage A; updated for B/C carryovers.

## Resuming — where to start the next session

1. **Verify branch state.** `git log --oneline` should show the rename-to-shareSignals commit at HEAD; just below: `9559d860 docs(spf): refresh plan doc for post-revert single-slot presentation` and `b17ef570 refactor(spf): route adapter inputs through exposeEngineInputs behavior` (the original landing — since renamed/generalized).
2. **Stage D type enforcement is the next major move.** Direction is picked (setup-signature-driven, no `writeKeys`; 0-or-1 writer-behavior invariant; required `initialState` for 0-writer keys; uniformly read-only public surface). Remaining open questions are mostly mechanical — see `## Stage D — direction picked, details TBD` below.
3. **Reconcilers for the 2-writer overlap cases** (`selectedVideoTrackId`, `selectedTextTrackId`) get folded into Stage D. Stage D's type machinery needs them anyway — once writer-count enforcement is on, the harness's direct writes have to go somewhere, and that somewhere is a reconciler that takes intent + presentation and writes the resolved id. See `### Reconciler shape (Pattern B, deferred)`.
4. **Other moves (any order, can interleave with Stage D):**
   - **Doc updates.** `packages/spf/docs/hls-engine.md` is on the parent `docs/spf-hls-engine-composition` branch and is now badly stale (uses old `update`-style state writes, single-`owners` signal, no `defineBehavior`, no `stateKeys`/`contextKeys`). Refresh after Stage D lands or use as a friction-list canary during. `internal/design/spf/fundamentals.md` no longer matches the new pattern (recommends external state writes; Stage C made that disallowed).
   - **Code-reuse follow-up.** See `## Follow-ups` — three behavior modules (select-tracks, resolve-track, load-segments) lost code reuse during the engine-wrapper revisit. Commit `77601054` documents the trade-off. Could fold into Stage D's pass since per-slot read/write annotations may surface a clean factory shape.
   - **Open the PR.** Branch is shippable as-is even without Stage D, but holding the PR until Stage D lands keeps the change set coherent under the new branch name.

## Stage A — what landed (early commits, pre-this-session)

Stage A is on `refactor/spf-discrete-signals-stage-a` (10+ commits from `b00fa1a1` through `ad863bf1`). Key deviations from the original plan and details worth preserving live in the project memory: `project_spf_stage_a_revisit.md`. Highlights:

- **Discrete signals + `owners` → `context`** as planned. Engine builds the signal maps externally and passes them to `createComposition`.
- **Compose-time conflict detection preserved + tightened.** The first pass dropped the inferred-overload type machinery; we restored it and unified context conflicts with state (intersection-based; sibling-type context now correctly conflicts). The owners-subtype check is gone — context uses the same intersection rule as state.
- **Single inferred overload only.** With discrete signals, the distributive-intersection inference issue from `044263f2` doesn't recur — the explicit-typed overload was removed. The HLS engine compiles cleanly with just the inferred form.
- **All behaviors uniform.** Every behavior is now `Behavior<S, C, Cfg>` (single-arg BehaviorDeps shape — `{ state, context, config }`). The engine wrappers all read `({ config, ...deps }: Deps) => behavior({ ...deps, config: { type, ...config } })`.
- **Engine config defaults `resolveTextTrackSegment`.** Removed the `setupTextTrackActors` engine wrapper that existed solely to inject the resolver.
- **Latent bug fix:** `update-duration` referenced `videoSourceBuffer`/`audioSourceBuffer` keys the engine never wrote to; renamed to `videoBuffer`/`audioBuffer`.

### Stage A side cleanups (not in original plan)

- `selectVideoTrack` / `selectAudioTrack` collapsed into a single `selectMediaTrack` (bodies were byte-identical). **Note:** Stages B/C re-specialized them in commit `f6a7aecc` once narrow keys were unlocked; this Stage-A consolidation was the right move at the time but is no longer the final shape.
- `QualitySwitchingConfig.defaultBandwidth` renamed to `initialBandwidth` for naming consistency with the engine config.
- `switchQuality` reshaped to `({ state, config })` so the engine no longer needs a wrapper.
- Conditional config-spreads in engine wrappers replaced with direct `{ type, ...config }` spreads (`exactOptionalPropertyTypes: false` on the SPF tsconfig made the conditional guards unnecessary).

## Stage B — what landed (commits `5a39d4ef` → `550b7d6d`)

Steps 1, 2a from the user's plan. Behaviors became objects with `defineBehavior(...)` factory enforcing single-behavior key/param consistency.

- **Behaviors are now `{ stateKeys, contextKeys, setup }` objects** (`5a39d4ef`). Every behavior in `playback/behaviors/` was converted; engine wrappers were updated to wrap `.setup` calls.
- **`defineBehavior<S, C, Cfg, SK, CK>` factory** with phantom-tag exhaustiveness check: declared `stateKeys` must equal `keyof S` (where S is inferred from the setup's `state` param type), same for `contextKeys` / `C`. Uses `const SK extends readonly (keyof S)[]` for literal-tuple capture (no `as const` needed at the call site).
- **`DepsForCfg<S, C, Cfg>` conditional shape** — when a slice (state/context/config) has no keys, the corresponding deps field becomes optional. Lets test calls like `behavior.setup({state, context})` work without per-call `config: {}` boilerplate.
- **`R` generic** preserves narrow setup return types (e.g. `() => void` instead of widening to the `BehaviorCleanup` union). Tests calling the cleanup directly without union-narrowing still typecheck.
- **Tests added in `deda6ae1`** cover defineBehavior surface: 9 `@ts-expect-error` exhaustiveness cases, 10 `expectTypeOf` inference cases, 4 runtime-identity cases. Total +24 tests.
- **`550b7d6d` consolidation:** the previous `create-composition-types.test.ts` was structurally typecheck-only (every test was `@ts-expect-error`-driven) but lived in a `.test.ts` file that runs at runtime. Two cases needed `if (Math.random() < 0)` runtime guards because the test bodies dereferenced missing config. Moved everything into `create-composition-types.test-d.ts` (typecheck-only via tsgo); the `Math.random` guards disappear since the file never executes.

## Stage C — what landed (commits `6e518795` → `c2dfd365`)

Step 2b + 3 from the user's plan. Composition derives signal maps internally; `initialState` / `initialContext` seed values.

- **`createComposition` derives state/context signal maps** from the union of all behaviors' declared `stateKeys` / `contextKeys` (`6e518795`). Caller-supplied signal maps are gone — `CompositionOptions` is now just `{ config?, initialState?, initialContext? }`.
- **Engine drops `createStateSignals` / `createContextSignals`** factories. `createSimpleHlsEngine` is now ~5 lines of "config + initialState" passed to `createComposition`.
- **load-segments behavior fix** (same commit) — the previous `initialBandwidth !== undefined ? bridge : undefined` conditional was effectively always-true because the engine seeded `bandwidthState`. After 2b that became always-false, silently disabling ABR. Dropped the conditional — video tracks always bridge throughput updates back to engine state.
- **`initialState` / `initialContext`** added in `c2dfd365` (`Partial<S>` / `Partial<C>`). Engine restores its `bandwidthState` seed via `initialState` so `switchQuality` fires on initial subscribe with the configured `initialBandwidth` fallback.
- **`buildSignalMap` extracted, exported, tested** (`13046a01`, `4c66d394`):
  - Functional pipeline: `flatMap → Set → Object.fromEntries`.
  - Signature simplified from `(behaviors, keysOf, initial)` to `(keys: Iterable<PropertyKey>, initial: Partial<S>)`.
  - Module-level export only (not in package's `index.ts` public API).
  - 8 runtime tests + 7 type tests.
- **Type cleanup in `21f43473`** — collapsed the two-overload pattern in `createComposition` into a single signature so the body has access to `Behaviors` directly. State/context inside the body are now typed as `StateSignals<ResolveBehaviorState<Behaviors>>` rather than the wide `Record<PropertyKey, Signal<unknown>>`. The runtime build still uses the wide shape (since TS can't follow imperative iteration), but the wide-to-narrow bridge is localized inside `buildSignalMap`. Two intentional casts remain in `createComposition` itself (the `behaviors as readonly AnyBehavior[]` for ValidateComposition, and the `config ?? {}` fallback when Cfg has no keys).

## Engine-wrapper revisit (commits `f6a7aecc` → `e4ce10ae`)

Originally flagged as "save for the end" of Stage B. The engine had 8 wrappers (`loadVideoSegments`, `selectAudioTrack`, `resolveTextTrack`, etc.) that each forwarded keys + reshaped config to inject a `type:` discriminant. We moved that specialization into the behavior modules, exporting per-type behaviors directly.

- **`select-tracks.ts`** (`f6a7aecc`) — `selectMediaTrack` (one generic) split into `selectVideoTrack`, `selectAudioTrack`, `selectTextTrack`. Each declares narrow `stateKeys` (e.g. `selectVideoTrack` declares only `['presentation', 'selectedVideoTrackId']`). Bodies inlined; shared `pickFirstTrackId` helper for presentation traversal.
- **`resolve-track.ts`** (`5c19b54a`) — `resolveTrack` split into `resolveVideoTrack`, `resolveAudioTrack`, `resolveTextTrack`. Body shared via `setupTrackResolution(state, type, selectedKey)` helper using a typed `K` generic over the selected-track key. State narrowed via `Pick<ResolveTrackState, 'presentation' | K>`.
- **`load-segments.ts`** (`e4ce10ae`) — `loadSegments` split into `loadVideoSegments`, `loadAudioSegments`. Body shared via `setupSegmentLoading(state, context, type)` helper. **State/context keys still broad** — narrowing per specialization is a follow-up (see below).
- **Engine** drops all 8 wrappers, the `Deps` shorthand, and the `StateSignals`/`ContextSignals` imports (no longer needed locally).

## Stage D — direction picked, details TBD

The user's plan #4: read/write enforcement. **In-scope for this branch.** As of 2026-05-04 we've picked the direction: **enforcement is derived from the setup signature itself, not from a separately-maintained `writeKeys` array.** The composition surface becomes uniformly read-only externally; all signal writes live inside behaviors. Detailed shape and the input mechanism for time-varying external inputs are TBD.

### Direction

Behaviors declare per-slot access by typing the setup param's `state` / `context` slots as either `Signal<T>` (read+write) or `ReadonlySignal<T>` (read-only):

```ts
defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId'] as const,
  setup({ state }: BehaviorDeps<{
    presentation: ReadonlySignal<Presentation>,
    selectedVideoTrackId: Signal<string | null>,
  }>): BehaviorCleanup { ... }
});
```

Why this works:

- `ReadonlySignal<T>` already exists (`core/signals/primitives.ts`) as `Omit<Signal<T>, 'set'>`. The structural difference (no `.set`) is enough to drive both body-level enforcement and compose-time inference. **No brands needed.**
- The body literally cannot call `.set()` on a `ReadonlySignal<T>` slot — type-safety follows directly from the param type.
- `createComposition` walks each behavior's setup param at the type level, identifies `Signal<T>` slots as writers and `ReadonlySignal<T>` slots as readers, and validates the writer-count invariant.

### The writer-count invariant

For each declared signal across a composition: **0 or 1 writer behaviors**, with these rules:

- **0 writers**: signal must be seeded via `initialState` / `initialContext`. Becomes a constant after seeding.
- **1 writer**: that behavior owns the write lifecycle (and per-signal cleanup/reset on destroy).
- **2+ writers**: invalid. Compose-time error.

This shifts `initialState` / `initialContext` from `Partial<S>` to a key-conditional shape — required for 0-writer keys, optional for 1-writer keys:

```ts
type ResolveInitialState<S, Behaviors> =
  & { [K in keyof S as IsZeroWriter<Behaviors, K> extends true ? K : never]-?: S[K] }
  & { [K in keyof S as IsZeroWriter<Behaviors, K> extends true ? never : K]?: S[K] };
```

The compose call site gets a type error if a behavior is removed (or never added) and a 0-writer key isn't seeded.

### What this means for the composition surface

The composition's public `state` / `context` become **uniformly read-only externally**. There is no "external writes via signal" pathway:

- **Constant inputs** (set once at construction): go through `initialState` / `initialContext`.
- **Time-varying inputs** (e.g. the adapter's `presentation`, `preload`, `mediaElement`, `playbackInitiated`): must go through a writer behavior, fed by an explicit non-signal input mechanism — see Stage D-pre below.

The "0-writer = external input via signal" overload is **rejected**: it would let one syntactic shape (`ReadonlySignal<T>` slot) carry two semantic meanings (internal vs external write source) discoverable only by surveying the entire composition.

### Stage D-pre — what landed and what's deferred

Before Stage D's type machinery lands, the runtime invariant has to hold. Audit (2026-05-04) showed the external writers to composition signals were:

| Key | Slot | Trigger | Nature | Status |
|---|---|---|---|---|
| `mediaElement` | context | `attach()` / `detach()` | DOM lifecycle | ✅ migrated to `onSignalsReady` capture in adapter |
| `preload` | state | `preload =` IDL setter | HTML attribute input | ✅ same |
| `presentation` | state | `src =` IDL setter (writes `{ url }`) | HTML attribute input | ✅ same |
| `playbackInitiated` | state | `play()` method | Imperative input | ✅ same |
| `abrDisabled` | state | sandbox harness UI toggle | pure input, no overlap | ✅ same |
| `selectedVideoTrackId` | state | sandbox harness rendition picker **and** `selectVideoTrack` behavior | **2-writer overlap** — behavior default-picks; harness overrides | ⏳ deferred to Stage D — harness still writes directly with `TODO(stage-d)` |
| `selectedTextTrackId` | state | sandbox harness auto-select + (default-pick from `selectTextTrack` behavior) | overlap on default-pick | ⏳ deferred to Stage D — same |

**The harness was also on the pre-Stage-A monolithic API** (`engine.state.set({...engine.state.get(),...})` + `engine.owners`) since Stage A landed — broken at runtime, not just type-stale. Stage D-pre rebuilt it on the discrete-signals shape and routed all five non-overlap inputs through `onSignalsReady`. The two overlap cases stayed as direct writes because they need a reconciler design that hasn't landed yet.

### Input mechanism — actual implementation (`shareSignals`)

**The original sketch was more elaborate than what shipped.** The plan was to have the engine create a *separate* set of input signals, with `mirrorInputState` / `mirrorInputContext` behaviors copying each input → composition state, and `reconcileSelectedVideoTrackId` / `reconcileSelectedTextTrackId` replacing `selectVideoTrack` / `selectTextTrack`. Implementation collapsed that down: the "input signals" *are* the composition state signals — there's no parallel set, no mirror layer, and the two reconciler-overlap cases got deferred.

What actually landed:

1. **`shareSignals` is a generic behavior factory** in `core/composition/share-signals.ts`:
   ```ts
   export interface ShareSignalsConfig<S extends object, C extends object> {
     onSignalsReady?: (signals: { state: StateSignals<S>; context: ContextSignals<C> }) => void;
   }

   export function makeShareSignals<S extends object, C extends object>(): Behavior<S, C, ShareSignalsConfig<S, C>> {
     return {
       stateKeys: [],
       contextKeys: [],
       setup: ({ state, context, config }) => {
         config.onSignalsReady?.({ state, context });
       },
     };
   }
   ```
   Uses a `Behavior<S, C, Cfg>` literal (not `defineBehavior`) so empty key arrays don't trip the exhaustiveness check. Its setup-param S/C describe what the consumer's callback receives, not keys this behavior needs created — the composition's signal map comes from other behaviors' `stateKeys` / `contextKeys` declarations. The factory is generic so it's not tied to a specific engine; the HLS engine instantiates it once at module load with its full state/context types.

2. **Engine wiring** — one-liner instantiation, no separate input signals:
   ```ts
   // packages/spf/src/playback/engines/hls/engine.ts
   const shareSignals = makeShareSignals<SimpleHlsEngineState, SimpleHlsEngineContext>();

   export interface SimpleHlsEngineConfig extends ShareSignalsConfig<SimpleHlsEngineState, SimpleHlsEngineContext> {
     initialBandwidth?: number;
     // ...
   }

   export function createSimpleHlsEngine(config: SimpleHlsEngineConfig = {}) {
     return createComposition([shareSignals, /* other behaviors */], { config: finalConfig, initialState: { ... } });
   }
   ```

3. **`SimpleHlsEngineSignals`** — a named alias for the callback's parameter type, exported from `engine.ts` / `engines/hls/index.ts` so adapters and harnesses can type their captured refs:
   ```ts
   export type SimpleHlsEngineSignals = {
     state: StateSignals<SimpleHlsEngineState>;
     context: ContextSignals<SimpleHlsEngineContext>;
   };
   ```

4. **Adapter capture** — straight ref-grab in the engine-creation path:
   ```ts
   #signals!: SimpleHlsEngineSignals;
   #createEngine() {
     return createSimpleHlsEngine({
       ...this.#config,
       onSignalsReady: (signals) => { this.#signals = signals; },
     });
   }
   ```

5. **Bidirectional usage** — once Stage D's read/write enforcement lands, the consumer's callback can declare per-slot intent by typing captured refs as `Signal<T>` (write) or `ReadonlySignal<T>` (read-only). For now everything is `Signal<T>`; the discipline is informal.

**Why this is simpler than the original sketch.** The mirror-behaviors layer assumed the input signals had to be *separate* from composition state ("input signals are owned by the engine; composition state is owned by the composition"). But there's no actual benefit to that separation — the composition is owned by the engine factory, which is the same scope. The single signal set carries both roles.

**The web-worker generalization** still works. If the engine moves into a worker, `onSignalsReady` is the IPC boundary. The composition's signals live on the worker side; the consumer captures proxies on the main-thread side. The callback shape is the same on either side — only the marshaling changes. (We haven't built that yet; this is forward-compat reasoning.)

**The `set src` engine-recreate cost** is also unchanged. Each `set src` destroys the composition and creates a new one; the adapter's `onSignalsReady` re-fires and re-captures refs. The adapter holds adapter-level source-of-truth fields (`#preload`, etc.) and re-applies them to the new signals. Same as the original sketch.

### Per-behavior writer audit (post-propagation)

After the per-slot read/write annotation propagation (commit `b7866e6a`), each behavior's intent is legible from its setup signature alone — `Signal<T>` for writable slots, `ReadonlySignal<T>` for read-only. Body-level enforcement catches accidental writes at typecheck time.

#### Internal writes (via `defineBehavior` setup bodies)

| Behavior | State writes | Context writes |
|---|---|---|
| `selectVideoTrack` / `selectAudioTrack` / `selectTextTrack` | `selected{Video,Audio,Text}TrackId` (the corresponding one) | — |
| `resolveVideoTrack` / `resolveAudioTrack` / `resolveTextTrack` | `presentation` (via shared `setupTrackResolution<K>`; merges resolved track segments into the existing presentation) | — |
| `resolvePresentation` | `presentation` (parses manifest from `{ url }` seed) | — |
| `calculatePresentationDuration` | `presentation` (sets the `duration` field on the existing presentation) | — |
| `switchQuality` | `selectedVideoTrackId` (ABR decisions) | — |
| `trackCurrentTime` | `currentTime` | — |
| `trackPlaybackRate` | `playbackRate` | — |
| `trackPlaybackInitiated` | `playbackInitiated` (from DOM `play` event + `paused` check) | — |
| `syncTextTracks` | `selectedTextTrackId` (when DOM `<track>` mode change picks a new track) | — |
| `syncPreloadAttribute` | `preload` (mirrors the DOM attribute when no explicit value set) | — |
| `setupMediaSource` | `mediaSourceReadyState` (mirrors `MediaSource.readyState`) | `mediaSource` |
| `setupSourceBuffers` | — | `videoBuffer`, `audioBuffer`, `videoBufferActor`, `audioBufferActor` |
| `setupTextTrackActors` | — | `textTracksActor`, `segmentLoaderActor` |
| `loadVideoSegments` | `bandwidthState` (per-chunk throughput sampling for ABR) | — |
| `loadAudioSegments` | — (audio doesn't sample bandwidth) | — |
| `loadTextTrackCues` / `updateDuration` / `endOfStream` | — (read-only — drive DOM properties / actor messages, not signal writes) | — |
| `shareSignals` | — (forwards refs to consumer; see external-writes table below) | — |

#### External writes (via `shareSignals.onSignalsReady` callback)

`shareSignals` itself writes nothing — it forwards composition signal refs to the consumer-supplied `onSignalsReady` callback at composition setup. The consumer captures the refs and writes through them at runtime. Two consumers exist today:

| Consumer | State writes | Context writes |
|---|---|---|
| `SimpleHlsMedia` adapter (`packages/spf/src/playback/engines/hls/adapter.ts`) | `presentation` (`set src`), `preload` (`set preload`), `playbackInitiated` (`play()`) | `mediaElement` (`attach()` / `detach()`) |
| Sandbox harness (`apps/sandbox/templates/spf-segment-loading/main.ts`) | `presentation`, `preload`, `abrDisabled` (UI toggle) | `mediaElement` |

Plus the deferred reconciler-overlap cases — the harness still writes these **directly via `engine.state`**, *not* via the `onSignalsReady` callback:

| Direct writer | Slot | Marker |
|---|---|---|
| Sandbox harness rendition picker | `selectedVideoTrackId` (manual override) | `// TODO(stage-d)` |
| Sandbox harness auto-select effect | `selectedTextTrackId` (initial pick) | `// TODO(stage-d)` |

These two slots are the 2-writer cases that need reconcilers (see "Reconciler shape (Pattern B, deferred to Stage D)" below).

#### Multi-writer slots — what Stage D's invariant has to handle

Slots with more than one writer once both internal and external writes are counted:

| Slot | Writers | Pattern |
|---|---|---|
| `presentation` | adapter / harness (initial `{ url }`), `resolvePresentation` (parsed), `resolve{Video,Audio,Text}Track` (per-track resolution), `calculatePresentationDuration` (duration field) | **Pipeline** — each writer builds on the previous, never mutating fields owned by another. May warrant per-field decomposition under Stage D. |
| `preload` | `syncPreloadAttribute` (DOM → state), adapter / harness (state → drives DOM via downstream) | **Two-way sync** — likely needs Stage D to disambiguate "external sets" from "DOM mirrors" with a separate input slot. |
| `selectedVideoTrackId` | `selectVideoTrack` (default-pick), `switchQuality` (ABR), harness direct write (manual override, deferred) | **Intent + reactive default** — natural reconciler case. |
| `selectedTextTrackId` | `selectTextTrack` (default-pick), `syncTextTracks` (DOM-driven), harness direct write (auto-select, deferred) | Same. |
| `playbackInitiated` | `trackPlaybackInitiated` (DOM observer), adapter `play()` write | **Imperative + observer** — adapter sets `true` on `play()` call, observer reflects DOM `paused` state on cleanup. May be a single-writer-with-input-trigger case. |
| `mediaElement` | adapter / harness only | Externally-driven only — single-source from outside, no internal writers. Cleanest case. |

Most multi-writer slots fall into one of three patterns: pipelines (presentation), two-way sync (preload), or intent+default reconcilers (`selected*TrackId`). Stage D's writer-count enforcement + the reconciler design have to cover all three.

### Reconciler shape (Pattern B, deferred to Stage D)

The 2-writer overlap cases (`selectedVideoTrackId` / `selectedTextTrackId`) need a reconciler when external "intent" overlaps with a behavior-owned default-pick. Today the harness writes intent directly into composition state and the behavior writes the default-pick into the same slot — runtime works but Stage D's writer-count enforcement will reject it.

The fix: the current `selectVideoTrack` behavior becomes a `reconcileSelectedVideoTrackId` behavior that reads an external intent + presentation and writes the resolved id. The intent input is a separate signal (held by the engine factory or the adapter / harness, whichever owns the intent) and gets passed to the reconciler at composition time.

```ts
// behaviors/select-tracks.ts (revised — replaces selectVideoTrack)
export function reconcileSelectedVideoTrackId(
  intent: ReadonlySignal<string | undefined>,
) {
  return defineBehavior({
    stateKeys: ['presentation', 'selectedVideoTrackId'],
    setup: ({ state }: {
      state: {
        presentation: ReadonlySignal<Presentation | undefined>;
        selectedVideoTrackId: Signal<string | undefined>;
      };
    }) =>
      effect(() => {
        const presentation = state.presentation.get();
        if (!presentation) return;

        const userIntent = intent.get();
        if (userIntent !== undefined) {
          state.selectedVideoTrackId.set(userIntent);
          return;
        }

        if (!state.selectedVideoTrackId.get()) {
          const id = pickFirstTrackId(presentation, 'video');
          if (id) state.selectedVideoTrackId.set(id);
        }
      }),
  });
}
```

**Open question for the reconciler implementation:** where does the intent signal live? Options:
- **Engine config** — engine creates the intent signal, hands it back via `onSignalsReady` (alongside the composition signals). Treats intent as part of the engine's input surface.
- **Engine config, separate callback** — the reconciler's setup callback receives the intent, similar to a plugin handshake.
- **Adapter-owned** — adapter creates the intent signal, passes it into the reconciler at composition time. Tightest scoping but couples reconciler creation to adapter knowledge.

Likely the first: extend the `onSignalsReady` payload (or an adjacent `onIntentsReady`) with intent signals. Decide alongside Stage D's read/write split since the shape interacts.

### Open product questions inside the reconcilers

These are real questions about behavior, not architecture. Live in the reconciler body whichever way inputs are wired:

- Default-pick re-fire on presentation reload — should `selectedVideoTrackId` reset to track 0 of the new presentation, or persist if user-selected and still valid?
- Intent pointing at a track that doesn't exist in the current presentation — fall back to default? Reset intent? Both?
- "Reset to auto" semantics — setting intent to `undefined` clears override; reconciler falls back to default-pick.

### Open questions for Stage D implementation

1. ~~**`writeKeys` placement.**~~ **Resolved.** No `writeKeys`. Per-slot access lives in the setup signature.

2. ~~**`ReadSignal<T>` / `WriteSignal<T>` shape.**~~ **Resolved.** Reuse `Signal<T>` (writable) and `ReadonlySignal<T>` (read-only). No brands.

3. ~~**0-writer signals + `initialState`.**~~ **Resolved.** 0-writer signals are constants seeded via `initialState`; required (not optional) at the type level. Composition surface is uniformly read-only externally; there is no signal-shaped external input pathway.

4. ~~**Input mechanism for the adapter's 4 writes.**~~ **Resolved (and shipped).** Generic `shareSignals` behavior factory hands writable signal refs to a consumer-supplied `config.onSignalsReady` callback at composition setup. The "input signals" are the composition state signals — no separate set, no mirror layer. Adapter and harness both use this. Reconcilers for the 2-writer overlap cases (`selectedVideoTrackId` / `selectedTextTrackId`) are deferred into Stage D. See `### Input mechanism — actual implementation (shareSignals)` above.

5. **Single-writer enforcement scope.** Compose-time only, or also at `defineBehavior`? Compose-time is required (cross-behavior). `defineBehavior` would catch "behavior can't declare the same key as both `Signal<T>` and `ReadonlySignal<T>` in its own setup" almost free via the existing exhaustiveness machinery.

6. **Migration path for read/write annotations.** Each behavior currently takes `state: { [K]: Signal<S[K]> }` (everything writable). Per-behavior audit:
   - Slots `.set` somewhere in the body → `Signal<T>`.
   - Slots only read → `ReadonlySignal<T>`.
   - No safe "default everything to writable" middle step (defeats enforcement).
   - Likely one PR per behavior module. Stage D-pre is landed; this can start whenever Stage D's type machinery is ready.

7. **Code-reuse follow-up convergence.** The three behavior modules in `## Follow-ups` lost code reuse during the engine-wrapper revisit. Stage D's per-slot access annotations might surface a clean factory shape (e.g. `makeFirstTrackSelector(type, selectedKey)` with the read/write split baked into the factory's return type). Worth holding the follow-up pass until Stage D's mechanics are nailed down.

8. **The destroy reset loop.** Currently `for (const sig of Object.values(state)) sig.set(undefined)`. Stage D moves this into per-signal cleanup owned by the writer behavior. Open: 0-writer (seeded) signals — skip the reset (preserve seeded value, treating them as immutable constants)? The cleanest answer is "yes, skip" — once they're constants, there's nothing to reset.

9. **Type machinery shape.** The accumulator-style walk over behaviors to count writers per key is straightforward but new. Worth a focused spike (4–6 lines of `AccumulateWriters<Behaviors>`) before committing to it. The existing `IntersectBehaviors` is a recursive tuple-walk too, so the shape is familiar.

## Motivation

A coordinated shift in SPF from **"shared bag mutated by everyone"** to **"declared signals with clear ownership."** Today, `state` and `owners` are each a single signal whose value is an object; any behavior can read or write any field. We want each field to be its own signal, and we want behaviors to declare which signals they read and which they write — so the compose step can enforce single-writer / N-reader and surface the contract in types.

## The six changes

1. **State and `owners` become objects of discrete signals.** ✅ Stage A.
2. **Rename `owners` → `context`.** ✅ Stage A.
3. **Networking → shared singleton in `context`.** ❌ Deferred (Stage E or follow-up).
4. **Behaviors: function → object with `stateKeys` / `contextKeys`.** ✅ Stage B.
5. **No external signal setting from the composition.** ✅ Stage C — `createComposition` no longer accepts caller-built signal maps; behaviors own all writes (with `initialState` / `initialContext` for seed values).
6. **Read vs. write enforcement on signals.** ❌ Deferred (Stage D).

## Proposed staging (historical reference)

| Stage | Change | Status |
|---|---|---|
| **A** | (1) discrete signals; (2) `owners` → `context` | ✅ Complete |
| **B** | (4) behavior-as-object with `stateKeys` / `contextKeys` / `setup` | ✅ Complete |
| **C** | (5) no external setting from composition + `initialState` | ✅ Complete |
| **D-pre** | route adapter + harness writes through `shareSignals` / `onSignalsReady` callback | ✅ Largely landed; reconcilers for 2-writer overlap cases (`selectedVideoTrackId` / `selectedTextTrackId`) deferred into Stage D |
| **D** | (6) writer-count enforcement (0-or-1 per signal) via setup-signature-derived read/write split + reconcilers for the deferred overlap cases | ⏳ In-scope, direction picked, details TBD |
| **E or parallel** | (3) networking singleton | ❌ Deferred |

## Follow-ups to revisit

### Type-specialized behaviors traded code reuse for narrow types

The engine-wrapper consolidation moved type-specifying configs (`type:
'video'`, `type: 'audio'`, etc.) from engine wrappers into per-type
specialized behaviors exported from each behavior module. `select-tracks`
went from one `selectMediaTrack` (dynamic key access via
`state[SelectedTrackIdKeyByType[config.type]]`) plus engine wrappers, to
three direct exports: `selectVideoTrack`, `selectAudioTrack`,
`selectTextTrack` — each with narrow `stateKeys` and an inlined body.

What we won: narrow per-behavior keys (e.g. `selectVideoTrack` only
declares `['presentation', 'selectedVideoTrackId']`); no engine wrappers;
no `config.type` discriminant carried at runtime; type-honest direct
signal access (`state.selectedVideoTrackId.set(...)` instead of
`state[selectedKey].set(...)`).

What we lost: shared body code. Each specialization repeats the
"read presentation, check if selected, pick by type, set if found"
pattern with only the type literal and signal name varying.

**Revisit each affected module after the engine-wrapper migration is
complete.** Look for shareable abstractions that preserve the wins —
e.g. a factory function `makeFirstTrackSelector(type, selectedKey)` that
takes the variants as parameters and produces a `defineBehavior` result.
The factory keeps narrow types (the selectedKey generic threads through
`Pick<S, K>` in the setup param) but reuses the body.

The trap to avoid: don't reintroduce a `config.type` discriminant or
type-erased `state[dynamicKey]` access. The factory binds the type at
definition time, not call time.

Modules to revisit when time permits:
- `select-tracks.ts` (3 specializations: video/audio/text) — bodies fully inlined; ripest for a factory pattern.
- `resolve-track.ts` (3 specializations) — already shares `setupTrackResolution` via a typed K generic; body is shared but state shape is parameterized.
- `load-segments.ts` (2 specializations: video/audio) — body shared via `setupSegmentLoading`, **but state/context keys still broad**. Per-specialization narrowing (e.g. `loadAudioSegments` dropping `bandwidthState` and the video buffer keys) is a follow-up; the body is dense (~120 lines) and a state-shape parameterization wants its own pass.

### Doc updates pending

- `packages/spf/docs/hls-engine.md` (parent branch `docs/spf-hls-engine-composition`) — uses `update`-style state writes and single-`owners` signal. Refresh once branch ships.
- `internal/design/spf/fundamentals.md` — recommends external state writes from outside the composition; that's now disallowed (Stage C). Update post-merge.

## Open questions to resolve before locking the plan

1. ~~**Read vs. write split — Stage B or D?**~~ **Resolved.** Single `stateKeys` shipped in Stage B. Read/write split is deferred to Stage D.

2. ~~**`setup` signature.**~~ **Resolved.** Receives `BehaviorDeps<S, C, Cfg>` = `{ state, context, config }`, with state/context/config optional via `DepsForCfg` when their slice has no keys. Returns `BehaviorCleanup` (narrowed via the `R` generic in `defineBehavior` so concrete returns survive).

3. ~~**`createComposition` explicit-typed overload.**~~ **Resolved in Stage A** (and re-confirmed in `21f43473`'s single-signature collapse) — explicit overload removed; the inferred form alone handles the HLS engine's behaviors with no inference issues.

4. **Composition's read-only API surface.** Still open. `Composition<S, C>` currently exposes the full signal maps as `state` / `context`. Read-only views aren't enforced. Revisit if Stage D needs this.

5. **Fundamentals doc updates.** Pending — see Doc updates above.

6. **Networking singleton design (3).** Deferred to a separate plan.

7. **Doc-driven cleanup loop continues.** The `hls-engine.md` walkthrough is the canary for whether the new shape reads well. Same friction-list pattern.

## Risk and scope notes

- **Stages A through C have landed in 16 commits on `refactor/spf-discrete-signals-stage-a`.** Net: behaviors are objects with declared keys, composition derives the signal map, type-specialized exports replace engine wrappers, and `defineBehavior` / `buildSignalMap` are tested primitives.
- **Stage D is where the type system gets interesting.** `readKeys` / `writeKeys` with proper inference at `createComposition` is the load-bearing piece. Worth a focused spike first.
- **Backwards compatibility** within the SPF package is not a concern — there are no external consumers of the behavior shape yet. Move freely.

## See also

- `internal/design/spf/primitives.md` — original architecture spec, especially §5 on observable state.
- `packages/spf/docs/hls-engine.md` — in-flight walkthrough that needs updates post-merge.
- `internal/design/spf/fundamentals.md` — needs updating (Stage C's "no external writes" rule).
- `.claude/plans/spf/signals-poc.md` — earlier signals spike that informed this direction.
