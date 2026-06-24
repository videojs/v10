---
status: accepted
---

# Mux Source & URL DX

How `<mux-video>` takes a source — and signs, refreshes, and derives URLs from
it — without the surface changing when the playback engine does.

> **Status:** `accepted` — direction approved (see **Final Decision**). Motivated
> by [#1432] (signed token refresh), under epic #977 (Mux Media Elements).
>
> **Review outcome — direction confirmed.** The team aligned on a
> **source-based** surface (`src` + an optional `toMuxVideoURL` helper, *not*
> `playback-id` / `tokens` attributes) with **player-owned** token refresh. The
> engine-agnostic-refresh concern resolved into a known constraint: re-resolving
> the master mid-session is a **media reload** on every engine except SPF —
> acceptable for v1 (on par with Mux Player), seamless on SPF later. See **Risk**
> and **Final Decision**.

## Problem Statement

Signed playback is a first-class Mux use case: signed URLs carry JWTs with
configurable TTLs, so long sessions fail when a token lapses ([#1432]). The
web-native precedent for fixing this is "refresh before the request resolves" —
Shaka's async request filter, hls.js's async `xhrSetup`. But there's a
prerequisite: **`<mux-video>` in v10 has no token surface at all today.** It
accepts `src` and standard HTML5 media attributes; the Mux Data mixin only
*reads* the playback-id out of `src` for analytics
(`packages/core/src/dom/media/mux/mux-data.ts`). There is nothing to refresh.

Adding that surface forces a question we haven't answered. Two DX goals pull in
opposite directions:

- **A — Convenience.** Bring over the mux-video / media-chrome conveniences: a
  `playback-id`, signed `tokens`, and we build the `stream.mux.com` URL (and
  thumbnail / poster URLs) for the user.
- **B — Lean on URLs.** Reduce Mux-specific attributes; have the user pass the
  full `stream.mux.com` URL in `src` and lean on URL building.

And one hard constraint: the surface is **engine-agnostic**. Switching the
engine under the hood (native HLS, hls.js, the SPF playback engine) must not
make the user change component config.

These don't carry equal weight. Engine-agnostic is a **hard constraint**.
"Lean on `src`" (Goal B) is a **direction**, not a rule — and it genuinely
conflicts with Goal A's convenience. Reconciling that conflict, *within* the
hard constraint, is the point of this RFC.

**If we do nothing:** signed-playback integrators stay stuck — a session can't
outlive its token TTL without a manual `src`-swap workaround that itself fails
mid-playback (v8's `reloadSourceOnError`, [#1432]) — and the source/attribute DX
stays ad hoc, reinvented per integrator.

## Customer Salience

**Who is affected?** Mux integrators serving **signed (secure) playback** —
paywalled, private, or access-controlled content. Note the two halves have
different reach: the source/attribute-*shape* question touches *every*
`<mux-video>` user (everyone configures a source); the *token-refresh* question
touches the signed-playback subset.

**How many?** Hard to bound precisely, but **not** a premium niche — signed
playback is opt-in per playback ID and available to **any Mux account** (it's a
`signed` [playback policy](https://www.mux.com/docs/guides/secure-video-playback)
plus a signing key, no plan tier required). Adoption is driven by *use case* —
membership, paywalled, private, or otherwise access-controlled content — not by
account size. So: a meaningful slice of integrators, anyone serving non-public
content.

**How strongly?** Strongly, for the affected segment. Without refresh, any
session that outlives its token TTL **hard-fails mid-playback** — the video
stops. For live, sports, events, or long-form courses with short TTLs that's not
an edge case, it's the expected path. It can prevent the product from being
usable for long secure sessions, not merely annoy.

**Hypothetical or observable?** Observable. Signed URLs with TTLs are a
documented Mux feature; the expired-token `403` is documented by Mux ([#1432]
links it); and the v8 `reloadSourceOnError` workaround is known to fail
mid-playback. We're reacting to a real, recurring failure mode.

## Layering

The key move is to separate *what the user configures* from *what gets played*
from *how the engine fetches it*:

```
┌─ Surface DX — component config — engine-agnostic, stable ─────────────────┐
│   <mux-video src | playback-id | tokens | poster …>                       │
├─ Source resolution — "what URL(s) do we actually play?" ──────────────────┤
│   playback-id (+ token) → signed stream.mux.com URL ; thumbnail/poster    │
├─ Engine / network — engine-specific, where refresh executes ──────────────┤
│   SPF Tier 2 refreshPlaybackToken hook (see network-resilience.md)        │
└────────────────────────────────────────────────────────────────────────────┘
```

(The diagram shows the conceptual space; the **accepted** surface is `src` only —
`playback-id` / `tokens` live in the off-component `toMuxVideoURL` helper at the
middle layer, not as component attributes. See **Recommendation**.)

The engine-agnostic constraint maps cleanly onto this: the **top layer can't
change when the bottom layer changes.** A token *refresh mechanism* belongs at
the bottom (it's engine- and network-specific), but its *config surface*
belongs at the top (stable across engines). Today the middle layer doesn't
exist — `src` flows straight from attribute to engine delegate
(`packages/core/src/dom/media/hls/index.ts`) with no transform seam. (That's the
legacy mixin path; the capability-contract / `MediaEngineHost` lifecycle in
[media.md](/internal/design/media.md) — itself a draft redesign — is where a
clean resolution seam would naturally land.)

Concretely: `<mux-video>` runs on **hls.js today** (`MuxVideoMedia` extends
`HlsMedia`, which drives hls.js or native HLS —
`packages/core/src/dom/media/mux/index.ts`), and the plan is to move it onto the
**SPF engine** (already shipped separately as `<simple-hls-video>`), where Tier‑2
refresh ([network-resilience.md]) will live and can be **seamless**; on hls.js and
native HLS a mid-session refresh is a media reload (see the **Risk** section),
which is why SPF is the target. The engine-agnostic layering is exactly what makes that
migration invisible to the user: the refresh *surface* stays put when the
*engine* underneath it changes. (The refresh *mechanism*'s fidelity varies by
engine — see the **Risk** section.)

The A-vs-B tension lives entirely in the middle layer: it's a question of *what
inputs the resolver accepts*, not a question of engine behavior.

## Options Considered

### Option 1 — Convenience attributes (mux-video / media-chrome parity)

`playback-id` + a `tokens` object (`playback`, `thumbnail`, `storyboard`,
`drm`) + `custom-domain`. We build every URL.

- **Pros** — familiar to mux-video / media-chrome users; least typing; we own
  URL-shape correctness; natural home for auto thumbnails/poster.
- **Cons** — grows Mux-specific attributes (directly against Goal B); the
  surface expands per feature; couples the surface to Mux URL conventions.

### Option 2 — Raw `src` + URL-builder util

User passes the full signed URL in `src`; we ship a standalone
`toMuxVideoURL`-style util (and a thumbnail/poster builder) they call
themselves.

- **Pros** — minimal surface (Goal B); `src` is the single source of truth; the
  util is reusable outside the element.
- **Cons** — the user wires refresh by re-setting `src` mid-playback, exactly
  the v8 `reloadSourceOnError` failure mode [#1432] cites; thumbnails/poster
  aren't automatic; worse out-of-box DX.

### Option 3 — Pluggable source-resolver with optional convenience inputs

Make the **middle layer the contract.** A *source-resolver* maps component
config to the URL(s) the engine plays:

- Raw `src` is the base case — the resolver is identity.
- `playback-id` + `tokens` is an **optional convenience**: the default Mux resolver expands it to
  a signed `stream.mux.com` URL.
- The same resolver seam re-resolves the URL on (or before) token expiry —
  engine-agnostically, above the engine. The 4xx-trigger-and-retry half is
  necessarily engine-side: the SPF Tier-2 `refreshPlaybackToken` hook
  ([network-resilience.md]) is that counterpart.
- Goal-B users who'd rather build URLs themselves use the standalone builder
  util and keep passing `src`.

So A and B stop being either/or: the raw URL is the contract, the convenience
inputs resolve through the same seam, and refresh + thumbnails derive from one
resolved identity.

- **Pros** — A and B coexist; refresh gets a stable, engine-agnostic home;
  thumbnails/poster derive from the resolved identity; per-feature config can
  ride on the resolver instead of multiplying attributes.
- **Cons** — one more concept up front (the resolver seam); needs a defined
  precedence when both `src` and `playback-id` are set; needs a defined path
  for refresh signals between surface and engine.

## Recommendation

**A source-based surface + a player-owned refresh mechanism.** Review refined the
earlier all-in-one "Option 3" pick by *decoupling* two decisions that had been
bundled:

- **Surface — source-based (confirmed).** The component takes a `src`
  (Option 2's shape), not `playback-id` / `tokens` attributes. A standalone
  `toMuxVideoURL` helper builds a URL from structured inputs for those who want
  it, but the Mux-specific shape stays *out* of the component. Rationale: the
  Video.js direction is to normalize toward `source` and carry fewer Mux-specific
  props than Mux Player, and one surface beats "two ways to do the same thing" —
  which also removes any `src` / `playback-id` precedence question.
- **Refresh — player-owned (agreed).** The player owns refresh (Option 3's
  mechanism), driven by one consumer-supplied async callback. On most engines the
  refresh is a media reload (acceptable for v1, on par with Mux Player);
  SPF makes it seamless. See **Token refresh** and **Risk** below.

```html
<!-- The component takes a source. -->
<mux-video src="https://stream.mux.com/abc123.m3u8?token=…"></mux-video>
```

```ts
// Optional: build the URL from structured inputs with a standalone helper,
// then hand the result to `src` — Mux specifics stay off the component.
el.src = toMuxVideoURL({ playbackId: 'abc123', tokens: { playback: '…' } });

// Refresh: supply one async callback. The player decodes the JWT's expiry and
// re-resolves with a fresh token (proactive + reactive). Seamless on SPF; a
// controlled reload elsewhere (on par with Mux Player). Exact shape is open.
el.refreshToken = () => fetchFreshToken();
```

**Next steps** — the surface and refresh mechanism get a full implementation
design doc; a minimal `playback-token` pass-through (the `toMuxVideoURL` shape,
[#1432]) can ship first to unblock signed playback; [#1432] implements refresh on
the SPF engine ([network-resilience.md] Tier 2).

### Token refresh (#1432)

A static signed `src` **can't refresh itself** — the token is embedded and
expiring. So refresh needs one extra thing from the consumer: an async callback
that returns a fresh token (their backend signs it — how is their concern).

The mechanism the team agreed on:

- The consumer supplies **one async callback** (e.g. `el.refreshToken = () =>
  Promise<jwt>`).
- The **player decodes the JWT** to read its `exp` — mux-elements already has
  this code — and watches the wall clock with some runway (NTP wiggle).
- It refreshes **proactively** (before `exp`, avoiding any failed request) and/or
  **reactively** (on a `403` expired-token response), then passes the fresh token
  down through the engine.
- The **player owns** this rather than asking the consumer to re-set `src`. On
  SPF the refresh can be seamless; on other engines it's still a reload, but a
  *controlled, proactive* one (refresh before expiry, restore position) — not
  Option 2's reactive mid-playback break.

How seamless that refresh is depends on the engine — it's a media reload
everywhere except SPF (the migration target). See the **Risk** section.

### Thumbnails & poster

Auto-derived from the same resolved identity:
`image.mux.com/{playback-id}/thumbnail.jpg` and the storyboard `.vtt` — today
only hand-built in the sandbox (`apps/sandbox/app/shared/sources.ts`). Signed
accounts need separate `thumbnail` / `storyboard` tokens, which is why `tokens`
is an object rather than a single value.

### Accessibility

Mostly downstream of UI, but two notes belong here: derived `poster` / thumbnail
images need alt semantics handled by the consuming UI, and an unrecoverable
expired-token state should surface a clear, localized error (ties into #1431,
playback-restriction error handling) rather than a silent stall.

## Risk — refresh fidelity is engine-bound (resolved)

A concern was raised in review that refresh might not be engine-agnostic — that
the fresh token would have to reach every segment, and that re-fetching playlists
would fight **HLS spec §6.3.4**. Investigation (including a capture of a real
signed stream) resolved it:

- **The token is on the master manifest only.** Mux re-signs the child playlists
  and segments with its own short-lived CDN signatures (no JWT). So a refresh
  re-resolves the *master* and the engine adopts the fresh child URLs. §6.3.4
  governs *Media* Playlists, not the master — so the spec doesn't block it.
- **The real constraint is the engine, not the spec.** Every engine (hls.js,
  native, AVPlayer) assumes the master loads once per session, so re-resolving it
  mid-session is treated as a **media reload** — except SPF, which can be built to
  refresh without one. (The spec-sanctioned way to swap the master live is HLS
  content steering, but that's a Mux Video server feature, out of scope.)

| Engine | Mid-session token refresh |
| ------ | ------------------------- |
| SPF (this repo) | Can refresh **without a full media reload** — the migration target. |
| hls.js | Master loads once → a re-resolve is a **media reload** (hackable, not seamless). |
| Native HLS / AVPlayer | Master loads once → a full **`src` reload**. |

So the **surface stays engine-agnostic**; only the *fidelity* varies — and a
reload is acceptable: the team confirmed it'd be on par with Mux Player today,
seamless on SPF later. Refresh is only needed for sessions that outlive the token
window, and the JWT-`exp` decode is reusable from `@mux/playback-core`.

## Open Questions

- **Refresh surface** — the mechanism is decided (see *Token refresh*); what's
  still open is the exact API shape — a `refreshToken` function vs an
  `onTokenExpiring` event vs both.
- **Resolver home & extensibility** — does the resolver live on the element, in
  core, or in a Mux adapter? Is it a public extension point for non-Mux
  providers, or Mux-internal for now? (Lean: internal first.)
- **Goal-B + thumbnails** — thumbnails come from a different URL
  (`image.mux.com/{playback-id}/…`), and the playback-id can be extracted from the
  `src`. The blocker is the token: Mux scopes JWTs by an `aud` claim — `v` (video),
  `t` (thumbnail), `s` (storyboard) — so the *video* token embedded in a signed
  `src` can't sign a thumbnail. A `src`-only flow (Goal B) therefore can't build a
  working *signed* thumbnail without a separate `thumbnail` token. Do we require
  that extra token, or accept that signed thumbnails need the convenience inputs?
- **Pass-through prerequisite** — the smallest standalone step: a `playback-token`
  attribute that just appends `?token=<token>` to the `src` — no resolver, no
  refresh (the same thing `@mux/playback-core`'s `toMuxVideoURL` does, [#1432]).
  It makes signed playback *work* before any of the above is built. Ship it first
  as a quick win to unblock signed playback, or only deliver it as part of the
  Option 3 resolver?

## Final Decision

**Decision:** Source-based surface — `src` plus an optional standalone
`toMuxVideoURL({ playbackId, tokens })` helper; no `playback-id` / `tokens`
component attributes — with **player-owned** token refresh (the consumer supplies
an async token callback; the player decodes the JWT and re-resolves the master
proactively / reactively). Refresh is a controlled media reload on hls.js / native
HLS and seamless on SPF.

**Rationale:** Matches the Video.js direction — normalize toward `source`, fewer
Mux-specific props than Mux Player, one surface not two. The team approved the
direction and set the v1 bar (a source reload on refresh is on par with Mux Player
today, improvable later), and confirmed the spec/engine reality: every engine
assumes the master loads once, so a mid-session re-resolve is a media reload
except on SPF — the right home for the seamless version.

**Date:** 2026-06-24

## Related

- [#1432] — Signed token refresh (motivating issue)
- #1431 — Playback restriction error handling (expired-token error path)
- #977 — Mux Media Elements (epic)
- #1411–#1414 — DRM (related secure-playback work)
- [network-resilience.md] — SPF Tier 1/2 retry & refresh
- [media.md](/internal/design/media.md) — media contracts & engine lifecycle
  (the engine-agnostic substrate)

[#1432]: https://github.com/videojs/v10/issues/1432
[network-resilience.md]: /internal/design/spf/features/network-resilience.md
