# @videojs/api-demo

An Astro demo app that showcases the Video.js 10 **media API**.

The homepage renders the React `HlsVideo` player (with the default skin) and a
panel of controls wired directly to the media instance via `useMedia()`. It is a
hands-on playground for the media API:

- **Source** — load any HLS (`.m3u8`) URL for testing.
- **Setters / actions** — play/pause, seek (slider + exact time), playback rate,
  volume, mute, and text/audio track selection, each calling the API directly
  (`media.play()`, `media.currentTime = …`, `media.textTracks[i].mode = …`, …).
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
# from the repo root
pnpm --filter @videojs/api-demo dev

# or build the workspace packages first, then run directly
pnpm build:packages
pnpm --dir apps/api-demo dev
```

## Build

```bash
pnpm --filter @videojs/api-demo build
```

## Adding more API demos

`src/components/PlayerDemo.tsx` is the place to grow this. The media instance
returned by `useMedia()` exposes the full media API (seeking, volume, playback
rate, tracks, stream type, renditions, …) — add new controls alongside the
existing ones, log them as actions, and persist them to the URL to match the
rest of the demo.
