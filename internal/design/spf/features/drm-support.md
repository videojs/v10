---
status: draft
date: 2026-05-20
definition: coarse
---

# DRM support

Digital Rights Management for protected content via the W3C
Encrypted Media Extensions (EME) specification. Covers MediaKeys /
MediaKeySession lifecycle, license-server interaction, key delivery,
and the per-key-system specifics for Widevine, PlayReady, and
FairPlay. The cluster F foundation that consumer-facing protected-
playback features (e.g., a Mux Player `drm-token` integration) build
on.

A **Media-src feature** in the framing from
[clusters.md § Feature classification axes](./clusters.md#feature-classification-axes):
without it, DRM-protected sources don't play. The engine has to set
up MediaKeys, negotiate a MediaKeySession, fetch and respond to
licenses, and deliver keys before the browser will decrypt segments.
*Which* key systems are supported is owned by
[capability-probing](./capability-probing.md) (cluster D); *setting
up* the chosen key system is owned by this feature.

Tracked via **[GitHub issue #1411](https://github.com/videojs/v10/issues/1411)**
("Feature: DRM Support") with three per-key-system sub-issues:
[#1412 Widevine](https://github.com/videojs/v10/issues/1412),
[#1413 PlayReady](https://github.com/videojs/v10/issues/1413),
[#1414 FairPlay](https://github.com/videojs/v10/issues/1414).
Milestone: GA. Prior art: [videojs-contrib-eme](https://github.com/videojs/videojs-contrib-eme)
(Video.js v8 plugin), [Mux Player DRM integration](https://www.mux.com/docs/guides/protect-videos-with-drm)
(Widevine + PlayReady + FairPlay via `drm-token` attribute).

## Status

- **Composition:** not implemented in `createSimpleHlsEngine`. No
  DRM-related code in `packages/spf/src/` today. `#EXT-X-KEY` and
  `#EXT-X-SESSION-KEY` tags are not recognized by `parseMediaPlaylist`.
- **Definition depth:** coarse — scope identified from GitHub issue
  + prior art; SPF touchpoints sketched at the cluster level; no
  implementation. The three sub-issues each carry per-key-system
  detail.
- **Hard prerequisite:** [capability-probing](./capability-probing.md)'s
  "Key-system capability probing" phase. The probe must resolve
  before this feature commits to a key system, sets up MediaKeys,
  or fetches a license. Crisp boundary per
  [clusters.md § Encrypted media (DRM)](./clusters.md#encrypted-media-drm):
  probing answers "can we?"; this feature answers "set it up."

## Phases of complexity

Scope slices around the implementation layers. Per-key-system
specifics are listed within a single phase row that points at the
three sub-issues, rather than as separate phases.

| Phase | What | Notes |
|---|---|---|
| EME setup pipeline | Capability-probing's key-system verdict drives `navigator.requestMediaKeySystemAccess(...)`, which produces a `MediaKeys` instance. `mediaElement.setMediaKeys(mediaKeys)` is called **before MediaSource attachment** per W3C EME (setMediaKeys must complete before encrypted content appends; pre-attachment is the spec-safe ordering). `encrypted` event on the media element fires when init data is appended → `MediaKeySession.generateRequest(initDataType, initData)` starts a session | Shared infrastructure regardless of key system. The generic ordering is settled by spec; the SPF composition question is how to express the gate without DRM-awareness leaking into the standard `setupMediaSource` behavior — see Likely cross-cutting impact for the variant-composition framing |
| License flow | Per-source license-server configuration (consumer-provided URL + optional headers / auth tokens). `MediaKeySession.message` event → fetch license from server → `MediaKeySession.update(licenseResponse)`. Pluggable hooks for consumer policies (custom headers, body transformation, response transformation) | Consumer-facing config surface lives here. Mux Player's `drm-token` attribute is one consumer of this; videojs-contrib-eme's per-key-system config is another precedent |
| Per-key-system specifics | Widevine ([#1412](https://github.com/videojs/v10/issues/1412)), PlayReady ([#1413](https://github.com/videojs/v10/issues/1413)), FairPlay ([#1414](https://github.com/videojs/v10/issues/1414)). Per-system: init-data format (PSSH for Widevine, PRO box for PlayReady, content-id derivation for FairPlay), license URL conventions, license body format, server-certificate handshake (FairPlay), browser-API quirks. **FairPlay-AirPlay is a distinct key system from standard FairPlay** (see [capability-probing](./capability-probing.md)'s four-key-system enumeration) — active when content streams via AirPlay; entering/exiting AirPlay mid-playback is a *runtime state change*, not a compose-time variant, raising an open question on runtime-switching shape (see Open questions) | Three sub-issues. The shared pipeline + license flow above handle most of the machinery; each key system adds its own init-data + license-format adapters. FairPlay-AirPlay sits as a runtime-switchable variant of FairPlay specifically |
| Key delivery and `keystatuschange` reactivity | Browser receives keys via `MediaKeySession.update()`; encrypted segments decrypt automatically. `MediaKeySession.keystatuses` Map tracks per-key status (`usable`, `expired`, `output-restricted`, `released`, etc.); `keystatuschange` event fires on changes. Engine reacts to status transitions (e.g., expired key → re-request) | Tier 2-ish: engine can ignore non-`usable` statuses initially (key expiry surfaces as a playback failure); richer handling is consumer-policy-driven |
| Security-level capability and constraint filtering | Probe device security level (Widevine L1 hardware-backed / L2 hybrid / L3 software-only; PlayReady SL150 / SL2000 / SL3000; FairPlay key-duration / persistent-vs-streaming model) via `MediaKeySystemAccess.getConfiguration()`. HDCP output-protection requirements similarly probed. Match against per-rendition security-level requirements (e.g., 4K HDR HEVC often requires L1 Widevine) and license-server policy. Write a `deviceSecurityLevel` constraint slot read by ABR / variant selection; renditions exceeding the device's level filter out, or the engine surfaces a failure when no compatible rendition remains | Constraint+filter pattern parallel to [rendition-selection-caps](./rendition-selection-caps.md) and [hevc-variant-selection](./hevc-variant-selection.md). Probing extends [capability-probing](./capability-probing.md)'s key-system probe with security-level configuration. Borderline classification (Media-src for "play protected content correctly"; Player for customer-policy caps) — current scope leans Media-src |
| Parser surface for key tags | `parseMediaPlaylist` recognizes `#EXT-X-KEY` and `#EXT-X-SESSION-KEY` from media playlists; multivariant parser surfaces session keys at presentation resolution. Init-data flows from the parsed-track output through MSE setup to the EME pipeline | Parser-side change. Today neither tag is recognized; both are silently passed through |
| Encrypted-event handling on `SourceBuffer` / mediaElement | `encrypted` event on `mediaElement` triggers session creation via init-data. Once keys are delivered, segment-append proceeds normally; the engine doesn't intervene per-segment | Cross-cluster MSE concern; segment-append flow is unchanged for encrypted streams aside from the key-readiness gate |

## What's in scope vs out of scope

**In scope:**
- All seven phases above for HLS protected content with EME-supported
  key systems (Widevine, PlayReady, FairPlay)
- MediaKeys / MediaKeySession lifecycle management (per-source setup,
  source-change cleanup)
- License fetcher with consumer-pluggable URL / headers / body
  transformation hooks
- Parser surface for `#EXT-X-KEY` and `#EXT-X-SESSION-KEY` tags
- `keystatuschange` event reactivity baseline (surface failures)
- Engine-composition variant for DRM-required content
- Security-level probing extension to capability-probing's key-system
  probe (returns supported security levels per key system via
  `MediaKeySystemAccess.getConfiguration()`)
- Security-level constraint slot (`deviceSecurityLevel`) + filter-
  pattern integration with rendition selection (parallel to
  `userVideoTrackSelection` in video-abr.md and per-cap slots in
  rendition-selection-caps.md)
- HDCP output-protection requirement detection and gating

**Out of scope (separate Media-src candidate features):**
- **Key-system capability probing** — owned by
  [capability-probing](./capability-probing.md). Crisp boundary:
  probing answers "can we?"; this feature answers "set it up."

**Out of scope (different architectural layer):**
- Adapter-layer customer-facing API surfaces (e.g., a Mux Player
  `drm-token` attribute, a consumer-passed license-server URL config).
  The SPF feature owns the engine-side license fetcher with pluggable
  hooks; the adapter / consumer provides the actual URL, headers,
  authentication tokens. videojs-contrib-eme's `keySystems` config
  shape is one reference for the consumer surface.
- License-server hosting and DRM token signing. Service-side concerns.
- Per-device key-system installation, content-decryption-module
  updates. Browser / OS responsibilities.
- DRM error UX (license expired, output not permitted) above the
  engine. Engine surfaces failures; adapter renders UX.

## Likely cross-cutting impact

Things this feature probably forces decisions on, not just additions:

- **Gate chain extension on MSE setup — composition-variant placement.**
  Per W3C EME, `mediaElement.setMediaKeys()` must complete before
  encrypted content is appended to a SourceBuffer; the spec-safe
  ordering is pre-MediaSource-attachment. Today's MSE gates per
  [mse-mms-pipeline.md](./mse-mms-pipeline.md): MediaElement +
  presentation URL + `'open'` readyState gate `setupMediaSource`;
  resolved track + open MediaSource gate `setupSourceBuffers`.
  Adding a "MediaKeys attached" gate between these is straightforward
  in isolation; the SPF composition question is how to do it
  *without* DRM-awareness leaking into the standard `setupMediaSource`
  (which today, and in DRM-free engine variants, has no need to know
  about MediaKeys). Per the failure-mode catalog's composition-
  variant entry: variant-specific behaviors compose into DRM-required
  engine variants, not as runtime branches in always-on behaviors.
  Two likely shapes:
  - **(a)** DRM-required engine variant composes a *different*
    `setupMediaSource` that gates on a `mediaKeysReady` signal before
    attaching; standard `setupMediaSource` composes into non-DRM
    engines unchanged.
  - **(b)** A new `setupMediaKeys` behavior writes to a generic
    "ready-to-attach" gate slot that `setupMediaSource` reads;
    standard engines provide a default-true writer for the slot.
  Option (a) is cleaner composition-variant discipline (DRM-free
  engine's `setupMediaSource` is genuinely unchanged); option (b)
  introduces a slot whose primary purpose is DRM. Lean: (a).
  Beyond setMediaKeys, additional DRM gates fire downstream:
  capability-probing's key-system verdict (Tier 1 gate, fires once
  per source); per-session license obtained + `keystatuschange`
  confirms at least one `usable` key (fires on key delivery,
  decryption is async beyond this gate).
- **Composition variant for DRM-required content.** DRM-required
  engine variants compose additional behaviors (MediaKeys setup,
  license fetcher, encrypted-event handler) atop the standard
  composition; DRM-free engines don't carry the machinery. Same
  shape as the live / DVR / LL-HLS variant pattern. The decision
  point — does the consumer opt into a DRM variant upfront, or does
  the engine detect DRM from `#EXT-X-KEY` / `#EXT-X-SESSION-KEY`
  parser output and route accordingly — is open. Adapter-upfront
  is simpler; detect-and-route is more adaptive.
- **State slots for DRM lifecycle.** New slots likely include:
  `drmReady` (key system probed + MediaKeys attached + license
  obtained), `mediaKeysReady` (intermediate gate), and possibly
  per-session state for license-renewal scenarios. Multi-writer
  characterization is open until the slot family solidifies.
- **Encrypted-segment buffer behavior.** Once keys are delivered,
  the MSE pipeline appends encrypted segments unchanged. The
  encrypted-event flow happens *before* steady-state appending. No
  per-segment decrypt overhead from the engine's perspective; the
  browser handles decryption transparently. The MSE codec-change
  check does not fire — DRM doesn't change codec.
- **Source-replacement cascade under DRM.** When the consumer
  changes `presentation.url`, the existing MediaKeys / MediaKeySession
  tear down; the new source's DRM setup runs fresh. Standard
  resolved/unresolved cascade per
  [source-replacement.md](./source-replacement.md), with MediaKeys
  cleanup as an additional in-place cleanup target.
- **License-fetcher composability.** License fetching is the most
  consumer-customizable surface (custom URLs per content, custom
  headers / auth tokens per session, custom body transformations for
  Mux's DRM token format vs raw EME, etc.). The engine should expose
  pluggable hooks rather than hardcoded behavior. videojs-contrib-eme's
  `keySystems.*.getLicense()` callback is one shape; a more general
  request/response-transformation interface is another.
- **Per-key-system browser-API differences.** Widevine, PlayReady,
  FairPlay all have spec-compliant EME surfaces, but the
  init-data formats, license-message formats, server-certificate
  handshakes, and key-status semantics differ. Per-key-system adapter
  modules (one per sub-issue) handle the system-specific logic; the
  shared EME pipeline calls into them via a uniform interface.

## Open questions

- **Variant-decision signal source.** Adapter-upfront opt-in (consumer
  knows the source is DRM-protected, instantiates a DRM-capable
  engine variant) vs detect-from-parser (engine sees `#EXT-X-KEY` and
  routes to DRM-capable composition). Adapter-upfront is simpler;
  detect-and-route is more adaptive but adds composition-time-
  decision complexity.
- **Composition-variant shape for the setMediaKeys gate.** Per the
  cross-cutting note: variant-specific `setupMediaSource` (option a)
  vs generic ready-to-attach slot (option b). The spec-required
  ordering (`setMediaKeys` before MediaSource attachment) is not in
  question; only the SPF composition shape is. Resolving this
  constrains how DRM-required engine variants are composed and
  whether non-DRM engines remain genuinely unchanged. Lean: (a) for
  composition-variant discipline.
- **FairPlay-AirPlay runtime switching.** AirPlay session state is
  a *runtime* condition (user can enter/exit AirPlay during
  playback), not a compose-time variant. This breaks the standard
  composition-variant discipline (compose-time variants for compose-
  time conditions). Two open shapes: (a) a middle-pattern behavior
  monitors AirPlay session state (`mediaElement.remote.state` or
  equivalent) and writes an `airplaySessionActive` slot; a DRM-variant
  behavior reads the slot and reacts (re-request key system,
  re-create MediaKeys, potentially flush buffer + re-fetch license).
  MediaKeys-recreation mid-source is non-trivial — the standard
  source-replacement cascade tears MediaKeys down on
  `presentation.url` change; an AirPlay-triggered recreation would
  need a narrower reset (MediaKeys only, not the rest of the source
  state). (b) Defer the switch entirely: standard FairPlay key system
  is used for both local and AirPlay playback, accepting any degraded
  behavior or playback errors during AirPlay sessions. Likely (a)
  but the implementation is substantial; this open question may
  itself motivate a follow-on feature doc once FairPlay implementation
  ([#1414](https://github.com/videojs/v10/issues/1414)) lands.
- **License-fetcher hook shape.** Single `getLicense(message)` callback
  vs separate request-transformation + response-transformation hooks
  vs a full fetch-wrapper interface. videojs-contrib-eme's shape vs
  more general request/response interceptors. Consumer-policy
  flexibility vs engine-side complexity trade-off.
- **MediaKeys re-use across sources.** When the consumer changes
  sources within the same key system + license server, should the
  engine re-use the existing MediaKeys instance or tear down and
  recreate? Re-use saves the `requestMediaKeySystemAccess` cost but
  complicates lifecycle. videojs-contrib-eme tears down per-source;
  worth verifying whether SPF wants the same default.
- **`keystatuschange` reactivity policy.** Engine-baseline behavior on
  key-status transitions (expired, output-restricted, released, etc.).
  Surface as a state-error slot? Trigger automatic re-request? Defer
  to consumer? Defaulting matters because keystatus changes can fire
  mid-playback.
- **Init-data extraction location.** Parser-side (extract during
  `parseMediaPlaylist`) vs segment-side (extract from segment init
  data via `encrypted` event). Both are valid; parser-side is more
  predictable, segment-side is more reactive. May not be either-or
  per the spec.
- **Cross-feature: DRM + live / DRM + DVR.** Live and DVR streams
  with DRM are valid use cases. The reload-loop interacts with key
  renewal cadence (if licenses expire during a long live session,
  the reload-loop + license-fetcher may both need re-trigger logic).
  Cross-cluster A + F open question; resolution likely after both
  clusters have implementation work.
- **Output-protection-aware ABR coordination.** Renditions tagged
  with security-level / HDCP requirements interact with video-ABR
  and hevc-variant-selection. ABR's candidate set should be filtered
  by the `deviceSecurityLevel` constraint slot before bandwidth-
  driven selection runs. Filter ordering: capability filter
  (physics) → policy caps → security-level → bandwidth-driven
  selection. Per-rendition requirement tagging is open: parser-
  surfaced HLS extension attributes vs runtime-probed via license-
  server policy vs both. Server-side conventions vary.
- **Per-rendition security-level tag surface.** HLS doesn't have a
  spec-defined attribute for "this rendition requires L1 Widevine."
  Providers commonly encode the requirement in proprietary attributes
  (`URI-SECURITY-LEVEL`, etc.) or imply it from `RESOLUTION` thresholds
  (4K+ requires hardware DRM by convention on many platforms). Parser
  needs an extension axis for surfacing the requirement; license-
  server policy is the orthogonal source.

## Related features

- **[capability-probing](./capability-probing.md)** *(hard
  prerequisite)* — owns key-system probing; this feature consumes the
  verdict. Crisp boundary: probing = "can we?"; this feature =
  "set it up."
- **`[fairplay-airplay-workaround]`** *(candidate, this session)* —
  Apple-specific FairPlay quirks during AirPlay sessions. Consumes
  this feature's FairPlay setup as the baseline.
- **[mse-mms-pipeline](./mse-mms-pipeline.md)** — DRM gates MSE
  setup; encrypted-event flow on `mediaElement` triggers session
  creation. Once keys are delivered, segment append proceeds
  unchanged.
- **[capability-probing](./capability-probing.md)** — also relevant
  for `changeType()` probing if mid-stream codec changes interact
  with DRM (uncommon but possible).
- **[source-replacement](./source-replacement.md)** — MediaKeys /
  MediaKeySession cleanup on source change. Standard resolved/
  unresolved cascade with DRM additions.
- **[live-stream-support](./live-stream-support.md)** *(not yet
  implemented)* — DRM + live combines naturally; license-renewal
  cadence during long live sessions is the open question.
- **[dvr-event-stream-support](./dvr-event-stream-support.md)** *(not
  yet implemented)* — DRM + DVR with back-seek through history; key
  delivery for back-seek-fetched segments needs verification.
- **[video-abr](./video-abr.md)** / **[hevc-variant-selection](./hevc-variant-selection.md)**
  — output-protection-aware variant filtering when `drm-security-
  levels` lands.

## See also

- [GitHub issue #1411 — Feature: DRM Support](https://github.com/videojs/v10/issues/1411)
  — the tracking epic; per-key-system sub-issues [#1412 Widevine](https://github.com/videojs/v10/issues/1412),
  [#1413 PlayReady](https://github.com/videojs/v10/issues/1413),
  [#1414 FairPlay](https://github.com/videojs/v10/issues/1414)
- [clusters.md § Encrypted media (DRM)](./clusters.md#encrypted-media-drm)
  — cluster F description; this feature is the foundation
- [clusters.md § Capability probing](./clusters.md#capability-probing)
  — cluster D; the probing prerequisite this feature consumes
- [clusters.md § Feature classification axes](./clusters.md#feature-classification-axes)
  — Media-src feature framing
- [capability-probing.md](./capability-probing.md) — hard
  prerequisite; key-system probing
- [videojs-contrib-eme](https://github.com/videojs/videojs-contrib-eme)
  — Video.js v8 prior art; key-system detection in
  [`src/cdm.js`](https://github.com/videojs/videojs-contrib-eme/blob/main/src/cdm.js)
- [Mux Player DRM integration](https://www.mux.com/docs/guides/protect-videos-with-drm)
  — adapter-layer prior art; `drm-token` attribute on `<mux-player>`
- [W3C Encrypted Media Extensions](https://www.w3.org/TR/encrypted-media/)
  — EME spec; [`MediaKeySystemAccess.getConfiguration()`](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemaccess-getconfiguration)
  is the security-level probing surface
- [HDCP specification (DCP LLC)](https://www.digital-cp.com/) —
  output-protection requirements; the protection-level data this
  feature gates on for high-resolution / premium content
- [HLS Spec — `EXT-X-KEY` / `EXT-X-SESSION-KEY`](https://datatracker.ietf.org/doc/html/rfc8216bis)
