# @videojs/api-demo

An Astro demo app that showcases the Video.js 10 **media API**.

The homepage renders the React `HlsJsVideo` player and a panel of controls wired
directly to the media instance via `useMedia()`. It is a hands-on playground for
the media API:

- **Source** — load any HLS (`.m3u8`) URL for testing.
- **Setters / actions** — play/pause, seek (slider + exact time), playback rate,
  volume, mute, and text/audio track selection, each calling the API directly
  (`media.play()`, `media.currentTime = …`, `media.textTracks[i].mode = …`, …).
- **Cue points** — timed markers with JSON payloads, added to a
  `<track kind="metadata">` element as `VTTCue`s. There is no cue point API:
  `track.addCue()` / `track.removeCue()` and the track's `cuechange` event are
  the whole feature (see `src/components/player-demo/cue-points.ts`).
- **Getters** — a cloud of every readable property; click one to log its current
  value.
- **Message log** — a live, color-coded console: media **events** (yellow),
  **actions** (orange), and **getter** reads (magenta).
- **Shareable state** — every action is written to the URL as a query param
  (booleans as `0`/`1`), so a configuration can be shared and is restored on
  reload.

Styling, palette, typography (Instrument Sans / IBM Plex Mono / Eurostile), and
footer mirror videojs.org so the page shares the same look and feel.

## Develop

```bash
# from the repo root (builds the workspace packages first)
pnpm dev:api-demo
```

## Build

```bash
pnpm build:api-demo
```

## Deployment

Deploys via Netlify from `main`, configured by [`netlify.toml`](netlify.toml). The
Netlify site uses **package directory** `apps/api-demo` — Netlify reads the
config from there while resolving its paths against the repository root, the same
arrangement as [`site/netlify.toml`](../../site/netlify.toml).

The `ignore` command asks Turborepo whether this app's `build` task is affected,
so pushes that don't touch the demo (or the packages it depends on) skip the
deploy.

## Adding more API demos

`src/components/PlayerDemo.tsx` is the place to grow this. The media instance
returned by `useMedia()` exposes the full media API (seeking, volume, playback
rate, tracks, stream type, renditions, …) — add new controls alongside the
existing ones, log them as actions, and persist them to the URL to match the
rest of the demo.
