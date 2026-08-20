# SPF DRM — Widevine vertical slice (temporary plan; delete before merge)

Branch: `feat/spf-drm`. Tracking: [#1776](https://github.com/videojs/v10/issues/1776).
Registry: `internal/design/spf/features/drm-support.md` (updated 2026-08-20 with the
prior-art survey; the gate-shape lean is **(c)** — gate the segment-load path, leave
`setupMediaSource` untouched).

Goal: the sandbox's Mux DRM source (`apps/sandbox/app/shared/sources.ts`,
`DRM_PLAYBACK_ID` + `DRM_SYSTEMS`) plays end-to-end on Chrome/Widevine through an
SPF DRM-composed engine variant. FairPlay/PlayReady adapters are shaped but not built.

**Status 2026-08-20: VERIFIED end-to-end, Widevine AND FairPlay.** Steps 1–9 done
(steps 2–4 as one `setupMediaKeys` behavior; the variant ships behind its own
`@videojs/spf/hls-drm` entry — the `./hls` entry was already at its size budget).
Chrome/Widevine smoke via the `spf-drm` sandbox template: license POSTs to
license.mux.com, 893 frames decoded / 0 dropped, ABR upgraded to 2048x914 on the
encrypted track. Step 8 (errors) landed: SVTA 4004/4008/4010/4013/4016/4021 onto
the collectErrors sequence. FairPlay vertical landed on top (per-key-system MKSA
configs incl. sinf, encryption scheme derived from EXT-X-KEY METHOD — cbcs for
Mux, server-certificate phase, encrypted-event fallback sessions with byte
dedupe) and **played on Safari** (user-verified). Post-FairPlay Chrome check:
negotiation + 2 Widevine license POSTs + zero errors confirmed; rendered-frames
re-check pending a visible tab. Smoke gotcha: Chrome 150 never fires
`sourceopen` in hidden tabs — keep the tab visible.

## Steps (TDD; narrowest test per step)

1. **Parser: structured key metadata.** Extend `media/hls/parse-media-playlist.ts`
   to surface `#EXT-X-KEY` detail (METHOD / KEYFORMAT / URI / KEYID / IV) on the
   resolved track instead of only the boolean `encrypted` (keep `encrypted`
   derived from it). Spec-valid input only; stateless helpers. Tests against the
   existing `tests/fixtures/drm-cmaf-video.m3u8` (Widevine `data:` PSSH, PlayReady
   PRO, FairPlay `skd://`).
2. **Minimal key-system probe.** Async `media/dom` helper wrapping
   `navigator.requestMediaKeySystemAccess` over the systems named by the engine's
   `drm: DrmSystemsConfig` config (contract from `@videojs/media`
   `core/drm.ts`). Slot-writer shape per capability-probing.md's resolved
   sync-vs-async split; scope = just enough to pick Widevine on Chrome. Full
   probe stays under capability-probing Phase 4.
3. **`setupMediaKeys` behavior** (`playback/behaviors/dom/`). Gates on
   mediaElement + resolved presentation + encrypted tracks + drm config; probe →
   `createMediaKeys()` → `setMediaKeys()` → optional server certificate →
   publish `mediaKeysReady` (+ context slot for the MediaKeys). State-exit
   cleanup: close sessions, `setMediaKeys(null)` — rides the resolver's
   resolved/unresolved cascade like `setupMediaSource` does.
4. **License exchange.** Session per unique init data from parsed key metadata
   (Widevine: PSSH straight from the `data:` URI — manifest-driven primary,
   `encrypted` event fallback deferred). `message` → POST raw body to
   `licenseUrl` → `session.update()`. Mirror a sibling abstraction for the
   actor-vs-behavior split (source-buffer-actor precedent) — decide in place,
   don't invent a new shape. Reuse `network-resilience` fetch/retry primitives
   where they fit.
5. **Key-readiness gate (lean c).** FSM precondition on `mediaKeysReady`
   composed into the segment-load path in the DRM variant only. Confirm the
   exact seam against `dom/load-segments.ts` / `track-load-triggers.ts` FSM
   shapes before wiring; if the seam contradicts (c), stop and revisit the doc's
   lean rather than forcing it.
6. **Stop refusing encrypted renditions in the DRM variant.** Today
   `media/dom/capabilities.ts` `canPlayTrack` returns false for
   `encrypted` tracks and errors report `SVTA_UNSUPPORTED_DRM_SYSTEM`
   (`media/errors.ts`). The DRM composition must not prune tracks whose key
   system probed usable; the non-DRM composition keeps the refusal unchanged.
7. **Engine variant.** DRM-composed HLS engine variant
   (`playback/engines/hls/`) accepting `drm: DrmSystemsConfig`; non-DRM engines
   carry none of the machinery (composition-time distinction, no runtime
   branches in always-on behaviors).
8. **Errors.** Produce DRM failures onto the collect-errors sequence; borrow the
   context taxonomy from `packages/media/src/dom/native-hls/fairplay.ts`
   (`NativeHlsDrmErrors`) rather than inventing codes.
9. **Sandbox + smoke.** Preset wiring the existing Mux DRM source through the
   SPF engine variant. Chrome smoke must verify *rendering* (painted frames /
   nonzero dimensions), not just readyState/currentTime; rebuild the spf dist
   and restart the sandbox before smoking; bound every await in browser evals.

## Out of slice (flag, don't build)

- FairPlay / PlayReady adapters (shape the per-key-system seam only).
- `encrypted`-event fallback path and session dedupe across both paths.
- Key-status → rendition-restriction constraint (registry: constraint+filter
  beside `excludeUnplayableTracks`).
- `#EXT-X-SESSION-KEY` multivariant parsing (Mux doesn't emit it).
- Un-inerting the `mux-video` adapter's `source.drm` / removing
  `alternativeMediaSuggestion` steering — needs the variant-decision open
  question (adapter-upfront vs detect-and-route) resolved first.

## Verification

- Per-step: `pnpm -F @videojs/spf test <path>`.
- Cross-package type changes: delete `*.tsbuildinfo` before `pnpm typecheck`.
- Bundle: `pnpm size` — DRM must not grow the non-DRM engine variants.
