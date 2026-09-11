---
status: partial
date: 2026-09-10
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

Tracked via **[GitHub issue #1776](https://github.com/videojs/v10/issues/1776)**
("Feature: SPF DRM"). The non-SPF DRM work that once shared this doc's
tracking epic has shipped and is now prior art:
[#1411](https://github.com/videojs/v10/issues/1411) (retitled "DRM API for
Legacy Engine Medias"), [#1772 hls.js](https://github.com/videojs/v10/issues/1772),
[#1775 Mux integration](https://github.com/videojs/v10/issues/1775), and the
per-key-system sub-issues
[#1412](https://github.com/videojs/v10/issues/1412)–[#1414](https://github.com/videojs/v10/issues/1414)
(all closed). Milestone: GA. Prior art: the in-repo DRM modules
(`@videojs/media`'s `core/drm.ts` contract, the hls.js bridge in
`adapters/hlsjs-video/src/drm.ts`, the native FairPlay implementation in
`adapters/native-hls-video/src/fairplay-eme.ts` + `fairplay-webkit.ts`,
and `adapters/mux-video/src/drm.ts` token-derived license URLs),
[videojs-contrib-eme](https://github.com/videojs/videojs-contrib-eme)
(Video.js v8 plugin), [Mux Player DRM integration](https://www.mux.com/docs/guides/protect-videos-with-drm)
(Widevine + PlayReady + FairPlay via `drm-token` attribute).

## Status

- **Composition:** implemented in `createHlsVideoEngine`, which composes
  `exchangeLicenses` then `setupMediaKeys` unconditionally and defaults
  `canPlayTrack` / `reportUnsupportedTrackConditions` to their DRM-aware
  variants over `config.drm`. Absent or empty `drm` is the degenerate
  case: encrypted renditions refuse exactly as a DRM-less engine
  refuses them, pruned before selection with
  `SVTA_UNSUPPORTED_DRM_SYSTEM` causes. `parseMediaPlaylist` surfaces
  structured `#EXT-X-KEY` metadata (`MediaPlaylistKey`; the boolean
  `encrypted` derives from it). `#EXT-X-SESSION-KEY` is still
  unrecognized, which matters: Mux emits no session-key tag in the
  multivariant playlist, so encryption is undiscoverable until a media
  playlist is fetched — hence pruning at resolve time rather than at
  manifest parse.
- **Behavior split:** two behaviors, not one. `setupMediaKeys`
  negotiates a key system, applies the server certificate, attaches
  MediaKeys, and owns the `segmentLoadingBlocked` load gate;
  `exchangeLicenses` opens sessions and exchanges licenses. The handoff
  is `context.mediaKeys` + `state.negotiatedKeySystem`, published
  together only after the certificate is applied — which is what
  carries the "certificate before `generateRequest`" ordering across
  the boundary. `exchangeLicenses` is composed **first**:
  `createComposition` calls cleanups in registration order, so its
  sessions must close before the detach.
- **Per-key-system composability:** each system is one
  `KeySystemModule` value (`media/drm.ts` for the DOM-free contract,
  `media/dom/key-systems.ts` for `widevineKeySystem`,
  `playReadyKeySystem`, `fairPlayKeySystem`, `DEFAULT_KEY_SYSTEMS`),
  carrying its `keyFormats`, request-string variants, init-data types,
  preferred video robustness, encryption-scheme fallback, manifest
  init-data projection, and license-message shaping. `config.keySystems`
  narrows the list; dropping `playReadyKeySystem` removes its PSSH wrap,
  its XML envelope unwrap, and `DOMParser` from the bundle. Replaces six
  string-keyed lookup tables that previously split one system's facts
  across the DOM boundary.
- **Droppability (measured 2026-08-27):** DRM costs +2,760 B gzipped
  over the pre-DRM engine; a composition omitting the two behaviors and
  the two DRM-aware config defaults recovers 2,512 B of that (**91%**),
  leaving ~248 B residue — ~130 B parser key metadata, 11 B `drm`
  config threading, 10 B the gate read in `load-segments`, the rest
  unrelated branch-era churn. Pinned by
  `playback/engines/hls/tests/engine-drm-optional.test-d.ts`, which
  asserts the DRM-free composition materializes none of the three DRM
  slots. The DRM-free **engine variant** is not built yet; the
  measurement patches `engine.ts` directly. A spread-based additive
  variant (`[...BASE_PRE, setupMediaKeys, ...BASE_POST]`) typechecks
  with inference intact, so it needs no duplicated behavior list — the
  cost that sank the short-lived `createDrmHlsVideoEngine`.
- **Consumer contract already landed:** `source.drm` is typed by
  `@videojs/media`'s `DrmSystemsConfig` (`packages/media/src/core/drm.ts`) —
  license servers keyed by EME key-system id, `licenseUrl` + optional
  `serverCertificateUrl` — and is already consumed by the hls.js bridge
  (`adapters/hlsjs-video/src/drm.ts`), the native FairPlay implementation
  (`adapters/native-hls-video/src/fairplay-eme.ts` + `fairplay-webkit.ts`,
  including a DRM error taxonomy), and the Mux token derivation
  (`adapters/mux-video/src/drm.ts`, one DRM token → all three systems' URLs). The SPF `mux-video` adapter derives
  Mux's three license servers from `drm.token`, with entries naming
  servers outright overriding them; the SPF `hls-video` adapter consumes
  `source.drm` directly, naming every composed key system up front with a
  resolver that reads whatever source is current, so the engine is never
  rebuilt when the source changes. A Mux DRM CMAF
  playlist fixture (Widevine PSSH + PlayReady PRO + FairPlay `skd://`, all
  `METHOD=SAMPLE-AES`) exists at
  `packages/spf/src/media/hls/tests/fixtures/drm-cmaf-video.m3u8`.
- **Definition depth:** sketched — scope identified from GitHub issue
  + prior art (including a 2026-08 survey of hls.js, Shaka, dash.js,
  and rx-player DRM architecture), and the EME setup / license flow /
  per-key-system phases below are implemented and tested, and the
  `keystatuschange` report-only baseline landed (see Open questions).
  Still coarse: the key-status *policy* layer (re-request, exclusion),
  security-level probing, and the AirPlay handoff (designed, unbuilt —
  see Open questions).
- **Hard prerequisite:** [capability-probing](./capability-probing.md)'s
  "Key-system capability probing" phase. The probe must resolve
  before this feature commits to a key system, sets up MediaKeys,
  or fetches a license. Crisp boundary per
  [clusters.md § Encrypted media (DRM)](./clusters.md#encrypted-media-drm):
  probing answers "can we?"; this feature answers "set it up."

## Phases of complexity

Scope slices around the implementation layers. Per-key-system
specifics are listed within a single phase row rather than as
separate phases.

| Phase | What | Notes |
|---|---|---|
| EME setup pipeline | Capability-probing's key-system verdict drives `navigator.requestMediaKeySystemAccess(...)`, which produces a `MediaKeys` instance attached via `mediaElement.setMediaKeys(mediaKeys)`. Ordering relative to MediaSource attachment is **not** spec-constrained the way this doc once claimed: Shaka and rx-player attach MediaKeys *after* `src`/MediaSource is linked (rx-player documents that ordering), hls.js gates fragment *loads* rather than MSE setup, dash.js gates nothing. The functional invariant is only that keys exist before encrypted data must decode. Sessions start manifest-driven (`MediaKeySession.generateRequest` with playlist-derived init data), with the `encrypted` event as fallback | Shared infrastructure regardless of key system. The SPF composition question is where the readiness gate composes — see Likely cross-cutting impact; the lean is a gate on the segment-load path, leaving `setupMediaSource` untouched in every variant |
| License flow | Per-source license-server configuration via the landed `DrmSystemsConfig` contract (`licenseUrl` + optional `serverCertificateUrl` per key system). `MediaKeySession.message` event → POST message to server → `MediaKeySession.update(licenseResponse)`. Per-key-system request/response quirks (PlayReady challenge-unwrap, FairPlay SPC/CKC bodies) live in internal adapters, as every surveyed engine does | The consumer contract is settled: `source.drm` (`packages/media/src/core/drm.ts`), already how Mux, hls.js, and native FairPlay are configured. Callback hooks (`licenseXhrSetup`-style request/response shaping) are deferred until a concrete need |
| Per-key-system specifics | Widevine, PlayReady, FairPlay. Per-system: init-data format (PSSH for Widevine, PRO box for PlayReady, content-id derivation for FairPlay), license URL conventions, license body format, server-certificate handshake (FairPlay), browser-API quirks. **FairPlay-AirPlay is a distinct key system from standard FairPlay** (see [capability-probing](./capability-probing.md)'s four-key-system enumeration) — active when content streams via AirPlay; entering/exiting AirPlay mid-playback is a *runtime state change*, not a compose-time variant, handled as a runtime handoff (see Open questions) | The shared pipeline + license flow above handle most of the machinery; each key system adds its own init-data + license-format adapters. In-repo references: `adapters/native-hls-video/src/fairplay-eme.ts` (FairPlay SPC/CKC + certificate handshake) and `fairplay-webkit.ts` (the legacy `WebKitMediaKeys` fallback); the Mux fixture shows Widevine/PlayReady keys arriving as complete PSSH / PRO `data:` URIs in `#EXT-X-KEY`. FairPlay-AirPlay sits as a runtime-switchable variant of FairPlay specifically |
| Key delivery and `keystatuschange` reactivity | Browser receives keys via `MediaKeySession.update()`; encrypted segments decrypt automatically. `MediaKeySession.keystatuses` Map tracks per-key status (`usable`, `expired`, `output-restricted`, `released`, etc.); `keystatuschange` event fires on changes. Engine reacts to status transitions (e.g., expired key → re-request) | The report-only baseline is implemented in `exchangeLicenses`: `expired` / `output-restricted` / `internal-error` transitions report SVTA 4003 / 4007 / 4014 so the silent-stall shapes are diagnosable. Richer handling stays consumer-policy-driven. Prior-art consensus (hls.js, Shaka, dash.js, rx-player): `output-restricted` / `internal-error` map to rendition-level exclusion, never a fatal error — SPF's constraint+filter pattern beside `excludeUnplayableTracks` |
| Security-level capability and constraint filtering | Probe device security level (Widevine L1 hardware-backed / L2 hybrid / L3 software-only; PlayReady SL150 / SL2000 / SL3000; FairPlay key-duration / persistent-vs-streaming model) via `MediaKeySystemAccess.getConfiguration()`. HDCP output-protection requirements similarly probed. Match against per-rendition security-level requirements (e.g., 4K HDR HEVC often requires L1 Widevine) and license-server policy. Write a `deviceSecurityLevel` constraint slot read by ABR / variant selection; renditions exceeding the device's level filter out, or the engine surfaces a failure when no compatible rendition remains | Constraint+filter pattern parallel to [rendition-selection-caps](./rendition-selection-caps.md) and [hevc-variant-selection](./hevc-variant-selection.md). Probing extends [capability-probing](./capability-probing.md)'s key-system probe with security-level configuration. Borderline classification (Media-src for "play protected content correctly"; Player for customer-policy caps) — current scope leans Media-src |
| Parser surface for key tags | `parseMediaPlaylist` surfaces structured key metadata (METHOD / KEYFORMAT / URI / KEYID) from `#EXT-X-KEY`, replacing today's boolean `encrypted` flag; multivariant parser surfaces `#EXT-X-SESSION-KEY` at presentation resolution. For Widevine / PlayReady the key URI is a `data:` URI carrying a complete PSSH / PRO (Mux emits this), so manifest-driven init data flows from the parsed-track output to the EME pipeline | Parser-side change. Today `#EXT-X-KEY` is recognized only enough to flag a rendition `encrypted`; the structured detail is dropped and `#EXT-X-SESSION-KEY` is unrecognized |
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
- **Full-segment clear-key AES** (`METHOD=AES-128` and the AES-256
  family) — owned by [clear-key-aes](./clear-key-aes.md). Not DRM: a
  segment-pipeline decrypt keyed off the `identity` keyformat, no EME.
  The boundary is the keyformat. Such content misreports
  `SVTA_UNSUPPORTED_DRM_SYSTEM` today; correcting that diagnosis to name
  the real gap is this feature's error-surface concern, and lands ahead
  of any decryptor.

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

- **Key-readiness gate placement — composition-variant placement.**
  The functional requirement is that keys are available before
  encrypted data must decode; no surveyed engine gates MediaSource
  attachment on MediaKeys. Prior art: Shaka sets `video.src` first and
  calls `setMediaKeys()` after (deferring further for FairPlay);
  rx-player attaches MediaKeys only once the MediaSource is linked and
  blocks segment push until then; hls.js gates fragment loads on key
  readiness (including the last clear fragment before an `#EXT-X-KEY`
  boundary); dash.js gates nothing and lets the element stall. Today's
  MSE gates per [mse-mms-pipeline.md](./mse-mms-pipeline.md):
  MediaElement + presentation URL + `'open'` readyState gate
  `setupMediaSource`; resolved track + open MediaSource gate
  `setupSourceBuffers`. Per the failure-mode catalog's composition-
  variant entry: variant-specific behaviors compose into DRM-required
  engine variants, not as runtime branches in always-on behaviors.
  Three shapes:
  - **(a)** DRM-required engine variant composes a *different*
    `setupMediaSource` that gates on a `mediaKeysReady` signal before
    attaching; standard `setupMediaSource` composes into non-DRM
    engines unchanged.
  - **(b)** A new `setupMediaKeys` behavior writes to a generic
    "ready-to-attach" gate slot that `setupMediaSource` reads;
    standard engines provide a default-true writer for the slot.
  - **(c)** `setupMediaSource` is untouched in every variant; the DRM
    variant composes the gate on the **segment-load path** (an FSM
    precondition on `mediaKeysReady` in the load behaviors), mirroring
    hls.js's fragment-load gate and rx-player's push-block, and
    matching the existing gate-shape convention (FSM precondition
    state with `monitor`-driven exit).
  **Resolved: (c).** Implemented as `state.segmentLoadingBlocked`, read
  by the `load*Segments` dispatchers and deliberately *not* by
  `setupMediaSource` — that asymmetry in what each gate forbids is why
  it is a separate slot from `loadingSuspended` rather than folded into
  it. The slot names the prohibition, not the domain, so
  `load-segments` carries no DRM vocabulary.
  Beyond that gate, additional DRM gates fire downstream:
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
- **State slots for DRM lifecycle.** Resolved as three, each
  single-writer: `state.segmentLoadingBlocked` (the load gate,
  `setupMediaKeys`), `state.negotiatedKeySystem` (the chosen system, or
  the `NO_KEY_SYSTEM` sentinel when negotiation was refused), and
  `context.mediaKeys`. No `drmReady`: nothing needed the conjunction.
  The sentinel exists because "not yet negotiated" and "refused" are
  different facts for rendition pruning, and encoding the second as a
  reserved string keeps the slot `string | undefined` — real key-system
  ids are reverse-DNS, so they cannot collide.
- **Verdict ownership.** `setupMediaKeys` reports only the *cause*
  (`SVTA_UNSUPPORTED_DRM_SYSTEM`). The *verdict* stays
  `track-switching`'s: publishing `NO_KEY_SYSTEM` re-fires its
  constraint chain, where `excludeRefusedKeySystems` prunes every
  encrypted rendition, so a type left with nothing reports
  `SVTA_NO_SUPPORTED_{VIDEO,AUDIO}_TRACK` from its owner and a type
  keeping a clear rendition still reports nothing. The constraint
  reaches the chain through `switch*Track`'s append-only
  `extraConstraints` config — an interim seam until the full constraint
  chain is passed in.
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
- **License-fetcher composability.** The consumer contract is settled:
  `source.drm`'s `DrmSystemsConfig` (`packages/media/src/core/drm.ts`) —
  declarative license-server URLs per key system — already describes
  Mux (`createMuxDrmSystems` derives every URL from one DRM token),
  hls.js, and native FairPlay. Per-key-system body/header quirks live
  in internal adapters. Pluggable request/response hooks
  (videojs-contrib-eme's `getLicense`, hls.js's `licenseXhrSetup`) are
  deferred until a concrete consumer need; nothing in the Mux path
  requires them.
- **Per-key-system browser-API differences.** Widevine, PlayReady,
  FairPlay all have spec-compliant EME surfaces, but the
  init-data formats, license-message formats, server-certificate
  handshakes, and key-status semantics differ. Per-key-system adapter
  modules (one per sub-issue) handle the system-specific logic; the
  shared EME pipeline calls into them via a uniform interface.

## Verification

Unit tests cover the key-system configuration the engine builds, including the invariant that a
negotiation offers no unstamped capability. That invariant is not self-evident, so it is worth stating
why it exists: Chromium warns "It is recommended that a robustness level be specified" for **any
configuration in the requested list** that omits `robustness` — not only the one it accepts. Reading the
accepted configuration instead is what let three separate fixes ship believing the warning was gone.

Confirming the warning is actually absent needs a real CDM, so it lives in an opt-in E2E suite:

```bash
pnpm test:e2e:drm
```

`apps/e2e/suites/drm` negotiates against a real Widevine CDM and asserts both halves — every requested
capability names a tier, and Chromium logs no robustness warning. It borrows the CDM from a local Google
Chrome install and runs headed, because a CDM will not provision otherwise; where Chrome is absent the
suite skips itself rather than failing. It is deliberately outside `test:all`, since hosted CI cannot
satisfy it.

The `drmContext` fixture in that suite owns the launch recipe — a persistent profile with the CDM copied
in, and the component updater left enabled. Four simpler shapes were measured and all reach ClearKey
only; the fixture's own comment records them, so a second DRM test inherits a working CDM rather than
rediscovering it.

## Open questions

- **Variant-decision signal source.** Adapter-upfront opt-in (consumer
  knows the source is DRM-protected, instantiates a DRM-capable
  engine variant) vs detect-from-parser (engine sees `#EXT-X-KEY` and
  routes to DRM-capable composition). Adapter-upfront is simpler;
  detect-and-route is more adaptive but adds composition-time-
  decision complexity.
- **Composition-variant shape for the key-readiness gate.** Per the
  cross-cutting note: variant `setupMediaSource` (a) vs generic
  ready-to-attach slot (b) vs segment-load-path gate (c). The
  prior-art survey removed the premise that `setMediaKeys` must
  precede MediaSource attachment, which is what made (a) attractive.
  Lean: (c) — confirm against the load behaviors' FSM shape when
  implementation starts.
- **FairPlay-AirPlay runtime handoff.** Resolved 2026-09-11 as shape
  (a) — a session fact plus a DRM behavior that reacts to it — with
  `setupAirPlay`'s `loadingSuspended` as the session fact (WebKit's
  `remote.state` does not track AirPlay reliably; `@videojs/core` skips
  it for the same reason). Two pieces, neither built yet. (1)
  `setupMediaKeys` treats an observed `loadingSuspended` as
  `preconditions-unmet`, so its own cleanup performs the MediaKeys-only
  reset — sessions close via `exchangeLicenses`, then `setMediaKeys(null)`
  — and re-negotiation rides the falling edge with the MediaSource
  rebuild. (2) A droppable `setupAirPlayFairPlay` behavior, gated on the
  session fact, a FairPlay key, a `com.apple.fps` entry, and a cleared
  `context.mediaKeys`, negotiates `com.apple.fps` with `skd` init data
  for the receiver's key requests through the same fetch and transform
  layers, keeps persistent `message` listeners (the receiver proxies its
  own SPC through the sender's CDM on connect and on disconnect), and
  dedupes nothing that could drop those. The handoff is needed regardless
  of any browser bug: the MSE MediaKeys are negotiated for `sinf`/`cenc`
  and cannot serve the `skd` requests the native fallback source raises.
  **The legacy fallback (`WebKitMediaKeys`, `com.apple.fps.1_0`) is
  deferred pending a device re-check.** Prior art: elements PR
  [muxinc/elements#1277](https://github.com/muxinc/elements/pull/1277)
  falls back to it only on `NotSupportedError` from `generateRequest`
  while `webkitCurrentPlaybackTargetIsWireless`, non-sticky, with no OS
  sniffing — an Apple sender bug on iOS/macOS 26.1–26.2 that may since be
  fixed. Legacy lacks SPC v3 and works for `src=` only, so it is never the
  primary path. Device verification gates both pieces; unit tests pin
  protocol and lifecycle against stubs only.
- **MediaKeys re-use across sources.** When the consumer changes
  sources within the same key system + license server, should the
  engine re-use the existing MediaKeys instance or tear down and
  recreate? Re-use saves the `requestMediaKeySystemAccess` cost but
  complicates lifecycle. Prior art splits: rx-player re-uses via a
  WeakMap-keyed attacher (MediaKeys + session cache across loads,
  guarded by config compatibility); hls.js tears down per manifest,
  serializing CDM cleanup across instances through a static promise;
  videojs-contrib-eme tears down per-source. Lean: teardown-per-source
  initially (matches the resolved/unresolved cleanup cascade); re-use
  is an optimization with prior art when needed.
- **`keystatuschange` reactivity policy.** The report-only baseline
  landed in `exchangeLicenses`: each session's `keystatuschange` is
  observed, and a key transitioning to `expired` / `output-restricted`
  / `internal-error` reports SVTA 4003 / 4007 / 4014 with the key id,
  deduped per key so CDM re-fires stay quiet while recovery-then-
  re-failure re-reports. Still open is the *policy* layer: automatic
  re-request on expiry, and rendition exclusion on output restriction
  (prior-art consensus: exclusion, never fatal). Defaulting matters
  because keystatus changes can fire mid-playback.
- **Init-data extraction location.** Partially resolved by prior art +
  Mux's manifests: for Widevine and PlayReady the `#EXT-X-KEY` URI is
  a `data:` URI carrying a complete PSSH / PRO (hls.js uses it as-is),
  so parser-side manifest-driven init data is the primary path and the
  `encrypted` event is the fallback; FairPlay's `skd://` URI has no
  playlist init data, so it stays event-driven (`sinf`). Residual:
  where the fallback listener lives and how the two paths dedupe
  sessions.
- **Cross-feature: DRM + live / DRM + DVR.** Live and DVR streams
  with DRM are valid use cases. The reload-loop interacts with key
  renewal cadence (if licenses expire during a long live session,
  the reload-loop + license-fetcher may both need re-trigger logic).
  Cross-cluster A + F open question; resolution likely after both
  clusters have implementation work.
- **Key rotation ≠ live (current scope).** Rotation and liveness are
  independent, and only one cell is unsupported. `exchangeLicenses`'
  manifest loop licenses every key declared at entry, so **VOD key
  rotation** (all `EXT-X-KEY` present at load) is covered, and
  **FairPlay live rotation** rides the `encrypted` fallback (each key
  licensed as its segment appends). **Single-key live** (Mux) is
  covered. The one gap is **mid-stream rotation for Widevine /
  PlayReady on a live reload**: the entry captures the presentation
  once (single-positive-state reactor, for source identity), later
  reloads' keys are never re-scanned, and the `encrypted` fallback
  isn't armed for manifest-licensed content. The fix — a reactive
  re-scan of `declaredDrmKeys` (dedup by manifest attribute identity,
  reusing `toInitData` → `openSession`), or licensing on `encrypted`
  encounter — also subsumes the eager per-key license fan-out, so the
  two are one design question. Unverified even for VOD: no
  temporal-rotation asset exists in the test set, and generating a
  real-DRM one needs a license server serving rotating keys
  (clear-key / CENC rotation wouldn't exercise the WV/PR/FP path).
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
- **`[fairplay-airplay-workaround]`** *(candidate)* — the legacy
  `WebKitMediaKeys` fallback for senders whose EME cannot generate a
  request during an AirPlay session. Real work only if the device
  re-check shows the Apple bug persists; the EME handoff itself lands in
  this feature.
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

- [GitHub issue #1776 — Feature: SPF DRM](https://github.com/videojs/v10/issues/1776)
  — the tracking issue; the shipped legacy-engine work lives under
  [#1411](https://github.com/videojs/v10/issues/1411) ("DRM API for
  Legacy Engine Medias") and its closed sub-issues
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
