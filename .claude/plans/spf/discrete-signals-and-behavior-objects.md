---
status: stage-A-complete
branch: refactor/spf-discrete-signals-stage-a
---

# SPF: Discrete Signals + Behavior-as-Object

> Captures a meeting follow-up on a coordinated set of architectural shifts in SPF. Stage A has landed (see `## Stage A — what landed` below). Stages B–E remain open. Findings feed back into `internal/design/spf/primitives.md` and `packages/spf/docs/hls-engine.md`.

## Status snapshot

- **Branch:** `refactor/spf-discrete-signals-stage-a` (off `docs/spf-hls-engine-composition`)
- **Stage A:** complete. Tests green (49 files, 703 tests). Build clean.
- **Not yet:** PR opened; merge to main; doc updates to `hls-engine.md` / `fundamentals.md`.
- **Memory:** `project_spf_stage_a_revisit.md` has the deeper "why we did it this way" notes.

## Resuming — where to start the next session

1. **Check the branch is still on** `refactor/spf-discrete-signals-stage-a`. The doc-driven `hls-engine.md` walkthrough is on the parent `docs/spf-hls-engine-composition` branch and will need updating once Stage A merges (drop `update` examples, switch to `state.x.set(...)`, rename `owners` → `context`, mention the inferred-overload-only `createComposition`).
2. **Decide whether to ship Stage A first or stack Stage B on top.** Stage A is shippable as-is. Stage B will reshape behaviors again (function → object) so a separate PR is cleaner.
3. **Stage B spike** (highest-leverage thing to do next): pick the smallest behavior — `syncPreloadAttribute` — and try the behavior-as-object shape end-to-end (`stateKeys` / `contextKeys` / `writeKeys` declarations + `setup` fn + the `createComposition` machinery to derive signal maps from declarations). The TS inference for the declaration shape is the load-bearing piece; spike before mass-migrating.
4. **Open questions still live:** see `## Open questions` below — most importantly Q1 (read/write split timing), Q4 (composition's read-only API), and Q6 (networking singleton design).

## Stage A — what landed

Stage A is on `refactor/spf-discrete-signals-stage-a` (10+ commits from `b00fa1a1` through `ad863bf1`). Key deviations from the original plan and details worth preserving live in the project memory: `project_spf_stage_a_revisit.md`. Highlights:

- **Discrete signals + `owners` → `context`** as planned. Engine builds the signal maps externally and passes them to `createComposition`.
- **Compose-time conflict detection preserved + tightened.** The first pass dropped the inferred-overload type machinery; we restored it and unified context conflicts with state (intersection-based; sibling-type context now correctly conflicts). The owners-subtype check is gone — context uses the same intersection rule as state.
- **Single inferred overload only.** With discrete signals, the distributive-intersection inference issue from `044263f2` doesn't recur — the explicit-typed overload was removed. The HLS engine compiles cleanly with just the inferred form.
- **All behaviors uniform.** Every behavior is now `Behavior<S, C, Cfg>` (single-arg BehaviorDeps shape — `{ state, context, config }`). The engine wrappers all read `({ config, ...deps }: Deps) => behavior({ ...deps, config: { type, ...config } })`.
- **Engine config defaults `resolveTextTrackSegment`.** Removed the `setupTextTrackActors` engine wrapper that existed solely to inject the resolver.
- **Latent bug fix:** `update-duration` referenced `videoSourceBuffer`/`audioSourceBuffer` keys the engine never wrote to; renamed to `videoBuffer`/`audioBuffer`.

### Side cleanups during Stage A (not in original plan)

Surfaced during the work; documented in commits and memory but worth knowing they happened:

- `selectVideoTrack` / `selectAudioTrack` collapsed into a single `selectMediaTrack` (bodies were byte-identical).
- `QualitySwitchingConfig.defaultBandwidth` renamed to `initialBandwidth` for naming consistency with the engine config.
- `switchQuality` reshaped to `({ state, config })` so the engine no longer needs a wrapper.
- Conditional config-spreads in engine wrappers replaced with direct `{ type, ...config }` spreads (`exactOptionalPropertyTypes: false` on the SPF tsconfig made the conditional guards unnecessary).

## Motivation

A coordinated shift in SPF from **"shared bag mutated by everyone"** to **"declared signals with clear ownership."** Today, `state` and `owners` are each a single signal whose value is an object; any behavior can read or write any field. We want each field to be its own signal, and we want behaviors to declare which signals they read and which they write — so the compose step can enforce single-writer / N-reader and surface the contract in types.

## The six changes

1. **State and `owners` become objects of discrete signals.**
   - `state.get().currentTime` → `state.currentTime.get()`
   - `owners.get().mediaElement` → `owners.mediaElement.get()`
   - First pass: HLS engine composition creates the signals "from the outside" as scaffolding. This goes away once (4) lands.
   - Need TS enforcement so behaviors only see the signals they expect.

2. **Rename `owners` → `context`** (working name; "refs" and "resources" also on the table). May change again, hopefully not.

3. **Networking → shared singleton in `context`.**
   - Created by a behavior.
   - Multiple iterations expected; design deferred to its own discussion.

4. **Behaviors: function → object.**
   ```ts
   const behavior = {
     stateKeys: ['currentTime'],
     contextKeys: ['mediaElement'],
     setup: behaviorWithTypesShapesFn,
   };
   ```
   - The object announces the state and context signal keys it expects.
   - `setup()` is roughly the function shape we have today, updated for discrete signals.
   - This *is* the declaration mechanism that lets composition derive (1)'s signal map — replacing the Stage A scaffolding.
   - Either explicit TS or a helper enforces internal consistency, plus cross-behavior enforcement at `createComposition`.

5. **No external signal setting from the composition.**
   - Any signal write must happen inside a behavior.
   - Contradicts the current `fundamentals.md` recommendation; the new convention will be what fundamentals describes as the *should* path. The reason is foot-gun avoidance and preconditions for (6).
   - Read-only signal access from the composition's API may still be supported (TBD on whether the cost is worth it).

6. **Read vs. write enforcement on signals.**
   - Exactly one behavior may write to a signal. N behaviors may read (including the writer).
   - 0-writer signals are allowed only if a value is supplied via `initialState`.
   - May land in Stage B with (4), or as a follow-up stage — see open questions.

## Proposed staging

| Stage | Change | Why this order |
|---|---|---|
| **A** | (1) discrete signals; (2) `owners` → `context` | Foundational data-shape change. Every behavior touches it. Rename batched in so behaviors don't churn twice. Signals created externally in HLS composition as scaffolding. |
| **B** | (4) behavior-as-object with `stateKeys` / `contextKeys` / `setup` | Removes Stage A scaffolding — composition derives the signal map from behavior declarations. TS enforcement story lands here. |
| **C** | (5) no external setting from composition | Falls out naturally once (4) is in place. Composition API exposes read-only views (or nothing). |
| **D** | (6) single-writer enforcement + `initialState` requirement for 0-writer signals | Needs (4)'s declarations. May fold into B if we go straight to `readKeys` / `writeKeys`. |
| **E or parallel** | (3) networking singleton | Independent track. Probably wants Stage A done first so it lands in the new shape. Defer concrete design. |

## Open questions to resolve before locking the plan

1. **Read vs. write split — Stage B or D?** Going straight to `readKeys` / `writeKeys` in Stage B front-loads design but enables (6) for free. Single `stateKeys` first means touching every behavior twice. Lean toward splitting now.

2. **`setup` signature.** What does it receive? Likely `(state, context, options)` filtered to declared keys with correct read/write typing. Does it still return a cleanup function? (Probably yes.) Are options still passed positionally or as part of the behavior object?

3. ~~**`createComposition` explicit-typed overload.**~~ **Resolved in Stage A** — explicit overload removed; the inferred form alone handles the HLS engine's behaviors with no inference issues. Stage B should preserve this.

4. **Composition's read-only API surface.** Does the engine's caller get the full read-only signal map, a curated subset, or nothing? Default to "nothing unless asked for"?

5. **Fundamentals doc updates.** Currently recommends what (5) prohibits. Update at end of each stage rather than during, so we're not chasing a moving target.

6. **Networking singleton design (3).** Defer to a separate plan once Stage A is done.

7. **Doc-driven cleanup loop continues.** The `hls-engine.md` walkthrough is the canary for whether the new shape reads well. Same friction-list pattern.

## Risk and scope notes

- **Stage A is mechanical but huge.** Every behavior touches state/context access. Worth a single, focused PR (or a stack of small PRs grouped by behavior cluster) rather than mixed with anything else.
- **Stage B is where the type system gets interesting.** `readKeys` / `writeKeys` with proper inference at `createComposition` is the load-bearing piece. Worth a focused spike first.
- **Backwards compatibility** within the SPF package is not a concern — there are no external consumers of the behavior shape yet. Move freely.

## See also

- `internal/design/spf/primitives.md` — original architecture spec, especially §5 on observable state.
- `packages/spf/docs/hls-engine.md` — in-flight walkthrough that will need updates as each stage lands.
- `internal/design/spf/fundamentals.md` — needs updating as part of (5).
- `.claude/plans/spf/signals-poc.md` — earlier signals spike that informed this direction.
