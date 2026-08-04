---
status: draft
date: 2026-08-04
definition: technical
---

# Errors

Engine-side error surfacing: a structured error emitted as encountered,
a *derived* fatal verdict, and the adapter mapping that turns a fatal
error into a DOM `MediaError`. The first scope is **unsupported-source
detection** — the cases where SPF cannot play a source that the
HLS.js-backed sibling media can, surfaced as a clear failure instead of
a silent stall.

Does not sit in one cluster. Every cluster produces errors, and no
cluster owns the surface; this doc owns the representation, the
fatal-vs-non-fatal derivation, and the adapter boundary, while each
producing feature owns its own detection. Foundation in the same sense
[capability-probing](./capability-probing.md) already describes — that
doc lists an "error-surfacing primitive" under *Foundational
primitives* without owning it, and [network-resilience](./network-resilience.md)
carries "retry-exhaustion error surfacing" as an open question. Both
consume what this doc defines.

Primarily a **Player feature** in the framing from
[clusters.md § Feature classification axes](./clusters.md#media-src-vs-player-vs-borderline)
— no source plays *because* of it. The unsupported-case detection half
carries **Media-src** weight, though: failing clearly rather than
stalling silently is a correctness difference, not an additive one.

Absorbs the previously-bracketed candidate `unsupported-case-error-mapping`
(forward-referenced from [capability-probing](./capability-probing.md),
[hevc-variant-selection](./hevc-variant-selection.md),
[5.1-surround-selection](./5.1-surround-selection.md), and
[dvr-event-stream-support](./dvr-event-stream-support.md)) as phases 2–4.

## Status

- **Composition:** not implemented. There is no error state slot,
  signal, or event anywhere in `packages/spf/src` — `grep -i error`
  over `playback/engines/hls/engine.ts` returns nothing. Four
  placeholders mark the intended seams:
  `behaviors/track-switching.ts:715` (every candidate pruned by
  constraints) and `:739` (rule chain returned nothing), whose comment
  already reads "placeholder until the planned error behaviors surface
  'nothing playable' as observable state";
  `behaviors/resolve-presentation.ts:119` (`TODO(error-management)`);
  and `behaviors/resolve-track.ts:146`/`:234` (a genuine resolve
  rejection, swallowed).
- **Detection inputs partly exist.** Container detection is wired end
  to end: `media/hls/parse-media-playlist.ts:368` derives the container
  MIME from the segment extension when no `EXT-X-MAP` is present,
  `behaviors/resolve-track.ts:223` relabels the track, and
  `media/dom/capabilities.ts:58` asserts `NON_FMP4_CONTAINER_MIMES`
  unplayable so track-switching's hard-constraint pre-pass prunes it.
  `EXT-X-KEY` is parsed nowhere — the only first-cut producer that
  needs new parser surface.
- **Definition depth:** technical — scope and constraints articulated;
  no implementation. Source material: the `<MuxVideo>` and Legacy
  Formats PRD (*Error Notices*) and SVTA 2070 (see *See also*).
- **Error vocabulary:** SVTA 2070 codes are the internal
  representation, not an outbound mapping. Consequence: the adapter
  still owes the DOM a `MediaError`, so the translation relocates to
  SVTA → `MediaError` rather than engine-native → both.

## Phases of complexity

**Scope slices** — the phases are mechanisms, not content complexity
or spec-baseline tiers. Phases 1–5 are the first cut (the PRD's
*Error Notices* ask); 6–8 are named so the surface isn't designed
without them in view.

| Phase | What | SVTA | Notes |
|---|---|---|---|
| Error representation + emission | The error shape (SVTA category + index, plus context: track type, URL, the constraint or tag that triggered it) and the mechanism producers emit onto. Emission is **stacked** per SVTA Principle 6 — many errors across the timeline, most non-fatal — not a single latched slot | category+index | Foundation for every later phase. Shape is the load-bearing open question; see *Likely cross-cutting impact* |
| Capability-pruned-to-empty surfacing | Replace both `track-switching.ts` `console.error`s. When a type *has* tracks but the hard-constraint pre-pass pruned every one, emit rather than only clearing the selection. Container/TS falls out for free — it reaches this site via `canPlayTrack` asserting `NON_FMP4_CONTAINER_MIMES` unplayable | 1004 / 1005 → 2011 / 2012 | The convergence point for two distinct causes (unsupported container, undecodable codec) and one transient one (every CDN in failover cooldown). Stacking carries the cause code before the outcome code, preserving what the current `console.error` string holds. The existing `hasTracksOfType` guard already separates "no tracks of this type" (legitimate) from "all pruned" (error) |
| DRM detection via `EXT-X-KEY` | Recognize an encrypted source and fail clearly rather than appending undecryptable segments. New parser surface — `EXT-X-KEY` is unparsed today | 4008 | The one first-cut producer needing parser work. Placement decides *when* the verdict lands: `EXT-X-KEY` in the media playlist means post-track-resolution; `EXT-X-SESSION-KEY` in the multivariant would allow pre-resolution. Detection only — actually playing encrypted content is [drm-support](./drm-support.md) |
| Fatal derivation + adapter mapping | Derive a single fatal verdict from the emitted sequence; map it to `MediaError` at the adapter and dispatch `error`. Per-source reset. Only fatal errors reach the adapter | → `MediaError` | Direct precedent: `packages/media/src/dom/hls-js/errors.ts:46` is `if (!data.fatal) return;`, and `native-hls/errors.ts:54` hard-codes `fatal: true`. Both are mixins owning `error: MediaError \| null`, dispatching `ErrorEvent`, clearing per source. Fatality is derived here, not asserted by producers — see *Likely cross-cutting impact* |
| Degraded-but-playable notices | The non-fatal tier: sources that play but aren't fully supported — LL-HLS (plays as standard live), DVR/EVENT (plays as simple live). Emit without failing | 2039 | The PRD's "feature that doesn't exist on the Media in use" case where the answer is "it plays, but not the way you asked." Must not reach the adapter's `error`. Depends on [ll-hls-support](./ll-hls-support.md) / [dvr-event-stream-support](./dvr-event-stream-support.md) for what "not fully supported" means per source |
| Runtime producers *(later)* | The three swallowed sites: manifest fetch/parse failure, and a live media-playlist reload rejection | 2014 / 2005 / 2017 | Deferred deliberately — these are runtime, not the PRD's ask. The live-reload one forces the recoverable-vs-fatal question immediately (a single failed reload is not fatal), which is why it isn't first |
| Retry-exhaustion intake *(later)* | Receive [network-resilience](./network-resilience.md)'s retry-exhaustion verdict as an emitted error | 3008 + 5-digit HTTP | That doc's open question "retry-exhaustion error surfacing — state slot vs callback vs both" resolves against this feature's phase 1 |
| Pipeline + accessibility producers *(later)* | MSE append/quota/remove, decode, out-of-memory; text-track parse/render | 2007 / 2008 / 2022–2028, 5001 / 5002 | Pulls in [buffer-management](./buffer-management.md) and [subtitles](./subtitles.md) scope |

## What's in scope vs out of scope

**In scope:**
- Phases 1–5 above
- SVTA 2070 category+index as the internal error identity
- The fatal-vs-non-fatal derivation, and the invariant that only fatal
  errors reach the adapter's `error`
- The adapter's SVTA → `MediaError` mapping, `error` dispatch, and
  per-source reset
- Composition-injected detection rule sets, so an alternative
  composition can add or drop unsupported-case rules without a runtime
  branch (the `canPlayTrack` config-predicate seam is the precedent)
- Replacing the four `console.error` / swallow placeholders (phases
  2 and 6)

**Out of scope (separate candidate features — all consumers or
producers, not this feature):**
- **[network-resilience](./network-resilience.md)** — retry, backoff,
  circuit-breaking, token refresh. This feature carries the *verdict*
  when recovery is exhausted; it owns no retry policy.
- **[container-support](./container-support.md)** — actually *playing*
  MPEG-TS (transmuxer). This feature surfaces that we can't.
- **[drm-support](./drm-support.md)** — EME, license handling. This
  feature only detects that a source needs it.
- **[buffer-stall-recovery](./buffer-stall-recovery.md)** /
  **[pseudo-ended-detection](./pseudo-ended-detection.md)** —
  detect-and-recover features. They may emit through this surface, but
  their recovery escalation is theirs.

**Out of scope (different architectural layer):**
- User-facing error message text and i18n. `MediaError` already carries
  `defaultMessages`, and `packages/core`'s `error-dialog` +
  `error-dialog-i18n` own presentation.
- The PRD's mux.com "are you using features SPF doesn't support?" page
  and the Current/Next docs toggle. Docs and tooling; they may reuse
  the same detection *rules* conceptually, but nothing in SPF.
- Error transport to QoE / analytics backends. SVTA 2070 puts this out
  of its own scope too ("Dictating how the errors flow, i.e. capturing
  is out of scope").
- Any SPF awareness of what the HLS.js-backed sibling supports. SPF can
  report *what it can't do*; "the other version can" is composed above.

## Likely cross-cutting impact

Things this feature probably forces decisions on, not just additions:

- **Emission shape, and the prior art against a stored flag.**
  [capability-probing](./capability-probing.md) prototyped per-type
  `noPlayable{Video,Audio}Tracks` flags and **removed** them as
  write-only state, leaving a standing lean toward "a derived
  `computed`, not a stored slot." Combined with SVTA's stacking
  principle, that points at producers emitting onto a sequence with one
  owner deriving the resolved verdict — structurally the resolution
  [clusters.md § Multi-writer state slots](./clusters.md#multi-writer-state-slots)
  already records for `userTextTrackSelection` (many inputs → shared
  slot → single deriving owner). Not settled; see *Open questions*.
- **Fatality is derived, not intrinsic.** SVTA excludes severity from
  the code deliberately: "impact varies with player implementation,
  breaking the consistency of a specific error mapping to single code."
  The same holds inside SPF for a sharper reason — whether a condition
  is fatal depends on the *composition*: which features are present,
  what defensive behavior is composed, and whether a degraded
  experience is acceptable. The same missing capability is fatal in one
  composition and a 2039 notice in another. So fatality cannot be a
  property of the error, and producers must not assert it.
- **Not another writer in the selection chain.** Phase 2 reads the
  *outcome* of the hard-constraint pre-pass; it adds no constraint and
  writes no `selected*TrackId`. That keeps it outside the
  [constraint + filter](./clusters.md#constraint--filter) pattern
  rather than becoming a participant in it — worth stating because the
  producing site sits inside `track-switching`, which is where that
  pattern lives.
- **Gating downstream work on a fatal verdict.** A fatal error should
  stop the work that would otherwise continue failing — segment
  loading, and notably the live reload loop, whose `RecurringRunner`
  `reschedule` seam is a natural stop point. Where the gate lives
  (a new behavior, a precondition state, a `reschedule` composition)
  is unresolved.
- **Removing `track-switching.ts`'s `console.error`s without losing
  information.** The current messages name *which* selection key and
  that constraints did the pruning. Emitting only the outcome code
  (2011/2012) drops the cause; stacking a cause code first (1004
  unsupported format vs 2013 no matching codec vs a transient CDN
  cooldown) preserves it. This is the first real test of whether the
  stacked shape earns its complexity.
- **SVTA as internal vocabulary carries version risk.** The spec was
  published 2026-07-08 and its own §Target implementation recommends
  players *map to* it rather than refactor onto it. Adopting it
  internally means spec revisions become internal-contract revisions.
  It also has at least one concrete ambiguity to pin: §Approach
  describes a category-unknown network error as `0300` while the error
  index table implies category 3 / index 000, so zero-padding and
  width are underspecified.
- **Per-source reset semantics.** Both sibling mixins clear `error` per
  source (`emptied`, `MEDIA_DETACHED`). SPF's equivalent is the
  resolved/unresolved presentation cascade, which
  [source-replacement](./source-replacement.md) documents — and whose
  open question ("single error vs per-source") this feature answers.
- **Adapter surface shape.** Whether this is a `SimpleHlsMediaErrorsMixin`
  sibling to the existing mixins or folded into
  `engines/hls/adapter.ts`. The mixin precedent is strong, and
  [engine-adapter-integration](./engine-adapter-integration.md) lists
  "curated state / error introspection" as not-implemented — this is
  the error half of it.
- **Non-fatal errors need a destination that isn't `error`.** The PRD
  asks for "player or console error messages." Console is the trivial
  answer and matches today's placeholders; an observable surface is
  what makes them useful to a player. Unresolved which, and phase 5
  can't land without it.

## Open questions

- **Emission shape.** Append-only sequence, ring buffer, or per-domain
  slots with a deriving owner? And does the sequence persist for
  diagnostics or only feed the derivation? SVTA Principle 5
  ("Stateless — players should be considered to be unsophisticated,
  with no centralized error logic maintaining the device, player or
  stream state") is in direct tension with a stateful deriving owner;
  worth resolving explicitly rather than by accident.
- **Where the fatal derivation lives.** A behavior, a `computed` over
  the emitted sequence, or the adapter. Deriving at the adapter keeps
  the engine stateless per SVTA P5 but puts composition-dependent
  policy above the composition that determines it.
- **How fatality policy is injected.** Config predicate (the
  `canPlayTrack` shape), composition-time rule set, or both. This is
  the mechanism that makes "fatal in composition A, degraded in
  composition B" expressible, and it's what phase 5 and non-Mux cases
  depend on.
- **Cause + outcome, or outcome only.** Whether phase 2 emits 1004
  *then* 2011 (SVTA stacking, preserves cause) or only the outcome.
  Determines whether stacking is load-bearing in the first cut or
  merely allowed.
- **Non-fatal destination.** Console, observable state, an event, or
  tiered by severity. Blocks phase 5.
- **`EXT-X-KEY` vs `EXT-X-SESSION-KEY`.** Media-playlist detection is
  simpler and matches where container detection already happens;
  multivariant `EXT-X-SESSION-KEY` gives an earlier verdict (before any
  track resolves) when present. Possibly both, with the multivariant
  path as an optimization.
- **SVTA version pinning.** What "we target SVTA 2070" means when the
  spec revises — pin a revision, or track and migrate? Interacts with
  the zero-padding ambiguity above.
- **Unknown-code fallbacks.** When a producer knows the category but
  not the specific error, SVTA reserves category-000; fully unknown is
  0999. Whether SPF ever legitimately emits these, or whether an
  unmapped error is a bug.
- **Container detection depth.** Response `Content-Type` and body
  magic-byte probing are unimplemented. The `EXT-X-MAP`-absence plus
  extension heuristic covers Mux's shapes; whether non-Mux sources
  need more is deferred until a case appears.
- **Interaction with transient constraint pruning.** Multi-CDN failover
  cooldown can prune every candidate *temporarily*. Per
  [capability-probing](./capability-probing.md)'s note, the surface
  must not let a consumer fire a terminal error on a transient
  condition — which may require the emitted error to distinguish
  "permanently unplayable" from "nothing available right now."

## Related features

- **[capability-probing](./capability-probing.md)** *(closest
  relationship)* — produces the pruned-to-empty condition phase 2
  surfaces, and currently lists the error-surfacing primitive under its
  own *Foundational primitives*. Its "Unsupported-case error surfacing"
  phase row defers to the candidate this doc absorbs, and its removed
  `noPlayable*` flag is the constraining prior art.
- **[network-resilience](./network-resilience.md)** — consumer. Its
  retry-exhaustion surfacing open question resolves against phase 1;
  its recovery policy stays its own.
- **[container-support](./container-support.md)** — the TS case. That
  doc owns playing MPEG-TS; this one owns saying we can't. Note that
  doc's Status predates the container detection now in
  `parse-media-playlist.ts` / `capabilities.ts`.
- **[drm-support](./drm-support.md)** — phase 3 detects what that
  feature would implement. Detection is a prerequisite for a clear
  failure today and a routing signal once DRM lands.
- **[ll-hls-support](./ll-hls-support.md)** /
  **[dvr-event-stream-support](./dvr-event-stream-support.md)** —
  the degraded-but-playable cases in phase 5. Both define what partial
  support means for their source shape; `dvr-event-stream-support`
  already forward-references the absorbed candidate twice.
- **[live-stream-support](./live-stream-support.md)** — the live reload
  loop is the phase-6 producer whose failures are recoverable rather
  than fatal, and its `reschedule` seam is the candidate fatal gate.
- **[source-replacement](./source-replacement.md)** — its
  "Source-error recovery state" not-implemented bullet and
  "Error recovery surface" open question are this feature's per-source
  reset semantics.
- **[engine-adapter-integration](./engine-adapter-integration.md)** —
  its "curated state / error introspection" gap; phase 4 is the error
  half.
- **[buffer-management](./buffer-management.md)** — `QuotaExceededError`
  is a phase-8 producer; that doc's quota-learning eviction idea would
  consume the same signal.
- **[hevc-variant-selection](./hevc-variant-selection.md)** /
  **[5.1-surround-selection](./5.1-surround-selection.md)** — both
  forward-reference the absorbed candidate for their
  filter-narrows-to-zero case, which is phase 2's path.
- **[multi-cdn-failover](./multi-cdn-failover.md)** — cooldown is the
  transient pruning source behind the terminal-vs-transient open
  question.

## See also

- **SVTA 2070 — Standardized Error Codes**, published 2026-07-08 (SVTA
  Player Working Group; to reside at `iana.org` per its
  §Standardization — see [wiki.svta.org](https://wiki.svta.org) for
  terms and working-group material) — the error vocabulary.
  Load-bearing sections:
  §Approach (code structure; severity deliberately excluded),
  §Principles 5–6 (Stateless, Partial), §Stacking error codes,
  §Error category, §Error index, §Target implementation (translation
  sub-component)
- [PRD: Video.js v10 `<MuxVideo>` and Legacy Formats](https://app.notion.com/p/38f97a7f89d080979189db5d688f7e74)
  — *Error Notices* is the motivating requirement; *Considered
  solutions* covers why feature-support detection (not just CMAF vs TS)
  drives it
- `packages/media/src/core/media-error.ts` — the `MediaError` contract
  phase 4 maps onto (codes 1–5 + `MEDIA_ERR_CUSTOM`, `fatal`,
  `context`, `data`, default messages)
- `packages/media/src/dom/hls-js/errors.ts`,
  `packages/media/src/dom/native-hls/errors.ts` — the adapter mixin
  precedent, including the fatal-only filter
- [clusters.md § Multi-writer state slots](./clusters.md#multi-writer-state-slots)
  — the shared-slot / single-deriving-owner resolution the emission
  shape should follow
- [clusters.md § Feature classification axes](./clusters.md#feature-classification-axes)
  — Player vs Media-src vs Borderline; Naive vs Full depth
- [conventions/signals.md](../conventions/signals.md) — multi-writer
  slot conventions, for settling the emission shape
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — epic #20 (unsupported-case error mapping), the absorbed candidate's
  origin
