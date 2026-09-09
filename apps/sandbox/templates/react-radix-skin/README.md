# React + Radix skin (spike)

Same shape as `react-base-ui-skin`: one page, two approaches, feature parity with the default video skin, and the shared
toolbar (Approach, Media, Source, Captions) from `@app/shared/react/library-skin-harness`.

- **render** — Video.js components own behaviour, state, and accessibility; Radix primitives go in through `render`.
- **hooks** — Radix primitives (`radix-ui` umbrella: Slider, DropdownMenu, Tooltip, Popover, Toggle, AlertDialog) and
  Radix Icons own rendering and interaction; Video.js supplies state, actions, availability, and the text-track cues.

## The hooks flavor, all in on Radix

Laid out to the default skin's metrics: a 44px pill bar inset 12px with a bottom gradient behind it, 36px round buttons
with 18px icons, 13px tabular time, a 4px track with a 12px thumb that appears on hover.

- **Icons** come from `@radix-ui/react-icons`. Radix has no picture-in-picture or cast glyph; `StackIcon` and
  `DesktopIcon` stand in.
- **Settings** is a `DropdownMenu` with one `Sub` per option hook (quality, audio, speed, captions), each showing the
  current value in the trigger like the default skin's submenus; a hook's `hidden` flag removes its submenu.
- **Seek slider** is a Radix `Slider` fed by the time, buffer, and text-track features. Radix has no pointer-position
  API, so hover time is derived from the root's rect, and from it the chapter title (`chaptersCues`) and storyboard
  tile (`thumbnailCues` + `thumbnailTrackSrc` through `mapCuesToThumbnails` and `ThumbnailCore` from `@videojs/core`).
  Chapter boundaries are drawn as gaps on the track.
- **Mute** has no tooltip because hover opens the volume popover, as in the default skin. Radix Popover has no
  hover-open, so the popover is controlled from pointer enter/leave on a wrapper and the click stays the mute toggle.
- **Disabled buttons** show `cursor: not-allowed`.

## What Radix added to the picture

1. **Radix has no Button primitive.** Plain buttons render into a shadcn-style button built on Radix `Slot` (render
   approach) or are plain `<button>`s (hooks approach).
2. **Function-form `render` is the bridge to controlled library state.** `render={(props, state) => <Toggle.Root
   {...props} pressed={state.muted} />}` lets Radix `Toggle` show `aria-pressed`/`data-state` from Video.js state while
   Video.js keeps the click handling, `aria-label`, and `data-*`.
3. **`asChild` collisions on `data-state`.** `Popover.Anchor asChild` wrapping `Toggle.Root` overwrites the toggle's
   `data-state="on|off"` with the popover's `data-state="closed|open"`.
4. **Radix DropdownMenu opens on `pointerdown`**, not `click`; programmatic `.click()` does nothing.
5. **Radix Slider takes `number[]`** and puts `role="slider"` on the thumb `span`; `PageUp` fires `onValueCommit`.
6. **Portals** need `container={useContainer()}` for tooltips, menus, submenus, popovers, and the alert dialog.

## Friction found (Video.js side, from this flavor)

- **Gestures see native events before React handlers.** The container's tap gesture listens natively on the container,
  so `event.stopPropagation()` in a React handler on a library slider does nothing and a click on the track toggled
  playback. The exemption is the `data-interactive` attribute the gesture layer checks (Video.js's `Controls.Content`
  sets it); the bar and the volume popover carry it now.
- **No pointer-position or preview seam for foreign sliders.** Hover time, chapter title, and thumbnail had to be
  derived by hand from the root's rect and the text-track cues; the core's `mapCuesToThumbnails` and `ThumbnailCore`
  did the sprite math.

Everything in the Base UI README about Video.js-side friction and the parity table applies unchanged.
