---
status: in-progress
date: 2026-05-07
branch: fix/spf-behaviors-and-media-cleanup
---

# SPF behaviors + media + network — assessment

> Point-in-time mapping of in-scope code (`packages/spf/src/playback/behaviors/`, `media/`, `network/`) against the [evaluation axes](../../../internal/design/spf/evaluation-axes.md) and the [conventions docs](../../../internal/design/spf/conventions/). **Pure observation** — recommendations land in the cleanup backlog ([`behaviors-and-media-cleanup.md`](behaviors-and-media-cleanup.md)), not here.
>
> Ephemeral by design. The *axes* and *conventions* are durable; the file:line *citations* decay as the code changes. When a citation goes stale, prefer re-running the assessment over patching individual lines.

## Method

- Read each file in scope.
- Anchor observations to axis letters (**A** Reusability, **B** Robustness, **C** Patternability, **D** Simplicity, **E** Size) and to specific conventions in [`behaviors.md`](../../../internal/design/spf/conventions/behaviors.md) and [`signals.md`](../../../internal/design/spf/conventions/signals.md).
- `file:line` citations for every claim.
- Skip files with nothing notable.
- Defer recommendations — they live in the backlog tagged with their axes/conventions, not here.

## Status

| Section | Files | Status |
| ------- | ----- | ------ |
| Behaviors (`packages/spf/src/playback/behaviors/`) | 17 | complete |
| Media (`packages/spf/src/media/`) | 17 | complete |
| Network (`packages/spf/src/network/`) | 2 | complete |

## Already-tracked follow-ups (excluded from new findings)

These are known follow-ups documented elsewhere; the assessment notes them when encountered but does not re-flag:

- Code-reuse compromise across `select-tracks`, `resolve-track`, `load-segments` ([`discrete-signals-and-behavior-objects.md`](discrete-signals-and-behavior-objects.md) → "Code-reuse compromise").
- `selectedVideoTrackId` decomposition (`abrDisabled` cleanup) — `quality-switching.ts` TODO.
- Writer-audit lint rule.
- `setup-mediasource.ts:63` "Reactor with internal finite state" comment — likely predates `createMachineReactor`.

## Behaviors

### Per-file findings

#### `packages/spf/src/playback/behaviors/calculate-presentation-duration.ts`

**Shape**: simple (single `effect`, no primitives reached for)

**Axis findings**:
- A: `getDurationFromResolvedTracks` hardcodes "video first, audio fallback" (calculate-presentation-duration.ts:46-62) — audio-only on the pressure list does not force a rewrite (it falls through), but multi-language audio + audio ABR don't change which audio-track's duration is read; assumption is "all selected tracks of a type agree on duration."
- C: Helper functions `canCalculateDuration` / `shouldCalculateDuration` / `getDurationFromResolvedTracks` are pure, exported, named with `can*`/`should*` prefixes (calculate-presentation-duration.ts:17-63) — same pattern as `update-duration.ts` and `end-of-stream.ts` but with no convention doc coverage.
- D: `shouldCalculateDuration` re-derives the same `getSelectedTrack` lookup that `getDurationFromResolvedTracks` then redoes (calculate-presentation-duration.ts:35-39, 47-58).

**Convention findings**:
- Wide-shape state typing: `PresentationDurationState` is exported as a wide interface and re-used in helper signatures (calculate-presentation-duration.ts:8-12, 17, 26, 45) — the setup itself does narrow with `Pick`-like inline shape (calculate-presentation-duration.ts:71-75), but the helpers don't, going against the "narrow with `Pick`" convention (behaviors.md "Narrow the slice with `Pick`").
- `presentation` slot typed `Signal<...>` (write); `selectedVideoTrackId` and `selectedAudioTrackId` typed `ReadonlySignal<...>` (calculate-presentation-duration.ts:72-74) — read/write intent annotation is correct.

**Code sniffs**:
- fix-in-place: the same `getSelectedTrack` lookup is performed in two helpers per call (calculate-presentation-duration.ts:47-58).

#### `packages/spf/src/playback/behaviors/load-text-track-cues.ts`

**Shape**: primitive-augmented (factory: `createMachineReactor`)

**Axis findings**:
- A: Hardcoded "first switching set, type=text" assumption (load-text-track-cues.ts:60) — multi-language audio/text via multiple switching sets isn't supported.
- B: `untrack(() => context.segmentLoaderActor.get())` followed by non-null assertion (load-text-track-cues.ts:144-145) — comment claims `deriveState` guarantees presence in this state; correctness depends on the monitor running before the per-state effect when an actor is unset, which is implicit ordering.
- C: `deriveState` + `monitor: () => derivedStateSignal.get()` pattern matches `resolve-presentation.ts` and `track-playback-initiated.ts` (load-text-track-cues.ts:75-90, 125, 131) — emergent convention not in docs.
- D: `derivedStateSignal`, `currentTimeSignal`, `selectedTrackSignal` all created up-front (load-text-track-cues.ts:125-127) — `selectedTrackSignal` is only read in one place (load-text-track-cues.ts:143), `currentTimeSignal` only in one place (load-text-track-cues.ts:142).

**Convention findings**:
- All state slots typed `ReadonlySignal<...>` (load-text-track-cues.ts:114-123) — zero writers; matches "consume-only" usage but no `initialState` seed declaration is visible at this layer (would be in the engine assembly).
- Per-type specialization not applied — text-track cue loading is type-bound (only text), where the doc says "co-locate per-type in one module" (behaviors.md "Per-type specialization") — this is a single-purpose module so the rule doesn't apply, but the body's coupling to `'text'` (load-text-track-cues.ts:60) is implicit.

#### `packages/spf/src/playback/behaviors/quality-switching.ts`

**Shape**: simple (single `effect`)

**Axis findings**:
- A: TODO at quality-switching.ts:16-20 explicitly names the `abrDisabled` decomposition pressure point — known follow-up.
- A: `safetyMargin`, `minUpgradeInterval`, `initialBandwidth` are configurable (quality-switching.ts:28-49) — accommodates per-asset tuning without surgery; flat `videoTracks` only (quality-switching.ts:65-67) hardcodes "first switching set" — multi-bitrate audio (audio ABR) on the pressure list would need a peer factory or audio path.
- B: `lastUpgradeTime` + `firstMeaningfulFire` are closure-captured flags (quality-switching.ts:109-110) carrying state across `effect` re-runs — re-creating the behavior resets them.
- C: Closure flags acting as mini state machine (quality-switching.ts:109-110, 123-124, 138-139) — behaviors.md "fight the shape" sniff for body manually serializing work via flags.
- D: The body has two interleaved concerns (gating ABR via `abrDisabled` and the upgrade-interval gate) wrapped in one `effect` (quality-switching.ts:112-143).
- E: `selectQuality(videoTracks as any, ...)` cast (quality-switching.ts:127) — defensive compatibility cast.

**Convention findings**:
- Documented multi-writer slot: `selectedVideoTrackId: Signal<...>` at quality-switching.ts:96 paired with the same slot also written by `setupTrackResolution` consumers — the "intent + default" pattern; TODO at quality-switching.ts:16-20 calls out the planned decomposition (signals.md multi-writer, also called out as known follow-up).
- `abrDisabled === true` boolean equality (quality-switching.ts:116) bypasses the closure rather than transitioning out — quality-switching.ts:22 confirms it's a "blunt instrument."

**Code sniffs**:
- fight-the-shape: hand-rolled FSM via closure flags (quality-switching.ts:109-110, 123-124, 138-139) — `createMachineReactor` is the documented target for this shape.

#### `packages/spf/src/playback/behaviors/resolve-presentation.ts`

**Shape**: primitive-augmented (factory: `createMachineReactor`)

**Axis findings**:
- B: `entry` returns the `AbortController` (resolve-presentation.ts:114) — relies on framework abort-on-state-exit; cleanup contract is correct.
- B: Catch arm checks `error.name === 'AbortError'` and rethrows otherwise (resolve-presentation.ts:109-112) — silent "throw" inside a then-chain has no observable error surface (no error slot, no rejection handler).
- C: Single `monitor: () => derivedStateSignal.get()` driven by exported `deriveState` (resolve-presentation.ts:60-65, 88, 92) — the recurring convention shape.

**Convention findings**:
- `presentation: Signal<...>`, others `ReadonlySignal<...>` (resolve-presentation.ts:83-86) — clean single-writer.
- `shouldResolve` and `canResolve` are exported as standalone helpers (resolve-presentation.ts:30-47) — same exported-helpers pattern as `calculate-presentation-duration.ts` and `end-of-stream.ts`.
- `canResolve` returns a TS predicate `value is ...` (resolve-presentation.ts:43-47) — matches CLAUDE.md type-guard convention.

#### `packages/spf/src/playback/behaviors/resolve-track.ts`

**Shape**: primitive-augmented (primitive: `Task` + `ConcurrentRunner`); per-type specialization via three exports

**Axis findings**:
- A: `setupTrackResolution` is parameterized over `selectedKey` and a finder (resolve-track.ts:86-93) — accommodates new track types without rewrite.
- B: Stale-snapshot problem and resolution documented inline (resolve-track.ts:115-123) — explicit fix for concurrent-task-write race.
- C: Inline TODO comments at resolve-track.ts:94-96 and resolve-track.ts:108-109 propose factoring the runner and Task creation into `createTaskRunner` / `createResolveTrackTask` (known follow-up).
- D: Ad-hoc `runner` lifecycle (resolve-track.ts:97, 130-133) — one-off shape; not a known primitive yet.

**Convention findings**:
- Per-type specialization with a typed helper: matches behaviors.md "code-reuse compromise" mention and `select-tracks.ts` shape (resolve-track.ts:86-134, 145-178).
- `presentation: Signal<...>` writer; `selected*TrackId` readers (resolve-track.ts:82-84) — correct.
- `setupTrackResolution` returns `() => { runner.abortAll(); cleanup(); }` (resolve-track.ts:130-133) — uses two-step cleanup composed manually rather than `AbortController` (CLAUDE.md "Cleanup Pattern" suggests `AbortController` for multiple cleanups).

**Code sniffs**:
- no-good-fit-yet: `ConcurrentRunner` + per-task ID is hand-rolled scheduling (resolve-track.ts:97, 107-127); the inline TODOs (resolve-track.ts:94-96, 108-109) match behaviors.md "hold the sniff visibly."

#### `packages/spf/src/playback/behaviors/select-tracks.ts`

**Shape**: simple (one `effect` per export); per-type specialization with three exports

**Axis findings**:
- A: `pickFirstTrackId` for video/audio (select-tracks.ts:19-21) — known POC; comment at select-tracks.ts:14-18 says it'll be replaced by `pickVideoTrack` / `pickAudioTrack` once selection algorithm matures (multi-language audio, BCP-47).
- C: `setupTrackSelection` shares orchestration with `resolve-track.ts:setupTrackResolution` — same shape (helper bound at module load by selectedKey + variant fn) (select-tracks.ts:39-50).
- D: `selectTextTrack` config flows through as `Omit<TextSelectionConfig, 'type'>` and re-injects `type: 'text'` (select-tracks.ts:106-110) — a minor type-shape mismatch handled at the call site.

**Convention findings**:
- `presentation: ReadonlySignal<...>`; `selected*TrackId: Signal<...>` (select-tracks.ts:36-37) — writer typing matches the multi-writer with quality-switching pattern documented in signals.md.
- Per-type specialization via a typed helper: matches behaviors.md `select-tracks` referenced as the canonical example.

#### `packages/spf/src/playback/behaviors/sync-preload-attribute.ts`

**Shape**: simple (single `effect`)

**Axis findings**:
- C: Cited as the canonical "simple" example in behaviors.md:21-24 and signals.md:21-29 — the file matches the doc.

**Convention findings**:
- `Pick<PresentationState, 'preload'>` to narrow (sync-preload-attribute.ts:20) — matches behaviors.md "Narrow the slice with `Pick`".
- `state: { preload: Signal<...> }`, `context: { mediaElement: ReadonlySignal<...> }` (sync-preload-attribute.ts:36-37) — single read, single write; canonical.
- `mediaElement` is wrapped in `computed(() => context.mediaElement.get())` (sync-preload-attribute.ts:39) — a tracked alias of an already-tracked signal; no observable behavior difference.

**Code sniffs**:
- fix-in-place: `computed` wrap of `context.mediaElement.get()` (sync-preload-attribute.ts:39) adds a layer with no observable benefit.

#### `packages/spf/src/playback/behaviors/dom/end-of-stream.ts`

**Shape**: primitive-augmented (helpers + ad-hoc `effect`-inside-Promise; no factory)

**Axis findings**:
- A: `videoBuffer`/`audioBuffer` hardcoded throughout — `getMaxBufferedEnd` iterates `[videoBuffer, audioBuffer]` (end-of-stream.ts:209), audio-only/video-only handled but multi-language audio (multiple audio buffers) would force a rewrite.
- B: `hasEnded` flag with re-entry window note (end-of-stream.ts:292, 297-308) — comments document the exact race; flag is set "before awaiting" to close the window. Async task fires from inside an `effect` (end-of-stream.ts:309).
- B: `waitForSourceBuffersReady` creates `effect()` inside `new Promise()` with manual `resolved` flag and `queueMicrotask` cleanup (end-of-stream.ts:170-200) — comment explains why the cleanup is microtask-deferred.
- C: Same `can*`/`should*`/`is*` exported-helper layout as `update-duration.ts` and `calculate-presentation-duration.ts` (end-of-stream.ts:78-163).
- D: `shouldEndStream` is ~60 lines reading 6 context slots and 4 state slots (end-of-stream.ts:110-163); behavior body is 50+ lines.
- E: Defensive non-null assertions throughout (end-of-stream.ts:229, 238, 247, 250).

**Convention findings**:
- All slots `ReadonlySignal<...>` (end-of-stream.ts:269-283) — zero direct writes; the only write side-effect is `mediaSource.endOfStream()` and `mediaSource.duration =` outside the signal graph (end-of-stream.ts:247, 250).
- `state.mediaSourceReadyState` reactive mirror documented as the dependency anchor (end-of-stream.ts:286-289) — relates obliquely to signals.md "Maintaining a parallel state slot for an Actor's snapshot" (the actor is not formalized; readyState is a DOM property mirrored to keep `computed` re-evaluating).

**Code sniffs**:
- augment-with-a-primitive: ~50-line `effect` body with internal flag (end-of-stream.ts:292-310); comment at end-of-stream.ts:73-92 ("right long-term condition") implies a future re-shape.
- fight-the-shape: `effect()` instantiated inside `new Promise()` with a `resolved` boolean and `queueMicrotask` cleanup (end-of-stream.ts:188-196) — a bespoke once-when-condition-met pattern, no convention coverage.
- no-good-fit-yet: `waitForSourceBuffersReady` (end-of-stream.ts:170-200) — "wait for actor to leave updating state" reads as a primitive shape that recurs (also seen in `update-duration.ts:79-91` waiting via `addEventListener('updateend')` instead of actor-aware).

#### `packages/spf/src/playback/behaviors/dom/load-segments.ts`

**Shape**: primitive-augmented (Actor: `createSegmentLoaderActor`; multiple effects + computeds + local signals)

**Axis findings**:
- A: `MediaTrackType` is `'video' | 'audio'` (load-segments.ts:18 imports from `setup-sourcebuffer.ts`); audio ABR is split into a `type === 'video'` branch for tracked-fetch (load-segments.ts:284); audio-only is handled.
- B: Local `throughput` signal kept separate from `state.bandwidthState` and bridged via `onSample` (load-segments.ts:270-278, 64-66) — duplicate state by design, with the comment explaining why (load-segments.ts:280-283).
- B: `prevInputs` closure-state used in equality check (load-segments.ts:346-354) — replaces a prior combineLatest pattern; only updated when a message is sent.
- C: Helper-and-factory style (`setupSegmentLoading` plus per-type `loadVideoSegments`/`loadAudioSegments` exports) matches `select-tracks.ts`/`resolve-track.ts` (load-segments.ts:260-265, 400-426).
- D: 165 lines of body in `setupSegmentLoading` (load-segments.ts:260-379), three nested computeds, two effects, two local signals (`throughput`, `segmentLoader`), and a captured `currentLoader`.
- E: Two `@ts-expect-error` calls (load-segments.ts:359, 364) — type system is not capturing the actor message contract.

**Convention findings**:
- `bandwidthState` is `Signal<...>` only in `loadVideoSegments` (load-segments.ts:411), `ReadonlySignal<...>` in `loadAudioSegments` and the shared `SegmentLoadingStateMap` (load-segments.ts:245, 424) — per-export read/write divergence handled via `Omit` type intersection (load-segments.ts:410-412); legitimate per-spec, but not documented as a pattern.
- `selectedTextTrackId` declared in `SegmentLoadingStateMap` (load-segments.ts:250, 389) but never read in the body — leftover key.
- `signal<SegmentLoaderActor | undefined>(undefined)` (load-segments.ts:287) and `signal<BandwidthState>(...)` (load-segments.ts:270) — local signals not part of the composition's signal map; relates to signals.md "Maintaining a parallel state slot for an Actor's snapshot" risk for `segmentLoader` (the loader's snapshot is itself a signal but is not exposed directly).

**Code sniffs**:
- fight-the-shape: `prevInputs !== undefined && loadingInputsEq(prevInputs, inputs)` (load-segments.ts:349) is a hand-rolled "skip-if-equivalent" gate; the equality function `loadingInputsEq` is a 40-line condition hierarchy (load-segments.ts:177-203) inline-encoded as a comparator.
- augment-with-a-primitive: actor-lifecycle `effect` with `currentLoader` captured ref (load-segments.ts:295-310) — "creates a resource ... that has its own lifecycle and needs disposing" (behaviors.md "augment with a primitive").
- no-good-fit-yet: the local `throughput` Signal bridged via callback (load-segments.ts:270, 64-66, 414) is a one-off pattern for "private state mirrored back to shared state" not covered by current primitives.

#### `packages/spf/src/playback/behaviors/dom/setup-mediasource.ts`

**Shape**: primitive-augmented (nested `effect`s; no factory)

**Axis findings**:
- B: `abortController.abort()` from outer cleanup propagates to `onMediaSourceReadyStateChange` only via `signal: abortSignal` (setup-mediasource.ts:50, 74, 91) — outer effect `return cleanup` sequence is documented but inner effect's cleanup runs from the outer's return (setup-mediasource.ts:79-87).
- C: NOTE comment at setup-mediasource.ts:63 explicitly identifies the fight-the-shape sniff and predates `createMachineReactor` (called out as known follow-up; behaviors.md:130 references this exact line).
- D: `canSetupSignal`, `shouldSetupSignal`, `mediaElementSrcSignal`, `mediaSourceSignal` — four computeds feeding two nested effects (setup-mediasource.ts:53-67).

**Convention findings**:
- `state.mediaSourceReadyState: Signal<...>`; others `ReadonlySignal<...>` (setup-mediasource.ts:42-48) — read/write intent OK.
- `context.mediaSource: Signal<...>` writer (setup-mediasource.ts:48) — the behavior owns the resource and writes the slot exposing it.

**Code sniffs**:
- fight-the-shape: nested `effect()` inside `effect()` (setup-mediasource.ts:66, 79) gated by flag-shaped computeds (`canSetupSignal`/`shouldSetupSignal`) — exactly the pattern called out in behaviors.md "fight the shape" + "Worked example: where setup-mediasource.ts falls today."

#### `packages/spf/src/playback/behaviors/dom/setup-sourcebuffer.ts`

**Shape**: simple (single `effect`, plus computeds; no factory)

**Axis findings**:
- A: Track types are derived from the presentation rather than hardcoded (setup-sourcebuffer.ts:91-97) — audio-only and video-only handled. `MediaTrackType = 'video' | 'audio'` (setup-sourcebuffer.ts:14) — adding more bufferable types would force a rewrite.
- B: All buffers created synchronously between `addSourceBuffer` calls (setup-sourcebuffer.ts:128-136) — comment explains the Firefox bug being avoided (setup-sourcebuffer.ts:60-65). State commit is per-iteration, not batched.
- C: `canSetupSignal` / `shouldSetupSignal` (setup-sourcebuffer.ts:100-117) — same flag-shaped FSM pattern as `setup-mediasource.ts:57, 61` and `quality-switching.ts:109-110`.
- D: Computeds re-snapshot full state inside their bodies (setup-sourcebuffer.ts:103-107, 121-126) — the same `s` shape is built twice.

**Convention findings**:
- Multiple writes to `context.videoBuffer` / `audioBuffer` / `videoBufferActor` / `audioBufferActor` (setup-sourcebuffer.ts:84-87, 134-135) — single-writer per behavior; `setupSourceBuffers` is the canonical owner of these slots.

**Code sniffs**:
- fight-the-shape: `if (!canSetupSignal.get() || !shouldSetupSignal.get()) return;` (setup-sourcebuffer.ts:120) — same flag-shaped FSM-in-an-effect as `setup-mediasource.ts`.

#### `packages/spf/src/playback/behaviors/dom/setup-text-track-actors.ts`

**Shape**: simple (single `effect`; resource-owning)

**Axis findings**:
- A: Cue parser injected via `config.resolveTextTrackSegment` (setup-text-track-actors.ts:33-35, 76) — extensible to new cue formats without rewrite.
- B: Cleanup destroys actors and clears the slots (setup-text-track-actors.ts:80-85) — actor lifecycle bound to behavior teardown; matches behaviors.md "Behaviors that own an Actor without disposing it in cleanup. Always a leak."
- C: Subscribes to a `computed` projection of `mediaElement` rather than the full context signal (setup-text-track-actors.ts:69-72) — avoids self-trigger from writing other context slots; comment explains (setup-text-track-actors.ts:46-49).

**Convention findings**:
- `mediaElement: ReadonlySignal<...>`, `textTracksActor: Signal<...>`, `segmentLoaderActor: Signal<...>` (setup-text-track-actors.ts:62-66) — single owner of those two context slots.
- `stateKeys: []` (setup-text-track-actors.ts:90) — context-only behavior; no `Pick` from a state interface is needed.

#### `packages/spf/src/playback/behaviors/dom/sync-text-tracks.ts`

**Shape**: primitive-augmented (factory: `createMachineReactor`)

**Axis findings**:
- B: Settling-window guard via `setTimeout(0)` (sync-text-tracks.ts:143-145) and a `change`-listener that re-applies modes if it fires inside the window (sync-text-tracks.ts:147-156) — bespoke timing-based defense against browser auto-selection.
- B: `effects` cleanup uses `clearTimeout(syncTimeout ?? undefined)` and `unlisten()` (sync-text-tracks.ts:173-176) — manual ordering; `entry`'s cleanup runs separately (sync-text-tracks.ts:127-132).
- C: `computed` with a hand-rolled `equals` for arrays (sync-text-tracks.ts:95-109) — TODO at sync-text-tracks.ts:96 suggests "make generic and abstract away for `Array<T> | undefined`" — recurring shape, not covered by signals.md.
- D: Two-state machine (`'preconditions-unmet'` and `'set-up'`) (sync-text-tracks.ts:113-181) — entry creates DOM, exit cleans up; minimal but the `effects` body has both mode-sync and the change listener.

**Convention findings**:
- `selectedTextTrackId: Signal<...>` (sync-text-tracks.ts:90) — the behavior writes it (DOM-driven write back to model); paired with `selectTextTrack`/`syncTextTracks` writes — multi-writer not in the documented "intent + default" / "pipeline" / "two-way DOM sync" list (signals.md:46-49) but matches "two-way DOM sync."
- `entry`'s body is "automatically untracked" — comment notes it (sync-text-tracks.ts:122-123); `effects` uses explicit `untrack(() => mediaElementSignal.get())` (sync-text-tracks.ts:139, 154, 166).

**Code sniffs**:
- fix-in-place: `clearTimeout(syncTimeout ?? undefined)` (sync-text-tracks.ts:174) — `?? undefined` is a no-op since `syncTimeout` is already `... | undefined`.

#### `packages/spf/src/playback/behaviors/dom/track-current-time.ts`

**Shape**: simple (single `effect`)

**Axis findings**:
- B: `lastMediaElement` and `removeListeners` are closure-captured imperative bookkeeping (track-current-time.ts:52-53, 60-62) — manually tracking element identity to avoid double-binding.
- D: Cleanup composed manually as `() => { removeListeners?.(); cleanupEffect(); }` (track-current-time.ts:80-83) — listeners are attached outside the effect and torn down manually rather than via the effect's cleanup return.

**Convention findings**:
- `state.currentTime: Signal<...>`, `context.mediaElement: ReadonlySignal<...>` (track-current-time.ts:49-50) — clean.

**Code sniffs**:
- fight-the-shape: `effect()` doing imperative `addEventListener` plumbing for events that drive a signal (track-current-time.ts:55-78) — behaviors.md "fight the shape" lists this exact pattern.

#### `packages/spf/src/playback/behaviors/dom/track-playback-initiated.ts`

**Shape**: primitive-augmented (factory: `createMachineReactor`)

**Axis findings**:
- C: Same `deriveState` + `monitor: () => derivedStateSignal.get()` pattern as `resolve-presentation.ts` and `load-text-track-cues.ts` (track-playback-initiated.ts:39-46, 73, 79).
- D: Three states (track-playback-initiated.ts:80-110) for "watch element + URL while playback active" — `effects` reads two signals to track them and returns a single cleanup.

**Convention findings**:
- `state.playbackInitiated: Signal<...>`; `state.presentation: ReadonlySignal<...>`; `context.mediaElement: ReadonlySignal<...>` (track-playback-initiated.ts:67-71) — clean.
- Two writes to `playbackInitiated` (track-playback-initiated.ts:88, 90, 108) — entry sets to `!el.paused`; exit cleanup sets to `false`. Single behavior owns the slot.

#### `packages/spf/src/playback/behaviors/dom/track-playback-rate.ts`

**Shape**: simple (single `effect`)

**Axis findings**:
- (nothing notable beyond conformance)

**Convention findings**:
- `state.playbackRate: Signal<...>`, `context.mediaElement: ReadonlySignal<...>` (track-playback-rate.ts:33-34) — clean.
- `canTrackPlaybackRate` computed (track-playback-rate.ts:37) — single-line predicate read once.

**Code sniffs**:
- fix-in-place: `canTrackPlaybackRate` computed wraps a one-line truthiness check used once (track-playback-rate.ts:36-37, 40) — adds a layer with no observable benefit.
- fight-the-shape: imperative `addEventListener` for an event that drives a signal (track-playback-rate.ts:42-47) — same pattern as `track-current-time.ts:72-73` and `sync-text-tracks.ts:171`.

#### `packages/spf/src/playback/behaviors/dom/update-duration.ts`

**Shape**: simple (single `effect` with async-fork; no factory)

**Axis findings**:
- B: `running` and `destroyed` flags (update-duration.ts:110-111, 117, 120, 128, 142, 147) protect against re-entry and post-destroy writes — comment explains the race (update-duration.ts:122-128).
- B: `Number.isNaN(mediaSource.duration)` as a "has not been set yet" gate (update-duration.ts:67-71) — comment explicitly warns that re-syncing races with `loadSegmentsTask`.
- C: `can*`/`should*` exported helpers (update-duration.ts:22-71) — same pattern as `end-of-stream.ts` and `calculate-presentation-duration.ts`.
- D: Manual `running`/`destroyed` flags + `.finally(() => running = false)` (update-duration.ts:117, 120, 142) — matches behaviors.md "Body manually serializes work via flags... `createTransitionActor` — Actor message handling already serializes."

**Convention findings**:
- All slots `ReadonlySignal<...>` (update-duration.ts:101-108) — zero writes; effect mutates `mediaSource.duration` directly (update-duration.ts:139), bypassing the signal graph (the slot `mediaSourceReadyState` is mirrored to keep the dependency tracked).

**Code sniffs**:
- fight-the-shape: `running` flag as a job lock (update-duration.ts:111, 117, 120, 142) — behaviors.md sniff "Body manually serializes work via flags (`isLoading`, `pending`, `inFlight`)" → `createTransitionActor`.
- no-good-fit-yet: `waitForSourceBuffersReady` (update-duration.ts:79-91) using `addEventListener('updateend')` — same shape as `end-of-stream.ts:170-200` but using DOM events vs actor snapshot, **inconsistent across files solving the same problem**.

### Cross-cutting

#### Recurring patterns

- **`deriveState` + `monitor: () => derivedStateSignal.get()`** as the canonical machine-reactor wiring (resolve-presentation.ts:60-65, 88; load-text-track-cues.ts:75-90, 131; track-playback-initiated.ts:39-46, 73, 79; sync-text-tracks.ts:111-115). Convention not in `behaviors.md`.
- **Exported `can*` / `should*` / `is*` predicate helpers** taking `(state, context)` or `(state)` (calculate-presentation-duration.ts:17-40; end-of-stream.ts:78-163; update-duration.ts:22-71; resolve-presentation.ts:30-47). Convention not in `behaviors.md`.
- **Per-type specialization with a typed `setupX` helper** at module scope (resolve-track.ts:86-134, 145-178; select-tracks.ts:39-50, 64-112; load-segments.ts:260-379, 400-426). Documented in behaviors.md as the chosen compromise; the specific shape (helper + key + variant fn + per-export `defineBehavior`) is the same across all three but not codified beyond the conventions doc's narrative.
- **Hand-rolled flag-shaped FSM in an `effect` body**: `canSetup`/`shouldSetup` computeds gating an effect (setup-mediasource.ts:57, 61, 66; setup-sourcebuffer.ts:100, 115, 119); job-lock flags (update-duration.ts:111, 117, 120; end-of-stream.ts:292-308; quality-switching.ts:109-110, 138). All match the "fight-the-shape" sniffs in behaviors.md.
- **Imperative `addEventListener` plumbing for events that drive signals**: `listen(...)` inside an effect body, with manual cleanup (track-current-time.ts:72-77; track-playback-rate.ts:42-47; sync-text-tracks.ts:171; track-playback-initiated.ts:89-91). Behaviors.md "fight the shape" sniff.
- **`computed` that wraps a single `signal.get()`** with no other logic (sync-preload-attribute.ts:39; setup-mediasource.ts:53, 60; track-playback-rate.ts:36; setup-text-track-actors.ts:69; track-playback-initiated.ts:74-75; sync-text-tracks.ts:94, 110). No semantic effect; pattern is uniform but unmotivated by signals.md.
- **`snapshot(state)`/`snapshot(context)` then operating on plain objects in helper functions** (calculate-presentation-duration.ts:78; quality-switching.ts:113; end-of-stream.ts:290, 296; track-playback-initiated.ts:73; load-text-track-cues.ts:125; resolve-presentation.ts:88; update-duration.ts:114-115). The pure-functions-take-snapshot pattern is consistent.
- **`waitFor*` helpers returning `Promise<void>` driven by either DOM events or actor snapshots** (end-of-stream.ts:170-200 via `effect()` over actor snapshots; update-duration.ts:79-91 via `addEventListener('updateend')`). Solve the same problem two different ways.

#### Conventions doc gaps

- **`deriveState`/`monitor` shape** for `createMachineReactor` is not documented in `behaviors.md` despite being the recurring pattern in 4 of 5 reactor-using behaviors. The conventions doc names `createMachineReactor` as the target but does not show the canonical "exported `deriveState` + `monitor` reading a single computed" structure.
- **Exported `can*`/`should*`/`is*` predicate helpers** colocated with behaviors are widespread (4 files) but not classified in behaviors.md "Helpers and behavior factories" — the doc covers helpers operating on already-resolved values inside a body, but not exported predicate helpers used by external tests/composition.
- **`computed` with a custom `equals` function** for arrays (sync-text-tracks.ts:95-109, with an inline TODO suggesting a reusable abstraction) — signals.md "Follow-ups" mentions "computed best practices" but no current guidance.
- **Local-signal-as-private-state inside a behavior body**, bridged back to engine state via a callback (load-segments.ts:270-278, 287-309) — a private parallel signal not in the composition's signal map; signals.md anti-patterns mention parallel-state-for-actor-snapshot but not this private-mirror-then-callback bridge.
- **Manual cleanup composition** vs. `AbortController` is uneven: CLAUDE.md/behaviors.md prescribes `AbortController` for multiple cleanups, but most multi-cleanup behaviors compose `() => { x(); y(); }` manually (resolve-track.ts:130-133; track-current-time.ts:80-83; load-segments.ts:374-378; setup-mediasource.ts:90-93; update-duration.ts:146-149). Only setup-mediasource.ts uses `AbortController` and it's for a single signal-based cleanup.
- **Multi-writer slot not on the documented list**: `selectedTextTrackId` is written by `selectTextTrack` (select-tracks.ts:48), `syncTextTracks` (sync-text-tracks.ts:131, 168). This is a "two-way DOM sync" + "intent + default" hybrid — fits signals.md:46-49 generously but isn't called out in the writer-audit examples.
- **Async-task-inside-`effect` with re-entry guard flag** (end-of-stream.ts:292-310; update-duration.ts:110-145) — neither matches `Task + Runner` (no scheduling) nor an Actor (no message inbox); the shape is recurrent enough that "no good fit yet" applies, but behaviors.md doesn't list "single-shot async work gated by a derived condition" as a known unfit shape.

#### Cross-file inconsistencies

- **"Wait for SourceBuffers to be idle" implemented twice with different mechanisms**: `end-of-stream.ts:170-200` uses `effect()` over the actor's `snapshot.value !== 'updating'`; `update-duration.ts:79-91` uses `addEventListener('updateend')` on the raw `SourceBuffer.updating` boolean. Same problem, two abstractions (signal-based vs DOM-event-based).
- **Cleanup composition** — `AbortController` used in `setup-mediasource.ts:50, 91`; manual `() => { a(); b(); }` in `resolve-track.ts:130-133`, `track-current-time.ts:80-83`, `load-segments.ts:374-378`, `update-duration.ts:146-149`. Behaviors.md prescribes `AbortController` for multi-cleanup; behaviors don't follow it consistently.
- **`computed`-wrap of a single `.get()`** is applied unevenly: `sync-preload-attribute.ts:39` wraps `context.mediaElement` but `track-current-time.ts:56` reads it directly. No discernible rule.
- **Per-type specialization helper signature** is consistent in `select-tracks.ts` and `resolve-track.ts` (helper takes `state`, `selectedKey`, variant fn) but `load-segments.ts:260-265` uses a slightly different shape (helper takes `state`, `context`, `type`, `onThroughputSample`) — track type rather than key, plus an extra callback. The "shared via a typed helper" pattern is recognizable but not a consistent signature.
- **`monitor` body** is uniformly a one-liner reading a `derivedStateSignal` *except* `sync-text-tracks.ts:115`, which writes the literal mapping inline (`preconditionsMetSignal.get() ? 'set-up' : 'preconditions-unmet'`). Both work; only one matches the recurring `deriveState` shape.
- **State slot with multiple writers** is annotated `Signal<...>` in both writers (quality-switching.ts:96, select-tracks.ts:37 for `selectedVideoTrackId`/`selectedTextTrackId`; sync-text-tracks.ts:90 for `selectedTextTrackId`) — correct per signals.md, but tracking is implicit.

## Media

`packages/spf/src/media/` — DOM-free / signal-free except for `media/dom/` subdirs. Behaviors and signals conventions docs do not strongly apply; findings are anchored on axes and CLAUDE.md general code rules.

### Per-file findings

#### `packages/spf/src/media/abr/bandwidth-estimator.ts`

**Purpose**: Dual-EWMA bandwidth estimator producing `min(fast, slow)` bandwidth estimate.

**Axis findings**:
- A: Estimator is bandwidth-only — no rendition/track-type tagging on samples; a single shared state combines all downloads regardless of whether they're audio, video, or text segments (bandwidth-estimator.ts:23-34, bandwidth-estimator.ts:85-123). Multi-bitrate audio (audio ABR) on the pressure list shares the same estimator state with video.
- D: Pure functional shape — state-in/state-out, no class machinery (bandwidth-estimator.ts:85-123).

**Repo-rule findings**:
- Rich JSDoc with `@param`, `@returns`, `@example` on internal (non-API-reference) helpers (bandwidth-estimator.ts:65-83, 125-141, 163-176) — exceeds the "minimal JSDoc" rule for non-public-API exports.

**Notable assumptions**:
- Single global estimator state; no per-track-type partitioning (bandwidth-estimator.ts:23-34) — touches axis A pressure list (audio ABR).
- Constants `8000`, `1000` inline in conversion math (bandwidth-estimator.ts:110, 114).

#### `packages/spf/src/media/abr/ewma.ts`

**Purpose**: Pure functional EWMA primitives (alpha, weighted average, zero-factor correction).

**Repo-rule findings**:
- `@param`/`@returns`/`@example` on every export (ewma.ts:8-23, 26-43, 49-67) — non-API-reference exports go above minimal-JSDoc.

#### `packages/spf/src/media/abr/quality-selection.ts`

**Purpose**: Bandwidth-driven track selector with safety-margin / resolution tiebreak.

**Axis findings**:
- A: Hardcoded to `PartiallyResolvedVideoTrack` — signature locks selection to video tracks only (quality-selection.ts:13, 58-62). Audio ABR (pressure list) requires a different track type; no generic `Track`-shaped overload exists.
- A: Resolution tiebreak baked in (quality-selection.ts:80-86, 102-106) — irrelevant for audio quality selection (which would tiebreak on bitrate / channels).
- A: Consumer cannot cap by max resolution — Mux 1080p+ resolution cap pressure-list item is not exposed via config (quality-selection.ts:18-25).
- D: `selectQuality` does a sort followed by a linear scan + assignment to find the last matching element (quality-selection.ts:67-92).

**Repo-rule findings**:
- Verbose JSDoc with multiple `@example` blocks (quality-selection.ts:35-58, 94-101).

**Notable assumptions**:
- Video-only selection (quality-selection.ts:58-62) — touches axis A pressure list (multi-bitrate audio).
- 1080p cap not configurable (quality-selection.ts:18-25) — touches axis A pressure list (Mux platform).

#### `packages/spf/src/media/buffer/back-buffer.ts`

**Purpose**: Compute back-buffer flush point by "keep N segments behind currentTime."

**Axis findings**:
- A: Strategy is segment-count-based; no time-based or memory-pressure-based variant (back-buffer.ts:13-19, 56-91). Mux buffer-stall recovery / quota-pressure scenarios on the pressure list have no swappable interface.
- B: `segments` parameter is documented as "should be sorted by startTime" (back-buffer.ts:42) but the function does not sort or assert — silent breakage if caller passes unsorted.
- D: Five branching returns in a single body (back-buffer.ts:61-91).

#### `packages/spf/src/media/buffer/forward-buffer.ts`

**Purpose**: Forward-buffer "what to load" + "what to flush ahead of position" calculators.

**Axis findings**:
- A: `getSegmentsToLoad` keys "is this position buffered" by `segment.startTime` only (forward-buffer.ts:108-122). Comment at forward-buffer.ts:107-108 explicitly notes this won't work for quality switches; no path to extend without rewriting.
- B: `Math.min(...beyond.map(seg => seg.startTime))` (forward-buffer.ts:89) — for very large buffer arrays, spread of large maps risks call-stack issues; correctness aside, an assumed-small-array invariant is implicit.
- D: Two top-level functions with overlapping config types in same file; one (`calculateForwardFlushPoint`) has its JSDoc placed between two unrelated functions, attached to the wrong block (forward-buffer.ts:51-73 vs 92).

**Repo-rule findings**:
- Doubled/orphaned JSDoc — the `getSegmentsToLoad` doc at forward-buffer.ts:28-50 is followed by a second JSDoc block (forward-buffer.ts:51-73) that documents `calculateForwardFlushPoint` instead, then `calculateForwardFlushPoint` is defined first (forward-buffer.ts:74) — function-doc order doesn't match.

**Notable assumptions**:
- Single SourceBuffer model; flushing decisions don't account for differing buffered ranges per video/audio buffer (forward-buffer.ts:74-90) — touches axis A pressure list (audio-only / multi-buffer).

#### `packages/spf/src/media/dom/mse/append-segment.ts`

**Purpose**: Serialize SourceBuffer appends (full buffer or chunked stream), with abort-aware partial cleanup.

**Axis findings**:
- A: No pre-append wait hook — pre-append DRM key handshake gating (pressure-list item) has no insertion point; appends happen unconditionally as soon as `updating` clears (append-segment.ts:60-69, 90-91).
- A: No `timestampOffset` / `appendWindowStart`/`End` configuration — instant clips / non-zero PTS pressure-list item not addressable here without changing signature (append-segment.ts:22).
- B: `updateend` listener at append-segment.ts:62-68 has no `error` listener — if the SourceBuffer errors while waiting, the promise never resolves (deadlock). The second phase (append-segment.ts:71-96) does add `error`, but the gating wait does not.
- B: `sourceBuffer.abort()` swallowed in nested `try/catch` (append-segment.ts:48-54) — comment explains "thrown if MS not open"; passes silently regardless of the actual cause.

**Repo-rule findings**:
- Manual event listener add/remove (append-segment.ts:62-68, 73-89) instead of `AbortController` + `signal` pattern from CLAUDE.md "Cleanup Pattern".
- DOMException instance-of + name compare (append-segment.ts:48) instead of a guard helper.

#### `packages/spf/src/media/dom/mse/buffer-flusher.ts`

**Purpose**: Wait-for-`updating`, then `remove(start, end)`, await `updateend`.

**Axis findings**:
- B: Pre-remove wait (buffer-flusher.ts:23-31) lacks `error` listener — same deadlock pattern as `appendSegment`'s wait phase.

**Repo-rule findings**:
- Same manual listener add/remove (buffer-flusher.ts:24-31, 34-50) duplicates the wait-for-updateend logic from `append-segment.ts`. Two separate copies of "wait until SourceBuffer is not updating."
- Verbose JSDoc with `@param`/`@returns`/`@example` for non-public utility (buffer-flusher.ts:7-20).

#### `packages/spf/src/media/dom/mse/mediasource-setup.ts`

**Purpose**: MediaSource / ManagedMediaSource creation, attach/detach, source-buffer creation, `isTypeSupported` check, ready-state observer.

**Axis findings**:
- A: `createSourceBuffer` requires `mimeCodec` string up-front (mediasource-setup.ts:129-139) — no path for codec capability detection feedback (HEVC, 5.1) before commit; consumer must pre-check.
- A: `attachMediaSource`'s ManagedMediaSource branch hardcodes `disableRemotePlayback = true` (mediasource-setup.ts:92) — opinionated AirPlay/remote-playback policy with no opt-out; conflicts with FairPlay/AirPlay path on pressure list.
- B: `detach` path calls `mediaElement.load()` (mediasource-setup.ts:99, 111) — synchronous element reset that races with any in-flight network/append work; teardown ordering responsibility shifts to caller.
- B: `onMediaSourceReadyStateChange` returns `void` (mediasource-setup.ts:178-188) — caller-only cleanup via abortSignal; no return-value to chain into broader cleanup.
- D: Three type casts on `mediaElement` for `disableRemotePlayback`/`srcObject` (mediasource-setup.ts:92, 95, 98).

**Repo-rule findings**:
- Type cast `(mediaElement as HTMLMediaElement & { srcObject: ... })` (mediasource-setup.ts:95, 98) — `srcObject` is on `HTMLMediaElement` in lib.dom and these casts add no value; CLAUDE.md "No Pointless Type Casts."
- Non-null assertion on `ManagedMediaSource!` (mediasource-setup.ts:49, 87) — relies on the `.d.ts` typing it as `... | undefined`; pattern inconsistent with the `supportsManagedMediaSource()` guard immediately preceding.

**Notable assumptions**:
- ManagedMediaSource availability checked once via `typeof` (mediasource-setup.ts:21-23); no caching or capability snapshot.

#### `packages/spf/src/media/dom/mse/mediasource.d.ts`

**Purpose**: Ambient types for ManagedMediaSource. (Trivial; no findings.)

#### `packages/spf/src/media/dom/text/resolve-vtt-segment.ts`

**Purpose**: Singleton-dummy-video-element VTT parser using browser-native `<track>`.

**Axis findings**:
- A: Singleton `dummyVideo` (resolve-vtt-segment.ts:9-20) — module-level state means concurrent `resolveVttSegment` calls share one element. Implicit single-resolver-at-a-time assumption; no queue.
- B: Multiple in-flight `resolveVttSegment` calls share one `<video>` element and re-mount/unmount `<track>` children (resolve-vtt-segment.ts:54, 59) — race conditions on `track.track.cues` between concurrent calls (which `<track>`'s load fired? `default = true` is set on every track).
- B: Track `error` event resolves nothing (resolve-vtt-segment.ts:46-49) — `track.error` does not fire on track elements in all browsers; under-detection of failure.
- D: `destroyVttResolver` at resolve-vtt-segment.ts:64-66 does not remove DOM children, just nulls the module reference — the previous `<video>` element is GC'd only when no `<track>`s remain attached.

**Repo-rule findings**:
- Loop with index access then null-check (resolve-vtt-segment.ts:33-39).

**Notable assumptions**:
- VTT delivered as a fetchable URL (no inline-parsed text path) (resolve-vtt-segment.ts:22-27) — LL-HLS partial-segment / blob delivery may not fit this signature.
- `track.crossOrigin = 'anonymous'` hardcoded (resolve-vtt-segment.ts:17) — no opt-in for credentialed VTT.

#### `packages/spf/src/media/hls/parse-attributes.ts`

**Purpose**: Tag/attribute-list parser primitives (regex-based) plus `AttributeList` typed accessor.

**Axis findings**:
- A: `parseCodecs` recognizes only `avc1.`, `hvc1.`, `hev1.`, `mp4a.` prefixes (parse-attributes.ts:65-78) — HEVC capability detection is partly here but no Dolby Vision (`dvh1`/`dvhe`), AV1 (`av01`), or 5.1 codec strings; pressure-list `codec capability detection` item does not extend without modification.
- A: `parseFrameRate` only handles three NTSC fractional rates (parse-attributes.ts:42-51) — anything else is rounded to integer, losing precision.
- D: `AttributeList` interface (parse-attributes.ts:117-124) is defined as a wide object literal then rebuilt in `createAttributeList` (parse-attributes.ts:129-167) — interface and implementation duplicate the shape.

**Repo-rule findings**:
- `AttributeList` `getInt(key, defaultValue?)` etc. (parse-attributes.ts:119-121, 137-149) — return type `number | undefined`, but signature documents fallback via `defaultValue`. Three near-identical accessor methods.

#### `packages/spf/src/media/hls/parse-media-playlist.ts`

**Purpose**: Parse media playlist text → resolved track with segments, init segment, byte ranges.

**Axis findings**:
- A: Live / DVR / LL-HLS unsupported — `#EXT-X-ENDLIST` is silently consumed (parse-media-playlist.ts:98-100); no signaling that the playlist is complete vs. live. Pressure-list `live/DVR sliding window` and `LL-HLS` items both invisible to caller.
- A: Skipped tags (parse-media-playlist.ts:62-70) — `EXT-X-PLAYLIST-TYPE`, `EXT-X-TARGETDURATION` are dropped on the floor; `MediaPlaylistInfo` type (types/index.ts:308-316) anticipates them but parser doesn't surface them.
- A: No `EXT-X-DISCONTINUITY` / `EXT-X-PROGRAM-DATE-TIME` / `EXT-X-KEY` / `EXT-X-MAP[KEYFORMAT]` handling — instant-clips PTS / DRM key gating / multi-period pressure-list items absent.
- B: Branch at parse-media-playlist.ts:103 only emits a segment when `currentDuration > 0` — a `0`-duration `#EXTINF` (LL-HLS partial) silently drops the URL line.
- D: Returned shape contains `as unknown as ResolveTrack<T>` cast (parse-media-playlist.ts:145).

**Repo-rule findings**:
- `as unknown as` double cast (parse-media-playlist.ts:145) — CLAUDE.md "No Pointless Type Casts" / type-safety.
- `ResolveTrack` helper named per Resolve* convention (parse-media-playlist.ts:14-23) — conforms.

**Notable assumptions**:
- Init segment optional only for `text` tracks (parse-media-playlist.ts:130-135) — for audio/video tracks without `EXT-X-MAP` (TS / fMP4-without-init combos), assumes one or the empty-string fallback.

#### `packages/spf/src/media/hls/parse-multivariant.ts`

**Purpose**: Parse multivariant playlist → `Presentation` with partially-resolved video / audio / text tracks.

**Axis findings**:
- A: Single-pass classification by codec presence; an audio-only stream is detected only when `CODECS` string parses cleanly to mp4a-only (parse-multivariant.ts:153-176). Audio-only with no `CODECS` falls into video bucket (parse-multivariant.ts:154-158). Pressure-list `audio-only` item.
- A: No `EXT-X-SESSION-KEY`, no DRM tag handling — pressure-list DRM item.
- A: No `EXT-X-CONTENT-STEERING` / multi-CDN failover — pressure-list multi-CDN item; only the single STREAM-INF URI line is captured (parse-multivariant.ts:138-145).
- A: `EXT-X-MEDIA:TYPE=CLOSED-CAPTIONS` ignored (parse-multivariant.ts:88-122 only branches `AUDIO` and `SUBTITLES`).
- A: Hardcoded mime/codec/sample-rate/channel defaults: `video/mp4` (parse-multivariant.ts:188), `audio/mp4` (parse-multivariant.ts:220, 252), `sampleRate: 48000`, `channels: 2` (parse-multivariant.ts:224-225, 254-255). Multi-language / multi-bitrate / 5.1 audio (pressure-list items) all start from these defaults.
- D: Three `interface` declarations (`StreamInfo`, `AudioRenditionInfo`, `SubtitleRenditionInfo`) defined inside the function body (parse-multivariant.ts:36-62) — local types.
- D: Selection-set assembly is three near-identical blocks (parse-multivariant.ts:312-358).

**Repo-rule findings**:
- `as const` on every track-type literal (parse-multivariant.ts:184, 217, 250, 283).
- `||` for `groupId` fallback (parse-multivariant.ts:223) accepts empty string as falsy; `??` would treat only nullish.
- Inline types with `| undefined` on optional fields (parse-multivariant.ts:39-43, 47-52, 56-62) — repeats `?:` + `| undefined`, doubled optionality.
- `getInt('BANDWIDTH', 0)!` (parse-multivariant.ts:129) — non-null assertion on a value the helper still types as `| undefined` even with `defaultValue`; type-system gap leaks here.

**Notable assumptions**:
- Multi-language audio: all renditions get `name: 'Default'` if from audio-only stream (parse-multivariant.ts:223).
- BCP-47 / language preference logic absent from parser; deferred to selector.
- `default: true` for text only when `DEFAULT && AUTOSELECT` (parse-multivariant.ts:296) — comment cites hls.js parity. Audio rendition uses raw `DEFAULT` (parse-multivariant.ts:265-267) — inconsistency between text and audio.

#### `packages/spf/src/media/hls/resolve-url.ts`

**Purpose**: Resolve relative URL via WHATWG `URL` constructor. (One-line wrapper; no findings.)

#### `packages/spf/src/media/primitives/select-tracks.ts`

**Purpose**: Pure selection helpers (`pickVideoTrack` / `pickAudioTrack` / `pickTextTrack`) plus capability/should-select predicates over a `TrackSelectionState` shape.

**Axis findings**:
- A: `pickVideoTrack` always reads `switchingSets[0]` (select-tracks.ts:132) with the comment "HLS typically has one switching set per type" — multi-period / DASH / HLS with multiple groups would silently drop renditions.
- A: `pickVideoTrack`'s ABR uses **initial** bandwidth only (select-tracks.ts:137-141) — comment in `shouldSelectTrack` (select-tracks.ts:262-264) flags "@TODO figure out reactive model for ABR cases".
- A: `pickAudioTrack` selects by language → first-default → first (select-tracks.ts:158-189). No multi-bitrate audio (pressure-list) — picks track id without bitrate input.
- B: `pickTextTrack` always returns `undefined` if no `enableDefaultTrack` and no language preference (select-tracks.ts:213-234) — explicit no-auto by design, but the same shape blocks resilience patterns where the text actor wants any track on null preference.
- D: Three near-identical `pickXTrack` shapes (select-tracks.ts:124-189, 205-234) — find-by-language → find-by-default → fallback; no shared helper.
- D: `as any` cast in `selectQuality` call (select-tracks.ts:141) and in `getSelectedTrack` (track-selection.ts:71, 64).

**Repo-rule findings**:
- `as any` (select-tracks.ts:141) — CLAUDE.md "Type Safety First / Avoid `any`."
- `TrackSelectionState` redefined in two files (select-tracks.ts:20-25 and track-selection.ts:16-21) — same shape duplicated.
- `TrackSelectionContext = Record<string, never>` reserved-for-future (select-tracks.ts:31) and unused `TrackSelectionAction` (select-tracks.ts:37) — speculative scaffolding; CLAUDE.md "don't gold-plate."
- `@TODO` inline (select-tracks.ts:262) signed `(CJP)`.

**Notable assumptions**:
- One switching-set per selection-set (select-tracks.ts:132, 166, 209) — multi-period / multi-group pressure for live, multi-CDN.
- `pickVideoTrack` uses single shared `DEFAULT_INITIAL_BANDWIDTH` constant (select-tracks.ts:11-15) regardless of network class.

#### `packages/spf/src/media/types/index.ts`

**Purpose**: HAM-shaped types: `Presentation`, `SelectionSet`, `SwitchingSet`, `Track` variants, `Segment`, type guards.

**Axis findings**:
- A: `Track` type unions video/audio/text via discriminated `type` (types/index.ts:124-175); no carrier for DRM/key info, no `language` mandatory on audio (it's `?:`), no `channels` count nuance. Pressure-list multi-language / DRM / 5.1.
- A: `MediaPlaylistInfo` (types/index.ts:307-316) is defined but unused by the actual parser (`parseMediaPlaylist` returns a track shape directly) — dead-or-future type.
- A: `Presentation` is single-period (types/index.ts:329-333; comment at types/index.ts:121-123 says "always 0 (for future multi-period support)" but no period type exists).
- D: `MaybeResolvedPresentation` (types/index.ts:344) and `Presentation` overlap; comments at types/index.ts:336-343 explain the lifecycle.
- E: Discriminated unions for tracks, switching sets, selection sets (types/index.ts:212-220, 232-256, 264-288) — each layer of generic helper types adds shape.

**Repo-rule findings**:
- `isResolvedTrack` overload (types/index.ts:354-360) — overload set + single implementation; conforms to type-guard convention.
- Doubled JSDoc above `Track` type (types/index.ts:117-124) — two adjacent comment blocks for one declaration.

**Notable assumptions**:
- `Segment` has no `discontinuity`, `programDateTime`, `key`, or `partial` flag (types/index.ts:298) — all relevant for live/LL-HLS/DRM pressure-list items.
- `VideoTrack.audioGroupId` (types/index.ts:148) baked into video track — implies HLS's audio group model is the canonical one.

#### `packages/spf/src/media/utils/track-selection.ts`

**Purpose**: State helpers (`SelectedTrackIdKeyByType`, `BufferKeyByType`, `getSelectedTrack`).

**Axis findings**:
- A: `BufferKeyByType` only has `video` and `audio` keys (track-selection.ts:36-39) — implicit "two-buffer model"; text never has a SourceBuffer (correct), but DRM key-handshake / per-rendition SB / instant-clip second-SB scenarios are not modeled.
- D: `getSelectedTrack` body assumes `switchingSets[0]` (track-selection.ts:71) — same one-switching-set assumption as `select-tracks.ts`.
- D: Triple-nested conditional return type (track-selection.ts:54-61) and `as any` return cast (track-selection.ts:64, 71).

**Repo-rule findings**:
- `as any` twice (track-selection.ts:64, 71) — CLAUDE.md "Avoid `any`."
- `TrackSelectionState` redefined (track-selection.ts:16-21) duplicating `select-tracks.ts:20-25` — same name, same shape, two files.

## Network

`packages/spf/src/network/` — HTTP fetch + chunked-stream utilities; DOM-free, signal-free.

### Per-file findings

#### `packages/spf/src/network/chunked-stream-iterable.ts`

**Purpose**: Min-chunk-size adapter from `ReadableStream<Uint8Array>` to async iterable.

**Axis findings**:
- B: `try/finally` releases reader lock (chunked-stream-iterable.ts:31-48) — clean. No abort signal plumbed in; cancellation depends on caller cancelling the underlying stream.
- D: `concat` helper is local (chunked-stream-iterable.ts:52-57) — duplicated wherever else byte concat is needed in the package.

**Repo-rule findings**:
- Class with single iterator method + one `readonly` field (chunked-stream-iterable.ts:16-50).

**Notable assumptions**:
- No max-chunk-size cap (chunked-stream-iterable.ts:1) — unbounded `pending` accumulation if stream produces large bursts.
- No back-pressure-aware behavior — relies on `ReadableStream`'s default queuing.

#### `packages/spf/src/network/fetch.ts`

**Purpose**: `Resource`-shaped fetch with byte-range header, plus stream and full-buffer convenience wrappers.

**Axis findings**:
- A: No retry / back-off / multi-CDN failover hook (fetch.ts:54-70) — pressure-list `multi-CDN failover` and `playback token expiry (4xx)` items have no extension point; consumer-side retry only.
- A: No request hooks (auth header refresh, CMCD, query-param signing) (fetch.ts:54-70). Mux platform `playback token expiry` and Mux Data CMCD pressure-list items not addressable.
- A: No timeout handling — relies on RequestInit `signal`, no library-level timeout (fetch.ts:54-70).
- B: `fetchResolvable` does not check `response.ok` (fetch.ts:54-70) — 4xx/5xx returns Response normally. Caller must re-validate.
- B: `fetchResolvableStream`'s spread-conditional `...(minChunkSize !== undefined ? [{minChunkSize}] : [])` (fetch.ts:101) — works, but noisier than direct option-passing.
- D: `Resource` (fetch.ts:26-32) and media's `AddressableObject` (types/index.ts:24-30) are structurally identical — duplication noted in the JSDoc itself (fetch.ts:21-25). CLAUDE.md dependency rules disallow `network/` from importing media types.
- D: `getResponseText` (fetch.ts:117-119) — single-line proxy for `response.text()`, exists as an export.

**Repo-rule findings**:
- Three exports' JSDoc has multi-`@example`, `@param`, `@returns` (fetch.ts:34-53, 71-78, 104-115) — non-API-reference utilities.
- `fetchResolvableStream` is `async function*` returning `AsyncGenerator` — couples header-await with iteration in one function (fetch.ts:94-102).

**Notable assumptions**:
- All requests are `GET` (fetch.ts:64).
- `Resource.byteRange.end` is inclusive (per HTTP Range spec) — implicit; documented only via the ASCII Range header (fetch.ts:60).

## Cross-cutting (media + network)

### Recurring patterns

- **Manual SourceBuffer event listener add/remove** instead of `AbortController`+`signal`: append-segment.ts:62-68, 73-89; buffer-flusher.ts:24-31, 34-50. Three near-identical "wait for `updateend`" blocks across the two files.
- **`switchingSets[0]` access** (one-switching-set assumption): select-tracks.ts:132, 166, 209; track-selection.ts:71. Comment at select-tracks.ts:131 acknowledges it; `parse-multivariant.ts:312-358` produces only one switching set per type.
- **Hardcoded MIME / sample-rate / channel defaults**: parse-multivariant.ts:188 (`video/mp4`), parse-multivariant.ts:220, 252 (`audio/mp4`), parse-multivariant.ts:224-225, 254-255 (`48000` / `2`). Same defaults appear in audio-only and rendition branches.
- **`as any` for selection-result narrowing**: select-tracks.ts:141; track-selection.ts:64, 71.
- **Verbose JSDoc with `@param`/`@returns`/multi-`@example`** on internal utilities: bandwidth-estimator.ts:65-83 and many others; quality-selection.ts:35-58; ewma.ts:8-23; back-buffer.ts:28-55; forward-buffer.ts:28-50; buffer-flusher.ts:7-20; mediasource-setup.ts:36-43, 70-83; fetch.ts:34-53, 71-78. The "minimal JSDoc" rule applies to internal utilities; only API-reference exports get the rich form.
- **Skipped/dropped HLS tags**: parse-media-playlist.ts:62-70 and parse-multivariant.ts:80-87 enumerate "tags we skip" — `EXT-X-PLAYLIST-TYPE`, `EXT-X-TARGETDURATION`, `EXT-X-INDEPENDENT-SEGMENTS` parsed only enough to skip; pressure-list items (LL-HLS, live, DRM, content-steering) all live in skipped or unhandled tag space.

### Cross-file inconsistencies

- **Two `TrackSelectionState` interfaces, same name, same shape** in select-tracks.ts:20-25 and track-selection.ts:16-21.
- **Two byte-range `Resource` shapes**: fetch.ts:26-32 (`Resource`) and types/index.ts:24-30 (`AddressableObject`) — identical structure, intentionally separate per dependency rules; the duplication is explicit but unsoftened by any shared base in `@videojs/utils`.
- **Default-track-when-DEFAULT** semantics differ between text (parse-multivariant.ts:296: `DEFAULT && AUTOSELECT`) and audio (parse-multivariant.ts:265-267: `DEFAULT` alone) renditions in the same parser; comment cites hls.js parity for text, audio path doesn't.
- **`updateend` wait blocks** repeated in append-segment.ts:60-69 and buffer-flusher.ts:21-31; `appendChunk` and `flushBuffer` are structurally siblings.
- **JSDoc style varies** — some files have rich `@example`-laden blocks (bandwidth-estimator.ts), others have one-liners (resolve-url.ts:1-3); same package, no consistent rule applied.

### Assumption clusters

- **Video-only / two-buffer-only cluster** (audio-only and audio ABR pressure-list items): `BufferKeyByType` (track-selection.ts:36-39) names only video/audio; `selectQuality` typed for `PartiallyResolvedVideoTrack` only (quality-selection.ts:13, 58-62); `pickVideoTrack` does ABR but `pickAudioTrack` does not (select-tracks.ts:124-189); `parseMultivariantPlaylist` falls back to "video" when codecs absent (parse-multivariant.ts:154-158).
- **Single-CDN / single-URL cluster** (multi-CDN failover pressure-list item): `Resource` carries one URL (fetch.ts:26-32); `Track`/`AddressableObject` carry one URL (types/index.ts:24-30); `parseMultivariantPlaylist` captures one URI per stream (parse-multivariant.ts:138-145); no `EXT-X-CONTENT-STEERING`/alternate-URI handling; `fetchResolvable` has no rotation hook.
- **DRM-absent cluster** (DRM pressure-list item): no `EXT-X-KEY` / `EXT-X-SESSION-KEY` in either parser; `Track` has no `keyInfo` field (types/index.ts:124-175); no pre-append wait hook in `appendSegment`; no `Encrypted` event plumbed through `mediasource-setup.ts`.
- **VOD-only cluster** (live / DVR / LL-HLS pressure-list items): `parseMediaPlaylist` consumes `#EXT-X-ENDLIST` silently (parse-media-playlist.ts:98-100); no `MediaPlaylistInfo` `endList` propagation; no `targetDuration` exit; no partial / preload-hint / blocking-reload signal; `Presentation.duration` modeled as static (types/index.ts:329-333).
- **Single-period / single-switching-set cluster**: `Presentation.startTime` always 0 with a comment about "future multi-period support" (types/index.ts:121-123); selection helpers always read `switchingSets[0]` (select-tracks.ts:132, 166, 209; track-selection.ts:71); parser builds at most one switching set per type (parse-multivariant.ts:312-358).
- **Single-codec defaults cluster** (HEVC / 5.1 / Dolby pressure-list items): `parseCodecs` whitelists 4 prefixes (parse-attributes.ts:65-78); audio defaults sampleRate 48000 / channels 2 in two places (parse-multivariant.ts:224-225, 254-255); video defaults to `video/mp4` (parse-multivariant.ts:188).
- **Implicit-ordering cluster** (axis B): `appendSegment` waits on `updateend` without an `error` listener (append-segment.ts:60-69); same in `flushBuffer` (buffer-flusher.ts:23-31); `back-buffer.ts:42` documents pre-sorted input but doesn't enforce; `mediaElement.load()` in detach (mediasource-setup.ts:99, 111) races with caller-side cleanup.

## Source-reset audit (2026-05-07)

Lens addendum — re-grouping the per-file findings under the source-reset framing introduced in [`behaviors.md` → "Source-reset handling (playback-engine behaviors)"](../../../internal/design/spf/conventions/behaviors.md#source-reset-handling-playback-engine-behaviors). Citations stand from the per-file findings above; this section reorganizes them by category. Three categories: async work tied to source / state derived from source / resources owned per source.

### Likely src-reset gaps — state derived from source carried in closure-mutables

- `quality-switching.ts:109-110, 123-124, 138-139` — closure-flag FSM (`lastUpgradeTime`, `firstMeaningfulFire`) survives source resets. Re-creating the behavior resets them, but mid-engine source change does not. Quality-switching policy (last upgrade time, throttle window) leaks across sources.
- `end-of-stream.ts:292, 297-308` — `hasEnded` flag carried in closure state. Source change wouldn't reset it without explicit cleanup; could trigger spurious "ended" handling on a new source if not addressed.
- `update-duration.ts:110-111` — `running` and `destroyed` flags carry through source changes. The race comments document the per-task race; the source-reset case is structurally similar but distinct.
- `load-segments.ts:346-354` — `prevInputs` closure state holds the last-scheduled inputs identity. The equality check via `loadingInputsEq` filters re-fires but doesn't reset structurally on source identity change.

### Likely src-reset gaps — resources owned per source without state-machine binding

- `setup-mediasource.ts:50-93` — MediaSource owned via behavior. Cleanup uses `AbortController` for inner observers, but the resource lifecycle isn't structurally bound to a state-machine state. Source reset relies on the existing `canSetup` / `shouldSetup` flag-FSM dynamic.
- `setup-sourcebuffer.ts:84-87, 134-135` — buffer + buffer-actor slots owned via behavior. Same shape — manual lifecycle management, no source-identity state.
- `load-segments.ts:287-309` — actor lifecycle via `currentLoader` captured ref. Teardown is in the effect's cleanup which fires on signal changes, not necessarily source resets cleanly.

### Likely src-reset gaps — async work without source-bound cancellation

- `load-segments.ts` — segment-loader actor's in-flight work doesn't have an explicit abort-on-source-reset hook beyond what the actor's own lifecycle provides; the closure-state `prevInputs` filter is doing the work that a source-identity reactor state would do structurally.
- `load-text-track-cues.ts:144-145` — already uses `createMachineReactor`; verify the per-state effect's tasks abort on source reset (likely yes via the reactor's monitor reading presentation, but worth confirming when this behavior is touched).

### Resolved through reactor migration

- `resolve-track.ts` — full migration to source-identity reactor; src-reset handling structural via state-exit cleanup. Commit series ending `f707b0e9`. Canonical worked example.
- `resolve-presentation.ts:97-114` — already a reactor; entry returns `AbortController` for fetch cancellation. The pattern was already canonical pre-iteration.

### Likely OK as-is

- `sync-preload-attribute.ts` — single effect, no async work, no derived state. Source change flows through the signal naturally.
- `track-current-time.ts`, `track-playback-rate.ts` — DOM-event-driven; source change happens at the mediaElement level, not presentation. Closure state `lastMediaElement` (track-current-time.ts:52) tracks element identity, which is the right axis.
- `setup-text-track-actors.ts` — actors disposed in cleanup; no closure state across source changes.
- `track-playback-initiated.ts` — already a reactor; per-state effect re-binds listeners on state entry.
- `sync-text-tracks.ts` — already a reactor; entry creates DOM, exit cleans up.

### How to use this audit

When picking a behavior to refactor next, this section is the priority list. The "likely gaps" categories are ordered by ease of conversion to the source-identity reactor pattern: the `quality-switching` closure-FSM is simplest; `setup-mediasource` is the largest lift (resource ownership + multiple states + DOM event integration).

For each refactor, run the [source-reset checklist](../../../internal/design/spf/conventions/behaviors.md#source-reset-checklist) and confirm the categories above before opening the cleanup.
