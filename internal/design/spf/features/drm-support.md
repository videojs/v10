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
| EME setup pipeline | Capability-probing's key-system verdict drives `navigator.requestMediaKeySystemAccess(...)`, which produces a `MediaKeys` instance. `mediaElement.setMediaKeys(mediaKeys)` attaches to the `<video>` element before or during MediaSource setup. Encrypted-event handling on the media element drives `MediaKeySession.generateRequest(initDataType, initData)` to start a session | Shared infrastructure regardless of key system. Gates MSE setup / segment append on key-system readiness |
| License flow | Per-source license-server configuration (consumer-provided URL + optional headers / auth tokens). `MediaKeySession.message` event → fetch license from server → `MediaKeySession.update(licenseResponse)`. Pluggable hooks for consumer policies (custom headers, body transformation, response transformation) | Consumer-facing config surface lives here. Mux Player's `drm-token` attribute is one consumer of this; videojs-contrib-eme's per-key-system config is another precedent |
| Per-key-system specifics | Widevine ([#1412](https://github.com/videojs/v10/issues/1412)), PlayReady ([#1413](https://github.com/videojs/v10/issues/1413)), FairPlay ([#1414](https://github.com/videojs/v10/issues/1414)). Per-system: init-data format (PSSH for Widevine, PRO box for PlayReady, content-id derivation for FairPlay), license URL conventions, license body format, server-certificate handshake (FairPlay), browser-API quirks | Three sub-issues. The shared pipeline + license flow above handle most of the machinery; each key system adds its own init-data + license-format adapters |
| Key delivery and `keystatuschange` reactivity | Browser receives keys via `MediaKeySession.update()`; encrypted segments decrypt automatically. `MediaKeySession.keystatuses` Map tracks per-key status (`usable`, `expired`, `output-restricted`, `released`, etc.); `keystatuschange` event fires on changes. Engine reacts to status transitions (e.g., expired key → re-request) | Tier 2-ish: engine can ignore non-`usable` statuses initially (key expiry surfaces as a playback failure); richer handling is consumer-policy-driven |
| Parser surface for key tags | `parseMediaPlaylist` recognizes `#EXT-X-KEY` and `#EXT-X-SESSION-KEY` from media playlists; multivariant parser surfaces session keys at presentation resolution. Init-data flows from the parsed-track output through MSE setup to the EME pipeline | Parser-side change. Today neither tag is recognized; both are silently passed through |
| Encrypted-event handling on `SourceBuffer` / mediaElement | `encrypted` event on `mediaElement` triggers session creation via init-data. Once keys are delivered, segment-append proceeds normally; the engine doesn't intervene per-segment | Cross-cluster MSE concern; segment-append flow is unchanged for encrypted streams aside from the key-readiness gate |

## What's in scope vs out of scope

**In scope:**
- All six phases above for HLS protected content with EME-supported
  key systems (Widevine, PlayReady, FairPlay)
- MediaKeys / MediaKeySession lifecycle management (per-source setup,
  source-change cleanup)
- License fetcher with consumer-pluggable URL / headers / body
  transformation hooks
- Parser surface for `#EXT-X-KEY` and `#EXT-X-SESSION-KEY` tags
- `keystatuschange` event reactivity baseline (surface failures)
- Engine-composition variant for DRM-required content

**Out of scope (separate Media-src candidate features):**
- **`[drm-security-levels]`** *(candidate, this session)* — HDCP
  output-protection requirements, hardware-DRM enforcement, security-
  level constraints (e.g., HEVC requires hardware DRM for L1
  Widevine). Layered on top of this feature's MediaKeys configuration
  surface.
- **`[fairplay-airplay-workaround]`** *(candidate, this session)* —
  Apple-specific FairPlay quirks during AirPlay sessions. Consumes
  this feature's FairPlay setup as a baseline.
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

- **Two-stage gate on MSE setup.** Today's gates (per
  [mse-mms-pipeline.md](./mse-mms-pipeline.md)): MediaElement +
  presentation URL + `'open'` readyState gate setupMediaSource;
  resolved track + open MediaSource gate setupSourceBuffers. DRM
  introduces additional gates between these: (a) capability-probing
  result for the key system (Tier 1 gate, fires once), (b) MediaKeys
  attached to mediaElement (gate on `setMediaKeys()` promise resolving,
  fires once per source), (c) keys available for the encrypted
  segments being appended (gate on `keystatuschange`, fires on
  key delivery). Net effect: MSE setup and segment append wait on
  more preconditions; gate slot family extends.
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
- **Output-protection-aware ABR.** The video-ABR algorithm doesn't
  today consider per-rendition output-protection requirements (e.g.,
  some HEVC renditions require hardware DRM for L1 Widevine; HDCP
  requirements may differ per rendition). When `drm-security-levels`
  lands, ABR may need to filter the candidate set based on the
  current security-level state. Cross-feature with `video-abr` and
  the upcoming `drm-security-levels` doc.

## Related features

- **[capability-probing](./capability-probing.md)** *(hard
  prerequisite)* — owns key-system probing; this feature consumes the
  verdict. Crisp boundary: probing = "can we?"; this feature =
  "set it up."
- **`[drm-security-levels]`** *(candidate, this session)* — extends
  this feature with HDCP / output-protection / hardware-DRM
  enforcement. Consumes the MediaKeys configuration surface.
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
  — EME spec
- [HLS Spec — `EXT-X-KEY` / `EXT-X-SESSION-KEY`](https://datatracker.ietf.org/doc/html/rfc8216bis)
