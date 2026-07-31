---
status: decided
date: 2026-07-31
---

# Configure media through `source.engine` instead of a `config` bag

## Decision

Media configuration has three tiers, each with exactly one home:

| Tier | Home | Example |
| --- | --- | --- |
| Source identity | `source` fields (`src`, or a host's own identity fields) | `src`, `MuxSource.playbackId` |
| How to interpret the source | `source.type` | `'application/vnd.apple.mpegurl'` |
| Options Video.js normalizes | `source`, alongside `engine` | `source.preferPlayback` |
| The engine's own configuration | `source.engine` | hls.js `maxBufferLength`, dash.js `streaming.abr` |
| A side-car component's own settings | that component's own props | `<mux-data env-key>`, `<google-cast receiver>` |

The `config` property is removed from `MediaConfigCapability`, `MediaConfig`, `HlsMediaConfig`, and every host, element, and React prop that exposed it.

Supporting rules:

- `source` is declared only by hosts that consume it, not by the base host or `MediaFull`. `src` stays the universal source surface and the only one with an attribute.
- `source` **replaces**; it never merges. Comparison is structural (`deepEqual`), so reassigning an equivalent object is a no-op.
- Only `source.engine`, engine-selecting options such as `preferPlayback`, and the resolved content type can force the playback engine to be recreated.
- Assigning `src` replaces source identity and preserves every other option.
- `source` has no HTML attribute. It holds an object, and `CustomMediaElement` coerces attributes to string, boolean, or number only.
- `engine` **is** the engine's own configuration object, typed per host and passed through untouched — an hls.js `HlsConfig`, dash.js settings, or Vimeo embed parameters. There is no Video.js-owned wrapper inside it and no vendor-named key (`hlsJs`, `dashJs`).

## Context

Media elements accepted one untyped `config` bag for everything that was not the source. It mixed engine construction options, per-source overrides, and side-car component settings into a single namespace with no attribute surface and nothing in the shape to say which tier a new option belonged to.

Two concrete failures drove this. Replacing the bag could silently destroy and rebuild the playback engine, because the engine key was derived from the whole bag by reference — so `media.config = { muxData: {…} }` tore down a working engine, and every test had to defend with the `{ ...media.config, … }` idiom. And coverage was uneven: `HlsMediaConfig` was inherited by `<dash-video>` and `<simple-hls-video>`, but neither read it, so those elements advertised a property that did nothing.

Settles the design question in issue #1866; implements issue #1891. Unblocks the four feature issues that would otherwise have landed as raw `hlsJs` passthrough (#1777, #1772, #1773, #1783).

The component tier was already resolved ahead of this record: `<mux-data>` and `<google-cast>` became real elements and components with their own props (#1860, #1883), which removed the `static configKey` routing. This record fixes that as the answer rather than relocating those namespaces somewhere new.

## Alternatives Considered

- **Keep `config` and document the tiers** — Cheapest, but leaves the engine-recreation hazard and the inert-property gap in place, and gives a new option no unambiguous home.
- **Key `engine` by engine name (`engine: { hlsJs, native }`)** — Reads well for a host with several delegates, but bakes a vendor name into the public shape and adds a level of nesting that carries no information: the element already determines which engine it drives.
- **Nest the vendor config under `engine.hlsJs` / `engine.dashJs` and keep normalized keys beside it** — Groups everything engine-related under one key, but leaks vendor naming into the API, and the extra level buys nothing once normalized options live on `source`.
- **Drop the passthrough entirely and rely on `el.engine.config`** — Removes vendor configuration from the declarative API, but loses construction-time-only options such as `enableWorker`, and forces imperative access for ordinary tuning.
- **Put `source` on the base host so every element has it** — Would close the HTML/React parity gap in one move, but gives `<native-hls-video>` and `<simple-hls-video>` a `source.engine` that nothing reads — the same inert-property problem, renamed.
- **Merge `source` instead of replacing it** — Convenient for changing one key, but makes clearing a value impossible and leaves the shape ambiguous about what a partial assignment means.

## Rationale

Tying configuration to the source is what makes engine recreation predictable: the engine is a function of the source it plays, so the engine key is derived from `source.engine` plus the resolved content type and nothing else. Structural comparison then makes the common React pattern — a fresh object literal every render — free, which is what removes the defensive spreading the old bag required.

Declaring `source` only where it is consumed keeps the contract honest. `<simple-hls-video>` loses an inert property instead of gaining a differently-named one; its SPF engine reads configuration once from a constructor argument the custom-element layer never supplies, so wiring `source.engine` there is a separate change to SPF, not a type-level rename.

Splitting normalized options from the engine's own config draws the boundary along the line that actually matters: ownership. Anything on `source` is a Video.js contract we are accountable for across engines — today `preferPlayback`, later the resolution-cap and DRM work. Anything inside `engine` belongs to the engine, is typed by the engine's own definitions, and needs no naming decision or wrapper from us. That keeps the passthrough exhaustive by construction, so a new hls.js option needs no change here, while leaving a clear home for options we do choose to normalize.

It also removes the vendor name from the shape. `engine` reads the same on every element, and its type tells you which engine you are configuring.

See `packages/media/src/core/types.ts` for `MediaSourceObject`, `packages/media/src/core/media-source.ts` for the shared `src` / `source` resolution, and `internal/design/media/architecture.md` for the surrounding capability model.
