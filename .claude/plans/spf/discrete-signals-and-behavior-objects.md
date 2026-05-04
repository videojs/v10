---
status: stages-A-B-C-complete
branch: refactor/spf-discrete-signals-stage-a
---

# SPF: Discrete Signals + Behavior-as-Object

> Captures a meeting follow-up on a coordinated set of architectural shifts in SPF. Stages A, B, and C have landed (the user's plan numbered these as steps 1, 2a, 2b, and 3). Stage D (read/write enforcement) is deferred. Findings feed back into `internal/design/spf/primitives.md` and `packages/spf/docs/hls-engine.md`.

## Status snapshot

- **Branch:** `refactor/spf-discrete-signals-stage-a` (off `docs/spf-hls-engine-composition`)
- **Stages A + B + C complete** + engine-wrapper revisit + `buildSignalMap` export with tests. Tests green: 48 files, 748 tests passed (was 703 at end of Stage A — net +45 from new test coverage and consolidation).
- **Build clean.** `pnpm typecheck`, `pnpm -F @videojs/spf test`, `pnpm exec biome check`, `pnpm check:workspace`, `pnpm build:packages` all pass.
- **Stage D deferred.** Read/write enforcement (single-writer rule + `writeKeys`) — user's note: "doesn't need to happen yet."
- **Not yet:** PR opened; merge to main; doc updates to `hls-engine.md` / `fundamentals.md`.
- **Memory:** `project_spf_stage_a_revisit.md` has the deeper "why we did it this way" notes for Stage A; updated for B/C carryovers.

## Resuming — where to start the next session

1. **Verify branch state.** `git log --oneline` should show `e4ce10ae refactor(spf): specialize load-segments behaviors per track type` at HEAD on `refactor/spf-discrete-signals-stage-a`.
2. **Decide between three next moves:**
   - **(a) Open the PR.** The branch is in shippable shape. PR description should walk through stages A→C, the engine-wrapper specialization, and the deferred Stage D.
   - **(b) Doc updates.** `packages/spf/docs/hls-engine.md` is on the parent `docs/spf-hls-engine-composition` branch and is now badly stale (uses old `update`-style state writes, single-`owners` signal, no `defineBehavior`, no `stateKeys`/`contextKeys`). Refresh after Stage A→C. `internal/design/spf/fundamentals.md` no longer matches the new pattern (recommends external state writes; we now require behaviors to own writes).
   - **(c) Stage D.** Read/write enforcement. See `## Stage D — what's left` below for the design sketch.
3. **Code-reuse follow-up.** See `## Follow-ups` — three behavior modules (select-tracks, resolve-track, load-segments) lost code reuse during the engine-wrapper revisit. The plan doc + commit `77601054` capture the trade-off; revisit once a clean factory pattern is settled.

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

## Stage D — what's left

The user's plan #4: read/write enforcement.

> Eventually, we will constrain these types more for our read vs. write enforcement, but I don't *think* that needs to happen yet.

Design sketch (not implemented):

- Behaviors gain a `writeKeys` (subset of `stateKeys`) declaring which signals they write.
- `createComposition` validates: each state key has at most one writer.
- 0-writer signals are allowed only if seeded via `initialState`.
- `setup`'s param can narrow further: declared writeKeys produce `WriteSignal<T>` slots; read-only keys produce `ReadSignal<T>` slots.
- The `destroy()` reset-loop in `createComposition` (which currently sets every signal to undefined post-cleanup) moves into per-signal cleanup owned by the writer behavior. The blanket reset is currently a workaround for missing read/write semantics.

This is out of scope for the current branch; pick up in a follow-up.

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
| **D** | (6) single-writer enforcement + `initialState` requirement for 0-writer signals | ❌ Deferred |
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
