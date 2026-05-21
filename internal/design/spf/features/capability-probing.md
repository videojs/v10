---
status: draft
date: 2026-05-20
definition: technical
---

# Capability probing

The engine's foundation for determining what the browser can actually
play: codec / container support via `MediaSource.isTypeSupported` and
`canPlayType`, key-system support via `requestMediaKeySystemAccess`,
and `SourceBuffer.changeType()` availability for mid-stream codec
transitions. Filters the candidate set *before* selection, so
unsupported renditions don't survive into the pipeline and fail late.

A **Media-src feature** in the framing from
[clusters.md § Feature classification axes](./clusters.md#feature-classification-axes):
without it, sources with browser-incompatible variants fail late at
`createSourceBuffer` instead of failing gracefully (or falling back to
a compatible variant). Cluster D foundation; the
[clusters.md § Capability probing](./clusters.md#capability-probing)
section flags this as "deserves a dedicated home" with high reuse —
consumers include [HEVC variant selection](./hevc-variant-selection.md), [5.1 surround selection](./5.1-surround-selection.md),
DRM, and the unsupported-case error mapping.

## Status

- **Composition:** not implemented in `createSimpleHlsEngine`. A
  single late-failure check exists today: `isCodecSupported` in
  `media/dom/mse/mediasource-setup.ts` is called by `createSourceBuffer`
  inside `setupVideoBufferActors` / `setupAudioBufferActors` — by which
  point selection has already run and an unsupported variant may have
  been picked.
- **Definition depth:** technical — scope and constraints articulated;
  no implementation. Source material: [SPF Epics Working Doc —
  candidate epics #17 (codec / container), #18 (multivariant CODECS),
  #19 (key-system)](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  (cluster D; each sized S; the Epics doc flags #17 + #18 as likely
  merging).
- **Foundational** for cluster D — `[hevc-variant-selection]`,
  `[5.1-surround-selection]`, `[unsupported-case-error-mapping]`, and
  [drm-support](./drm-support.md) (GitHub issue #1411) all consume
  probing output.

## Phases of complexity

Scope slices around the capability-probing contract. Tier 1
(spec-compliant filtering) and Tier 2 (customer-driven overrides)
layer onto specific phases per the
[Tier 1 / Tier 2 framing](./clusters.md#tier-1-spec-compliant-baseline-vs-tier-2-custom-behavior).

| Phase | What | Notes |
|---|---|---|
| Codec / container probing primitive | Uniform API wrapping `MediaSource.isTypeSupported` + `canPlayType`. Helpers for "given a `Track`, can we play it?" Builds on today's `isCodecSupported` | The minimum primitive everything else builds on. Today's `isCodecSupported` is the codec half; the wrapper formalizes the surface |
| Multivariant CODECS-attribute filtering | At presentation resolution (post-parse), filter `presentation.selectionSets` to drop renditions whose `CODECS` doesn't decode on this browser. Filtered set is what selection behaviors operate over; unsupported renditions never reach selection | Tier 1 (spec-compliant). Today's late-failure path becomes a defensive fallback rarely exercised |
| Media-playlist / segment-level capability checking | Per-segment CODECS verification + container detection at the media-playlist level. Catches mismatches the multivariant didn't declare | Tier 1. Largely defensive; expected to be rare for well-formed manifests |
| Key-system capability probing | `requestMediaKeySystemAccess` for each candidate key system (Widevine, PlayReady, FairPlay, FairPlay-AirPlay). Returns supported configurations. **DRM-adjacent boundary:** this feature owns Tier 1 probing only; EME setup, license fetch, key delivery live under [drm-support](./drm-support.md) (GitHub issue #1411) | Async — pushes toward a new-behavior filter writer pattern rather than a derived signal |
| Cross-codec transition (`changeType()`) probing | Probe whether `SourceBuffer.changeType()` is available, plus pair-wise support for specific codec transitions (AVC ↔ HEVC, AAC stereo ↔ AC-3 5.1, etc.). Browser support is fragile and pair-specific | Consumers decide whether to attempt mid-stream switches based on this probe; the `changeType()` call itself lives in those consumer features |
| Unsupported-case error surfacing | When no candidate survives filtering, surface a clear error rather than failing late in `createSourceBuffer`. State-error slot or callback — the interface is defined here; consumer-side mapping lives in `[unsupported-case-error-mapping]` | The "fail loudly upstream" path |
| Tier 2: customer probing overrides | Config-driven biases: "force AVC even when HEVC supported," "prefer hardware-backed DRM," "exclude codec X." Layered on top of Tier 1's spec-compliant filtering | Tier 2 (custom behavior). Often consumer-policy-driven |

## What's in scope vs out of scope

**In scope:**
- All phases above
- Browser-API wrappers (`isTypeSupported`, `canPlayType`,
  `requestMediaKeySystemAccess`, `changeType()` availability)
- Filter-writer behavior + the filtered-candidate-set slot pattern
- Error-surfacing primitive (used by both this feature and
  `[unsupported-case-error-mapping]`)

**Out of scope (separate Media-src candidate features):**
- **[hevc-variant-selection](./hevc-variant-selection.md)** —
  *consumer*. Uses Tier 1 (select HEVC if supported, fallback to AVC)
  + cross-codec transition probing (mid-stream switching).
- **[5.1-surround-selection](./5.1-surround-selection.md)** —
  *consumer*. Same shape as HEVC, on the audio channel-count axis.
  Adds a 5.1-specific runtime-detection phase (downstream-environment-
  aware channel preference) with no HEVC analog.
- **[drm-support](./drm-support.md)** (GitHub issue #1411) — EME
  setup, license handling. This feature owns the "what key systems
  are available?" probe; drm-support uses that answer to set up
  keys.
- **Multi-language-audio Tier 2 mid-stream codec switch** —
  *consumer* of `changeType()` probing.
- **`[unsupported-case-error-mapping]`** — sister feature; maps the
  error-surfacing primitive to consumer-facing codes / messages.

**Out of scope (different architectural layer):**
- Adapter / consumer-side error display
- Consumer-specific error-code mappings (above-engine)

## Likely cross-cutting impact

- **Selection behaviors** — `selectVideoTrack` / `switchVideoQuality`
  / `selectAudioTrack` / `selectTextTrack` pickers read filtered set,
  not raw `presentation.selectionSets`. Same shape as the
  `userVideoTrackSelection` constraint pattern in `video-abr`.
- **`mse-mms-pipeline` late-failure path** — `createSourceBuffer`'s
  throw on unsupported codec becomes a defensive fallback. With
  upstream filtering it should rarely fire; the throw stays as a
  structural guarantee.
- **`presentation-modeling`** — parser stays format-neutral.
  Capability filtering is post-parse, before selection. The
  architectural doc's parser-interface contract isn't affected.
- **`video-abr`** — `selectQuality` operates over the filtered set.
  No code change in ABR itself; just narrower input.
- **DRM gate** — key-system probing becomes the *first* DRM gate.
  Subsequent EME setup, license fetch, key delivery happen under
  [drm-support](./drm-support.md), gated on probing's verdict.
  Crisp boundary:
  probing answers "can we?"; DRM-support answers "set it up."
- **Cross-codec transition consumers** — HEVC, 5.1, multi-language-
  audio Tier 2 all need `changeType()` probing. The actual
  `changeType()` call lives in their own feature work; this feature
  provides the "can we?" answer.

## Open questions

- **Filter-writer pattern.** New behavior vs derived signal? Async
  key-system probing pushes toward new-behavior (writes a filter
  slot after async resolves). Synchronous codec probing could be a
  derived signal. Unified or split?
- **Cache-eager vs lazy probing.** Probe everything upfront (simpler,
  worst-case cost) vs probe-on-demand (more efficient for sources
  with many renditions). Affects state-slot writer pattern.
- **`changeType()` pair-wise probing API.** Probe all pairs upfront,
  probe lazily on switch attempt, or expose a `canChangeType(from,
  to)` predicate that callers invoke?
- **Tier 2 customer override surface.** Config-driven (engine-wide)
  vs per-source vs both? Per-source is more flexible but harder to
  wire.
- **Container-detection scope.** [container-support](./container-support.md)
  is documented as standalone (cluster-less; MSE doesn't accept
  non-fMP4 containers per spec, so the concern is structurally
  different from capability-probing's "what can the browser decode
  in fMP4?" framing). Open: should this feature surface container-
  format detection as part of multivariant filtering (filter out
  MPEG-TS variants when no transmuxer is composed)? That would
  resolve the scope intersection cleanly without building the
  transmuxer.

## Related features

- **mse-mms-pipeline** — owns `isCodecSupported` + the late-failure
  path. This feature builds on those and moves the check upstream.
- **presentation-modeling** *(architectural)* — data shape this
  feature filters; parser stays format-neutral.
- **video-abr** — quality selection narrowed to filtered candidates.
- **audio-playback** / **subtitles** — per-type selection over
  filtered candidates.
- **multi-language-audio** *(coarse)* — Tier 2 mid-stream codec
  switch consumes `changeType()` probing.
- **[hevc-variant-selection](./hevc-variant-selection.md)** —
  consumer; selection + cross-codec switching.
- **[5.1-surround-selection](./5.1-surround-selection.md)** —
  consumer.
- **[drm-support](./drm-support.md)** (GitHub issue #1411) — owns EME +
  license; consumes key-system probing.
- **`[unsupported-case-error-mapping]`** *(candidate)* — sister;
  consumer-facing error mapping on top of this feature's error
  primitive.
- **[container-support](./container-support.md)** — standalone
  feature (cluster-less); resolved per the doc's framing that MSE
  doesn't accept non-fMP4 containers per spec, making the concern
  fundamentally different from capability-probing's framing.
  Container-detection-without-transmuxer remains a possible cross-
  feature integration point (filter MPEG-TS variants when no
  transmuxer is composed).

## See also

- [clusters.md § Capability probing](./clusters.md#capability-probing)
- [clusters.md § Feature classification axes](./clusters.md#feature-classification-axes)
  — Constraint + filter pattern, Composition vs Policy vs middle
  pattern (middle pattern), Tier 1 / Tier 2 framing
- [mse-mms-pipeline.md](./mse-mms-pipeline.md) — `isCodecSupported`
  + the late-failure `createSourceBuffer` throw
- [presentation-modeling.md](../presentation-modeling.md) — data
  shape this feature filters
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — epics #17 (codec / container), #18 (multivariant CODECS),
  #19 (key-system), #20 (unsupported-case error mapping)
- [Permutations Matrix — Upcoming Features + Unsupported Case Handling](https://www.notion.so/32c97a7f89d08191b84dd30f06685490)
  — source material for the consumer features (HEVC, 5.1, DRM
  security levels) and error-handling scope
