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
| Media (`packages/spf/src/media/`) | 17 | not yet started |
| Network (`packages/spf/src/network/`) | 2 | not yet started |

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

_Not yet assessed._

## Network

_Not yet assessed._
