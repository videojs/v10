# Spike: non-zero-PTS via `timestampOffset` (relocate to 0-based)

Exploratory. An alternative to the native-PTS approach spiked on
`feat/spf-non-zero-pts`. Both paths stay live; this branch explores the other one.

## Base

Branched off `7b0d8bbdc` (`feat(spf): parse VTT X-TIMESTAMP-MAP`) — the
mechanism-independent text foundation, needed either way. Deliberately *without*
the native-PTS spike that sits on `feat/spf-non-zero-pts` (commits `7c0c89aeb`,
`8be855fe9`): adapter B-translate, `seekable-window` / `track-seekable-window` /
`seek-to-window-start`, `anchor-presentation-timeline` buffered-pts, parser
`startTimeOffset`/`placeByOffset`, and the observed-native SourceBuffer actor.
Those are all specific to "model native + translate at the adapter" and would
carry conflicting assumptions here.

## The two paths

- **Native-PTS (other branch):** buffer holds native PTS; model re-origined onto
  it; adapter translates the player-facing timeline to 0-based; engine models its
  own `seekableWindow`.
- **This branch — `timestampOffset` relocation:** set
  `SourceBuffer.timestampOffset ≈ −origin` so native PTS 60 lands at 0. Buffer,
  model, and `currentTime` are all 0-based → native `seekable [0,dur]` and
  `duration = content` work without engine-side modeling. Relocate at region
  boundaries (after `abort()` + a keyframe), never per-segment — see
  `internal/decisions/mse-timestamp-offset.md` §3.

## Status & backlog (living — keep current so commits never bury outstanding work)

The design of record is `internal/design/spf/presentation-timeline-model.md`
(reactor architecture). This tracks *implementation* state against it. Tags:
**KEEP** = lasting, review it; **TODO** = designed, not built; **REVIEW** = needs
your detailed pass; **DEFERRED** = later/open.

### Pre-PR checklist (canonical — before converting the spike to a PR)
**Branch reconstructed 2026-07-14:** `feat/spf-non-zero-pts-relocation` — 6 clean commits on
`main` (VOD-only; live wiring stripped via a 3-way apply of the cumulative relocation diff onto
main, NOT a literal rebase). Backups: branch `spike/spf-non-zero-pts-timestamp-offset` + tag
`backup/pre-rebase-relocation` (the on-live 18-commit stack). Cross-browser smoke
(chromium/firefox/webkit × muxclip/apple/muxfull + audio-only) all green.
1. [x] **~0-PTS threshold** — `NEAR_ZERO_ORIGIN_THRESHOLD = 1`s in the derive (folded into the core commit).
2. [x] **Land below live on `main`** — DONE via reconstruction (3-way cumulative-apply, live stripped);
   6 logical commits; typecheck + 1099 spf tests + lint + build green.
3. [ ] **Live-vs-VOD mutual-exclusion gate** — N/A for this VOD-below-live branch (live absent).
   Becomes relevant when the live PR rebases relocation on top → do it at live-integration.
4. [ ] **Track-id-matched parser** for muxed `clcp` (presumptive first-box → `findMediaTrack`). Defer past draft.
5. [ ] **Barrier-liveness bound** — shared-`min` stamp `awaitDefined` unbounded → hang edge case. Defer past draft.
6. [ ] **Load-behavior coordinate-assumption audit** — loader planning/flush keyed off `currentTime`.
   (The general seek-to-exact-end stall found in manual testing is a SEPARATE loader bug →
   GH issue videojs/v10#1828, NOT this branch.)
7. [x] **Negative-DTS on Chromium** — VALIDATED (cross-browser smoke: Chromium appended + played to
   end, no append errors; shared-`min` keeps DTS ≥ 0 by construction). Note it in the PR.
8. [ ] **Composition opt-in / tree-shaking + Tier-0 bundle measure** (baked-in w/ markers). Defer past draft.
9. [~] **Commit cleanup** — DONE (6 clean `feat`/`docs` commits, no `(spike)`/`wip`). OPEN: `StepDeps`
   typing decision (tighten the `AnySlotMap` cast vs leave).
10. [~] **Docs** — design doc + ADR committed. OPEN: flip `presentation-timeline-model.md` status to
    `implemented`; update stale `features/non-zero-pts-support.md`; write the PR description.
- Deferred (separate effort): playback-lifecycle **e2e** (see "E2E coverage" below).

**To open the DRAFT PR:** full `pnpm test` + `pnpm check:workspace`; item 10 docs (status flip +
PR description); push + `gh pr create --draft`. Items 3/4/5/6/8 + StepDeps typing → enumerate as
TODOs in the draft body (a draft PR is explicitly WIP).

Detail for each item is in the sections below (TODO / REVIEW / DEFERRED).

### Landed (committed)
- mp4 box parser + decode-time origin — `cf8aaca45`
- presentation timeline coordinate model doc (+ reactor rearchitecture) — `555f9fdac`, `ae1b0beee`
- spike relocation (boolean/inline approach, since reworked) — `6a20bade9`
- VTT `X-TIMESTAMP-MAP` parse — `7b0d8bbdc`
- messagePipelines step model (loader step pipelines) — `041cecca6`
- relocation as `establishStartMediaTime` reactor (DOM-free) + `relocation-steps`
  (config messagePipelines) + DOM split; deleted `relocation.ts`/`origin-discoverer.ts` — `05a0a6452`
- audio-only relocation wiring (reactor + `audioMessagePipelines` baked into
  `engine-audio-only`) — audio 0-based sandbox-verified
- per-type keying (#3) + non-0th-segment origin `bmdt/ts − segmentStartTime` (#4) +
  `derivePerTypeStartMediaTime` unit test — unit + end-to-end (start-at-300) verified
- text-cue relocation (#6) — `relocatingTextPipelines` (`resolveWithMetadata →
  relocateCues → dispatchCues`) shifts cues by `mapCorrection − startMediaTime`, reading
  the primary A/V origin (video ?? audio, awaited). Text loader rearchitected onto the
  v/a composed-step model (`TextFrame`/`TextLoadStep`/`TextStepDeps`/`TextMessagePipelines`,
  base `resolveCuesStep`/`dispatchCuesStep`); resolver reverted to a pure `(url) → cues`
  host primitive; composition `state` threaded via `compositionDeps` into `TextStepDeps`;
  engine bakes `textMessagePipelines` (mirrors `video`/`audioMessagePipelines`).
  Sandbox-verified 0-based (active cue brackets 0-based playhead)
- **step deps collapsed** to `{state,context,config}` — loader folds its own wiring
  (sourceBufferActor/fetch, textTracksActor/resolveSegment) into `config`, base steps
  read via `stepWiring`/`textStepWiring`
- **Tier 1 + Tier 2 collapsed → shared-`min` default** (`deriveSharedMinStartMediaTime`):
  relocate every track by `min` across selected A/V origins. Subsumes per-type (aligned
  → equals each; skewed → keeps DTS ≥ 0 + preserves skew; single-type → own).
  `derivePerTypeStartMediaTime` kept as barrier-free opt-out.
- **tier-agnostic apply** — stamp now applies the SAME derive over `mediaContainerData`
  (not raw own-origin), async with an `awaitDefined` holdback (per-type immediate;
  shared-`min` barrier waits for both selected origins), liveness-guarded (own origin
  absent → native, no wait). Engine feeds ONE resolved derive to reactor + both pipelines.
- **Apple bipbop HEVC added to sandbox sources** + source picker. Verified shared-`min`
  end-to-end: buffered `0.044` (video 10.0 − sharedMin 9.956, audio 0.0 → 44ms skew
  PRESERVED) + text "Bip!" `0.008 + 10 (X-TIMESTAMP-MAP) − 9.956 = 0.052`. Mux clip
  (AVC) regression clean. NB: Apple full A/V playback needs HEVC decode (headless
  Chromium can't; relocation math still proven via buffered/cue values).

### Architecture (as landed)
- **Steps** (`behaviors/dom/relocation-steps.ts`, `relocationPipelinesFor(type, derive)`):
  a plain config array, one per track type. `discover` (`readInitTimescale`/
  `readSegmentOrigin`) writes `state.mediaContainerData[type]` (`timescale`,
  `baseMediaDecodeTime`, `segmentStartTime`); `stampStartMediaTime` applies the SAME
  `derive` seam over the slot (tier-agnostic), async + `awaitDefined`, liveness-guarded,
  and sets `timestampOffset = −startMediaTime`. Steps read composition `state` from
  call-time `deps`. ABR rungs of a type share the entry.
- **Reactor** (`behaviors/establish-start-media-time.ts`, DOM-free): 3 states —
  `inactive` (clears the slot per source) / `monitoring` (derive effect = injected
  `deriveStartMediaTime` seam → writes `Track.startMediaTime`, the consume) /
  `established` (derive disabled, sticky). Default derive = `deriveSharedMinStartMediaTime`
  (shared-`min`). Owns `mediaContainerData` on `state`; selection **optional/defensive**
  (composes across video-only/audio-only/both).
- Step `deps` IS `{state,context,config}` (the loader folds its own wiring into
  `config`). Engines resolve ONE `deriveStartMediaTime` and feed it to both the reactor
  (config) and `relocationPipelinesFor(type, derive)`; also bake the `mediaContainerData`
  slot + `*MessagePipelines`, all comment-marked.

### REVIEW — your detailed pass
- The reactor + steps end-to-end (architecture above).
- **`StepDeps` typing:** steps get composition `{state,context,config}` typed loose
  (`AnySlotMap`); relocation asserts its slots via `containerSlot(deps)` (one cast,
  since it legitimately knows the composition provides them). OK, or want it tighter?
- **Liveness:** relocation applies only when a *complete* origin (`timescale` +
  `baseMediaDecodeTime`) is discovered; else native (offset 0) — stops TS /
  containerless / mock sources from hanging.
- Load-behavior coordinate assumptions (see below) — still open.

### TODO — outstanding for relocation
- **~0-PTS threshold** (NEXT): below a threshold, set `startMediaTime` 0 / leave
  `timestampOffset` native (avoid ripple on ordinary ~0-PTS VOD). Put it in the derive
  (single place, propagates to model + buffer). Basis TBD (absolute time vs proportion).
- **Live vs VOD gate**: relocation is composed unconditionally; `anchorPresentationTimeline`
  self-gates to live (needs PDT) but relocation does NOT self-gate to VOD → latent conflict
  if both fire on live. Naturally a live-integration (post-rebase) task; anchor + relocation
  must be mutually exclusive per source.
- **Track-id-matched parser for Apple's muxed `clcp`**: discover uses the presumptive
  first-box parser; Apple video muxes a `clcp` caption track (ts 30000) beside `vide`
  (ts 6000) — presumptive works only by box order. Switch to `findMediaTrack` (hdlr
  `vide`/`soun` + `tfhd.track_id`) for a non-presumptuous read. [parser axis]
- **Composition opt-in / tree-shaking** — baked into the standard engine (per decision)
  with comment markers; revisit a tree-shakeable opt-in + measure Tier-0 bundle.
- **Barrier-liveness bound**: shared-`min` stamp `awaitDefined` is unbounded — if one
  selected type is fMP4 and the other never establishes, it hangs. Edge case; bound later.

### Landed — end-of-stream recovery for skewed A/V (ORTHOGONAL, general EOS robustness)
Apple stalled at the end + wouldn't loop. Two compounding causes, two narrow fixes (ADR:
`internal/decisions/end-of-stream-av-skew-recovery.md`):
- **`end-of-stream` reactor**: added `LAST_SEGMENT_REACHED_SLACK` (0.5s) to the
  `currentTime >= lastSegStart` gate. Apple's tiny ~44ms final segment starts at the
  buffered end; the playhead freezes ~50–70ms short (audio-clock render horizon), so the
  strict gate deadlocked (EOS never fired → MS stuck `'open'` → frozen). Slack lets the
  stalled-near-end playhead finalize.
- **`recover-end-stall`** (new DOM behavior + predicate unit test): on `waiting`, if MS
  `'ended'` + finite duration + playhead within `endStallNudgeWindow` (0.2s, config) of the
  reachable buffered end → `currentTime = duration` → native `ended`. Event-driven (no poll;
  `waiting` fires at ~0ms). Composed in both engines; inert for live / clean-ending streams.
- Sandbox-verified: Apple ends + loops; Mux regression clean. Harness `loop` checkbox was
  also just unwired (fixed in the harness). NB: MS reaches `'ended'` ONLY via `endOfStream()`
  (MSE spec) — the nudge works by re-triggering our reactor, not by bypassing it.

### DEFERRED / open (see the doc's Open questions)
- **Cross-codec ABR switch (ORTHOGONAL — track-switching, not non-zero-PTS).** Apple's
  `bipbop_adv_example_hevc` muxes HEVC (`hvc1`) + AVC rungs of the same content; SPF treats
  them as ABR-switchable rungs of one video track and switches HEVC→AVC without
  `SourceBuffer.changeType()` → `CHUNK_DEMUXER_ERROR_APPEND_FAILED` ("h264 doesn't match
  SourceBuffer codecs"). NOT a decode-capability issue (HEVC decodes fine here). Fix =
  separate codec-family switching sets OR `changeType()` on cross-codec switch. Sandbox
  works around it with an AVC-only `canPlayTrack` pin (`avcOnly`); no clean single-codec
  Apple fMP4 example exists (others are MPEG-TS / gone).
- Honest-`startMediaTime`-everywhere convergence + live-anchor dedup.
- Suspected pre-existing: seek-into-evicted-back-buffer.
- Env: `pnpm size` leaves `packages/spf/tsdown.config.ts` swapped to the single-entry
  size config (breaks `build` + sandbox until `git restore`d). Interrupted-restore bug.

### E2E coverage — SEPARATE EFFORT (do NOT bake into the current suite yet)
The existing `apps/e2e` suite is entirely **UI/skin-expectation** tests (controls, keyboard,
gestures, captions, visual snapshots); nothing asserts **playback lifecycle** (reaches
`ended`, loops, 0-based timeline). Playback-lifecycle e2e is a NEW category — track it with
the media-renderer-reliability effort ([[project_e2e_renderer_reliability]]), not here.
Cross-browser validation of this work currently lives in the git-ignored sandbox smoke script
`apps/sandbox/src/spf-non-zero-pts/eos-smoke.mjs` (chromium/firefox/webkit × apple/muxclip, all
green 2026-07-14; needs a sandbox server on :5173) —
reusable driving pattern: mute, seek-to-near-end for speed, bounded polls, never `await
media.play()`.
Candidates when this lands:
- **General `SimpleHlsMedia` lifecycle** (NOT spike-coupled; landable independently): plays
  through to `ended` + loops, across the 3 browsers, on the existing `simple-hls-video` +
  `hlsFmp4` page. Assert the **outcome** (reaches `ended` within N s via seek-to-near-end),
  never "the nudge fired" — the outcome holds whether or not Chrome's freeze occurs, so it's
  CI-stable.
- **Non-zero-PTS relocation correctness** (spike): 0-based `currentTime`/`seekable`/`buffered`
  + active caption cue brackets the 0-based playhead. The owned Mux clip
  (`asset_start_time=60`) works and we control it.
- **`recover-end-stall` on skewed A/V** (spike): reaches `ended` + loops on a source that
  actually reproduces the tiny-final-segment / audio-clock freeze. **Prereq: an OWNED skewed
  asset.** Apple `bipbop_adv_example_hevc` reproduces it but is a third-party CDN + HEVC (forces
  the `avcOnly` pin); the Mux clip's ~0.6ms skew does NOT reproduce the freeze. Without an owned
  skewed / tiny-final-segment asset this test is either flaky (Apple CDN) or doesn't exercise
  the fix.
- e2e media-source convention: external streams centralized in `apps/e2e/fixtures/resources.ts`;
  pages generated by `scripts/generate-pages.ts` from `fixtures/media.ts`; parametrized across
  chromium/webkit/firefox.

## Problems the other branch surfaced — keep in view (likely changed, not gone)

1. **Initial-load stall** (anchor-shift / origin-seek / flush mis-coordination) —
   probably *sidestepped*: 0-based buffer + model + currentTime from the start
   means no post-shift coordinate mismatch. Confirm it doesn't reappear elsewhere.
2. **Seekable `[0,origin)` void + `duration = origin+content`** — both simplified
   away by relocation. No adapter-modeled window, no duration correction.
3. **AV/text coupling** — the one to get right. Relocating AV to 0-based (mechanism
   A) means text cues need the X-TIMESTAMP-MAP delta applied to match
   (`cue_final = cue_LOCAL + MPEGTS/90000 − origin`). The parser in the base feeds
   this; wire it so text rebase tracks the AV offset.
4. **Negative-DTS on Chromium** — the headline `timestampOffset` risk. `−origin`
   could push the earliest B-frame DTS below 0 at the very start (hard append
   failure on Chromium, not Firefox). Probe this first. Also: audio
   sample-continuity across any discontinuity (decision doc §6).

## Load behavior + implicit assumptions (flagged) — applies to BOTH paths

The segment loader / `load-segments` behavior and the actor planning carry implicit
coordinate assumptions (e.g. planning/flush relative to raw `currentTime`, the
`getSegmentsToLoad`/`calculateForwardFlushPoint` window keyed off `currentTime` vs
`track.segments`). On the native-PTS branch this produced the planning-floor half
of the stall (still open there). Either direction may need to rework these
assumptions — don't assume the loader is coordinate-neutral. Audit it explicitly
as the spike progresses.

## TODO

Superseded by the "Status & backlog" section above. Of the original spike probes:
- [x] Sandbox harness — `apps/sandbox/src/spf-non-zero-pts/` exists and drives the
      real provider (Mux instant clip verified 0-based).
- [x] Negative-DTS on Chromium — no append failure observed under relocation.
- [x] Text-cue rebase (X-TIMESTAMP-MAP delta) wired to the AV offset.
- [ ] Audit the load behavior's coordinate assumptions — still open (REVIEW backlog).

## Pointers

- Other approach + full problem write-ups: branch `feat/spf-non-zero-pts`
  (`8be855fe9`, `7c0c89aeb`).
- Decision: `internal/decisions/mse-timestamp-offset.md` (§3 relocation mechanism;
  §5 negative-DTS guard; §6 audio sample-continuity; Update(2026-06-26) steered
  *away* from relocation for finite VOD — this spike revisits that).
