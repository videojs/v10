---
status: decided
date: 2026-06-12
---

# MSE timeline derivation and `timestampOffset` usage

## Decision

Place media on the MSE presentation timeline at its **native PTS** by default
— neither rewriting timestamps nor applying a `timestampOffset` for the common
case. Reach for `timestampOffset` only to *relocate* a region. Concretely:

1. **`segments` mode, not `sequence` mode.** The engine's own timeline model
   is the source of truth; `segments` mode keeps frame placement legible to
   that model. `sequence` mode delegates placement (and an implicit
   `timestampOffset` recomputation) to the user agent, which we don't want.
2. **Default (continuous live): append at native PTS, offset 0.** Declare the
   seekable window with `MediaSource.setLiveSeekableRange()` in that native
   timeline; seek into the window on load. No timeline remapping is required —
   live UIs are window-relative (DVR: differences against
   `seekable.start`/`seekable.end`) or position-less (pure live edge), so the
   origin is irrelevant; absolute-time display comes from PDT separately. This
   is the simplest *and* safest path: large positive timestamps are
   precision-safe in JS doubles (microsecond-fine even at 10⁹ s) and sidestep
   the Chromium negative-DTS append failure entirely (timestamps never go
   negative). For a CMAF-first engine there is no remux step, so byte-level
   rewriting never even arises.
3. **Reach for `timestampOffset` only to *relocate* a region**, set once
   before the first append of that region (after `abort()` + feeding a
   keyframe first), never per-segment. The relocation cases: instant-clip /
   "`currentTime` starts at 0" product semantics; mid-stream discontinuities /
   encoder restart; and aligning tracks whose PTS epochs differ onto a common
   timeline. VHS's "offset only at boundaries" shape applies here; per-segment
   offsetting is the anti-pattern.
4. **Derive any relocation offset empirically / by introspection, then
   validate.**
   Read the first segment's `tfdt` `baseMediaDecodeTime` (timescale-aware) and
   confirm against read-back `SourceBuffer.buffered` rather than assuming a
   fixed relationship between encoded media time and presentation time.
5. **When you do offset, guard it to keep DTS ≥ 0 on Chromium.** A negative
   DTS after offsetting is a hard append failure on Chrome/Chromium (not
   Firefox). Any relocation offset that could push B-frame DTS negative must be
   clamped or paired with a DTS rebase. (The native-PTS default avoids this by
   construction.)
6. **Audio sample-continuity across discontinuities is a separate, hard
   requirement.** Chrome paces the audio clock from decoded *sample counts*,
   not from appended per-frame timestamps. `timestampOffset` anchors where a
   coded-frame-group starts; it does **not** make Chrome honor per-frame audio
   PTS mid-run. Across a discontinuity the audio must be made sample-continuous
   (or the gap handled explicitly), independent of the offset.

This resolves the mechanism fork in
[non-zero-pts-support](../design/spf/features/non-zero-pts-support.md) and
informs open question **[4]** in
[live-presentation-modeling](../design/spf/live-presentation-modeling.md).

## Context

Live HLS does **not** need a zero-based presentation timeline — that's a VOD /
instant-clip requirement, not a live one. A non-seekable live UI renders no
position at all (a "LIVE" indicator, not a scrubber), and a DVR UI is entirely
window-relative — scrubber fill, "behind live", and window length are all
differences against `seekable.start`/`seekable.end`, so the timeline's origin
cancels out. Absolute-time display (time-of-day) comes from
`EXT-X-PROGRAM-DATE-TIME`, a separate media→wall-clock mapping orthogonal to
`currentTime`'s origin. What live actually needs from the engine is narrower:
a consistent monotonic timeline in the buffer (native PTS satisfies this), a
declared seekable window via `setLiveSeekableRange` in whatever coordinates
were appended, a one-time seek *into* that window on load, optional PDT
wall-clock mapping, and A/V sync across the window and any discontinuities
(e.g. SSAI ad splices). The engine maintains its own timeline model separate
from MSE, so the question is how that model drives the SourceBuffer — and
whether to touch `timestampOffset` at all, given every production OSS web
engine uses it in some form.

A deep research pass (W3C MSE spec, byte-stream registry, Chromium/WebKit/
Gecko trackers, and the source of hls.js / shaka / VHS) plus targeted reading
of specific Chromium and WebAudio/WebCodecs issues grounded the trade-offs.
See **Evidence** below for citations.

## Alternatives Considered

- **Byte-level timestamp rewriting** (rewrite PTS/DTS in the segment before
  append — hls.js's historical path). Rejected: hls.js maintainers call it
  "costly and result in issues" and are migrating *to* `timestampOffset`
  (hls.js #5715), with negative-DTS decode artifacts as a documented failure
  class (#5710). Walking away from `timestampOffset` means walking into the
  path the industry is abandoning.

- **Rebase to zero via `timestampOffset`** (buffer `currentTime` becomes
  ~0-based at source start; browser does the math). Considered as the default
  but **not** chosen for continuous live. It does *not* actually shrink the
  live translation surface: zero-at-encoder-start is still not zero-at-window-
  start, so DVR UIs compute window-relative time from `seekable` either way.
  And it gives up the native-PTS path's two free wins (negative-DTS immunity,
  no offset to maintain). Kept as the mechanism for the *relocation* cases
  (Decision §3), where 0-based product semantics or cross-epoch alignment are
  the actual requirement.

- **`sequence` mode** (Shaka's HLS default). Rejected: it still uses
  `timestampOffset` under the hood (UA sets it from the group-start
  timestamp), so it doesn't "avoid" the mechanism — it just hides placement
  from our model. We want the model authoritative and placement explicit.

- **Per-segment `timestampOffset`** (Shaka's per-segment empirical offset).
  Rejected for our continuous-run case: VHS explicitly *removed* per-segment
  offset changes because they "produce bad behavior, especially around
  long-running live streams." Per-segment offsetting also fights Chrome's
  audio sample clock. We keep the offset stable within a run and re-anchor
  only at boundaries (the VHS shape).

## Rationale

The OSS field converges on `timestampOffset`, but mostly because those engines
remux TS→fMP4 (hls.js) or stitch multi-period content (Shaka/DASH) and need to
*relocate* media as a matter of course. A CMAF-first live engine that holds its
own timeline model has no such standing need: appending at native PTS lets the
media place itself, and `setLiveSeekableRange` declares the window in the same
coordinates. That default is strictly safer — large positive timestamps are
precision-safe and can't trip the Chromium negative-DTS abort — and the failure
modes the field works around (long-running-live drift, A/V divergence,
negative-DTS) all trace to *applying or changing* an offset, which we now do
only when relocation genuinely requires it. The mechanism remains the right
tool for that narrow job; the decision is to stop reaching for it by default.

## Evidence

Spec / mechanics:
- MSE coded-frame processing adds `timestampOffset` to both PTS and DTS;
  `segments` vs `sequence` placement; coded-frame-group / need-random-access-
  point rules — <https://www.w3.org/TR/media-source-2/>,
  <https://www.w3.org/TR/mse-byte-stream-format-mp2t/>.

Engine prior art:
- hls.js abandoning byte rewriting for `timestampOffset` —
  <https://github.com/video-dev/hls.js/issues/5715>,
  <https://github.com/video-dev/hls.js/issues/5710>.
- Shaka per-segment empirical offset + `sequence` mode for HLS — Shaka
  `media_source_engine.js` (`calculatedTimestampOffset = reference.startTime
  − realTimestamp`); >150 ms audio compensation.
- VHS sets offset only at discontinuity/rendition boundaries via a serialized
  queue; removed per-segment offsetting for long-running-live —
  <https://github.com/videojs/http-streaming/blob/main/docs/a-walk-through-vhs.md>.

Browser behavior:
- Negative-DTS-after-offset hard append failure on Chrome/Chromium, not
  Firefox/legacy-Edge — <https://github.com/google/shaka-player/issues/1108>,
  <https://github.com/Dash-Industry-Forum/dash.js/issues/2265>;
  `bFrameAdjustment` workaround — <https://github.com/shaka-project/shaka-player/pull/731>.
- **Chrome paces the audio clock from decoded sample counts, not muxed
  timestamps** ("chrome used to trust the muxed timestamps for pacing the
  media clock, but found that the numbers are often imprecise"); drift at
  SSAI ad-splice discontinuities; classified app-bug / WontFix —
  Chromium #41340529 (crbug 757799), hls.js #828. This is the dominant
  A/V-sync constraint for live.
- Edit-list (`edts`/`elst`) handling diverges by browser **and inverts by
  API**: in MSE, Chrome applies `media_time` start-trim while Firefox/Edge
  don't (nzhang227/gapless_audio_mse); in Web Audio `decodeAudioData`, Safari
  trims AAC priming while Chrome/Firefox/Edge don't
  (<https://github.com/WebAudio/web-audio-api/issues/1091>). The popular
  "Chrome ignores edts, Safari applies" framing is **not** supported. Own
  priming-trim explicitly via `appendWindow` + `timestampOffset`
  (<https://developer.chrome.com/blog/media-source-extensions-for-audio>);
  encoder priming counts aren't reliably emitted upstream
  (<https://github.com/w3c/webcodecs/issues/626>).

## Open follow-ups (verification, not blockers)

- **Double-precision PTS drift is a non-issue at these magnitudes** — a JS
  double holds microsecond resolution out past 10⁹ s (~31 yr), and Chromium
  uses integer microseconds internally. The "~26.5 h / 33-bit rollover" figure
  is the **MPEG-TS** 33-bit PTS field wrapping, *not* a float-precision bound:
  it's a TS-container concern (a mid-stream wrap is a discontinuity to handle),
  irrelevant to CMAF/fMP4 (64-bit `tfdt` `baseMediaDecodeTime`). So the
  native-PTS default is precision-safe for CMAF; TS sources carry a wrap
  caveat that pushes them toward normalization. No primary source confirmed any
  double-precision degradation threshold — treat that framing as retired.
- **Chrome audio sample-pacing on *current* Chrome.** The primary source is
  Chrome 60 / 2017 (WontFix-Obsolete 2022). It's a deliberate design choice
  corroborated by current hls.js audio-restamping, but verify on a current
  Chrome against a discontinuity stream before hardening the audio-continuity
  requirement.

## See also

- [non-zero-pts-support](../design/spf/features/non-zero-pts-support.md) —
  the mechanism fork this decision resolves.
- [live-presentation-modeling](../design/spf/live-presentation-modeling.md) —
  open question [4] (PDT → `timestampOffset`, A/V sync).
- [mse-mms-pipeline](../design/spf/features/mse-mms-pipeline.md) — the
  SourceBuffer pipeline this offsetting plugs into.
