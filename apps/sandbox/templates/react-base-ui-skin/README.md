# React + Base UI skin (spike)

Two ways to put Video.js 10 behind a third-party component library, side by side on one page, at feature parity with
the default video skin. The toolbar mirrors the shell: **Approach** (`approach=render|hooks`), **Media**, **Source**,
and **Captions** (the sandbox's synthetic caption tracks). All four travel in the URL. The media, source, and captions
pickers, the media component per media id, and the default skin's hotkeys and gestures live in
`@app/shared/react/library-skin-harness`, shared with the Radix template.

- **render** — Video.js components own behaviour, state, and accessibility; Base UI elements go in through `render`.
- **hooks** — Base UI components own rendering and interaction; Video.js supplies state and actions through
  `usePlayer(selector)`, the store's action methods, availability flags, and the option hooks.

Base UI was first because the sandbox shell already uses it (`@base-ui/react`, shadcn `base-nova` wrappers under
`@app/components/ui`).

## Parity with the default skin

| Default skin | render | hooks |
| --- | --- | --- |
| Poster, buffering indicator, error dialog | Video.js `Poster`, `BufferingIndicator`, `ErrorDialog` (Close renders a Base UI Button) | `<img>` from metadata, spinner from `waiting`, Base UI `AlertDialog` from the error feature |
| Play, mute + volume popover, time, remaining toggle | Video.js components; Base UI `Button` via `render` | Base UI `Button`/`Toggle`/`Popover`/`Slider`; a button toggles remaining ↔ duration |
| Time slider with chapters, buffer, thumbnail + chapter-title preview | Video.js `TimeSlider` with Base UI slider classes; preview shown only while pointing | Base UI `Slider`; buffered range drawn from the buffer feature. Gap: no pointer preview, chapters, or thumbnails |
| Captions button, settings (quality, audio, speed, captions) | Video.js buttons and `Menu` with the four `*RadioGroup` parts; empty groups hidden by the option hooks | Base UI `Menu.RadioGroup` per option hook; `hidden` gates each group |
| Cast, AirPlay, PiP, fullscreen | Video.js buttons render `null` when unsupported, disabled when unavailable | One remote-playback toggle for Cast/AirPlay; PiP and fullscreen toggles; all gated on `*Availability` |
| Seek/volume/status indicators, status announcer | Video.js indicator compounds | Gap: no exported hook subscribes to input actions |
| Hotkeys, gestures | `PlayerBehaviors` (state-only Video.js components) | same |

## Friction found (Video.js side)

1. **Sliders cannot be `render`ed into a library slider.** Both sides own pointer handling on their root and both
   place `role="slider"` (Video.js on `Thumb`, Base UI on a hidden `<input type="range">`). Keep the Video.js slider
   and restyle it, or go fully to the library slider via hooks and lose the pointer preview.
2. **Menus, popovers, tooltips, dialogs are Video.js implementations** coordinated through the container's popup
   group, positioner, and controls lock. A library menu can only replace the whole compound; the radio groups'
   `Options` part depends on `Menu.Root` context, so the `use*Options` hooks are the seam for a foreign menu, and their
   `hidden` flag is the availability gate a flat menu needs to hide empty groups.
3. **Tooltip labels flow by context push.** A Video.js button inside a library tooltip surfaces no label; a library
   button inside a Video.js tooltip surfaces nothing unless it is also a Video.js button.
4. **`disabled` on media buttons is a core prop**, so only `aria-disabled` reaches the element.
5. **A bare library trigger loses i18n**: `Menu.Trigger render={<Button/>}` needs its own `aria-label`.
6. **Element-form `render` lets the library element's props win** on key collisions, and the library's handlers run
   first. `className` is concatenated, not merged.
7. **Library popups portal to `<body>` by default** and would leave a fullscreen player; pass the container.
8. **Auto-hide vs open popups**: Video.js popups take a controls lock; a library popup does not.
9. **No hook for input-action indicators**: the seek/volume/status overlays are reachable only as components.

## Friction found (sandbox side)

- The optimizer runs with `noDiscovery`, so every library entry point a template uses must be listed in
  `optimizeDeps.include`. The engine entries had gone stale after the adapter package rename; they now point at
  `@videojs/dash-video`, `@videojs/hlsjs-video`, `@videojs/mux-data`, and `@videojs/shaka-video`.
- The SPF `hls-video` media refuses MPEG-TS sources by design, so the harness lands on each media's shell entry or
  fallback source and defaults to hls.js, which plays every HLS source and exposes renditions and audio tracks.
