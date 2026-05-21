---
status: draft
date: 2026-05-20
definition: technical
---

# Rendition selection caps

Policy-driven constraints that narrow the candidate set of video
renditions before quality selection runs. Each cap is a separate
constraint slot read by `selectQuality` (or the ABR equivalent) and
applied as a filter on `presentation.videoTracks` before selection.
The selection slot itself (`selectedVideoTrackId`) remains
single-writer; caps participate as constraints, not as competing
selectors.

A **Player feature** in the framing from
[clusters.md § Feature classification axes](./clusters.md#feature-classification-axes):
additive functionality not tied to making any source play, used by
the player to bias delivery for billing, device, viewport, or
other consumer-side reasons.

## Status

- **Composition:** not implemented in `createSimpleHlsEngine`. Today
  `selectQuality` operates over all `presentation.videoTracks` with
  no candidate-set narrowing beyond `userVideoTrackSelection`
  (single-track manual override) and bandwidth-driven safety
  margins.
- **Definition depth:** technical — scope and constraints
  articulated; no implementation. Source material: [SPF Epics
  Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  Cluster E entries #13 (1080p+ Resolution Cap, eng S, validation S)
  and NEW-C (Screen-Size / Player-Size Resolution Cap, eng S–M,
  validation S), unified per that doc's "Resolution-cap
  unification" open question.

## Phases of complexity

Phases. The first four are motivation slices — different signal
sources (config / `ResizeObserver`) feeding the same constraint+filter
mechanism (a per-cap state slot read by `selectQuality` as a filter on
the candidate set before selection). The fifth is meta-policy on top:
it modifies how the combination of caps resolves, not a cap of its
own.

| Phase | What | Mechanism |
|---|---|---|
| Billing-driven max-height cap | Config-driven `maxHeight` (e.g., 1080) excludes higher-resolution variants from the candidate set. Drives the Mux billing use case (cap delivery at 1080p+ for tier-pricing alignment) | **Policy** — config field consumed by `selectQuality`'s filter step; no new behavior. Matching axis is configurable: height (default, simpler) or total pixels (e.g., for exact alignment with resolution-based pricing tiers — `1080p = 2,073,600 pixels` ensures anamorphic / non-standard-aspect variants are matched correctly) |
| Viewport-driven height cap | Cap the candidate set to renditions that fit the player element's rendered dimensions. Avoids serving higher-resolution variants the viewer can't perceive | **Middle pattern** — `ResizeObserver` monitor writes cap state on player-element size changes; `selectQuality` reads. New behavior. Pairs with the cap-floor phase below — the floor counters this phase's tendency to over-aggressively downgrade on small players |
| Max-bitrate cap | Config-driven `maxBitrate` excludes variants above the threshold. Useful for bandwidth-constrained delivery contexts (mobile, billing) | **Policy** — same shape as max-height cap |
| Max-FPS cap | Config-driven `maxFps` excludes high-frame-rate variants. Less common motivation but mentioned in [video-abr.md](./video-abr.md)'s "What's not implemented" | **Policy** — same shape |
| Cap floor (minimum effective cap) | Counter-pressure to other caps: when the combination of upper-bound caps (viewport, max-bitrate, etc.) would narrow the effective candidate set below a configured floor (e.g., 720p), the floor wins — the effective cap is `max(otherCaps, floor)`. Motivation: viewport-driven caps over-aggressively downgrade quality on small players; the floor prevents perceptual quality from dropping too far when the player is small | **Meta-policy** — not a cap of its own. New constraint slot (e.g., `videoMinMaxHeight`) read by `selectQuality`'s filter step alongside the other cap slots; combination takes the `max` over the other caps' effective bounds. Mux Player's [`MinCapLevelController.minMaxResolution = 720`](https://github.com/muxinc/elements/blob/main/packages/playback-core/src/min-cap-level-controller.ts) is the reference implementation |

The first four phases share a single mechanism: a constraint slot +
filter step before `selectQuality` consumes the candidates. They
differ in signal source (one-shot config vs reactive `ResizeObserver`)
and constraint axis (height / bitrate / FPS). The cap-floor phase is
meta-policy on top — it modifies how the combination of caps resolves,
not a cap of its own. Per-phase implementation is small (S / S-M per
the Epics doc).

## What's in scope vs out of scope

**In scope:**
- All five phases above for video renditions
- Constraint+filter pattern: per-cap state slots + filter step in
  `selectQuality` before bandwidth-based selection runs
- Config surface under existing `quality?: {…}` engine config
- Edge case handling: empty candidate set after cap filtering (open
  question — fallback policy)

**Out of scope (separate candidate features):**
- **[multi-signal-abr](./multi-signal-abr.md)** — incorporates non-
  bandwidth signals (CPU / thermal / network type / battery / viewport
  / customer preference) into the ABR algorithm itself. Different
  concern: caps narrow the candidate set; multi-signal-abr biases
  selection within it. Caps could feed multi-signal-abr as one input,
  but the algorithm-modification work is its own feature.
- **[audio-abr](./audio-abr.md)** — audio quality switching now
  documented; its "Audio caps inclusion" open question explicitly
  references this doc as the resolution candidate. When audio-ABR
  ships, the audio-caps integration question becomes load-bearing.
- **`[audio-only-composition]` / `[video-only-composition]`** —
  composition variants that subtract behaviors for mode-only
  delivery. Different mechanism (composition, not constraint).

**Out of scope (different architectural layer):**
- Above-engine consumers that write cap state from React / HTML
  observers (e.g., a React hook that observes the player container
  and writes a cap value). This feature owns the SPF-side state
  slots and filter logic; *where* the writer lives (engine-side
  `ResizeObserver` behavior vs adapter-level observation writing to
  the slot) is partly an open question (see below).
- The Mux Video element's customer-facing attributes
  (`max-resolution`, `cap-rendition-to-player-size`) — those are
  adapter-layer API surfaces that *consume* this feature's config /
  state.

## Likely cross-cutting impact

Things this feature probably forces decisions on, not just additions:

- **`selectQuality` filter-then-select shape.** Today's `selectQuality`
  takes `(candidates, bandwidth, config)` and returns a track.
  Adding caps means either (a) pre-filtering candidates outside
  `selectQuality` and passing the filtered set in, or (b) extending
  `selectQuality`'s signature to take the constraint slots and
  filter internally. Option (a) keeps `selectQuality` pure and
  matches the `userVideoTrackSelection` precedent (where the
  filtering happens in `switchVideoQuality` before invoking
  `selectQuality`). Option (b) bakes caps into the ABR module
  directly.
- **State-slot granularity.** Per-cap slots (`videoMaxHeight`,
  `videoMaxBitrate`, `videoMaxFps`, `videoViewportHeight`) vs a
  unified slot (`videoRenditionConstraints: { maxHeight?,
  maxBitrate?, maxFps?, viewportHeight? }`). Per-cap slots align
  with the constraint+filter pattern's "one writer per slot"
  shape; a unified slot complicates multi-writer semantics if
  different caps have different writers (config-driven for some,
  `ResizeObserver`-driven for others).
- **Viewport-driven cap signal-source location.** The cap state is
  SPF-side, but the player-element dimensions are DOM-side. A new
  engine-side behavior could read `mediaSource.media` (the
  `<video>` element) and `ResizeObserver` it, or adapter-level code
  could observe the player container and write the cap state slot.
  Affects which layer owns the DOM dependency.
- **Empty-candidate-set fallback.** If caps narrow candidates to
  zero (e.g., `maxHeight: 480` on a source with only 720p+
  variants), `selectQuality` has nothing to return. Fallback
  options: ignore the cap entirely, pick lowest available
  rendition above the cap, or surface an engine error.
  Configurable behavior or engine-level decision.
- **Cap-combination semantics.** When multiple caps are active
  (viewport + max-bitrate, or viewport + cap-floor), they combine
  via *intersection* on the candidate set — each upper-bound cap
  narrows independently. The cap-floor inverts: it computes the
  most restrictive other-cap result and enforces a lower bound on
  it (`max()`). Where this combination lives is part of the
  filter-then-select shape question above: option (a) puts it in
  the dispatcher (`switchVideoQuality`) before `selectQuality` is
  invoked; option (b) bakes it into `selectQuality` itself.

## Open questions

- **Per-cap slots vs unified constraint slot.** See cross-cutting
  bullet above. Open until the second cap lands and the multi-writer
  shape becomes concrete.
- **Viewport-driven cap signal-source location.** Engine-side
  `ResizeObserver` on `mediaSource.media`, or adapter-side observation
  writing to the cap slot? Affects feature shape (one behavior vs
  one slot) and DOM dependency placement.
- **Empty-candidate-set fallback policy.** Ignore / pick-lowest /
  error? Config-driven or engine-fixed?
- **max-FPS cap inclusion.** Listed in video-abr.md's "What's not
  implemented" but lower priority than max-height / max-bitrate.
  Document as Phase 4 or defer?
- **Audio caps.** Audio renditions don't have height analogs but
  could have max-bitrate or max-channels caps. Extend this feature
  to cover audio or carry audio caps separately?
- **Interaction with [capability-probing](./capability-probing.md).**
  Capability filtering narrows candidates to "what the browser can
  play"; caps narrow to "what the player chooses to deliver." Apply
  capability filter first, then policy caps (per current cluster
  framing). Confirm ordering when both land.
- **Cap-floor scope: policy caps only, or all candidate-narrowing
  signals?** The floor counters the viewport-driven cap (and
  potentially max-bitrate / max-FPS caps), but should not override
  capability-filter physics. If [capability-probing](./capability-probing.md)
  removes unsupported renditions, the floor can't add them back.
  Confirm the boundary: floor operates over the policy-cap-narrowed
  set, not over the capability-filtered set.
- **Cap-floor default value.** Mux Player hardcodes 720p as
  `MinCapLevelController.minMaxResolution`. For SPF, should the
  floor default to a value, or require explicit opt-in? Defaulting
  risks unexpected high-bitrate delivery on tiny embeds; not
  defaulting means most consumers won't get the perceptual benefit
  unless they configure it.

## Related features

- **[video-abr](./video-abr.md)** — primary consumer. `selectQuality`
  is the read-side; `userVideoTrackSelection` is the existing
  constraint+filter precedent. Cap slots layer on top of the same
  pattern.
- **[multi-signal-abr](./multi-signal-abr.md)** — different concern
  (ABR algorithm extension) but caps could feed it as inputs.
- **[audio-abr](./audio-abr.md)** — audio quality switching that
  may extend this feature with audio-side caps; see that doc's
  "Audio caps inclusion in rendition-selection-caps.md" open
  question.
- **[capability-probing](./capability-probing.md)** — adjacent. Both
  narrow the candidate set, but along different axes (capability =
  physics, caps = policy). The cluster framing places caps in
  cluster E (selection policy) and capability filtering in cluster
  D (capability probing primitive); the line matters for
  composition order.
- **[hevc-variant-selection](./hevc-variant-selection.md)** — sibling
  constraint+filter feature on the codec axis. Same filter-then-select
  shape; the open question about per-cap slots vs unified slot is
  shared.
- **`[audio-only-composition]` / `[video-only-composition]`**
  *(candidates)* — composition variants for mode-only delivery.
  Different mechanism than caps.

## See also

- [clusters.md § Selection policy](./clusters.md#selection-policy)
  — cluster E description; this feature is the first concrete cluster
  E member, and the cluster's documented foundation
- [clusters.md § Feature classification axes](./clusters.md#feature-classification-axes)
  — the Player-feature framing this doc instantiates; mixes
  Policy mechanism (config-driven caps) and Middle-pattern
  mechanism (viewport-driven cap)
- [clusters.md § Constraint + filter](./clusters.md#constraint--filter)
  — cross-cluster pattern this feature instantiates; `video-abr`'s
  `userVideoTrackSelection` is the precedent
- [video-abr.md](./video-abr.md) — primary consumer; `selectQuality`
  is the read-side, `userVideoTrackSelection` the constraint
  precedent
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — source material; Epic #13 (1080p+ Resolution Cap) and NEW-C
  (Screen-Size / Player-Size Resolution Cap), unified per that
  doc's "Resolution-cap unification" open question
- [Mux Video Permutations Matrix](https://www.notion.so/32c97a7f89d08191b84dd30f06685490)
  — Stream Type / Selection Policy section; consumer-facing API
  surfaces (`max-resolution`, `cap-rendition-to-player-size`)
  documented in the Mux Video element README
