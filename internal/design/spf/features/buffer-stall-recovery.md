---
status: draft
date: 2026-05-20
definition: coarse
---

# Buffer-stall recovery

Detect mid-stream playback stalls (playhead not progressing despite
buffer not at end, source not pseudo-ended, and no in-flight retry)
and trigger recovery actions to unstick playback: seek-nudge,
buffer flush + refetch, or source reset (escalating in order). Third
and final cluster B Borderline content-compensation feature; sister
to [pseudo-ended-detection](./pseudo-ended-detection.md) and
[edit-list-compensation](./edit-list-compensation.md).

A **Borderline feature** per
[clusters.md § Feature classification axes](./clusters.md#media-src-vs-player-vs-borderline):
defensive engine logic for stall scenarios that emerge from network
variability, encoder hiccups, segment-delivery gaps, or browser-
internal issues. Affects **live more than VOD** in practice (live
streams have more stall vectors: ingest glitches, server-side
delivery variability, sliding-window edge cases) but applies to all
sources — not a composition-variant feature.

## Status

- **Composition:** not implemented. Engine relies on browser-native
  recovery and the user's tolerance for stalls; pathological cases
  hang indefinitely or recover slowly.
- **Definition depth:** coarse — scope from Notion + Borderline
  framing + sister-feature coordination concerns. Recovery action
  sequencing + threshold tuning open.
- **Composition scope:** always-on. Unlike
  pseudo-ended-detection (VOD-only variant), buffer-stall-recovery
  applies to all sources. Live streams trigger the detection more
  often in practice; the behavior composes uniformly.
- **Notion-flagged caveat:** "Hard to deterministically test"
  (epic #16). Synthetic stalls in test environments don't always
  reproduce real-world stall patterns; empirical tuning is
  load-bearing.

## Phases of complexity

Two phases (detection + recovery action), Naive vs Full depth per
row. Matches pseudo-ended-detection's framing shape; recovery action
escalation (seek-nudge → flush → reset) lives within the Full-depth
recovery phase rather than as separate phases.

| Phase | Depth | What | Notes |
|---|---|---|---|
| Stall detection | **Naive** | Don't detect. Engine relies on the browser to recover from stalls naturally (or not). The current state | Status quo. Some browsers recover from minor stalls via internal buffering / retry behaviors; others hang on the same conditions |
| | **Full** | Heuristic monitor: playhead non-progressing for a threshold duration + buffer not at end (distinguishing from [pseudo-ended-detection](./pseudo-ended-detection.md)'s near-duration case) + no in-flight retry from [network-resilience](./network-resilience.md) (don't fire while retry might recover) → flag stall. Write a `stallDetected` state slot (or derived signal) | Composition coordination: pseudo-ended-detection checks first (near-duration boundary owns near-end stalls); buffer-stall-recovery considers the stall on negative result. Cross-feature with network-resilience: don't fire while retry-in-flight (retry may recover the stall naturally). Threshold tuning is load-bearing — too sensitive triggers spurious recoveries on momentary hiccups; too lax leaves users hanging |
| Stall recovery action | **Naive** | Passive: wait for the browser / buffer to recover naturally. May work for transient hiccups; doesn't help with stuck states | Status quo |
| | **Full** | Recovery action sequence (escalation order, lightest first): (1) **seek-nudge** — set `mediaElement.currentTime = currentTime + epsilon` to wake the demuxer; (2) **buffer flush + refetch** — remove buffered range around the stall point via [buffer-management](./buffer-management.md)'s `SourceBufferActor.remove` message + trigger segment loader to refetch; (3) **source reset** — heavy escalation, tear down + rebuild MediaSource. Recovery success detection: playhead progresses post-action within a follow-up threshold → success; no progress → escalate to next action | Escalation order + per-step success-detection thresholds are the load-bearing implementation work. The three actions touch [mse-mms-pipeline](./mse-mms-pipeline.md) (seek-nudge + source reset), [buffer-management](./buffer-management.md) (flush + refetch), and the engine composition itself (source reset = essentially re-entering setup). Open: customer-policy hooks for skipping or reordering actions |

## What's in scope vs out of scope

**In scope:**
- Both phases for all HLS sources (live + VOD; live triggers more
  often)
- Stall-detection state slot + monitor behavior
- Recovery-action behavior(s) — seek-nudge, buffer flush + refetch,
  source reset
- Threshold tuning + escalation success-detection
- Coordination with pseudo-ended-detection (composition order)
- Coordination with network-resilience (don't fire during in-flight
  retry)

**Out of scope (separate Borderline sister features):**
- **[pseudo-ended-detection](./pseudo-ended-detection.md)** — sister
  Borderline; near-duration-boundary stalls. This feature owns
  mid-stream / not-near-end stalls.
- **[edit-list-compensation](./edit-list-compensation.md)** — sister
  Borderline; orthogonal mechanism (init-time offset application).
- **[network-resilience](./network-resilience.md)** — cluster G;
  HTTP retry/backoff for failed fetches. Buffer-stall-recovery
  fires *after* network-resilience exhausts retries (or when stall
  isn't network-fetch-driven at all — e.g., decode hiccup, gap in
  buffered range).

**Out of scope (different architectural layer):**
- Customer-facing "we're trying to recover playback" UI. Engine
  exposes the stall + recovery state; adapter renders UI from there.
- Service-side ingest reliability / encoder uptime. Service-side.
- DRM-specific recovery (license expiry → license refresh).
  Handled under [drm-support](./drm-support.md)'s key-status
  reactivity; orthogonal to this feature.

## Likely cross-cutting impact

Things this feature probably forces decisions on, not just additions:

- **Coordination with pseudo-ended-detection.** Both monitors detect
  "playback not progressing." Composition order: pseudo-ended
  considers stalls near the duration boundary; buffer-stall-recovery
  considers stalls elsewhere. The discriminator (near-end vs not) is
  the load-bearing distinction. Two implementation shapes: (a)
  pseudo-ended monitor runs first, writes its state slot;
  buffer-stall-recovery reads the slot and only fires if pseudo-
  ended did not fire; (b) both monitors run independently with
  mutually-exclusive triggers (pseudo-ended fires only when near
  duration; buffer-stall-recovery fires only when not near duration).
  Lean (b) — cleaner separation; no inter-monitor coupling.
- **Coordination with network-resilience.** Stall could be
  network-driven (segment fetch failing); if network-resilience is
  in the middle of a retry sequence, firing recovery actions on top
  is premature. Buffer-stall-recovery should gate on
  "no retry in flight" — read from a network-resilience state slot
  (e.g., `retryInFlight: { [fetchSite]: boolean }`).
- **Recovery escalation order + thresholds.** Three actions, three
  escalations, each with its own success-detection threshold. The
  order (seek-nudge → flush+refetch → source-reset) is from
  lightest to heaviest impact; success-detection thresholds
  determine how long to wait before escalating. Empirical territory;
  defaults should ship; consumer overrides via config.
- **Recovery action implementation surfaces.** Seek-nudge touches
  the mediaElement directly (one-shot `currentTime` write). Flush +
  refetch touches buffer-management (SourceBufferActor.remove + load
  retrigger). Source reset is essentially re-entering the engine
  setup flow — closer to `source-replacement` behavior territory,
  but triggered defensively rather than by consumer action. Worth
  scoping: should source reset be cleanly implementable here, or
  does it route through a shared "destroy and rebuild" primitive?
- **False-positive avoidance.** Common gotchas:
  - Legitimate user pauses look like stalls (playhead not
    progressing). Gate on `mediaElement.paused === false`.
  - Seeking in progress (currentTime is changing but the seek
    target isn't reached) — distinguish from stuck-at-currentTime.
  - Low-buffer state during initial-load — wait for buffer to fill
    before declaring stall.
  - Background tabs (Page Visibility hidden) may have throttled
    decode; cross-cluster with `[multi-signal-abr]`'s visibility
    signal.
- **Live vs VOD threshold differences.** Live streams have more
  inherent variability; thresholds need to be more permissive (allow
  longer stall durations before triggering recovery). VOD is more
  deterministic; tighter thresholds work. Per-source-type config OR
  customer override.
- **Cross-feature with `[multi-signal-abr]`.** Visibility signal
  (page hidden) should suppress stall detection — decode is
  intentionally throttled when hidden. Bandwidth signal could also
  inform recovery action choice (low bandwidth → prefer flush over
  refetch to avoid wasted re-fetches).

## Open questions

- **Recovery action escalation order.** Default sequence (seek-nudge
  → flush + refetch → source-reset) and per-step success-detection
  thresholds. Empirical tuning.
- **Stall detection threshold.** How long of non-progressing counts
  as a stall? Per-source-type defaults + customer overrides. Live
  threshold > VOD threshold.
- **Coordination with pseudo-ended-detection.** Mutually-exclusive
  triggers (option b) vs sequential check (option a). Lean: option
  b — cleaner separation.
- **Coordination with network-resilience.** Gate on "no retry in
  flight" — read which state slot? `retryInFlight: { [fetchSite]:
  boolean }` shape question for network-resilience.
- **Source-reset implementation.** Re-enter engine setup in place
  vs route through a shared "destroy and rebuild" primitive (closer
  to source-replacement's mechanism).
- **Customer-policy hooks.** Allow customers to skip or reorder
  recovery actions? Per source vs engine-wide?
- **Page Visibility coordination.** Suppress stall detection when
  page is hidden (browsers intentionally throttle background
  decode). Cross-cluster with `[multi-signal-abr]`'s visibility
  signal — same hidden-state slot consumed by multiple features.
- **Backend exit condition.** Like edit-list-compensation, the
  proper long-term fix for many stalls is service-side (encoder
  reliability, network delivery quality, etc.). When is this
  feature's recovery logic no longer needed? Document the
  conditions.
- **Notion-flagged: deterministic testing.** Stall scenarios are
  hard to reproduce in tests. What synthetic stall conditions
  validate the recovery logic? Empirical / test-fixture work.

## Related features

- **[pseudo-ended-detection](./pseudo-ended-detection.md)** — sister
  Borderline; near-duration-boundary stalls. This feature owns
  not-near-end stalls; pseudo-ended owns near-end.
- **[edit-list-compensation](./edit-list-compensation.md)** —
  sister Borderline; orthogonal mechanism.
- **[non-zero-pts-support](./non-zero-pts-support.md)** — cluster B
  foundation; this feature reads offset-corrected `currentTime` and
  buffered ranges naturally.
- **[network-resilience](./network-resilience.md)** — cluster G;
  retry-exhausted fetches can be the cause of a stall. Coordination:
  buffer-stall-recovery gates on "no retry in flight."
- **[buffer-management](./buffer-management.md)** — recovery action
  "flush + refetch" touches SourceBufferActor's `remove` message +
  segment loader's load triggers.
- **[mse-mms-pipeline](./mse-mms-pipeline.md)** — seek-nudge and
  source-reset recovery actions touch this feature's MediaSource
  lifecycle.
- **[live-stream-support](./live-stream-support.md)** — primary
  consumer in the sense that live triggers stall detection more
  often. Reload-loop interruption is one stall cause.
- **`[multi-signal-abr]`** — page visibility signal should suppress
  stall detection during hidden state.
- **`[discontinuity-handling]`** *(deferred candidate)* —
  mid-stream PTS jumps can manifest as stalls if mishandled.
  Discontinuity territory; orthogonal to this feature.

## See also

- [clusters.md § Time normalization](./clusters.md#time-normalization)
  — cluster B description + Borderline content compensation
  sub-cluster framing (now complete with this doc)
- [clusters.md § Feature classification axes](./clusters.md#feature-classification-axes)
  — Borderline / content-compensation category; Naive vs Full
  framing
- [pseudo-ended-detection.md](./pseudo-ended-detection.md) — sister
  Borderline feature with overlapping detection signal
- [network-resilience.md](./network-resilience.md) — cluster G
  retry-foundation; coordination with this feature's stall trigger
- [buffer-management.md](./buffer-management.md) — flush + refetch
  recovery action surface
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — source material; epic #16 (Buffer Stall Recovery; Notion flags
  "Hard to deterministically test")
