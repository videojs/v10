# React + Radix skin (spike)

Same shape as `react-base-ui-skin`: one page, two approaches, feature parity with the default video skin, and the shared
toolbar (Approach, Media, Source, Captions, Language) from `@app/shared/react/library-skin-harness`. Both pages sit
inside `SandboxI18nProvider`, so the `locale` param and the shell's `locale-change` message drive Video.js i18n.

- **render** — Video.js components own behaviour, state, and accessibility; Radix primitives go in through `render`.
- **hooks** — Radix primitives (`radix-ui` umbrella: Slider, DropdownMenu, Tooltip, Popover, Toggle, Dialog) and
  Radix Icons own rendering and interaction; Video.js supplies state, actions, availability, and the text-track cues.

## The hooks flavor, all in on Radix

Laid out to the default skin's metrics: a 44px pill bar inset 12px with a bottom gradient behind it, 36px round buttons
with 18px icons, 13px tabular time, a 4px track with a 12px thumb that appears on hover.

- **Icons** come from `@radix-ui/react-icons`, one per concept and shared between button and menu: speech bubble for
  captions, overlapping frames (`CopyIcon`) for picture-in-picture, sliders (`MixerHorizontalIcon`) for quality, a
  globe for audio language, a stopwatch for speed, a desktop for remote playback. Radix has no closed-caption,
  picture-in-picture, cast, or speedometer glyph, so those are the nearest stand-ins.
- **On/off state** swaps the icon where Radix has a pair (speaker levels, fullscreen, PiP enter → `ExitIcon`) and
  otherwise underlines the icon while active (captions showing, remote playback connected), the way YouTube marks
  captions; the inactive icon sits at 80% opacity.
- **Wording** comes from the same i18n text tokens the default skin uses (`@videojs/core/i18n/text/*`) through
  `useTranslator()`, so labels, tooltips, and menu headings read identically and translate with the locale.
- **Settings** is a `DropdownMenu` with one `Sub` per option hook (quality, audio, speed, captions), each showing the
  current value in the trigger like the default skin's submenus; a hook's `hidden` flag removes its submenu.
- **Seek slider** is a Radix `Slider` fed by the time, buffer, and text-track features. Radix has no pointer-position
  API, so hover time is derived from the root's rect, and from it the chapter title (`chaptersCues`) and storyboard
  tile (`thumbnailCues` + `thumbnailTrackSrc` through `mapCuesToThumbnails` and `ThumbnailCore` from `@videojs/core`).
  Chapter boundaries are drawn as gaps on the track.
- **Mute** has no tooltip because hover opens the volume popover, as in the default skin. Radix Popover has no
  hover-open, so the popover is controlled from pointer enter/leave on a wrapper and the click stays the mute toggle.
- **Disabled buttons** show `cursor: not-allowed`.
- **Error dialog** is a non-modal Radix `Dialog` with `role="alertdialog"`, portaled into the container with its own
  backdrop and outside interactions ignored, so it covers the player and nothing else, like Video.js's `ErrorDialog`.
  Its title, description, and dismiss label come from the core's error-dialog text helpers
  (`getErrorDialogTitleText`, `resolveErrorDialogDescription`, `getErrorDialogDismissText`) through `translateText`.

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
6. **Portals** need `container={useContainer()}` for tooltips, menus, submenus, popovers, and the dialog.
7. **Radix `AlertDialog` is always page-modal.** It hides everything else from assistive tech, locks scroll, and
   disables outside pointer events for the whole document, where Video.js's `ErrorDialog` scopes modality to the
   player. Only `Dialog` exposes `modal={false}`, and non-modal `Dialog` renders no `Overlay`, so the backdrop and the
   "ignore outside clicks" behaviour are hand-rolled.

## Friction found (Video.js side, from this flavor)

- **Gestures see native events before React handlers.** The container's tap gesture listens natively on the container,
  so `event.stopPropagation()` in a React handler on a library slider does nothing and a click on the track toggled
  playback. The exemption is the `data-interactive` attribute the gesture layer checks (Video.js's `Controls.Content`
  sets it); the bar and the volume popover carry it now.
- **No pointer-position or preview seam for foreign sliders.** Hover time, chapter title, and thumbnail had to be
  derived by hand from the root's rect and the text-track cues; the core's `mapCuesToThumbnails` and `ThumbnailCore`
  did the sprite math.

Everything in the Base UI README about Video.js-side friction and the parity table applies unchanged.
