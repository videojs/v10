---
status: partial
date: 2026-05-20
definition: sketched
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

- **Composition:** synchronous codec filtering is live in
  `createSimpleHlsEngine`. The `canPlayTrack` probe is injected into
  `track-switching`'s hard-constraints pre-pass (`excludeUnplayableTracks`),
  so undecodable renditions are pruned *before* selection. The pre-existing
  late-failure check (`isCodecSupported` inside `createSourceBuffer`) stays as
  a defensive backstop and should now rarely fire.
- **Definition depth:** sketched — Phase 1 (probe primitive), Phase 2
  (multivariant CODECS filtering), and Phase 6 *partial* (no-playable
  surfacing) are implemented; key-system probing, `changeType()` probing,
  segment-level checking, and Tier 2 overrides remain unimplemented. Source
  material: [SPF Epics Working Doc — candidate epics #17 (codec / container),
  #18 (multivariant CODECS),
  #19 (key-system)](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4).
- **Foundational** for cluster D — `[hevc-variant-selection]`,
  `[5.1-surround-selection]`, `[unsupported-case-error-mapping]`, and
  [drm-support](./drm-support.md) (GitHub issue #1411) all consume
  probing output.

## Phases of complexity

Scope slices around the capability-probing contract. Tier 1
(spec-compliant filtering) and Tier 2 (customer-driven overrides)
layer onto specific phases per the
[Tier 1 / Tier 2 framing](./clusters.md#tier-1-spec-compliant-baseline-vs-tier-2-custom-behavior).

| Phase | What | Status |
|---|---|---|
| Codec / container probing primitive | Uniform API wrapping `MediaSource.isTypeSupported` + `canPlayType`. Helpers for "given a `Track`, can we play it?" Builds on today's `isCodecSupported` | **Implemented** (codec half) — `canPlayTrack` in `media/dom/capabilities.ts`, memoized by MIME. `canPlayType` not wrapped yet |
| Multivariant CODECS-attribute filtering | Post-parse, drop renditions whose `CODECS` doesn't decode on this browser, before selection. Filtered set is what selection behaviors operate over | **Implemented** — `excludeUnplayableTracks` constraint in `track-switching`'s pre-pass. Tier 1 (spec-compliant). The late-failure path is now a defensive fallback |
| Media-playlist / segment-level capability checking | Per-segment CODECS verification + container detection at the media-playlist level. Catches mismatches the multivariant didn't declare | Not implemented. Tier 1; largely defensive, rare for well-formed manifests |
| Key-system capability probing | `requestMediaKeySystemAccess` for each candidate key system (Widevine, PlayReady, FairPlay, FairPlay-AirPlay). Returns supported configurations. **DRM-adjacent boundary:** this feature owns Tier 1 probing only; EME setup, license fetch, key delivery live under [drm-support](./drm-support.md) (GitHub issue #1411) | Not implemented. Async — a slot-writer behavior, *not* the synchronous config-predicate route codec filtering took (see resolved open question) |
| Cross-codec transition (`changeType()`) probing | Probe whether `SourceBuffer.changeType()` is available, plus pair-wise support for specific codec transitions (AVC ↔ HEVC, AAC stereo ↔ AC-3 5.1, etc.). Browser support is fragile and pair-specific | Not implemented. Consumers decide whether to attempt mid-stream switches based on this probe; the `changeType()` call itself lives in those consumer features |
| Unsupported-case error surfacing | When no candidate survives filtering, surface a clear state rather than failing late in `createSourceBuffer` | **Partial** — `track-switching` writes per-type `noPlayable{Video,Audio}Tracks` flags (cause-agnostic). The full error-code interface + consumer mapping (`[unsupported-case-error-mapping]`) is deferred |
| Tier 2: customer probing overrides | Config-driven biases: "force AVC even when HEVC supported," "prefer hardware-backed DRM," "exclude codec X." Layered on top of Tier 1's spec-compliant filtering | Not implemented. The `canPlayTrack` config injection point is the natural seam (override the default probe) |

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

## Implementation surface

**Probe primitive:**

| Export | File | Role |
|---|---|---|
| `canPlayTrack` | `media/dom/capabilities.ts` | `(track) => boolean` — builds the MIME codec string and checks `MediaSource.isTypeSupported`, memoized by MIME. Unprobeable tracks (no `mimeType` / no `codecs`) pass through. **Asserts detected non-fMP4 containers (`video/mp2t`, `audio/aac`) unsupported without probing** — TS because the probe false-positives + no transmux; raw AAC because the pipeline assumes init segments (a temporary limitation — browser supports it) |
| `CanPlayTrack` (type) | `media/types/index.ts` | DOM-free predicate type the constraint consumes; `canPlayTrack` is its DOM implementation |
| Container detection (`CONTAINER_MIME_BY_EXTENSION`, `NON_FMP4_CONTAINER_MIMES`) | `media/hls/parse-media-playlist.ts` | Detects non-fMP4 containers per media playlist (no `#EXT-X-MAP` **and** a recognized segment extension: `.ts` → `video/mp2t`, `.aac` → `audio/aac`) and relabels the resolved track's `mimeType` from the fMP4 default. `canPlayTrack` then prunes them |
| `applyContainerMimeType` | `media/utils/tracks.ts` | Propagates the detected container to every rendition of the **same type** (called from `resolve-track`): one resolved non-fMP4 playlist relabels all of that type's renditions, so the type is pruned from a single fetch. Scoped to one type — never crosses audio↔video (mixed-container sources exist), which also keeps per-type resolutions' writes disjoint (race-free) |

**Constraint + surfacing (in `playback/behaviors/track-switching.ts`):**

| Piece | Role |
|---|---|
| `excludeUnplayableTracks` | Hard-constraint in the `applyConstraints` pre-pass; reads `config.canPlayTrack`, drops undecodable renditions before the rule chain. Shared by `switchVideoTrack` / `switchAudioTrack`, pooled with `excludeFailedCdns` |
| `noPlayableSignal` write | `setupTrackSwitching` sets the per-type flag when a non-empty candidate set prunes to empty; cleared on src unload |

**Engine wiring (`playback/engines/hls/engine.ts` + `engine-audio-only.ts`):**
- `canPlayTrack` config — both engine factories default it to the DOM `canPlayTrack` in `finalConfig` (the audio-only variant too, so filtering isn't inert there); override to force-exclude a codec (the Tier 2 seam). Adapters forward it via `...config`.
- `noPlayable{Video,Audio}Tracks` state — per-type not-ready flags, observable via `shareSignals` (audio-only engine exposes `noPlayableAudioTracks`).

**State slots:**
- **Reads (constraint):** `presentation` candidates' `mimeType` + `codecs`, via `config.canPlayTrack`.
- **Writes:** `noPlayableVideoTracks` (by `switchVideoTrack`), `noPlayableAudioTracks` (by `switchAudioTrack`) — single-writer per type.

## Verification

- **Unit — `media/dom/tests/capabilities.test.ts`:** `canPlayTrack` returns the `isTypeSupported` verdict for a track's built MIME; memoizes per unique MIME (probes once); passes through (`true`) for unprobeable tracks (no `mimeType`, or empty/absent `codecs`); asserts non-fMP4 containers (`video/mp2t`, `audio/aac`) unsupported without consulting `isTypeSupported` (even with codecs).
- **Unit — `media/hls/tests/parse-media-playlist.test.ts`:** relabels to `video/mp2t` / `audio/aac` when there's no `#EXT-X-MAP` and segments are `.ts` / `.aac` (query string ignored; `video/mp2t` for audio TS too); keeps the fMP4 default when an `#EXT-X-MAP` is present or the extension is unrecognized.
- **Unit — `media/utils/tests/tracks.test.ts`:** `applyContainerMimeType` sets the MIME on every track of the given type, leaves other types untouched (never crosses audio↔video), idempotent.
- **Unit — `playback/behaviors/tests/track-switching.test.ts`:** `excludeUnplayableTracks` prunes undecodable renditions before ranking (picks best playable codec); passes through with no probe wired; a user-selected unplayable track is still excluded (hard constraint beats the soft user filter). `noPlayable*` surfacing: flags `true` when a non-empty type prunes to empty (no pick); `false` when a playable candidate exists; flips `true → false` reactively on recovery (driven via failover); stays `false` when the type simply has no tracks; clears on src unload.
- **Integration — `playback/engines/hls/tests/engine.test.ts`:** a mixed HEVC+AVC source with a `canPlayTrack` rejecting HEVC selects the AVC rendition; an all-undecodable source surfaces `noPlayableVideoTracks=true` with no pick.

**Live smoke test:** verified in the SPF sandbox against the Apple `bipbop_4x3` stream (muxed-TS video + raw-`.aac` audio) — video relabels `video/mp2t` → `noPlayableVideoTracks=true`, audio relabels `audio/aac` → `noPlayableAudioTracks=true` (per-type propagation: one fetch per type, not per rendition). An audio-only `.aac` source likewise surfaces `noPlayableAudioTracks=true` (loud, not a silent stall).

**Out of scope / deferred:** `canPlayType` wrapper, key-system probing, `changeType()` probing, per-segment CODECS checking, the full error-code interface, and Tier 2 override config. Container *detection* covers MPEG-TS + raw ADTS AAC (not `.mp3` etc. yet); both are asserted **unplayable** for now. *Playing* them is separate follow-up work — TS needs a transmux pipeline; **raw AAC is genuinely browser-supported (Chrome/Safari) and could be played by removing the pipeline's init-segment assumption** (the segment loader queues an `append-init` with an empty URL, and append handling is fMP4-shaped). No sandbox surface yet for the no-playable state.

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

## Resolved during Phase 1–2 implementation

- **Filter-writer pattern → split (not unified).** Synchronous codec
  probing is a pure function of (track, environment), so it landed as a
  **config-injected predicate** (`canPlayTrack`) read by the
  `excludeUnplayableTracks` hard constraint — no behavior, no state slot.
  This mirrors `getCdnId` injection, not the `failedCdns ←
  setupFailoverMonitor` slot-writer (which exists because CDN cooldown is
  *dynamic*; codec support is static). Async key-system probing (Phase 4)
  will take the slot-writer route, coexisting in the same pre-pass — the
  two are genuinely split by sync-vs-async.
- **Cache-eager vs lazy → lazy + memoized.** The constraint probes each
  candidate at apply time; `canPlayTrack` memoizes by built MIME string, so
  each unique MIME is asked once without an upfront sweep.
- **No-playable surfacing is cause-agnostic.** The per-type `noPlayable*`
  flag fires whether emptiness came from codec filtering *or* CDN-failover
  cooldown — "nothing playable right now," with cause attribution left to
  the downstream error-mapping feature. A track with no declared `CODECS`
  (optional per spec) is unprobeable and passes through; the late
  `createSourceBuffer` check remains its backstop.
- **Container-detection scope → non-fMP4 detection (TS + raw AAC), per-track-type,
  marked unplayable.** The media-playlist parser relabels a resolved non-fMP4
  rendition (no `#EXT-X-MAP` + a recognized extension: `.ts` → `video/mp2t`,
  `.aac` → `audio/aac`), and `resolve-track` propagates that MIME to every
  rendition of the **same type** (`applyContainerMimeType`), so a type is pruned
  from a single resolved playlist. Propagation is **same-type, not cross-type**:
  Apple `bipbop_4x3` is mixed-container (muxed-TS video + raw-`.aac` audio), so a
  cross-type "whole source is one container" assumption was both *wrong* for that
  stream and racy under concurrent per-type resolution; same-type is safe (an ABR
  ladder shares its container) and race-free (disjoint writes). Both are asserted
  unplayable, for different reasons: TS because `isTypeSupported('video/mp2t…')`
  false-positives on Chromium *and* there's no transmux pipeline; raw AAC as a
  **temporary** limitation — the browser genuinely supports it (Chrome/Safari
  decode bare `audio/aac`; Firefox doesn't), but our segment loader / append
  pipeline assumes an `EXT-X-MAP` init segment, so it would fetch-but-never-buffer
  (a silent stall) today. Making raw AAC playable (remove the init-segment
  assumption; bare-MIME probe + projection) is deliberately out of scope here —
  see [container-support](./container-support.md).

## Open questions

- **`changeType()` pair-wise probing API.** Probe all pairs upfront,
  probe lazily on switch attempt, or expose a `canChangeType(from,
  to)` predicate that callers invoke?
- **Tier 2 customer override surface.** Config-driven (engine-wide)
  vs per-source vs both? Per-source is more flexible but harder to
  wire.

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
  feature (cluster-less) for *playing* non-fMP4 containers. The
  detection half landed here: MPEG-TS (`.ts` → `video/mp2t`) and raw
  ADTS AAC (`.aac` → `audio/aac`) are detected and asserted unplayable.
  Playing them lives there — TS needs a transmux pipeline; raw AAC just
  needs the init-segment assumption removed from the segment loader /
  append pipeline (the browser already supports it).

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
