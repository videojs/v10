---
status: draft
---

# Mux Source & URL DX

How `<mux-video>` takes a source — and signs, refreshes, and derives URLs from
it — without the surface changing when the playback engine does.

> **Status:** `draft` — light RFC to align on direction. Motivated by [#1432]
> (signed token refresh), under epic #977 (Mux Media Elements). The
> recommendation is a proposal for the team to react to, not a settled decision.

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
refresh ([network-resilience.md]) will live. hls.js has its own async `xhrSetup`,
so refresh *could* land there first — the decision to do it in SPF follows from
phasing hls.js out. The engine-agnostic layering is exactly what makes that
migration invisible to the user: the refresh *surface* stays put when the
*engine* underneath it changes.

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

**Recommended default shape:** the leanest config — a `src` plus an *optional*
token-refresher (no `playback-id`, no `tokens` object). The player swaps the
`?token=` on (or before) expiry using the refresher; `playback-id` + `tokens`
stay available as a heavier opt-in for full convenience. This keeps the
surface minimal (Goal B) while the player still owns refresh (unlike Option 2),
and — with no `playback-id` input — sidesteps the `src` / `playback-id`
precedence question entirely.

- **Pros** — A and B coexist; refresh gets a stable, engine-agnostic home;
  thumbnails/poster derive from the resolved identity; per-feature config can
  ride on the resolver instead of multiplying attributes.
- **Cons** — one more concept up front (the resolver seam); needs a defined
  precedence when both `src` and `playback-id` are set; needs a defined path
  for refresh signals between surface and engine.

## Recommendation

**Option 3.** It's the only one that satisfies the engine-agnostic constraint
*and* both DX goals, and the only one where [#1432]'s refresh has a natural
place to live. Options 1 and 2 are really the two *ends* of Option 3 — the
convenience inputs and the raw-URL base case — so adopting 3 doesn't foreclose
either style of use, which also makes it the least-committal (most reversible)
choice.

**What it looks like** — the recommended default is the leanest shape: a `src`
plus an *optional* token-refresher. `playback-id` + `tokens` stay available as
heavier opt-in convenience inputs (Goal A).

```html
<!-- Recommended default: src is the contract -->
<mux-video src="https://stream.mux.com/abc123.m3u8?token=…"></mux-video>

<!-- Opt-in convenience: the resolver builds the signed URL + thumbnails -->
<mux-video playback-id="abc123"></mux-video>
```

```ts
// Illustrative only — shapes are open (see Open Questions).

// Lean default: keep src, supply a token-refresher; the player swaps `?token=`
// on (or before) expiry. No playback-id → no src / playback-id precedence.
el.refreshToken = () => fetchFreshToken();

// Heavier opt-in convenience: structured inputs the resolver expands and refreshes.
el.tokens = { playback: () => fetchFreshToken(), thumbnail: '…', storyboard: '…' };
```

Exact shapes (attribute vs property, event vs refresher) are open — see below.

**If accepted** — the resolver seam and refresh mechanism get a full
implementation design doc; a minimal `playback-token` attribute that appends
`?token=` to the resolved URL — the shape `@mux/playback-core`'s `toMuxVideoURL`
already uses ([#1432]) — can ship first as an independent step; [#1432]
implements the refresh against the SPF engine ([network-resilience.md] Tier 2).

### Token refresh (#1432)

Automatic refresh forces a surface decision. A static signed `src` **can't
refresh itself** — its token is embedded and expiring, so *something* has to know
how to get a fresh one. Any option that refreshes automatically therefore needs
*some* surface beyond a static `src`; the only question is its shape:

- **`src`-based** — `src` + a callback returning a fresh **full URL** (no
  `playback-id`, no `tokens`). Closest to Goal B.
- **convenience-based** — `playback-id` + `tokens` + a refresher returning a
  fresh **token**, which the resolver rebuilds into a URL. Goal A.

This is why "everything depends on `src`" can't fully hold for [#1432] under any
option — refresh always needs at least a callback. Option 3's seam carries both
forms. Either one uses two triggers:

- **Reactive** — on a `403` expired-token response, re-resolve and retry the
  request. This is the Shaka / hls.js precedent ([#1432]) and the SPF Tier-2
  behavior.
- **Proactive** — decode the JWT `exp` and refresh *before* expiry, avoiding the
  failed request entirely. No player library does this today; it's the
  differentiator — but it's also net-new engine work: it needs a scheduler
  (decode `exp`, set a timer) that the reactive, 4xx-triggered
  `refreshPlaybackToken` hook ([network-resilience.md] Tier 2) doesn't provide.
  Where that scheduler lives (resolver / engine / element) is open.

The surface that feeds both is a stable per-token refresher (function) or an
`onTokenExpiring` / `token-refresh` event the consumer answers with a fresh
token. The engine-side counterpart is `refreshPlaybackToken(originalUrl,
errorContext)` from [network-resilience.md].

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

## Open Questions

- **Precedence** — today there is no `playback-id` attribute; it's *derived*
  from the `src` URL for analytics (`toPlaybackIdFromSrc`,
  `packages/core/src/dom/media/mux/mux-data.ts`). *If* Option 3 adds
  `playback-id` as a settable convenience input, a user could set both it and
  `src` — so we'd need a rule. (Lean: `src` is the contract and `playback-id` is
  a shorthand that *produces* a `src`, so an explicit `src` wins.) The recommended
  default shape (`src` + token-refresher, no `playback-id`) avoids this entirely
  — it only arises if the convenience inputs are used.
- **Refresh surface** — per-token refresher function vs `onTokenExpiring` event
  vs both; proactive, reactive, or both by default; and if proactive, where the
  `exp`-decoding scheduler lives (resolver / engine / element).
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

*(Completed after review)*

**Decision:**
**Rationale:**
**Date:**

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
