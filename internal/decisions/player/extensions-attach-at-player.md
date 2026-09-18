---
status: decided
date: 2026-09-18
---

# Extensions Attach at the Player

## Decision

Player extensions (Google Cast, Mux Data) register with the player, not with a media adapter. The player attaches them to whatever `Media` it resolves, wraps that media in a facade that consults each extension's `mediaOverride` before the media itself, and hands the facade to `store.attach()`. `HTMLMediaAdapter` is a pure host with no extension registry.

## Why

The extension elements already lived at the player level in markup (`<google-cast>` as a sibling of the media), but their wiring reached down to find an `HTMLMediaAdapter` and registered there. A plain `<video>` has no adapter, so extensions silently ignored it. Casting from a native element was the concrete requirement this could not meet, and wrapping native elements in an adapter would have kept the player dependent on media-host internals for a concern that is the player's.

The player is also the only place the intercept can be made reliable. Store features capture members such as `media.remote` once, at attach time. With the registry on the adapter, casting worked only because `<google-cast>` happened to register before the store attached: `#publishMedia()` ran before `#tryAttach()` in HTML, and child effects ran before parent effects in React. Nothing stated or tested that ordering, and an extension registered late never took effect. Owning both the registry and `store.attach()` lets the player attach extensions first and re-attach the store when an extension is added or removed, which is the same "one owner for the lifecycle" argument as [provider-attach](provider-attach.md). Re-attaching resets non-preserved store state momentarily; dynamic add/remove of an extension is rare enough that this is acceptable, and it matches what a media swap already does.

The facade is a `Proxy`, which [media/architecture](/internal/design/media/architecture.md) rejects for custom media implementations. That rejection is about media authors hiding a contract behind forwarding machinery. Here the facade is player-internal plumbing over a media the player already resolved, and store features depend on that media's Element semantics (`instanceof`, `matches(':fullscreen')`, `shadowRoot`, event dispatch). A hand-written class would break every one of them for a plain `<video>`; a Proxy is the only shape that keeps them while letting an extension take over individual members. The facade is used only while at least one extension is registered, so `store.target.media` remains the raw media otherwise.

## Sources

- Contract, coordinator, and facade: [`extension.ts`](/packages/core/src/dom/extensions/extension.ts), [`coordinator.ts`](/packages/core/src/dom/extensions/coordinator.ts), [`media.ts`](/packages/core/src/dom/extensions/media.ts)
- Player wiring: [`element.ts`](/packages/html/src/player/element.ts), [`create-player.tsx`](/packages/react/src/player/create-player.tsx)
- Plain `<video>` coverage: the `extensions` cases in [`create-player.test.ts`](/packages/html/src/player/tests/create-player.test.ts) and [`create-player.test.tsx`](/packages/react/src/player/tests/create-player.test.tsx)
