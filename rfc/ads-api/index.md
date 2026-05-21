---
status: draft
---

# Video Ad API

| Document                       | Purpose                                                      |
| ------------------------------ | ------------------------------------------------------------ |
| [index.md](index.md)           | This file — problem statement, options, recommendation       |
| [api.md](api.md)               | Full API surface — enumerations, interfaces, timeupdate event |
| [examples.md](examples.md)     | Format-specific adapter and player usage patterns            |
| [decisions.md](decisions.md)   | Format inventory, design rationale, open questions           |

**References:** IAB CTV & Digital Video Ad Format Guidelines (May 2026 Draft), Google IMA SDK, VAST 4.x, SIMID, VMAP

## Problem Statement

Video.js 10 exposes no unified API for advertising. Every integrator that needs to monetize content reaches for a vendor SDK (Google IMA, FreeWheel AdManager, YoSpace, etc.) and bolts it onto the player. Each SDK has its own surface, lifecycle, and naming conventions, and none of them model the new IAB CTV ad formats — Pause, Menu, Squeezeback, Overlay, In-Scene, and Screensaver — consistently. Most still treat the world as "linear ad pods plus a few corner cases."

This forces integrators to write per-vendor glue and limits the player's ability to provide a coherent UI layer across ad experiences. As the IAB publishes its 2026 CTV Ad Format Guidelines and CTV monetization grows, this gap becomes a structural blocker for adoption.

**Driving behavior:** IAB has shipped format definitions for seven distinct ad types. Vendor SDKs (IMA, FreeWheel) already ship partial non-linear support. CTV platforms (Roku, Fire TV, Vizio) require non-linear inventory. Integrators ship vendor-specific code today because there is no abstraction to ship instead.

**If we do nothing:**

- Integrators continue shipping vendor-specific ad code outside the player abstraction.
- The player can't expose ad-related UI (skip controls, pod progress, dismiss affordances) without leaking vendor specifics.
- Each new ad format requires a per-vendor integration pattern we can't standardize.
- Companion features (skins, captions, accessibility tooling) have no consistent way to react to ad state.

**Scope.** This RFC covers the programmatic API surface: TypeScript interfaces, properties, methods, events, and enumerations. It does not cover VAST/VMAP parsing, ad-server communication, or rendering implementation. Those concerns live in ad-adapter implementations that conform to this API.

## Customer Salience

**Who is affected?**

- **Player integrators** (primary): every developer using `@videojs/html`, `@videojs/react`, or downstream player builds who needs to monetize content. This is most CTV and streaming use cases.
- **Skin creators / player engineers**: anyone building UI that reacts to ad state (overlays, progress bars, dismiss buttons).
- **Open source contributors**: anyone authoring an ad adapter or extending the player with new ad formats.
- **Viewers of the player** (indirect): they see whatever ad UI the player can render, which is currently constrained by the lack of an abstraction.

**How many customers are realistically impacted?**

A meaningful majority. Linear is universal in CTV monetization, and Pause/Overlay/Squeezeback are growing rapidly. Integrators who currently ship only linear ads will face pressure to support non-linear formats within the next 12–18 months.

**How strongly would they feel about it?**

Without an API, integrators are blocked from non-linear formats unless they hand-roll integration per vendor, which is expensive and inconsistent. With an API, they target a single surface and skins/UI can light up new formats without bespoke wiring.

This is a structural addition. The cost of getting the shape wrong is high because it will be hard to deprecate once integrators build against it.

We are reacting to current observable behavior, not a hypothetical user.

## Options Considered

### Option 1: TextTrack-analogous hierarchy

Model the ad domain as `AdTrackList → AdTrack → AdCue → Ad`, mirroring the existing `TextTrackList → TextTrack → VTTCue` API on `HTMLMediaElement`. One `AdTrack` per supported ad format (`'linear'`, `'pause'`, `'overlay'`, etc.). Cues group related ads — a pod for linear, a single appearance for non-linear. Lifecycle events parallel TextTrack semantics (`activated`/`deactivated` ≈ `enter`/`exit`).

- **Enables:** Familiar web semantics. Drop-in mental model for anyone who has used the captions API. Natural support for concurrent experiences (overlay during content + lingering companion). A single hierarchy generalizes across all seven IAB formats without per-format manager classes.
- **Constrains:** Forces an upfront design that handles every format in one consistent shape. New formats require either a new track or fitting into the existing four-level hierarchy.
- **Complexity:** Moderate. Heavier than a flat event bus but lighter than per-format manager classes. Implementation needs the `EventTarget` + numeric-indexable-collection pattern that TextTrack uses, which V10 has already documented as awkward in TypeScript.
- **Coupling:** Couples the ad surface to `HTMLMediaElement` semantics (good for parity; awkward for ad surfaces that exist outside video playback, like menu ads — see open questions).
- **Reversibility:** Hard to reverse once integrators build against it. Changes to the hierarchy ripple through every adapter and consumer.

### Option 2: Per-format manager classes

Provide separate, format-specific managers: `LinearAdManager`, `OverlayAdManager`, `PauseAdManager`, etc. Each exposes its own lifecycle, events, and types. No unifying hierarchy.

- **Enables:** Each format gets a bespoke API tuned to its semantics. Easier to evolve one format without touching others.
- **Constrains:** No shared abstraction. Skins and UI integrate with each manager individually. Cross-cutting concerns (impression tracking, click-through routing, dismiss affordances) are re-solved per manager.
- **Complexity:** High aggregate surface area. N formats × M lifecycle concerns = a lot of repeated decisions and types.
- **Coupling:** Loose between formats; the cost is paid by every consumer who has to learn N APIs instead of one.
- **Reversibility:** Easier to remove a single manager than to deprecate a hierarchy, but harder to consolidate into a unified API later.

### Option 3: Adopt an existing SDK surface (e.g., IMA SDK shape)

Mirror the Google IMA SDK API (`AdsManager`, `AdsLoader`, `AdEvent`, `AdsRequest`, etc.) directly, so integrators can swap in/out vendors with minimal friction.

- **Enables:** Zero learning curve for integrators already familiar with IMA. Easy to adapt other vendor SDKs that already mimic IMA.
- **Constrains:** Inherits IMA's linear-first worldview. Non-linear CTV formats are awkward — IMA doesn't natively model squeezeback or in-scene. Couples our public API to a vendor's evolution.
- **Complexity:** Lower upfront cost (much of the surface is borrowed) but higher long-term cost as IMA changes or as we need to support formats it doesn't.
- **Coupling:** Tight semantic coupling to Google's product roadmap.
- **Reversibility:** Very hard. The whole point is to look like IMA, and integrators will write code assuming IMA semantics.

### Option 4: Flat event bus

A single `EventTarget` (e.g., `videoElement.ads`) emits typed events for every ad transition (`ad-pod-start`, `ad-impression`, `overlay-shown`, etc.). No hierarchy, no cue grouping, no track abstraction.

- **Enables:** Minimal API surface. Trivial to extend with new event types. Low ceremony for simple linear-only integrations.
- **Constrains:** Consumers reconstruct state from event streams. No query surface — "what overlays are active right now?" requires a shadow state machine in every consumer. Concurrent experiences (overlay + linear companion + squeezeback) become awkward.
- **Complexity:** Low for the API itself; high for every non-trivial consumer that maintains shadow state.
- **Coupling:** Loose, but consumer cost compounds.
- **Reversibility:** Easy to add hierarchy on top later, but every consumer will have built ad-hoc state machines that are hard to migrate.

### Option 5: Low-level primitives only

Ship the lowest-level building blocks (impression tracking helpers, VAST parsing utilities, ad creative timing primitives) and let each integrator assemble their own API.

- **Enables:** Maximum flexibility. No opinionated abstraction to fight.
- **Constrains:** Every integrator does the same work. No shared UI surface, no skin ad support, no consistent vendor adapter contract.
- **Complexity:** Lowest for us, highest for integrators in aggregate.
- **Coupling:** None.
- **Reversibility:** We can add a higher-level API later, but we'd be doing so in a world where every integrator has built incompatible patterns.

## Recommendation

**Option 1: TextTrack-analogous hierarchy.**

The TextTrack pattern is already familiar to every web developer building on `HTMLMediaElement`. Adopting the same `List → Track → Cue → Payload` shape for ads gives integrators a mental model they don't have to learn from scratch, and it lets the player team reuse the same architectural patterns (event semantics, indexable collections, concurrent-track support) we've already accepted for captions and subtitles.

The hierarchy generalizes naturally across all seven IAB formats: one track per format, one cue per activation window (pod for linear, appearance for non-linear), one `Ad` per individual creative. Concurrent experiences — overlay during content with a lingering companion from a previous linear break — fall out of the model without per-format coordination logic. See [decisions.md § Format Inventory](decisions.md#format-inventory) for the formats this needs to cover.

The main cost is implementation. The `EventTarget` + numeric-indexable collection pattern is awkward in TypeScript (see [decisions.md § Numerically indexable lists](decisions.md#numerically-indexable-lists)) and we'd be doubling down on a pattern V10 has already identified as painful. We accept this cost because:

1. API surface familiarity matters more for adoption than implementation ergonomics.
2. We can opt out of strict numeric indexing in favor of `.at(i)` or iterators if the team prefers (tracked as an open question).
3. The alternatives all have worse tradeoffs: per-format managers fragment the surface, IMA-style locks us to a vendor, flat event bus pushes complexity to every consumer, and primitives-only abdicates the responsibility.

The detailed interface design lives in [api.md](api.md). Format-specific usage patterns live in [examples.md](examples.md). Open design questions and rationale are tracked in [decisions.md](decisions.md).

## Final Decision

*(Completed after review)*

**Decision:**
**Rationale:**
**Date:**
