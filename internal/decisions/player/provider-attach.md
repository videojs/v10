---
status: decided
date: 2026-03-13
---

# Provider Owns Media Attachment

## Decision

The provider (`<video-player>` / React `Provider`) owns the `store.attach()` lifecycle. The container (`<media-container>` / React `Container`) no longer discovers media or calls `store.attach()` — it registers itself with the provider via context and serves only as a layout reference element.

Media and container elements register themselves with the provider through attach contexts — setter callbacks that flow downward from provider to descendants. The provider calls `store.attach({ media, container })` when it has a media element. As a fallback for plain `<video>`/`<audio>` elements that can't consume context, the provider queries its subtree.

## Context

The [player-container separation](player-container-separation.md) decision established that the provider owns state and the container handles layout. But the container still owned a critical piece of the store lifecycle: media discovery and `store.attach()`.

The container discovered media via `querySelector('video, audio')`, duck-type checks for custom media elements, `MutationObserver` watching the subtree, and `slotchange` listeners on `<slot name="media">`. When it found media, it called `store.attach({ media, container: this })` and managed the detach lifecycle.

This split created friction:

- The provider creates the store and destroys it, but a descendant controls when state flows through it. The lifecycle is split across two elements.
- Setups without a container (audio-only, headless, programmatic) couldn't attach — they needed the container present just to wire up the store.
- The container's media discovery logic (MutationObserver, slot queries, duck-typing) was brittle and required users to remember `slot="media"`.

## Alternatives Considered

- **Keep attach in the container** — Leave the current architecture. Rejected because it perpetuates the split lifecycle and forces container presence for attachment.

- **Move discovery to the provider via its own DOM queries** — The provider watches its subtree for media elements. Rejected as the primary mechanism because the media element is nested deep (provider > skin > container shadow DOM), making reliable DOM queries fragile. Used only as a fallback for plain `<video>`/`<audio>`.

- **Event-based registration** — Media elements dispatch a bubbling event that the provider catches. Simpler than context but doesn't handle disconnection cleanly and requires the provider to be in the DOM path (shadow DOM boundaries block event bubbling unless composed).

## Rationale

**Unified lifecycle.** The provider already creates and destroys the store. Adding attach/detach means one element controls the full store lifecycle: create → attach → detach → destroy. No split ownership.

**Container becomes truly dumb.** The container is a reference element — the store uses it for fullscreen, PiP, keyboard focus, and gesture tracking. It doesn't need to know about media discovery or store internals. It registers itself with the provider and renders children.

**No-container setups work.** Audio-only players, headless stores, and programmatic setups can attach media directly through the provider without requiring a container element in the DOM.

**Context-based registration matches React.** React already uses this pattern — `<Video>` calls `setMedia` via context, `<Container>` calls `setContainer`. The HTML implementation now mirrors this with `mediaAttachContext` and `containerAttachContext`.

### Trade-offs

- **Provider mixin grows in complexity.** It gains attach lifecycle management, fallback media discovery, and two additional context providers. This is manageable since the logic is straightforward and consolidates previously scattered responsibilities.

- **Fallback query is a pragmatic compromise.** Plain `<video>` elements can't consume context, so the provider falls back to `querySelector`. This means two discovery paths exist, but the fallback is simple and predictable.
