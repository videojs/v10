# player.style ports

Each `templates/player-style-<name>/` page renders one player.style theme rebuilt on Video.js 10 elements beside the
published media-chrome original, in two frames. The axis is the port itself, which is why it cannot live in the
sandbox shell's Compare — every axis there differs on a shell-owned selection.

A theme is `theme.html` + `theme.css`. Everything else — the comparison shell, both panels, the router, the element
registry — lives here and is shared.

## Status

Ports are being taken breadth-first: get every theme structurally right, then polish. Each theme has been teaching
something systemic that would have invalidated earlier pixel work, so polishing one at a time would mean redoing it.

| Theme | Ported | Known deltas |
| --- | --- | --- |
| instaplay | yes | Preview thumbnail sizing differs from the original |
| demuxed-2022 | yes | Not yet checked beyond the resting state |
| halloween | yes | Not yet checked beyond the resting state |
| notflix | yes | Control-bar icons look slightly small; bar spacing |
| reelplay | yes | Transport buttons tighter and smaller than the original; volume slider narrower |
| tailwind-audio | yes | Not yet checked beyond the resting state |
| winamp | yes | Video window narrower than the original; transport row spacing |
| x-mas | yes | Mute icon shows a different volume level than the original |
| sutro | yes | Icons render smaller and thinner than the original (22px at stroke-width 1); bar spacing |
| sutro-audio | yes | Times stack right in the original; port lays them inline around a small scrubber. Icons thin, as sutro |
| vimeonova | yes | Icons stroke-only where the original fills them; no title/byline (see slots below) |
| yt | yes | Matches at the default width |
| minimal | yes | Matches at the default width |
| minimal-live | yes | Renders the DVR shape; the test stream has no live window so the original picks its no-DVR branch. Shows more controls than the original |
| microvideo | yes | Matches at the default width |
| microvideo-live | yes | Renders the DVR shape, as minimal-live. Shows more controls than the original |

Winamp references its artwork from player.style over a pinned CDN rather than copying the bitmaps in — the same
reference-don't-carry pattern the media-chrome repo uses for its own winamp example.

`minimal` and `microvideo` each branch on stream type, so both are two skins — the on-demand port plus a `-live`
sibling on the `live-video` preset, compared against the same published package.

The originals branch *again* on whether the stream has a target live window. v10 does model this: `targetLiveWindow`
is in store state (`0` standard latency, `Infinity` DVR, `NaN` on-demand) and the live button already reads it. What
it does not do is reflect it as a data attribute, and a static skin selects on attributes, not store state — so these
ports render the DVR shape unconditionally. v10's own live skins sidestep the question entirely by carrying no
scrubber at all.

Only one live source exists in the sandbox (`hls-live`), and it reports `targetLiveWindow: 0` — standard latency, a
seekable window of about twenty seconds. Exercising the DVR branch needs a DVR stream added to `SOURCES`.

**What "checked" currently means.** Every port was compared at one width, one source, paused, with no captions and no
menu open. Hover states, playback, menus and the narrow breakpoints are unverified across the board. Treat a blank
deltas cell as "not looked at", not "matches".

## What porting a theme actually costs

Things that bit at least once and apply to every theme:

- **Named icon slots become CSS.** media-chrome selects icons with `slot="play"`, `slot="off"` and friends. v10 has no
  slots; every icon renders and CSS on the state data attribute hides the wrong ones.
- **Skin-authored artwork paints itself.** v10's own icons ship `fill="currentColor"` and follow CSS `color`, so icon
  colour is inheritance rather than a custom property. But media-chrome *forces* `fill` onto slotted artwork, which v10
  never does — artwork that shipped `fill="none"` and relied on the player to colour it renders blank until the skin
  sets fill itself.
- **Icon sizing is internal.** `--media-icon-size` exists and the packaged skins size through it, but it is marked
  internal in `packages/skins/src/styles/vars.ts`, so a skin outside the package sets its own dimensions.
- **Sprite sheets live outside the controller.** A theme drawing icons with `<use href="#id">` keeps its `<symbol>`
  definitions above the player. They have to come across or every control renders an empty box of the right size.
- **Volume level is reported on the mute button only.** A theme that styles by level without a mute button needs one
  as a hidden state carrier.
- **No reflected numeric state.** media-chrome reflects `mediacurrenttime` and `mediavolume` as attributes and themes
  select on them. v10 exposes position as CSS variables and reflects no numbers, so those selectors have no equivalent.
- **Binary assets need a build step.** player.style inlines images through an ejs `base64()` call at build time. A v10
  skin is static markup with nothing equivalent, so assets are inlined at author time here.
- **Named slots do not work.** The harness stamps skins into light DOM, where `<slot>` is inert. Themes that
  exposed a title or byline through a slot render nothing, and an empty chip if the markup wraps it. Only a
  shadow-DOM skin — v10's own `SkinElement` — can honour named slots, which is a point in favour of that being
  the eventual distribution shape.
- **Controls can be opt-in.** `minimal` and `microvideo` default their seek and picture-in-picture buttons to
  `display: none` behind a custom property, so an integrator opts in. Nothing about this is visible from the markup —
  it is three easily-missed rules near the end of the stylesheet.
- **Artwork can carry more than one state.** `yt`'s play icon ships `play-icon` and `pause-icon` as sub-groups of one
  SVG with no rules of its own; media-chrome toggled them from the player's stylesheet. v10 leaves skin-authored
  artwork alone, so both paint at once until the skin toggles them.
- **media-chrome ships default icons; v10 does not.** A control left empty in the original — `yt`'s centred seek
  buttons — renders as an empty box until the skin supplies an icon.
- **Breakpoints become container queries** on the skin root, at the same stops the theme already used.

And one thing that got *smaller*: halloween stacks two range elements because media-chrome's thumb lives in a shadow
root and cannot carry an animation from the theme. v10's slider is built from real children, so the duplicate goes.

## Upstream issues these ports surfaced

**Buttons disagree about when to hide themselves.** All five declare `hidden` in state, but compute it differently:

| Button | hides when |
| --- | --- |
| airplay, fullscreen | `availability !== 'available'` |
| captions | `availability === 'unavailable'` |
| cast | `availability === 'unsupported'` |
| pip | `!actionable` |

Cast is the outlier in the direction that shows a dead control. In Chrome with no Cast device the packaged
`<video-skin>` renders it visible at 36×36, `opacity: 0.5`, `aria-disabled="true"` — while captions and AirPlay
correctly collapse. media-chrome drops the control in every one of these cases. Reproduce at `/html-video/`.
