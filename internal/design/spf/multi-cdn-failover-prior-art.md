---
status: draft
date: 2026-06-12
---

# Multi-CDN failover: prior art

> A survey of how eight open-source players and playback engines model CDN
> redundancy and failover, read against SPF's design. It backs
> [features/multi-cdn-failover.md](./features/multi-cdn-failover.md),
> [features/content-steering.md](./features/content-steering.md), and
> [features/network-resilience.md](./features/network-resilience.md), and
> informs the constraint+scope framing in
> [track-switching-model.md](./track-switching-model.md). Iterate freely —
> this is a reference frame, not a status record.

## Scope

The research question: when a source publishes the same content on more than
one CDN (e.g. Mux Video's `?redundant_streams=true`), how do existing players
(a) represent that redundancy, (b) decide a CDN has failed, (c) recover, and
(d) compose with HLS/DASH Content Steering?

Surveyed: video.js v8 http-streaming (VHS), hls.js, dash.js, shaka-player,
rx-player, Media3/ExoPlayer, VLC, OSMF. Citations are against each project's
repository (see *Sources*) at survey time and may drift — verify before
quoting as current.

## The two architectural families

Every player that does real failover falls into one of two camps for **how
redundancy is modeled**. This is the axis SPF is most interesting against.

**Family A — URL/URI rotation at the resource level.** The segment (or
BaseURL) carries *multiple URIs*; failover picks a different URI for that
resource. Redundancy lives *inside* the resource.

- [**shaka**](https://github.com/shaka-project/shaka-player) — segments expose
  `getUris()` → an array; `NetworkingEngine` rotates via
  `index = request.attempt % request.uris.length`
  (`lib/net/networking_engine.js`).
- [**dash.js**](https://github.com/Dash-Industry-Forum/dash.js) — multiple
  `<BaseURL>` per MPD node; `BaseURLController` selects per node
  (`src/streaming/controllers/BaseURLController.js`).
- [**rx-player**](https://github.com/canalplus/rx-player) — `ICdnMetadata[]`
  per Representation; a `CdnPrioritizer` picks among them
  (`src/core/fetchers/cdn_prioritizer.ts`).
- [**media3 (DASH path)**](https://github.com/androidx/media) —
  `BaseUrlExclusionList` filters `BaseUrl` objects
  (`libraries/exoplayer_dash/.../BaseUrlExclusionList.java`).
- [**VLC**](https://github.com/videolan/vlc) — parses multiple `<BaseURL>` but
  *only ever uses `baseUrls.front()`*
  (`modules/demux/adaptive/playlist/BasePlaylist.cpp`) — decorative.

**Family B — pathway/ladder selection.** Redundant variants are *separate
playlists/levels* grouped by a pathway id; failover switches which whole
ladder is active. Redundancy lives *above* the resource.

- [**hls.js**](https://github.com/video-dev/hls.js) — redundant streams become
  separate `Level`s; pathway ids auto-assigned `"."`, `".."`, `"..."`; the
  `ContentSteeringController` swaps ladders
  (`src/controller/level-controller.ts`,
  `src/controller/content-steering-controller.ts`).
- [**VHS**](https://github.com/videojs/http-streaming) — separate playlists
  keyed by `PATHWAY-ID || serviceLocation`; exclusion + steering pathway switch
  (`src/playlist-controller.js`).
- **media3 (HLS path)** — `HlsRedundantGroup` maps pathway ids → playlist URLs
  (`libraries/exoplayer_hls/.../playlist/HlsRedundantGroup.java`).

### Where SPF sits

Family B *in spirit* — redundant variants parse as separate candidate tracks,
failover is a ladder-level concept — but expressed **declaratively as a
selection constraint in the track-switching rule chain** rather than
imperative "switch pathway" controller logic. None of the eight do this. The
closest mental model is hls.js / media3 "pathway = a complete ladder," but
they all *imperatively* reassign level/playlist indices on switch
(`reassignFragmentLevelIndexes()`, `switchPathway()`). SPF makes failover fall
out of the same `candidateSet` computed that already does ABR/track selection:
"prune the failed CDN's tracks, scope falls to the next entry" is structurally
the same operation as any other filter rule. That is the genuinely novel
framing, and it is why the feature needed no parser change and no dedicated
failover state machine — see
[features/multi-cdn-failover.md § How redundant streams are modeled](./features/multi-cdn-failover.md).

## Comparison by axis

| Player | Model | Trip trigger | Recovery | CDN identity | Scope |
|---|---|---|---|---|---|
| **SPF (v10)** | Separate candidate tracks; failover = selection constraint | **First terminal fetch failure** (playlist or segment), no threshold | 300s cooldown expiry (config) | **URL origin, configurable `getCdnId`** | Per-presentation shared list |
| **VHS** | Separate playlists by pathway | First failure → temporal exclude; error *count* → permanent (`maxPlaylistRetries`) | Temporal expiry; permanent past threshold; last-rendition fallback clears others | `PATHWAY-ID \|\| serviceLocation` | Per-playlist + steering |
| **hls.js** | Separate levels by pathway | Cumulative **error threshold/retries**, then penalty box | **300s** penalty cooldown | `PATHWAY-ID` (auto-dotted) | Per-level + per-pathway |
| **dash.js** | Multiple BaseURLs per node | **First failure** → blacklist serviceLocation | Blacklist expiry; **indefinite by default** unless steering TTL | `serviceLocation` + DVB priority/weight | Per-node, sticky-cached |
| **shaka** | Multiple URIs per segment | Per-request retry rotation (modulo) | **Stateless** — each segment restarts at `uris[0]`; steering ban = 60s | serviceLocation / pathway | Per-request |
| **rx-player** | `ICdnMetadata[]` per Representation | First failure → downgrade + per-CDN retry counter → permanent at maxRetry | ~60s downgrade¹; `priorityChange` event pivots mid-backoff | `id` (≈ serviceLocation), baseUrl fallback | Per-segment, global prioritizer |
| **media3** | DASH: BaseUrls; HLS: redundant groups | **First failure, selective HTTP codes** (403/404/410/416/500/503) | **Asymmetric: 300s location / 60s track** | serviceLocation / pathway | 3 layers: chunk / track / location |
| **VLC** | Parses BaseURLs, uses only first | **No inter-CDN failover** — HTTP 3xx redirects only (max 3) | None | hostname/port (implicit) | Per-chunk redirect |
| **OSMF** | `serverBaseURLs[]` parsed but unused | **None** — retries same URL on timeout | None | manifest baseURL | Per-fragment |

¹ rx-player's `DEFAULT_CDN_DOWNGRADE_TIME` reads `60` ms in `default_config.ts`
— most likely a typo for seconds; its tests use `5000`. Treat the intent as
"seconds," the value as unverified.

## Content Steering: near-universal convergence

The modern players implement it almost identically, which validates SPF's
choice to name its ordered list `cdnPriority` after HLS Content Steering's
`PATHWAY-PRIORITY`:

- **hls.js, VHS, dash.js, shaka, media3** all parse a steering manifest with
  `PATHWAY-PRIORITY` / `SERVICE-LOCATION-PRIORITY`, `PATHWAY-CLONES` (HOST /
  PARAMS URI rewriting), TTL-based reload, and `_HLS_pathway` / `_HLS_throughput`
  (or `_DASH_*`) query hints. Steering **reorders** the priority list and can
  **synthesize** new CDN pathways via clones.
- **rx-player** built `CdnPrioritizer` *specifically* as the steering
  substrate but hasn't wired steering in — "waiting for the spec to be
  standardized and relied on in the wild" (`cdn_prioritizer.ts` class comment).
- **VLC, OSMF** — absent.

The industry consensus — "steering reorders the priority list and clone-rewrites
URIs" — is exactly the design [features/multi-cdn-failover.md](./features/multi-cdn-failover.md)
anticipates: `cdnPriority` is a reorderable list a steering behavior would
write (pathway priority as a sort key). The one piece everyone else has that
SPF would add later: **pathway clones** (HOST/PARAMS rewriting to synthesize
CDNs absent from the manifest). SPF's configurable `getCdnId` is the seam where
clone-rewritten URLs would need consistent identity. Tracked in
[features/content-steering.md](./features/content-steering.md).

## Ideas worth adopting

Mapped to the *Follow-up candidates* in
[features/multi-cdn-failover.md](./features/multi-cdn-failover.md):

1. **Asymmetric cooldowns (media3, hls.js).** media3 uses **300s for
   location/CDN exclusion vs 60s for track exclusion** — the principle being
   "CDN failures are infrastructure problems (longer) than bitrate issues
   (shorter)." This is the prior art behind bumping SPF's default cooldown
   from 30s to **300s**. The next refinement — cooldown-extension on re-failure
   — is what hls.js's penalty box and media3's exclusion already do.

2. **rx-player's `priorityChange` event** is the most elegant recovery design:
   when a downgraded CDN's cooldown expires it *interrupts an in-flight backoff
   wait* and pivots immediately. Push-driven recovery, not "next request happens
   to re-check." Relevant if SPF ever wants recovery faster than the next
   natural fetch.

3. **media3's `LoadErrorHandlingPolicy` / `FallbackSelection` /
   `FallbackOptions`** is the cleanest *abstraction*: a pluggable policy that,
   given `FallbackOptions(numberOfLocations, numberOfTracks)`, returns either a
   location-fallback or a track-fallback with a duration — and **prefers
   location fallback over track fallback** when both are available. It cleanly
   separates "this is a CDN problem" from "this is a quality problem." SPF's
   `applyConstraints` pre-pass is the analogous seam; a mature policy layer on
   top would look like this.

4. **Selective HTTP-status classification (media3; VHS's 410→permanent,
   429→Retry-After).** Directly addresses the *HTTP-status classification is
   coarse* follow-up. media3 is the reference for which codes should trip vs
   retry.

5. **VHS's last-rendition fallback** — when excluding the final playlist,
   proactively clear other temporal exclusions instead of erroring — is exactly
   the *all-CDNs-down has no terminal state* gap. Their answer: don't have a
   terminal state; re-admit everyone and retry rather than hard-fail.

6. **shaka's stateless per-request rotation** is the opposite end from SPF — no
   cross-request memory, every segment starts at `uris[0]`. Dead simple, no
   flapping logic, but no stickiness either. Worth knowing as the minimal
   baseline; SPF's sticky `cdnPriority` + cooldown is deliberately more stateful.

## Where SPF is distinctive

- **CDN identity from URL origin, not a manifest signal.** Everyone else keys
  on an explicit manifest token (`serviceLocation` for DASH, `PATHWAY-ID` for
  HLS). SPF derives identity from the URL because Mux's `?redundant_streams=true`
  doesn't emit pathway tags — and `getCdnId` makes it configurable (origin vs
  `cdn=` param). A gap-filler the spec-bound players don't need but also can't
  do; the right call for untagged redundancy.
- **Failover as a pure rule in an existing selection chain**, not a dedicated
  controller with its own state. Every other player carries a distinct object
  (`ContentSteeringController`, `BaseURLSelector`, `CdnPrioritizer`,
  `BaseUrlExclusionList`). SPF's failover is a constraint over tracks plus a
  per-source cooldown timer (`setupFailoverMonitor`) — a smaller surface than
  anyone else.
- **Trip-on-first-failure with cooldown-only backoff** matches dash.js and the
  spirit of media3, but is more aggressive than hls.js / rx-player, which both
  count errors before tripping. SPF's bet — "absorbing transient blips is the
  retry layer's job, once it exists" — is reasonable but means it is more
  sensitive to a single blip than hls.js until network-resilience lands.

## Sources

Surveyed repositories (paths are within each repo, read against its default
branch at survey time — verify before quoting as current):

- video.js v8 http-streaming (VHS) — https://github.com/videojs/http-streaming — `src/`
- hls.js — https://github.com/video-dev/hls.js — `src/controller/`
- dash.js — https://github.com/Dash-Industry-Forum/dash.js — `src/streaming/`, `src/dash/controllers/`
- shaka-player — https://github.com/shaka-project/shaka-player — `lib/net/`, `lib/util/content_steering_manager.js`
- rx-player — https://github.com/canalplus/rx-player — `src/core/fetchers/`
- Media3 / ExoPlayer — https://github.com/androidx/media — `libraries/exoplayer*/`
- VLC — https://github.com/videolan/vlc — `modules/demux/adaptive/`
- OSMF — https://github.com/denivip/OSMF — `framework/OSMF/org/osmf/net/httpstreaming/`

External references:

- [Mux Video — `?redundant_streams=true`](https://www.mux.com/docs/guides/play-back-on-multiple-cdns)
- [HLS Content Steering (draft-pantos-hls-rfc8216bis)](https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis)
- [DASH-IF Content Steering](https://dashif.org/docs/DASH-IF-CTS-00XX-Content-Steering-Community-Review.pdf)
