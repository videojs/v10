# React + Radix UI skin

A Video.js player whose controls are [Radix Primitives](https://www.radix-ui.com/primitives) and Radix Icons. Radix owns
rendering and interaction; Video.js supplies state and actions through `usePlayer(selector)`, availability flags, the
option hooks, the text-track feature's chapter and thumbnail cues, and its i18n text tokens. The site guide
[Use Video.js with Radix UI](../../../../site/src/content/docs/how-to/use-videojs-with-radix-ui.mdx) builds the same
code up step by step; this page is the feature-complete version with the shell's Source, Captions, and Language
pickers.

- `main.tsx`: the page. hls.js is the one media (it plays every on-demand HLS source and exposes renditions and audio
  tracks); source, captions, and locale travel in the URL and post the shell's messages.
- `skin.tsx`: the controls, laid out to the default skin's metrics (44px pill bar inset 12px over a bottom gradient,
  36px round buttons with 18px icons, 13px tabular time, 4px track with a 12px thumb).

## What Video.js supplies, and where

| Piece | Video.js seam |
| --- | --- |
| Play, mute, captions, PiP, fullscreen, remote playback | `usePlayer(selectX)` state and actions; `*Availability` hides `'unsupported'` and disables `'unavailable'` |
| Volume slider | `selectVolume` (`volume`, `setVolume`), shown in a hover popover |
| Seek slider | `selectTime`, `selectBuffer`; chapters and storyboard from `selectTextTrack` via the core's `normalizeChapterCues`, `mapCuesToThumbnails`, `ThumbnailCore` |
| Time display | `formatTime` from `@videojs/utils/time`, guided by the duration like the built-in `Time` |
| Settings submenus | `useQualityOptions`, `useAudioTrackOptions`, `usePlaybackRateOptions`, `useCaptionsOptions`; each hook's `hidden` removes its submenu |
| Tooltips | `useHotkeyShortcut(action)` for the key hint |
| Popups in fullscreen | `useContainer()` as every Radix `Portal`'s `container` |
| Gestures | `Hotkey` and `Gesture`; `data-interactive` on the bar, popover, and dialog so taps there are ignored |
| Wording | `useTranslator()` with `@videojs/core/i18n/text/*` tokens; error copy from `getErrorDialogTitleText`, `resolveErrorDialogDescription`, `getErrorDialogDismissText` |
| Auto-hide | `selectControls().controlsVisible` |

## Radix findings

1. **`AlertDialog` is always page-modal** (hides the rest of the document, locks scroll, blocks outside pointers).
   Video.js's `ErrorDialog` scopes modality to the player, so the skin uses `Dialog modal={false}` with
   `role="alertdialog"`, ignores outside interaction, and paints its own scrim.
2. **`Slider` exposes no pointer position.** Hover time comes from the root's rect in `onPointerMove`; chapter title and
   storyboard tile are derived from it.
3. **`Popover` has no hover-open.** The volume popover is controlled from pointer enter/leave on trigger and content with
   a short close delay so the pointer can cross the gap.
4. **`DropdownMenu` opens on `pointerdown`**, not `click`; programmatic `.click()` does nothing.
5. **No Button primitive.** Plain `<button>`s share a class with the `Toggle` roots.
6. **Popups take no controls lock**, so the bar can auto-hide under an open menu.
7. **Radix Icons** has no closed-caption, picture-in-picture, cast, or speedometer glyph; nearest stand-ins are used and
   single-glyph on/off state is an underline.

## Video.js-side friction

- **Gestures see native events before React handlers.** `stopPropagation()` in a Radix handler cannot stop the
  container's tap gesture; the exemption is the `data-interactive` attribute `Controls.Content` sets.
- **Three packages to import from.** `@videojs/react` does not re-export the text tokens, the error-dialog copy helpers,
  the thumbnail and chapter helpers (`@videojs/core`), or `formatTime` (`@videojs/utils`), so a hooks-only consumer
  installs and imports all three.
- **No pointer-position or preview seam for foreign sliders**; the core's pure helpers did the math, but the pointer
  itself had to be derived by hand.
