## status: draft
date: 2026-05-01

# Cast architecture for Video.js v10

## Problem Statement

Cast is on the GA milestone with no agreed architecture. The Media design doc lists `MediaFullscreenCapability` and `MediaPictureInPictureCapability` but has no examples for cast and remote playback. The team currently holds several mental models:

- **Wesley** wants cast handled in the media layer the way the platform handles AirPlay and Chromecast-on-Android — exposed via something close to the standard `RemotePlayback` API on the media element, so consumers interact with one uniform surface whether playback is local or remote.
- **Rahim** wants cast as a standalone component composable alongside Media, with an optional mixin if a user really wants `cast()` on the media element. His core concern is that platform-specific SDK configuration (Chromecast app IDs, namespace handlers, etc.) should not pollute the Media API.
- **Heff** suggested a pragmatic middle: bake cast into specific media types like `<hls-video>` so the most common case has zero ceremony, and CP pointed at shaka-player's `CastProxy` as worth studying for inspiration.

What user or system behaviour is driving this question:

- Active and unresolved discussion in the PR #1362 thread that spilled over into Slack.
- Cast is a hard requirement for many enterprise integrators, particularly anyone shipping to TV-capable audiences.
- Engine teams will start integrating cast-relevant code soon; without an agreed shape, each will pick its own path and we end up with inconsistent surfaces across `<hls-video>`, `<dash-video>`, etc.

What happens if we do nothing:

- Cast development drifts. Each integrator picks an approach. We end up with mismatched APIs across engine-backed media, and the design doc accumulates an architectural gap that gets harder to close.
- The "play it on Cast" demo for GA either ships against an ad-hoc shape (hard to undo later) or doesn't ship at all.
- The Media boundary stays ambiguous for the next cross-cutting concern (ads is the next obvious one), and we relitigate the same fault line.

## Customer Salience

**Who is affected?**

- **Player integrators** shipping to TV / connected-living-room audiences — directly. Cast is non-optional for them. The architecture decides how much of their integration cost they're paying.
- **Engine implementers** (`<hls-video>`, `<dash-video>`, anyone building custom media) — directly affected by whether cast is something they have to support, something layered above them, or something out of their concern.
- **Skin creators** — affected only by whether the cast surface is uniform with local playback or a separate state to reconcile in UI.
- **Viewers** — only indirectly. All four options can deliver a good viewer experience; the differences are about integrator DX, bundle weight, and consistency.
- **Open source contributors** — affected by where cast code lives (core vs. html package vs. specific media types) and the bundle implications.

**How many customers are realistically impacted?**

A meaningful minority by raw count, but a high-value minority. Most enterprise integrators ship cast support. Plenty of pure-mobile / pure-web players don't need it, but it is on essentially every long-form media platform's checklist.

**How strongly would they feel about it?**

A wrong architecture would meaningfully degrade the experience for cast-shipping integrators:

- If cast doesn't compose with custom UIs, integrators have to write parallel code paths.
- If cast pulls Chromecast SDK weight into core bundles by default, integrators who don't need cast pay for it.
- If cast requires a different mental model than local playback (i.e., separate state, separate event surface), every UI control has to handle two cases.

Are we reacting to a hypothetical user or to current observable behaviour:

Observable. Integrators are already asking. The Shaka `CastProxy` exists because the problem is real and has been solved at least once before. The GA milestone calls for it.

## Options Considered

**Option 1: Cast as a Media capability**

Add a `MediaRemotePlaybackCapability` (or similar) to the design doc's capability list. Each Media implementation opts in. Native `<video>` already exposes the standard `RemotePlayback` API — for AirPlay on iOS/macOS Safari and for Chromecast on Android Chrome — so the platform-native case satisfies the contract without extra work. Engine-backed media (`<hls-video>` etc.) implements the same shape and routes through the Chromecast SDK or equivalent.

- Enables uniform store and UI behaviour: nothing has to know cast is happening, everything works through Media. Skins reuse local playback controls.
- Constrains every engine-backed Media implementation to either implement cast or stub it. Pulls Chromecast SDK weight into media bundles whose users may not need it.
- Tight coupling — once consumers start relying on the capability shape, changing it is expensive.
- Mirrors how the platform itself models this for AirPlay. Easy to reason about for anyone familiar with the web platform.
- Wesley's preferred direction.

**Option 2: Cast as a standalone component**

Cast is its own thing, composable alongside any Media. UI components can listen to a separate cast surface, or the user can opt into a mixin that grafts `cast()` onto the media element.

- Enables a clean Media API. Cast SDK weight is fully isolated to consumers who pull it in.
- Constrains UI and store: skins need awareness of two state surfaces (local Media + Cast component), and have to reconcile them.
- Lower coupling; reversible.
- More complicated mental model — most integrators think of casting as "the player is casting," not "there's a separate cast subsystem alongside the player."
- Rahim's preferred direction. His specific concern is keeping platform-SDK config off the Media API; this option does that maximally.

**Option 3: Cast as a proxy over Media (shaka-player's `CastProxy` pattern)**

A `MediaCastProxy` class wraps a Media and a `CastSender`. The proxy *implements* Media itself and routes calls to local or remote based on session state. UI and store talk to the proxy as if it were any Media. Switching is transparent to consumers — the proxy decides whether `play()` calls go to the local element or the receiver.

Reference: `shaka.cast.CastProxy` in shaka-player. The proxy exposes `getVideo()` and `getPlayer()` which return proxy objects with the same API surface as the underlying video element and player. When connected to a receiver, calls forward to remote. When not connected, calls go to local. UIs are oblivious to the switch. State events fire on the proxy regardless of source.

For v10 this would look something like:

```
const proxy = new MediaCastProxy(media, { receiverAppId: '...' });
mediaContainer.attach(proxy);
// proxy implements Media; everything else is unchanged
```

- Enables uniform UI and store, with Cast SDK weight isolated to the proxy rather than every Media implementation. Engine implementers don't have to think about cast.
- Constrains us to pay for one extra layer — the proxy. Heff's "techs allergy" applies if we frame the proxy as a wrapper around Media. Maybe doesn’t apply if we frame the proxy as a Media implementation, because Media is already a contract that any class can satisfy.
- Medium coupling; reversible.
- Battle-tested by Shaka. Aligns with Heff's "extend the API, don't reach through it" principle if we treat the proxy as just another Media implementation rather than a new layer concept.

**Option 4: Bake cast into specific media types**

`<hls-video>` (and other engine-backed media) includes cast support out of the box. Bare `<video>` doesn't (relies on platform RemotePlayback for AirPlay only). The cast logic lives inside the engine-backed class — a method on the host, plus internal state.

- Enables the 95% case with zero ceremony. Most integrators who want cast also want HLS, and now they get cast for free.
- Constrains users wanting cast over a custom Media implementation to roll their own integration.
- Low coupling; reversible by extracting the cast logic into a shared component or proxy later.
- Heff's suggestion in Slack: "I might assume we'd just include casting as built into things like `<hls-video>` instead of making people add it after the fact."
- Risks code duplication if `<dash-video>` and others need essentially the same cast logic

## Recommendation

**Option 4 for now (bake into `<hls-video>` and equivalents). Option 3 (proxy) for later.**

Salience is high enough that getting the eventual shape right matters, but low enough on the critical path to GA that we shouldn't over-engineer cross-Media cast on day one. The pragmatic move is to ship cast as part of `<hls-video>` for v1 and learn from real usage before committing to a cross-cutting architecture.

For the long-term contract, lean toward the proxy pattern. It preserves Wesley's "uniform UI" goal and Rahim's "don't pollute Media with SDK config" concern simultaneously, by making cast itself a Media implementation rather than a thing that lives inside or alongside Media. The Chromecast SDK lives in the proxy, never in core Media. UIs see uniform Media. Engine implementers don't have to think about cast.

The two options are compatible. Ship Option 4 now to unblock GA. Refactor cast logic out of `<hls-video>` into a `MediaCastProxy` once we have enough usage signal to know whether cross-Media cast is something users actually want. If it isn't — if everyone using cast is also using HLS — Option 4 stands alone and we never need Option 3.

### Open questions for discussion

- **Does framing `MediaCastProxy` as "a Media implementation" make sense or are we re-implementing techs?** If a proxy that itself implements Media is structurally indistinguishable from a tech that wraps a `<video>` API, we need to reconsider.
- **What's the minimal primitive design?** A `MediaCastSession` interface? A `RemotePlaybackLike` interface? Something thinner?
- **Where does cast live in the package layout?** Argument for `@videojs/core/dom`: shared across engine-backed media. Argument for `@videojs/html`: keeps Chromecast SDK weight off the core bundle. Argument for a new `@videojs/cast` package: cleanest isolation, opt-in install.
- **Is GA the right cutoff for the long-term cast architecture, or can we ship GA with Option 4 alone and design the proxy in v10.x?**
- **AirPlay and Chromecast-on-Android.** These come for free via the platform's `RemotePlayback` API. Do we expose them through the same Media surface as Chromecast (uniform), or treat them as a separate "native remote" concept (matches the platform but creates two surfaces)?

### References

- shaka-player `CastProxy` — `lib/cast/cast_proxy.js` in `github.com/shaka-project/shaka-player`. The reference implementation for Option 3.
- [PR #1362 review thread](https://github.com/videojs/v10/pull/1362) — Apr 18–25; cast came up alongside the fullscreen/PiP debate.
- [PR #1362 — Heff's `<hls-video>`bakes-cast suggestion](https://github.com/videojs/v10/pull/1362#discussion_r3139862494) (in the wider discussion thread, not this exact comment).
- [internal/design/media.md](https://github.com/videojs/v10/blob/main/internal/design/media.md) — current design doc; capability list (no cast yet).
