---
status: stages-A-B-C-D-shipped-pivoted-no-count-invariant
branch: refactor/spf-discrete-signals-and-behavior-objects
---

# SPF: Discrete Signals + Behavior-as-Object

> Captures a meeting follow-up on a coordinated set of architectural shifts in SPF. Stages A, B, C, and a scoped-down Stage D have landed. Stage D originally proposed a compose-time **writer-count invariant** (0-or-1 writer per signal) on top of per-slot read/write annotations — that part was dropped after the writer audit revealed multiple legitimate multi-writer patterns (intent+default, pipeline, two-way DOM sync). What shipped is the per-slot annotation work + writer audit; multi-writer slots are accepted as legitimate shapes. Findings feed back into `internal/design/spf/primitives.md` and `packages/spf/docs/hls-engine.md`.

## Status snapshot

- **Branch:** `refactor/spf-discrete-signals-and-behavior-objects` (off `docs/spf-hls-engine-composition`). Renamed from `refactor/spf-discrete-signals-stage-a` once scope expanded beyond Stage A.
- **Stages A + B + C + D (scoped-down) complete** + engine-wrapper revisit + `buildSignalMap` export + Stage D-pre input mechanism (`shareSignals`) + per-slot read/write annotation propagation across all 17 behaviors. Tests green: 49 files, 759 tests passed.
- **Build clean.** `pnpm typecheck`, `pnpm -F @videojs/spf test`, `pnpm exec biome check`, `pnpm check:workspace`, `pnpm build:packages` all pass.
- **Stage D pivoted (no count invariant).** Per-slot `Signal<T>` (writable) / `ReadonlySignal<T>` (read-only) annotations are the contract — body-level write enforcement is shipped (commit `b7866e6a`). The originally-planned compose-time writer-count invariant ("0-or-1 writer behaviors per signal") was **dropped** once the writer audit (commit `c29fea1e`) confirmed that multi-writer slots are legitimate patterns, not violations. See `### Why we dropped the writer-count invariant` for the patterns and reasoning.
- **Stage D-pre shipped.** The adapter's external writes flow through a generic `shareSignals` behavior factory: the engine instantiates `makeShareSignals<S, C>()` and the consumer captures writable signal refs via `config.onSignalsReady` at composition setup. Adapter migrated; sandbox harness rebuilt (also fixed: it had been on the pre-Stage-A monolithic API since Stage A landed). The 2-writer cases on `selectedVideoTrackId` / `selectedTextTrackId` are now documented in the writer audit as legitimate intent+default patterns; the harness's direct writes via `engine.state` retain `TODO(stage-d)` markers as cleanup hints (decompose into manual + ABR slots), but are no longer Stage D-blocking.
- **Future follow-up:** custom linter rule that warns on multi-writer slots with an ignore-comment mechanism for intentional cases (`// writer-audit-allow: <reason>`). Captures the original Stage D intent (visibility into multi-writer cases) without forcing decomposition through types. See `### Follow-up: writer-audit lint rule`.
- **Not yet:** PR opened; merge to main; doc updates to `hls-engine.md` / `fundamentals.md`.
- **Memory:** `project_spf_stage_a_revisit.md` has the deeper "why we did it this way" notes for Stage A; updated for B/C carryovers.

## Resuming — where to start the next session

1. **Verify branch state.** `git log --oneline` should show recent commits including `c29fea1e docs(spf): add per-behavior + shareSignals writer audit to plan doc`, `b7866e6a refactor(spf): make per-slot read/write intent explicit in behaviors`, and `6b9801a4 refactor(spf): parameterize Behavior types over slot-map shapes`.
2. **No major Stage D work pending.** The scoped-down Stage D shipped; the count invariant is dropped. Stage D's open questions (`### Open questions for Stage D implementation`) are largely resolved or moot.
3. **Independent grooming work** (any order, can interleave):
   - **Writer-audit lint rule.** The future follow-up — a custom rule that warns on multi-writer slots with a comment-based ignore mechanism for intentional cases. See `### Follow-up: writer-audit lint rule` for the sketch.
   - **`selectedVideoTrackId` decomposition.** Replace the `abrDisabled` flag with a clean intent-vs-default split: separate `abrSelectedVideoTrackId` (written by `switchQuality`) and `manualSelectedVideoTrackId` (written by external code), derive `selectedVideoTrackId` as `manual ?? abr`. Already noted as a TODO at `quality-switching.ts:18`. Independent of Stage D.
   - **Doc updates.** `packages/spf/docs/hls-engine.md` (parent `docs/spf-hls-engine-composition` branch) and `internal/design/spf/fundamentals.md` are stale. Refresh post-merge.
   - **Code-reuse follow-up.** Three behavior modules (select-tracks, resolve-track, load-segments) lost some code reuse during the engine-wrapper revisit. Commit `77601054` documents the trade-off.
   - **Open the PR.** Branch is shippable.

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

## Stage D — pivoted: per-slot annotations are the contract

The user's plan #4: read/write enforcement. **Shipped in scoped-down form (commit `b7866e6a`).** The original plan included a compose-time **writer-count invariant** ("0-or-1 writer behaviors per signal") on top of per-slot read/write annotations. The annotation work shipped; the count invariant was **dropped** after the writer audit (commit `c29fea1e`) confirmed multi-writer slots are legitimate patterns, not violations.

### What shipped

Behaviors declare per-slot access by typing the setup param's `state` / `context` slots as either `Signal<T>` (read+write) or `ReadonlySignal<T>` (read-only):

```ts
defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId'],
  setup: ({ state }: {
    state: {
      presentation: ReadonlySignal<MaybeResolvedPresentation | undefined>;
      selectedVideoTrackId: Signal<string | undefined>;
    };
  }) => effect(() => { ... }),
});
```

Why this works:

- `ReadonlySignal<T>` already exists (`core/signals/primitives.ts`) as `Omit<Signal<T>, 'set'>`. The structural difference (no `.set`) drives body-level enforcement directly — TS rejects `.set()` on a slot typed as `ReadonlySignal<T>`. **No brands needed.**
- `Behavior<>` / `BehaviorDeps<>` / `defineBehavior` are now parameterized over **slot maps** (`StateMap`, `ContextMap`) rather than data shapes (`S`, `C`). Slot maps are bounded as `Record<PropertyKey, ReadonlySignal<unknown>>` so heterogeneous slot maps (some writable, some read-only) typecheck cleanly. `StateSignals<S>` / `ContextSignals<C>` remain as helpers for "everything writable" cases (`Composition<S, C>`'s public surface still uses them — no read/write split externally).
- Cross-behavior intersection (`InferBehaviorState` / `IntersectBehaviors`) is unchanged — `UnwrapSignals<M>` matches structurally on `{ get(): infer V }`, so both `Signal<T>` and `ReadonlySignal<T>` unwrap to `T`.

All 17 playback behaviors were updated in commit `b7866e6a`. See `### Per-behavior writer audit (post-propagation)` for the full picture.

### Why we dropped the writer-count invariant

The original plan was: **0-or-1 writer behaviors per signal**, enforced at compose time via the type machinery. 0-writer slots would be required in `initialState`; 2+ writers would be a compile error.

The writer audit revealed three legitimate multi-writer patterns we'd be ruling out:

1. **Pipeline / patch** — `presentation` is written by the adapter (initial `{ url }` seed), then `resolvePresentation` (parses manifest), then `resolve{Video,Audio,Text}Track` (per-track segments), then `calculatePresentationDuration` (duration field). Each writer owns a different aspect of the same logical object. Forcing decomposition into separate `url` / `selectionSets` / `tracks.*.segments` / `duration` slots breaks the "presentation is one thing" model and pushes complexity to consumers (query 4 slots instead of 1). Forcing colocation breaks composition.

2. **Intent + reactive default** — `selectedVideoTrackId` is written by `selectVideoTrack` (default-pick on presentation load), `switchQuality` (ABR), and external code (manual override, currently in the sandbox harness). Disambiguated today via the `abrDisabled` flag. A clean factoring exists (separate `abrSelectedVideoTrackId` + `manualSelectedVideoTrackId` slots, derive `selectedVideoTrackId` as `manual ?? abr` — see `quality-switching.ts:18`'s TODO), but we don't want to *force* this decomposition for every multi-writer case. The "two writers + mode-flag disambiguator" shape is sometimes the right answer.

3. **Two-way DOM sync** — `preload` is written by `syncPreloadAttribute` (DOM → state mirror) and external code via `shareSignals` (state → drives downstream DOM behavior). The slot is a coordination point between observer and controller; both writers are legitimate.

The 0-or-1 invariant would force decomposition for all three cases. That's too aggressive — it imposes a uniform shape on patterns that are genuinely different. Per-slot annotations alone (which we shipped) give us body-level write enforcement and self-documenting intent at the call site; the count invariant was layered on top but adds churn without proportional value.

**Decision:** drop the count invariant. Multi-writer slots are legitimate. The writer audit (`### Per-behavior writer audit`) documents who writes what; review serves the same purpose the count invariant would have.

### Composition surface stays writable

The original plan made `composition.state` / `composition.context` **uniformly read-only externally** — all writes had to go through behaviors or the `shareSignals` callback. Without the count invariant, this enforcement isn't necessary: the composition surface stays as `StateSignals<S>` / `ContextSignals<C>` (writable). External code can still write directly via `composition.state.X.set(...)` (the harness's deferred `selectedVideoTrackId` / `selectedTextTrackId` writes do this).

Per-slot annotations are a **behavior-side** contract — they describe what each behavior reads and writes within its setup body. They're not a composition-surface contract.

### Follow-up: writer-audit lint rule

A future custom linter rule could capture the original Stage D intent (visibility into multi-writer cases) without forcing decomposition through types:

- **Detection.** Walk all `defineBehavior(...)` calls and `shareSignals.onSignalsReady` consumer callbacks; tally writers per slot.
- **Warn on multi-writer slots.** Surface the writer list at each violating site so reviewers see the broader picture.
- **Ignore mechanism.** A comment marker (e.g. `// writer-audit-allow: <reason>`) on the writing line opts the slot out of the warning. Forces the author to articulate intent ("this is the pipeline pattern" / "this is intent + default with `abrDisabled` mode flag" / "this is DOM ↔ state sync").
- **Separate concerns.** Lives in tooling, not in types — keeps the type system simple and lets reviewers see the multi-writer landscape without compile-time churn.

Not in scope for the current branch. Worth opening as a follow-up issue once the branch ships.

### Stage D-pre — what landed (input mechanism)

Stage D-pre routed external writes through a new generic behavior (`shareSignals`) so the call site for "external writes" became uniform. Originally framed as a precondition for Stage D's count invariant; with the invariant dropped, this work stands on its own as the canonical pattern for external writes. Audit (2026-05-04) showed the external writers to composition signals were:

| Key | Slot | Trigger | Nature | Status |
|---|---|---|---|---|
| `mediaElement` | context | `attach()` / `detach()` | DOM lifecycle | ✅ migrated to `onSignalsReady` capture in adapter |
| `preload` | state | `preload =` IDL setter | HTML attribute input | ✅ same |
| `presentation` | state | `src =` IDL setter (writes `{ url }`) | HTML attribute input | ✅ same |
| `playbackInitiated` | state | `play()` method | Imperative input | ✅ same |
| `abrDisabled` | state | sandbox harness UI toggle | pure input, no overlap | ✅ same |
| `selectedVideoTrackId` | state | sandbox harness rendition picker + `selectVideoTrack` (default-pick) + `switchQuality` (ABR) | **Multi-writer (intent + reactive default)** — accepted pattern; cleanup proposed at `quality-switching.ts:18` (decompose into `manualSelectedVideoTrackId` + `abrSelectedVideoTrackId`) |
| `selectedTextTrackId` | state | sandbox harness auto-select + `selectTextTrack` (default-pick) + `syncTextTracks` (DOM-driven) | **Multi-writer** — accepted pattern; harness still writes directly with `TODO(stage-d)` markers as cleanup hints |

**The harness was also on the pre-Stage-A monolithic API** (`engine.state.set({...engine.state.get(),...})` + `engine.owners`) since Stage A landed — broken at runtime, not just type-stale. Stage D-pre rebuilt it on the discrete-signals shape and routed all five non-overlap inputs through `onSignalsReady`. The two multi-writer cases stayed as direct writes via `engine.state` (no longer needing a reconciler — see "Reconciler shape — optional pattern").

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

5. **Bidirectional usage** — the consumer's callback can already declare per-slot intent by typing captured refs as `Signal<T>` (write) or `ReadonlySignal<T>` (read-only) — `Signal<T>` is structurally a subtype of `ReadonlySignal<T>`, so the narrower assignment Just Works. Discipline is per-consumer; today's consumers (adapter, harness) declare everything writable since they need both reads and writes.

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

These slots are documented in the multi-writer table below as legitimate intent + default patterns; the harness's direct writes via `engine.state` are noted with `TODO(stage-d)` markers as cleanup hints (see `selectedVideoTrackId` decomposition below) but are no longer Stage D-blocking.

#### Multi-writer slots — accepted patterns

Slots with more than one writer once both internal and external writes are counted. With the count invariant dropped, these are **legitimate shapes**, not violations:

| Slot | Writers | Pattern |
|---|---|---|
| `presentation` | adapter / harness (initial `{ url }`), `resolvePresentation` (parsed), `resolve{Video,Audio,Text}Track` (per-track resolution), `calculatePresentationDuration` (duration field) | **Pipeline** — each writer owns a different aspect of the same logical object; each builds on the previous via `{ ...current, fieldOwnedHere }` rather than overwriting. |
| `preload` | `syncPreloadAttribute` (DOM → state), adapter / harness (state → drives DOM via downstream) | **Two-way DOM sync** — the slot is a coordination point between observer and controller. |
| `selectedVideoTrackId` | `selectVideoTrack` (default-pick), `switchQuality` (ABR), harness direct write (manual override) | **Intent + reactive default** — disambiguated today via `abrDisabled` flag. Cleaner factoring exists (separate `manualSelectedVideoTrackId` + `abrSelectedVideoTrackId`, derive `selectedVideoTrackId` as `manual ?? abr`); see TODO at `quality-switching.ts:18`. Independent cleanup, not Stage D-mandated. |
| `selectedTextTrackId` | `selectTextTrack` (default-pick), `syncTextTracks` (DOM-driven), harness direct write (auto-select) | Same intent + reactive default pattern. |
| `playbackInitiated` | `trackPlaybackInitiated` (DOM observer), adapter `play()` write | **Imperative + observer** — adapter sets `true` on `play()` call; observer reflects DOM `paused` state on cleanup. |
| `mediaElement` | adapter / harness only | Externally-driven only — single source from outside, no internal writers. |

The future writer-audit lint rule (see `### Follow-up: writer-audit lint rule`) will surface multi-writer slots at review time and let the author confirm intent via an ignore comment, without forcing decomposition through types.

### Reconciler shape — optional pattern (no longer Stage D-required)

Originally the 2-writer cases on `selectedVideoTrackId` / `selectedTextTrackId` were going to need a reconciler to satisfy the count invariant. With the invariant dropped, **the reconciler pattern is now optional** — multiple direct writers are fine. We're keeping the sketch below as a documented pattern for cases where the intent-vs-reactive-default distinction is worth making explicit.

```ts
// Optional pattern — replaces a default-pick behavior with a reconciler that
// also reads external intent. Useful when the consumer wants the intent vs.
// default split to be visible in the type signature.
export function reconcileSelectedVideoTrackId(intent: ReadonlySignal<string | undefined>) {
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

The cleaner-still factoring (decompose into `manualSelectedVideoTrackId` + `abrSelectedVideoTrackId`, derive `selectedVideoTrackId` as `manual ?? abr`) eliminates the multi-writer entirely. Either approach works; the choice is per-case, not a framework rule.

### Open product questions (still relevant if a reconciler is adopted)

These are real questions about behavior, not architecture. Apply equally to the harness's current direct writes or to a future reconciler:

- Default-pick re-fire on presentation reload — should `selectedVideoTrackId` reset to track 0 of the new presentation, or persist if user-selected and still valid?
- Intent pointing at a track that doesn't exist in the current presentation — fall back to default? Reset intent? Both?
- "Reset to auto" semantics — setting intent to `undefined` clears override; reactive default takes over.

### Resolved questions (Stage D scope-down)

1. ~~**`writeKeys` placement.**~~ **Resolved.** No `writeKeys`. Per-slot access lives in the setup signature.
2. ~~**`ReadSignal<T>` / `WriteSignal<T>` shape.**~~ **Resolved.** Reuse `Signal<T>` (writable) and `ReadonlySignal<T>` (read-only). No brands.
3. ~~**0-writer signals + `initialState`.**~~ **Moot — count invariant dropped.** 0-writer slots are still allowed (and seeded via `initialState` if needed); they just aren't enforced as a special case. `initialState` stays `Partial<S>`.
4. ~~**Input mechanism for the adapter's writes.**~~ **Resolved (and shipped).** Generic `shareSignals` behavior factory hands writable signal refs to a consumer-supplied `config.onSignalsReady` callback at composition setup.
5. ~~**Single-writer enforcement scope.**~~ **Moot — count invariant dropped.**
6. ~~**Migration path for read/write annotations.**~~ **Resolved (and shipped).** All 17 behaviors migrated in commit `b7866e6a`.
7. **Code-reuse follow-up convergence.** Still open. Three behavior modules (select-tracks, resolve-track, load-segments) lost code reuse during the engine-wrapper revisit. The per-slot annotation work didn't surface a clean factory shape; this is independent grooming.

8. **The destroy reset loop.** Currently `for (const sig of Object.values(state)) sig.set(undefined)`. Stage D moves this into per-signal cleanup owned by the writer behavior. Open: 0-writer (seeded) signals — skip the reset (preserve seeded value, treating them as immutable constants)? The cleanest answer is "yes, skip" — once they're constants, there's nothing to reset.

9. **Type machinery shape.** The accumulator-style walk over behaviors to count writers per key is straightforward but new. Worth a focused spike (4–6 lines of `AccumulateWriters<Behaviors>`) before committing to it. The existing `IntersectBehaviors` is a recursive tuple-walk too, so the shape is familiar.

## Motivation

A coordinated shift in SPF from **"shared bag mutated by everyone"** to **"declared signals with clear ownership."** Today, `state` and `owners` are each a single signal whose value is an object; any behavior can read or write any field. The shift makes each field its own signal and asks behaviors to declare which signals they read and which they write — surfacing the contract in types and making intent visible at the call site. (Originally the plan also included a compose-time writer-count invariant; that part was dropped after the writer audit confirmed multiple legitimate multi-writer patterns exist. See `### Why we dropped the writer-count invariant`.)

## The six changes

1. **State and `owners` become objects of discrete signals.** ✅ Stage A.
2. **Rename `owners` → `context`.** ✅ Stage A.
3. **Networking → shared singleton in `context`.** ❌ Deferred (Stage E or follow-up).
4. **Behaviors: function → object with `stateKeys` / `contextKeys`.** ✅ Stage B.
5. **No external signal setting from the composition.** ✅ Stage C — `createComposition` no longer accepts caller-built signal maps; behaviors own all writes (with `initialState` / `initialContext` for seed values). (The Stage-D follow-up here would have made `composition.state` read-only externally; that part was dropped — composition surface stays writable. External writes go through the `shareSignals.onSignalsReady` callback by convention rather than by enforcement.)
6. **Read vs. write enforcement on signals.** ✅ Stage D, scope reduced — per-slot `Signal<T>` / `ReadonlySignal<T>` annotations on behavior setup signatures (body-level enforcement). The originally-planned compose-time writer-count invariant ("0-or-1 writer per slot") was **dropped** — multi-writer patterns are accepted as legitimate. Future custom linter rule will warn on multi-writer slots with an ignore mechanism.

## Proposed staging (historical reference)

| Stage | Change | Status |
|---|---|---|
| **A** | (1) discrete signals; (2) `owners` → `context` | ✅ Complete |
| **B** | (4) behavior-as-object with `stateKeys` / `contextKeys` / `setup` | ✅ Complete |
| **C** | (5) no external setting from composition + `initialState` | ✅ Complete |
| **D-pre** | route adapter + harness writes through `shareSignals` / `onSignalsReady` callback | ✅ Shipped |
| **D (scope-down)** | (6) per-slot `Signal<T>` / `ReadonlySignal<T>` annotations on all behaviors. Count invariant **dropped** — multi-writer slots are legitimate patterns. | ✅ Shipped (commit `b7866e6a`); writer-audit lint rule = future follow-up |
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

1. ~~**Read vs. write split — Stage B or D?**~~ **Resolved (and shipped).** Single `stateKeys` shipped in Stage B; per-slot read/write annotations on setup signatures shipped in Stage D (commit `b7866e6a`).

2. ~~**`setup` signature.**~~ **Resolved.** Receives `BehaviorDeps<S, C, Cfg>` = `{ state, context, config }`, with state/context/config optional via `DepsForCfg` when their slice has no keys. Returns `BehaviorCleanup` (narrowed via the `R` generic in `defineBehavior` so concrete returns survive).

3. ~~**`createComposition` explicit-typed overload.**~~ **Resolved in Stage A** (and re-confirmed in `21f43473`'s single-signature collapse) — explicit overload removed; the inferred form alone handles the HLS engine's behaviors with no inference issues.

4. ~~**Composition's read-only API surface.**~~ **Resolved (stays writable).** `Composition<S, C>` continues to expose `state: StateSignals<S>` / `context: ContextSignals<C>` (writable everywhere). The originally-planned readonly external surface was a Stage D enforcement promise that's no longer being made — per-slot read/write annotations live on **behavior** setup signatures, not the composition's external API.

5. **Fundamentals doc updates.** Pending — see Doc updates above.

6. **Networking singleton design (3).** Deferred to a separate plan.

7. **Doc-driven cleanup loop continues.** The `hls-engine.md` walkthrough is the canary for whether the new shape reads well. Same friction-list pattern.

## Risk and scope notes

- **Stages A through D (scoped down) have landed.** Net: behaviors are objects with declared keys + per-slot read/write annotations; composition derives the signal map; type-specialized exports replace engine wrappers; `defineBehavior` / `buildSignalMap` / `makeShareSignals` are tested primitives. Multi-writer slots are accepted as legitimate patterns (see writer audit).
- **Stage D's count invariant was dropped after the audit.** Per-slot `Signal<T>` / `ReadonlySignal<T>` annotations alone give us body-level write enforcement and self-documenting intent at the call site. The originally-planned compose-time writer-count invariant added churn without proportional value — see `### Why we dropped the writer-count invariant`.
- **Backwards compatibility** within the SPF package is not a concern — there are no external consumers of the behavior shape yet. Move freely.

## See also

- `internal/design/spf/primitives.md` — original architecture spec, especially §5 on observable state.
- `packages/spf/docs/hls-engine.md` — in-flight walkthrough that needs updates post-merge.
- `internal/design/spf/fundamentals.md` — needs updating (Stage C's "no external writes" rule).
- `.claude/plans/spf/signals-poc.md` — earlier signals spike that informed this direction.
