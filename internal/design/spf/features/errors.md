---
status: partial
date: 2026-08-06
definition: sketched
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

**Phases 1–4 implemented** (the PRD's *Error Notices* ask for
unsupported-source detection). Phase 5 is **partially** implemented — the
two degraded-but-playable cases are detected and announced, but to a
console rather than as emitted conditions, because the *Non-fatal
destination* open question below is unresolved. Phases 6–8 (runtime,
retry-exhaustion, pipeline producers) are not.

- **Causes vs verdicts is the shipped shape, and it's load-bearing.**
  *Causes* are per-rendition and non-fatal, reported as each media
  playlist resolves through an injected seam. *Verdicts* are per type
  and fatal, reported when a type's candidate set actually empties.
  Keeping them apart is what makes a mixed source correct by
  construction: an unplayable rendition reports a cause, gets pruned, a
  sibling resolves, playback continues. An earlier draft aggregated
  causes per type to decide fatality and **reported fatal DRM over
  sources that then played** — deleted, and worth not rebuilding.
- **Fatality is decided at the adapter, not the engine.** The engine
  reports conditions; the composition's boundary decides which are
  fatal (`FATAL_SVTA_CODES`). This follows the doc's own reasoning
  below — the same condition is fatal in one composition and a notice
  in another.
- **The surfaced *code* is composed from the verdict plus its causes; the
  copy is not the engine's at all.** A verdict only says a type emptied,
  which doesn't distinguish "we don't implement this" from "everything
  failed at once." So when the sequence holds a cause the engine has no
  pipeline for — unsupported container (1004/1005) or unsupported DRM
  (4008) — the adapter surfaces `SVTA_UNSUPPORTED_PLAYBACK_FEATURE`
  (99001) in place of the verdict's code, and the consumer maps that to
  localized text it owns. This is what makes SVTA stacking load-bearing
  in the first cut rather than merely allowed: the adapter reads the
  causes to pick the code.
  An earlier draft had the *engine* compose viewer-facing English from
  verdict + unanimous per-type cause (`FATAL_SVTA_MESSAGES`,
  `FATAL_SVTA_MESSAGES_BY_CAUSE`, `resolveFatalMessage`) — deleted.
  Reporting a code instead moved the copy to the layer that owns
  presentation and localization, and got viewer-facing strings out of the
  engine bundle.
- **Cause matching is sequence-wide, not per type.** `hasUnsupportedFeatureCause`
  asks whether *anything* reported is an unimplemented-capability cause,
  deliberately not whether a cause matches the verdict's track type: an
  encrypted audio-only source empties audio, an encrypted video source
  empties video, and both are the same answer to a viewer. This replaced
  the deleted draft's per-type unanimity check, which is also what
  removed the need for a cause to be `trackType`-tagged to be usable.
- **Error vocabulary:** SVTA 2070 codes are the internal
  representation, not an outbound mapping. A code is a single integer,
  so `svtaCategory` / `svtaIndex` decompose the 4- and 5-digit forms
  uniformly and the spec's inconsistent zero-padding is a non-issue.
  One code is ours: the spec defines only `99000` (Unknown) in the
  custom category and leaves the rest to the publisher, so 99001 is the
  first we define. It needs no special-casing — every standard category
  is below 8000 and custom starts at 99000, so the arithmetic
  decomposition still holds.
- **Remaining producer placeholders.** `resolve-presentation.ts`
  (`TODO(error-management)`) and `resolve-track.ts`'s swallowed resolve
  rejection are still unreported — phase 6, deliberately, because a
  single failed live reload is not fatal and that question isn't
  settled. Phase 2 replaced *one* of `track-switching`'s two
  `console.error`s; the other is an internal invariant assertion, not
  an error surface.

### Known limitations

- **Only one SVTA code has viewer copy; the rest fall through to the
  generic fallback.** `packages/core` maps 99001 → `errors.unplayable`,
  localized across every shipped locale. But the engine now reports an
  empty `message` by design, and `MEDIA_ERROR_TRANSLATIONS` knows no
  other SVTA code, so a fatal verdict that *isn't* explained by an
  unimplemented-capability cause resolves to "An unexpected error
  occurred." The concrete case is an all-CDN cooldown emptying a type:
  2011 surfaces with no cause beside it, and the viewer is told nothing
  useful. Previously the engine's own English covered this; the fix is
  the *extensible code lookup* open question below, not restoring engine
  copy. Bounded in practice — the shipped detection paths (MPEG-TS, DRM)
  always report a cause first.
- **`message` is empty and must stay that way.** `resolveErrorDialogDescription`
  prefers a non-empty `message` over the translation a code resolves to,
  so any engine prose on a mapped code would silently displace the
  localized copy. The empty string is load-bearing rather than a
  placeholder, and it's `''` not absent because `ErrorLike` requires
  `message: string` and `MediaError` normalizes to `''` itself.
- **Mixed-container sources.** `applyContainerMimeType` relabels a whole
  type from one playlist, which Apple's authoring spec makes wrong in
  general: §1.5 + §9.22 require HEVC to be fMP4 *and* recommend a
  192 kbit/s H.264 TS variant, so a conformant HEVC ladder is
  necessarily mixed-container. Accepted for a CMAF-first target and
  documented at that function.
- **A fatal audio verdict fails a source whose video plays.** 2012 is in
  `FATAL_SVTA_CODES`, so an all-encrypted or all-TS *audio* group fails
  the source even when video is fine. Correct for the Mux shapes in
  scope (muxed or uniformly-encoded), wrong for a source meant to play
  video-only.
- **`media → spf` dependency inversion.** `@videojs/media` already
  depends on `@videojs/spf`, so the adapter can't import `MediaError`
  and instead satisfies `ErrorLike` *structurally*, putting an SVTA code
  in a `code` field consumers read as `MEDIA_ERR_*`. The inversion
  should be unwound; the structural workaround is the same one
  `SimpleHlsMediaStreamType` uses.
- **Source-swap carry-forward.** `collectErrors` clears on exit from
  `presentation-resolved`; a resolved→resolved swap that never passes
  through unresolved carries the prior source's errors forward.
  `resolve-track` guards the same transition with a commit-time id
  check; doing likewise here is a follow-up.
- **A type absent entirely is silent, which is wrong for a composition
  that needs it.** `hasTracksOfType` correctly treats "no tracks of this
  type" as legitimate — a video-only source must not report 2012 — but
  the audio-only engine composes *only* audio, so a source with no audio
  rendition is unplayable and reports nothing at all. Observed on a
  muxed-audio MPEG-TS source (`hls-1` in the sandbox): no cause, since
  `reportUnsupportedTrackConditions` runs per resolved track and none resolves; no
  verdict, since the guard returns first; the element sits at
  `readyState 0` with `error === null`. `track-switching` can't tell the
  two apart — it's per-type and composition-agnostic, and per §Open
  questions producers must not assert fatality — so the fix likely mirrors
  the causes/verdicts split: report "this type has no renditions" as a
  distinct non-fatal-by-default condition and let each adapter's
  `FATAL_SVTA_CODES` decide, which the audio-only adapter's narrower set
  already demonstrates. No existing code fits (1004/1005 and 2011/2012 all
  presuppose renditions that *were* there), so this needs a code chosen
  against the spec. A source with no tracks of **any** type is the same
  gap, wider: every type takes the silent path.
- **Manifest fetch/parse failure never reaches `errors`.**
  `resolve-presentation` carries a `TODO(error-management)` and only
  `console.error`s. Notably the path a 403 takes, so an expired signed or
  DRM token produces no reported condition.

## Phases of complexity

**Scope slices** — the phases are mechanisms, not content complexity
or spec-baseline tiers. Phases 1–5 are the first cut (the PRD's
*Error Notices* ask); 6–8 are named so the surface isn't designed
without them in view.

| Phase | What | SVTA | Status | Notes |
|---|---|---|---|---|
| Error representation + emission | The error shape (SVTA category + index, plus context: track type, URL, the constraint or tag that triggered it) and the mechanism producers emit onto. Emission is **stacked** per SVTA Principle 6 — many errors across the timeline, most non-fatal — not a single latched slot | category+index | **Implemented** | Foundation for every later phase. Landed as an append-only sequence in a slot owned by `collectErrors`, with severity decided above it |
| Capability-pruned-to-empty surfacing | Replace both `track-switching.ts` `console.error`s. When a type *has* tracks but the hard-constraint pre-pass pruned every one, emit rather than only clearing the selection. Container/TS falls out for free — it reaches this site via `canPlayTrack` asserting `NON_FMP4_CONTAINER_MIMES` unplayable | 1004 / 1005 → 2011 / 2012 | **Implemented** (one of two `console.error`s — the other is an invariant assertion) | The convergence point for two distinct causes (unsupported container, undecodable codec) and one transient one (every CDN in failover cooldown). Stacking carries the cause code before the outcome code, preserving what the replaced `console.error` string held — and the causes now also decide which code the adapter surfaces. The existing `hasTracksOfType` guard already separates "no tracks of this type" (legitimate) from "all pruned" (error) |
| DRM detection via `EXT-X-KEY` | Recognize an encrypted source and fail clearly rather than appending undecryptable segments. New parser surface — `EXT-X-KEY` is unparsed today | 4008 | **Implemented** — media-playlist detection only | The one first-cut producer needing parser work. Placement decides *when* the verdict lands: `EXT-X-KEY` in the media playlist means post-track-resolution; `EXT-X-SESSION-KEY` in the multivariant would allow pre-resolution. Detection only — actually playing encrypted content is [drm-support](./drm-support.md) |
| Fatal derivation + adapter mapping | Derive a single fatal verdict from the emitted sequence; map it to `MediaError` at the adapter and dispatch `error`. Per-source reset. Only fatal errors reach the adapter | → 99001 → `MediaError` code | **Implemented**, plus cause-driven code substitution | Direct precedent: `packages/media/src/dom/hls-js/errors.ts:46` is `if (!data.fatal) return;`, and `native-hls/errors.ts:54` hard-codes `fatal: true`. Both are mixins owning `error: MediaError \| null`, dispatching `ErrorEvent`, clearing per source. Fatality is derived here, not asserted by producers — see *Likely cross-cutting impact*. The adapter surfaces a *code*, never prose; `packages/core` maps it to localized copy |
| Degraded-but-playable notices | The non-fatal tier: sources that play but aren't fully supported — LL-HLS (plays as standard live), DVR/EVENT (plays as simple live). Emit without failing | 2039 | **Partially implemented** — detected and announced, to a console rather than as emitted conditions | The PRD's "feature that doesn't exist on the Media in use" case where the answer is "it plays, but not the way you asked." `parseMediaPlaylist` detects both (`lowLatency`, `playlistType === 'EVENT'`) and the adapter warns once per source. Neither reaches `errors` as a 2039, because *Non-fatal destination* is unresolved — so nothing observable carries them yet. Depends on [ll-hls-support](./ll-hls-support.md) / [dvr-event-stream-support](./dvr-event-stream-support.md) for what "not fully supported" means per source |
| Runtime producers *(later)* | The three swallowed sites: manifest fetch/parse failure, and a live media-playlist reload rejection | 2014 / 2005 / 2017 | **Not implemented** | Deferred deliberately — these are runtime, not the PRD's ask. The live-reload one forces the recoverable-vs-fatal question immediately (a single failed reload is not fatal), which is why it isn't first |
| Retry-exhaustion intake *(later)* | Receive [network-resilience](./network-resilience.md)'s retry-exhaustion verdict as an emitted error | 3008 + 5-digit HTTP | **Not implemented** | That doc's open question "retry-exhaustion error surfacing — state slot vs callback vs both" resolves against this feature's phase 1 |
| Pipeline + accessibility producers *(later)* | MSE append/quota/remove, decode, out-of-memory; text-track parse/render | 2007 / 2008 / 2022–2028, 5001 / 5002 | **Not implemented** | Pulls in [buffer-management](./buffer-management.md) and [subtitles](./subtitles.md) scope |

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

## Implementation surface

**Vocabulary** — `packages/spf/src/media/errors.ts`. Signal-free and
DOM-free, so the codes are usable from any layer: `SvtaError`
(`{ code, message?, data? }`), the code constants
(`SVTA_UNSUPPORTED_VIDEO_FORMAT` 1004, `SVTA_UNSUPPORTED_AUDIO_FORMAT`
1005, `SVTA_NO_SUPPORTED_VIDEO_TRACK` 2011,
`SVTA_NO_SUPPORTED_AUDIO_TRACK` 2012, `SVTA_UNSUPPORTED_DRM_SYSTEM`
4008, `SVTA_UNSUPPORTED_PLAYBACK_FEATURE` 99001), and `svtaCategory` /
`svtaIndex`.

**Behaviors:**

| Behavior | File | Responsibility |
|---|---|---|
| `collectErrors` | `playback/behaviors/collect-errors.ts` | Owns the `errors` slot and its per-source lifecycle. No effects, no policy — a lifecycle owner, not an error handler. Same slot-owner-vs-writer split as `setupFailoverMonitor` / `failedCdns` |
| `switchVideoTrack` / `switchAudioTrack` / `switchTextTrack` | `playback/behaviors/track-switching.ts` | Report the **verdict** (2011 / 2012) when a type has renditions but constraints pruned every one. Per-variant `noSupportedTrackCode`; text supplies none, since absent subtitles aren't a failure. Reports generically — it never reads a constraint's state, so it doesn't know *why* the set emptied |
| `resolveVideoTrack` / `resolveAudioTrack` / `resolveTextTrack` | `playback/behaviors/resolve-track.ts` | Call the `reportUnsupportedTrackConditions` seam post-parse, reporting **causes** per rendition as it resolves — before committing the parsed track |

**Helpers and seams:**

| Export | File | Status |
|---|---|---|
| `emitError(state, error)` | `playback/behaviors/collect-errors.ts` | The write seam. Lives with the slot it writes; no-ops when no owner is composed, so a reporter needn't know whether collection is composed. `ErrorEmitterState` is the optional-slot contract |
| `reportUnsupportedTrackConditions` | `playback/primitives/report-track-conditions.ts` | The default `ReportUnsupportedTrackConditions` implementation — reports MPEG-TS container (1004/1005) and encryption (4008), each tagged with `trackType` and `trackId`. Scoped to the capability-pruned types (video, audio): text runs no `canPlayTrack` pre-pass, so a cause reported against it could never be matched by an exclusion or followed by a verdict. Injected, so a composition that never ships TS can drop the check |
| `canPlayTrack` | `media/dom/capabilities.ts` | Prunes non-fMP4 containers and encrypted renditions, so every reported cause has a corresponding exclusion |
| `parseMediaPlaylist` → `MediaPlaylistMetadata.encrypted` | `media/hls/parse-media-playlist.ts` | `EXT-X-KEY` detection. `METHOD=NONE` is not encryption; a clear lead followed by a real key is. Deliberately not a CMAF-HAM `Protection` model — set-level `defaultKid` can't express a clear lead or key rotation, and CML never populates it from HLS |
| `parseMediaPlaylist` → `MediaPlaylistMetadata.lowLatency` | `media/hls/parse-media-playlist.ts` | LL-HLS detection for the phase-5 notice — any of `EXT-X-PART`, `EXT-X-PART-INF`, or `PART-HOLD-BACK`. Records that the publisher configured LL-HLS, not that we honour it; partial segments are still skipped |
| `firstFatal` / `hasUnsupportedFeatureCause` | `playback/engines/hls/error-surface.ts` | The shared half of both adapters' promotion step, plus the `SimpleHlsMediaError` type. Only the *policy* — which codes are fatal — stays per adapter |
| `UNSUPPORTED_PLAYBACK_FEATURE_MESSAGE` and the two notice strings | `playback/primitives/error-messages.ts` | **Console-only** copy, plain constants. Nothing here is viewer-facing; separate exports so a composition that logs neither notice doesn't carry the bytes |

**Adapters** — `playback/engines/hls/adapter.ts` and
`adapter-audio-only.ts`. Each owns `FATAL_SVTA_CODES` (its fatality
allow-list — the audio-only set is narrower, since it composes no video
selection and so can never report 2011), the `error` getter, and the
`'error'` dispatch. First fatal wins, latched on the *reported* code so a
later append doesn't re-fire. Where the sequence holds an
unimplemented-capability cause, the surfaced code becomes 99001 and the
condition is logged with the sequence attached; the `message` stays
empty either way.

`alternativeMediaSuggestion` is a static seam on the video adapter: a
Media with a better-equipped sibling to point at (a Mux Video whose
hls.js-backed counterpart plays MPEG-TS and DRM) overrides it, and the
logged copy gains a second sentence with no other change. Empty for
`simple-hls-video`, which has no such sibling.

**State slots:**

- `errors: SvtaError[]` — **multi-writer by construction**, single
  deriving owner. Writers are `resolve-track` (causes) and
  `track-switching` (verdicts); `collectErrors` owns the slot and its
  reset; the adapter derives the fatal verdict. Appends go through
  `update` so concurrent reporters can't lose each other's writes. The
  same shape [clusters.md § Multi-writer state slots](./clusters.md#multi-writer-state-slots)
  records for `userTextTrackSelection`.

**Composition** — both `createSimpleHlsEngine` and the audio-only
variant declare the `errors` slot, compose `collectErrors`, and wire
`reportUnsupportedTrackConditions`. The audio-only variant matters
because an all-encrypted or all-TS source there has no video to fall
back to.

**Consumer chain** — `errorFeature`
(`packages/core/src/dom/store/features/error.ts`) sets `error` on the
media element's `'error'` event and clears on `'emptied'` → `selectError`
→ `media-error-dialog`. `resolveErrorDialogDescription` maps 99001 to
`errors.unplayable` — copy deliberately distinct from `errors.source`,
which blames the viewer's *browser*; here the browser is fine and this
player can't play the source. Any other SVTA code has no mapping and an
empty `message`, so it resolves to the generic fallback (see *Known
limitations*).

## Verification

- **Unit tests:**
  - `packages/spf/src/media/tests/errors.test.ts` → `svtaCategory` /
    `svtaIndex` — decomposition of the 4-digit native and 5-digit
    external forms, including the 0999 fully-unknown code
  - `packages/spf/src/playback/behaviors/tests/collect-errors.test.ts` →
    `emitError` — append order across reporters, duplicates kept (a
    repeat is a real observation), array replaced rather than mutated so
    signal consumers notify, no-op with no owner composed
  - `.../collect-errors.test.ts` → `collectErrors` — retains while the
    source stays resolved, **does not clear on a live reload** (new
    presentation object, still resolved), clears on src unload and on
    destroy
  - `packages/spf/src/playback/primitives/tests/report-track-conditions.test.ts`
    — nothing for a playable fMP4 rendition; 1004 for MPEG-TS; 1005 for
    raw AAC; 4008 for encrypted; both causes for encrypted MPEG-TS;
    neither cause for text, format or DRM; `trackType` tagged (the DRM
    code can't carry it)
  - `packages/spf/src/playback/behaviors/tests/track-switching.test.ts`
    → 2011 when capability prunes every video rendition; **emits
    regardless of which constraint emptied the set** (all-CDN cooldown
    reads the same as capability rejection); nothing for a type with no
    tracks; 2012 for the audio variant; nothing for text
  - `packages/spf/src/media/dom/tests/capabilities.test.ts` — encrypted
    renditions asserted unplayable without consulting `isTypeSupported`;
    clear renditions still fall through to the codec probe (the other
    half of a partially-encrypted source still playing)
  - `packages/spf/src/media/hls/tests/parse-media-playlist.test.ts` —
    `EXT-X-KEY`: absent → not encrypted; `METHOD=NONE` → not encrypted;
    a real METHOD → encrypted; clear lead (`NONE` then a real key) →
    encrypted; not treated as a segment tag
  - `packages/spf/src/playback/behaviors/tests/resolve-track.test.ts` —
    reports unsupported DRM through the seam for an encrypted playlist;
    nothing for a playable rendition; nothing when no seam is wired
  - `packages/spf/src/playback/engines/hls/tests/adapter.test.ts` →
    *error surface* — fatal condition surfaces as an `ErrorLike` and
    fires `'error'`; first fatal wins; non-fatal reports stay in the
    sequence only; fires once per distinct condition; clears on
    per-source reset; reporter context passes through as `data`. For code
    substitution: a container cause and an encrypted source both surface
    99001, including when the cause sits on a different track type than
    the verdict; a verdict with nothing unsupported behind it keeps its
    own code; neither code carries viewer-facing prose; a cause appended
    *after* the verdict surfaced doesn't re-fire; a reporter-supplied
    message is preferred when there is one. For the console half: logged
    once, with the conditions attached, silent for a verdict with no
    unsupported cause, and the alternative-Media sentence appended when
    the class names one
- **E2E:**
  - `apps/e2e/tests/spf-unsupported-source.spec.ts` (Chromium and WebKit —
    the two the CI matrix and `test:all` run; a `vite-firefox` project
    exists but nothing invokes it) — a real MPEG-TS Mux source through
    the whole chain: 99001
    surfaces on the element with an empty `message`; 1004 still precedes
    2011 in the engine's own sequence; the dialog opens with the
    `errors.unplayable` translation rather than the generic fallback; a
    source change to fMP4 clears the error, closes the dialog, and plays;
    and an fMP4 control reports nothing. Driven by the
    `html-simple-hls-video-ts` page, deliberately absent from
    `fixtures/media.ts`'s page arrays
- **Manual:** the sandbox offers both failing shapes to the Simple HLS
  presets — `hls-audio-only-ts` (MPEG-TS) and `hls-drm-unlicensed` (the
  DRM asset with no license path), each labelled with the error it should
  produce. `SIMPLE_HLS_SOURCE_IDS` is what keeps the unlicensed DRM
  source reachable there while the presets that *can* license DRM get the
  playable variants instead.
- **Out of scope / deferred:**
  - **No E2E for the encrypted path** — no encrypted source is wired into
    the e2e fixtures, so 4008 → 99001 is unit-verified plus manually
    reachable in the sandbox, not automated
  - **The audio verdict (2012) is unit-covered only** — the e2e TS
    source has muxed audio and therefore no separate audio track

## Likely cross-cutting impact

Things this feature forces decisions on, not just additions. Written
before implementation; the entries phases 1–4 settled are recorded under
*Open questions → Resolved*, and the reasoning below is what they were
settled against.

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

- **How fatality policy is injected.** `FATAL_SVTA_CODES` is a
  module-level constant today, not a composition or config seam — fine
  while one composition exists, insufficient for "fatal in composition
  A, degraded in composition B." Phase 5 and non-Mux cases force it.
- **Non-fatal destination.** Console, observable state, an event, or
  tiered by severity. Non-fatal conditions currently land in `errors` and
  nothing consumes them, and the phase-5 notices bypass the sequence
  entirely for a `console.warn`. Blocks finishing phase 5.
- **Extensible code lookup above the engine.** Partially answered: 99001
  is mapped by hand in `error-dialog-i18n`, which proves the shape works
  but doesn't generalize — each new SVTA code needs core edited, and core
  hard-codes the numeric literal because it can't depend on `@videojs/spf`.
  Whether the general form is a registry consumers can extend, a mapping
  at the adapter, or a `MediaError` subclass carrying both codes is still
  open. Until then every unmapped code resolves to the generic fallback
  (see *Known limitations*).
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
### Resolved during phases 1–4 implementation

Kept for traceability.

- **Emission shape** → an append-only sequence in one slot, owned by
  `collectErrors`, with the resolved verdict derived above the engine.
  The SVTA-P5 "stateless" tension resolves in favor of the sequence: P5
  argues against *centralized error logic maintaining stream state*, not
  against recording what was observed. No ring buffer — the per-source
  reset bounds growth.
- **Where the fatal derivation lives** → the adapter. The one argument
  for engine-level was halting downstream work on a fatal verdict; that's
  in *Likely cross-cutting impact* but isn't a phase, so it stayed out of
  scope.
- **Cause + outcome, or outcome only** → both, and stacking is
  load-bearing rather than merely allowed: the adapter reads the causes to
  decide which code to surface. Order is causal (cause before verdict)
  because causes are reported as renditions resolve, before a set can
  empty.
- **What the adapter surfaces: prose or a code** → a code. The first cut
  had the engine compose viewer-facing English from the verdict plus its
  unanimous per-type cause. Two problems ended it: the strings were
  English-only with no path to localization, and composing viewer copy is
  presentation work sitting below the presentation layer. Replacing them
  with `SVTA_UNSUPPORTED_PLAYBACK_FEATURE` moved the wording to
  `packages/core`, where it is localized like every other player string,
  and left the engine reporting only codes and structured context.
  Deciding *which* code still belongs at the adapter, because that's where
  fatality is decided and the causes are visible.
- **Why a custom code rather than a standard one** → the standard codes
  available describe either narrower or wider things. Causes (1004/1005,
  4008) say what one rendition hit; verdicts (2011/2012) say a type
  emptied without saying why that's unfixable. And 2039 "Manifest feature
  unsupported" covers features that are unsupported but still *playable* —
  LL-HLS degrading to standard live is a 2039 — so overloading it for a
  fatal condition would make it useless for the phase-5 notices it
  belongs on.
- **`EXT-X-KEY` vs `EXT-X-SESSION-KEY`** → `EXT-X-KEY` in the media
  playlist. `EXT-X-SESSION-KEY` turned out to be useless for per-type
  detection — RFC 8216 §4.3.4.5 makes it optional and explicitly "not
  associated with any particular Media Playlist." It's a key-preload
  hint, so it belongs to [drm-support](./drm-support.md), not detection.
- **Interaction with transient constraint pruning** → **no
  terminal-vs-transient distinction was modeled**, which reverses the
  lean this doc and [multi-cdn-failover](./multi-cdn-failover.md) carried.
  `track-switching` reports the same verdict whether capability rejection
  or an all-CDN cooldown emptied the set, deliberately: it must not read
  a constraint's state, because doing so couples it to every constraint
  that could ever prune. The consequence is real — an all-CDN cooldown
  surfaces a fatal error for a condition that may recover — and it stays
  open under multi-cdn-failover rather than here.
- **Per-source reset semantics** → single error slot, cleared per source
  by `collectErrors`, answering
  [source-replacement](./source-replacement.md)'s "single error vs
  per-source" question. The adapter fires no event on *clear*, which
  raised whether a stale dialog could strand: it doesn't. The inner media
  element's native `emptied` is re-dispatched by the host, so
  `errorFeature`'s reset path fires (E2E-verified on Chromium and WebKit).
- **Adapter surface shape** → folded into each adapter rather than a
  `SimpleHlsMediaErrorsMixin` sibling, since the fatal derivation needs the
  same engine signals the adapter already holds. With two adapters wanting
  it, the shared half (`firstFatal`, `hasUnsupportedFeatureCause`, the
  `SimpleHlsMediaError` type) was extracted to `error-surface.ts` and only
  the fatality allow-list stayed per adapter. The promotion step itself is
  still duplicated between them.

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
