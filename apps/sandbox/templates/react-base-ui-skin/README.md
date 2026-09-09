# React + Base UI skin (spike)

Two ways to put Video.js 10 behind a third-party component library, side by side on one page. Switch with the
**Approach** dropdown or the `approach` URL param (`render` | `hooks`).

- **render** — Video.js components own behaviour, state, and accessibility; Base UI elements go in through `render`.
- **hooks** — Base UI components own rendering and interaction; Video.js supplies state and actions through
  `usePlayer(selector)`, the store's action methods, and the option hooks.

Base UI was first because the sandbox shell already uses it (`@base-ui/react`, shadcn `base-nova` wrappers under
`@app/components/ui`), so no new dependency was needed.

## What the two approaches proved

| Concern | render | hooks |
| --- | --- | --- |
| Buttons | Base UI `Button` in `render`; keeps `aria-label` (i18n), `data-paused`/`data-ended`/`data-started`, tooltip wiring, hotkey hints | Base UI `Button`/`Toggle` with `onClick` → `playback.togglePaused()` etc.; labels hand-written |
| Time slider | Video.js `TimeSlider` stays; Base UI slider classes applied; fill/buffer from `--media-slider-*` vars | Base UI `Slider` controlled by `currentTime`, commit → `time.seek()`; drag value held locally |
| Volume | Video.js `VolumePopover` + `VolumeSlider`, Base UI-styled | Base UI `Popover` (hover) + vertical `Slider` → `volume.setVolume()` |
| Settings menu | Video.js `Menu` with Base UI `Button` trigger; radio groups from `*RadioGroup.Root/Options` | Base UI `Menu` with `Menu.RadioGroup` per `usePlaybackRateOptions()` / `useCaptionsOptions()` / `useQualityOptions()` |
| Tooltips | Video.js `Tooltip` (label + shortcut pushed by the button) | Base UI `Tooltip`; label hand-written, shortcut from `useHotkeyShortcut(action)` |
| Auto-hide | `Controls.Root/Content` | `usePlayer(selectControls).controlsVisible` |
| Fullscreen containment | Video.js popups never leave the container | Every Base UI `Portal` gets `container={useContainer()}` |

## Friction found (Video.js side)

1. **Sliders cannot be `render`ed into a library slider.** Both sides own pointer handling on their root and both
   place `role="slider"` (Video.js on `Thumb`, Base UI on a hidden `<input type="range">`). The workable pattern is
   keep the Video.js slider and restyle it, or go fully to the library slider via hooks.
2. **Menus, popovers, tooltips are Video.js implementations** coordinated through the container's popup group,
   positioner, and controls lock. A library menu can only replace the whole compound; the radio groups' `Options`
   part depends on `Menu.Root` context, so the `use*Options` hooks are the seam for a foreign menu.
3. **Tooltip labels flow by context push.** A Video.js button inside a library tooltip surfaces no label; a library
   button inside a Video.js tooltip surfaces nothing unless it is also a Video.js button.
4. **`disabled` on media buttons is a core prop**, so only `aria-disabled` reaches the element; a library button that
   styles the native `disabled` attribute will not react.
5. **A bare library trigger loses i18n**: `Menu.Trigger render={<Button/>}` needs its own `aria-label`; the packaged
   skin gets it by rendering a Video.js button as the trigger.
6. **Element-form `render` lets the library element's props win** on key collisions, and the library's handlers run
   first. `className` is concatenated, not merged.
7. **Library popups portal to `<body>` by default** and would leave a fullscreen player; pass the container.
8. **Auto-hide vs open popups**: Video.js popups take a controls lock; a library popup does not, so the bar can hide
   under an open Base UI menu unless `controls.requestControlsLock()` is wired.

## Friction found (sandbox side)

- The sandbox Vite config runs the optimizer with `noDiscovery`, so every `@base-ui/react/*` entry a template uses
  must be listed in `optimizeDeps.include`; unlisted entries fail on CommonJS deps (`use-sync-external-store`).
