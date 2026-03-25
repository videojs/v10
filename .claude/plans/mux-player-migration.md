# Mux Player Migration Plan
# VJS v10 → `mux-video` / `mux-player` Functional Parity

**Branch:** `feat/mux-player-hls.js-migration`
**Date:** 2026-03-24
**Focus:** HlsVideo path only. SPF path is tracked in the Notion support matrix but is out of scope here.

## Status

| Phase | Description | hls.js | Native |
|-------|-------------|--------|--------|
| 1 | `MuxHlsMediaDelegate` + `MuxVideo` element | ✅ Done | ✅ Done (implicit MSE fallback; no explicit `prefer-playback` yet) |
| 2 | Stream type detection | ✅ Done | ⚠️ Not yet implemented. Requires independent `fetch()` + parse of the multivariant and media playlists (`#EXT-X-PLAYLIST-TYPE`, `#EXT-X-PART-INF`, `#EXT-X-TARGETDURATION`). Reference: `playback-core/src/index.ts:getStreamInfoFromSrcAndType()`. |
| 3 | Error handling | ✅ Done | ⚠️ Not yet implemented. Requires listening to native `error` events, then doing a follow-up `fetch(src)` to recover the HTTP status code for accurate error classification. Reference: `playback-core/src/index.ts:handleNativeError()`. |
| 4 | DRM | ✅ Done (Widevine, PlayReady, FairPlay via EME) | ⚠️ Not yet implemented. Requires two separate FairPlay code paths: modern EME (`eme-fairplay.ts`) and legacy WebKit (`webkit-fairplay.ts`, needed for AirPlay). Both fetch app cert + license from `license.mux.com`. |
| 5 | Mux Data integration | ✅ Done | ⚠️ Not yet implemented. `mux.monitor()` supports native playback without an `hlsjs` argument — the monitoring call is simply skipped when `engine` is null. Needs to call `setupMuxData` with `engine: null` and omit the `hlsjs` option. |
| 6 | Convenience API (`playbackId` → URL, tokens, `prefer-playback`) | ⏳ Not started | ⏳ Not started (`prefer-playback='native'` is gating item) |
| 7 | `MuxPlayer` UI | ⏳ Not started | ⏳ Not started |

---

## Architecture

The stack mirrors the elements repo structure, mapped onto VJS v10's delegate + mixin patterns:

```
elements repo                     → VJS v10 equivalent
─────────────────────────────────────────────────────────────
playback-core (hls.js config)     → MuxHlsMediaDelegate
mux-video (custom element)        → MuxVideo (html package)
mux-player (UI + media-chrome)    → MuxPlayer (html package, createPlayer-based)
```

### Delegate Layer: `MuxHlsMediaDelegate`

Extends the existing `HlsMediaDelegate` (which already handles text tracks). Adds:
- Mux-specific hls.js config (resolution cap, DRM, CMCD, redundant streams)
- Stream type detection from `LEVEL_LOADED`
- Error mapping to Mux error codes
- Pseudo-ended detection

**Location:** `packages/core/src/dom/media/mux/`

### Element Layer: `MuxVideo`

Extends `MediaAttachMixin(MuxCustomMedia)` — same pattern as `HlsVideo`. Adds:
- `playbackId` attribute → `toMuxVideoURL()` → `this.src`
- `playback-token`, `drm-token` attributes → token object
- `env-key` attribute → Mux Data SDK init
- `stream-type`, `target-live-window` properties (populated after manifest load)
- `metadata` property → live heartbeat to Mux Data
- `max-resolution`, `rendition-order`, `cap-rendition-to-player-size` attributes

**Location:** `packages/html/src/media/mux-video/`
**Tag name:** `mux-video`

### Player Layer: `MuxPlayer`

Built with `createPlayer({ features: videoFeatures })` + Mux-specific features. Adds:
- Poster: `https://image.mux.com/{playbackId}/thumbnail.webp?token=`
- Storyboard: `https://image.mux.com/{playbackId}/storyboard.vtt?token=`
- Error dialog UI
- Stream-type-aware control configuration (live indicator, DVR scrubbar)
- `thumbnail-token`, `storyboard-token` attribute handling

**Location:** `packages/html/src/presets/mux.ts` and `packages/html/src/media/mux-video/`

---

## Phases

### Phase 1: `MuxHlsMediaDelegate` + `MuxVideo` element ✅ DONE

**Goal:** A `<mux-video src="...">` element backed by a Mux-tuned hls.js instance, with graceful native fallback when MSE is unavailable. No URL construction — callers compose the `src` externally.

Deliverables:
1. `MuxHlsMediaDelegate` — extends `HlsMediaDelegate`, overrides hls.js config:
   - `backBufferLength: 30`
   - `liveDurationInfinity: true`
   - `MinCapLevelController` wired by default (see below)
   - **Native fallback:** if `!Hls.isSupported()`, skip hls.js entirely and set `target.src` directly. All downstream delegate behavior (stream type, error mapping, Mux Data) must be gated on whether hls.js is actually running.
2. `MinCapLevelController` — port from `playback-core/src/min-cap-level-controller.ts`:
   - Caps ABR at player size, with 720p minimum floor
   - Must be injected at hls.js construction time — can't be done from outside
3. `MuxCustomMedia` = `DelegateMixin(CustomMediaMixin(HTMLElement, {tag:'video'}), MuxHlsMediaDelegate)`
4. `MuxVideo` — extends `MediaAttachMixin(MuxCustomMedia)`, same pattern as `HlsVideo`:
   - No `playbackId`, no URL construction, no token plumbing yet
5. `MuxVideoElement` define file + `safeDefine('mux-video', MuxVideoElement)`
6. Tests for `MinCapLevelController` behavior and native fallback path (`!Hls.isSupported()`)

---

### Phase 2: Stream Type Detection ✅ DONE

**Goal:** `streamType` and `targetLiveWindow` are observable after manifest load; live/DVR assets work correctly.

Deliverables:
1. `updateStreamInfoFromLevelDetails(levelDetails)` — reads hls.js `LevelDetails.type` (VOD/EVENT/LIVE):
   - `streamType: 'on-demand' | 'live' | 'unknown'`
   - `targetLiveWindow: number` (Infinity for EVENT, 0 for LIVE, NaN for VOD)
   - `liveEdgeOffset`: `partTarget * 2` for LL-HLS, `targetDuration * 3` for live
2. Wire into `MuxHlsMediaDelegate` on `Hls.Events.LEVEL_LOADED`
3. `streamtype-change`, `targetlivewindow-change` custom events dispatched from the media element
4. `streamType`, `targetLiveWindow`, `liveEdgeStart` read-only properties on `MuxVideo` (populated after manifest load)
5. `seekable` proxy for live: cap `seekable.end()` at `hls.liveSyncPosition`
6. Tests using fixture manifests (VOD, live, DVR/EVENT)

---

### Phase 3: Error Handling ✅ DONE

**Goal:** hls.js errors surface as structured Mux errors; transient failures retry correctly.

Deliverables:
1. `MuxErrorCode` enum — port from `playback-core/src/errors.ts`
2. `MuxMediaError` — extends `MediaError`, adds `muxCode`, `errorCategory`, `context`, `fatal`
3. Error mapping in `MuxHlsMediaDelegate` on `Hls.Events.ERROR`:
   - HTTP status classification: 4xx JWT errors (missing/malformed/expired/aud mismatch)
   - NETWORK_NOT_READY (412) retry: 6 retries, first after 5s, subsequent after 60s
   - Non-retriable 4xx → fatal, no retry
4. Pseudo-ended detection wired into `MuxHlsMediaDelegate`:
   - Port heuristic from `playback-core` (TARGET-DURATION + last segment duration)
   - Override `ended` getter
5. Tests

---

### Phase 4: DRM ✅ DONE

**Goal:** Widevine, PlayReady, and FairPlay assets decrypt and play.

Deliverables:
1. `getDRMConfig(playbackId, drmToken)` — builds hls.js `drmSystems` config:
   - FairPlay cert + license at `license.mux.com/appcert/fps/` and `license.mux.com/license/fps/`
   - Widevine license at `license.mux.com/license/widevine/` + `HW_SECURE_ALL` robustness
   - PlayReady license at `license.mux.com/license/playready/`
2. Wire into `MuxHlsMediaDelegate` when a `drmToken` is provided (passed as a delegate option)
3. WebKit FairPlay fallback for older Safari — **native path, DRM-triggered:**
   - When EME FairPlay fails, re-initialize using `webkitGenerateKeyRequest` / `webkitAddKey`
   - This forces native HLS playback (hls.js torn down, `target.src` set directly)
   - Distinct from Phase 1 native fallback (which is MSE unavailable); this is intentional re-init after an EME failure
4. FairPlay over AirPlay workaround (iOS 26.1+) — port from `playback-core` 0.33.2
5. `drm-token` attribute on `MuxVideo` — flows into the delegate; this is functional (not convenience), the delegate needs it to configure EME
6. Tests (mock EME / DRM fixtures)

---

### Phase 5: Mux Data Integration ✅ DONE

**Goal:** Playback analytics flow to Mux Data; requires hls.js instance access, so must be inside the delegate.

Deliverables:
1. Add `@mux/mux-embed` as a dependency of `packages/html`
2. `setupMuxData(props, mediaEl, hlsInstance)` — calls `mux.monitor()`:
   - Passes `hlsjs` and `Hls` constructor references (required by mux-embed for monitoring)
   - `automaticErrorTracking: false` (manual error reporting to avoid double-tracking)
   - Custom `errorTranslator` to suppress string-coded hls.js internal errors
   - `view_session_id` and `video_id` injected per session
3. Wire into `MuxVideo` connect/disconnect (or `attach`/`detach`) lifecycle
4. `env-key` attribute — if absent but `src` is a `stream.mux.com` URL, infer env mode
5. `metadata` property → live heartbeat: `mux.emit('hb', metadata)`
6. Error reporting: `mux.emit('error', { player_error_code, player_error_message, player_error_context })`
7. DRM type heartbeat: `mux.emit('hb', { view_drm_type })`
8. Tests (mock `mux-embed`)

---

### Phase 6: Convenience API (playbackId → URL, tokens) ← **Next**

**Goal:** `<mux-video playback-id="...">` works end-to-end without callers constructing the URL.

Deliverables:
1. `toMuxVideoURL(props)` utility — `playbackId` + options → `stream.mux.com` HLS URL:
   - `?redundant_streams=true` appended by default
   - `?max_resolution=`, `?min_resolution=`, `?rendition_order=` optional params
   - When `playback-token` present: emit only `?token=`, strip all other params
   - `customDomain` support
2. `playbackId` attribute/property on `MuxVideo` → calls `toMuxVideoURL()` → sets `this.src`
3. `playback-token` attribute — forwarded as `?token=` into the URL
4. `max-resolution`, `min-resolution`, `rendition-order`, `custom-domain`, `extra-source-params` attributes
5. `prefer-playback='native'` attribute — explicit opt-in to native HLS (AirPlay, user preference):
   - Bypasses hls.js even when `Hls.isSupported()` is true
   - Sets `target.src` directly, same codepath as the Phase 1 MSE-unavailable fallback
   - `prefer-playback='mse'` forces hls.js even on Safari (override native preference)
6. Token validation utilities — check JWT `aud` claim for `thumbnail-token`, `storyboard-token`, `drm-token`
7. Tests for `toMuxVideoURL()`, attribute reflection, and `prefer-playback` behavior

---

### Phase 7: MuxPlayer UI

**Goal:** `<mux-player playback-id="...">` renders a full player with controls, poster, storyboard, and error UI.

Deliverables:
1. `getPosterURLFromPlaybackId(playbackId, token?)` — `image.mux.com/{id}/thumbnail.webp[?token=]`
2. `getStoryboardURLFromPlaybackId(playbackId, token?)` — `image.mux.com/{id}/storyboard.vtt[?token=]`
3. `MuxPlayer` element built with `createPlayer({ features: videoFeatures })`:
   - Shadow DOM contains `<mux-video>` as the media element
   - Uses existing VJS v10 skin/UI system
4. All `MuxVideo` attributes forwarded through to the inner `<mux-video>`
5. `thumbnail-token`, `storyboard-token` attributes with JWT audience validation
6. Poster integration with existing VJS v10 poster UI feature
7. Storyboard integration (timeline preview)
8. Error dialog: maps `MuxMediaError` to human-readable title/message/link
9. Stream-type-aware UI:
   - Live: live indicator, constrained scrubbar
   - DVR: full scrubbar with live-edge indicator
   - Audio-only: suppress video-specific controls
10. `mux-player` tag definition + CDN bundle entry

---

## Key Utilities to Port (from playback-core)

| Utility | Source | Notes |
|---|---|---|
| `toMuxVideoURL()` | `playback-core/src/index.ts:406` | URL construction |
| `MinCapLevelController` | `playback-core/src/min-cap-level-controller.ts` | Custom hls.js controller |
| `updateStreamInfoFromHlsjsLevelDetails()` | `playback-core/src/index.ts` | Stream type detection |
| `getDRMConfig()` | `playback-core/src/index.ts:848` | DRM configuration |
| `fallbackToWebkitFairplay()` | `playback-core/src/webkit-fairplay.ts` | Safari DRM fallback |
| `getErrorFromHlsErrorData()` | `playback-core/src/errors.ts` | Error mapping |
| `getErrorFromResponse()` | `playback-core/src/request-errors.ts` | JWT/HTTP error classification |
| `isPseudoEnded()` | `playback-core/src/index.ts` | Ended detection heuristic |
| `setupMux()` | `playback-core/src/index.ts:1057` | Mux Data init |
| `setupAutoplay()` | `playback-core/src/autoplay.ts` | Smart autoplay |

---

## File Layout (Target)

```
packages/core/src/dom/media/mux/
  index.ts              ← MuxHlsMediaDelegate, MuxCustomMedia, MuxMedia (React)
  stream-info.ts        ← updateStreamInfoFromLevelDetails, stream type types
  url.ts                ← toMuxVideoURL, toPlaybackIdParts
  errors.ts             ← MuxErrorCode, MuxMediaError, getErrorFromHlsErrorData
  drm.ts                ← getDRMConfig, fallbackToWebkitFairplay
  cap-level-controller.ts ← MinCapLevelController
  mux-data.ts           ← setupMuxData
  tests/
    url.test.ts
    stream-info.test.ts
    errors.test.ts

packages/html/src/media/mux-video/
  index.ts              ← MuxVideo class

packages/html/src/define/media/
  mux-video.ts          ← MuxVideoElement + safeDefine('mux-video', ...)

packages/html/src/cdn/media/
  mux-video.ts          ← CDN bundle entry

packages/html/src/media/mux-player/   (Phase 7)
  index.ts              ← MuxPlayer class

packages/html/src/define/
  mux-player.ts         ← MuxPlayerElement + safeDefine('mux-player', ...)
```

---

## Cross-Cutting Concerns

- **`redundant_streams=true`**: Always appended by default (matches `DEFAULT_EXTRA_PLAYLIST_PARAMS` in mux-player). Can be disabled via `extra-source-params`.
- **Native playback (Safari iOS)**: `preferPlayback='native'` skips hls.js entirely; `mediaEl.src` is set directly. The explicit opt-in is deferred to Phase 6. An implicit MSE-unavailable fallback is already wired (`Hls.isSupported() === false` → `target.src = src`). The native path requires four independent implementations that are not yet ported (see status table). The reference `playback-core` handles all four via explicit native-path code: manifest fetch+parse for stream type, native `error` event + follow-up `fetch` for error classification, `eme-fairplay.ts`/`webkit-fairplay.ts` for DRM, and `mux.monitor()` called without `hlsjs` for analytics.
- **Autoplay**: Smart autoplay (muted fallback, live-edge seeking) is deferred. VJS v10 has an existing autoplay feature; Mux-specific live-edge-seek behavior can be added as a feature slice.
- **Audio-only**: Requires UI suppression of video-specific controls. Tracked in the Notion matrix as ⚠️ for HlsVideo. Defer to Phase 7.
- **CMCD**: `preferCmcd` attribute. Deferred; hls.js supports it natively.
- **Multi-language audio tracks**: `AudioTrackList` API not yet wired in VJS v10. Deferred.
