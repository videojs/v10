# Migrate from Media Chrome

Video.js v10's HTML player uses the same `media-*` custom-element convention as Media Chrome, so most of the work is **renaming and reshaping**, not rewriting. This guide maps Media Chrome's API to Video.js v10 for both the HTML and React players.

> Scoped to apps that compose their own player from Media Chrome elements. If you use `<mux-player>`, see the Mux Player guide instead.

## Before you begin

Install Video.js and pick a preset/skin (see the [installation guide](https://videojs.org/docs/framework/html/how-to/installation)). The fastest path is to start from a preset, then replace its controls with your migrated markup.

```bash
npm install @videojs/html   # or @videojs/react
```

## Map the controller

Media Chrome wraps a slotted `<video slot="media">` in a single `<media-controller>`. Video.js splits this into a `<video-player>` provider and a `<media-container>`, with the media as a plain child.

```html
<!-- Media Chrome -->
<media-controller>
  <video slot="media" src="video.m3u8"></video>
  <media-control-bar>
    <media-play-button></media-play-button>
  </media-control-bar>
</media-controller>
```

```html
<!-- Video.js -->
<video-player>
  <media-container>
    <video src="video.mp4"></video>
    <media-controls>
      <media-play-button></media-play-button>
    </media-controls>
  </media-container>
</video-player>
```

## Map controller attributes

Media Chrome configures behavior through `<media-controller>` attributes. Video.js v10 has no single controller element, so these settle into three places:

- **Store features** — playback behavior composed into the player via `createPlayer({ features })`.
- **`<media-container>` / `<media-controls>`** — layout, focus, and autohide.
- **Dedicated elements** — `<media-hotkey>`, `<media-gesture>`, etc., declared in markup.

| Media Chrome attribute | Video.js v10 | How |
|---|---|---|
| `audio` | `audioFeatures` preset | Choose an audio player (`createPlayer({ features: audioFeatures })` / audio skin) rather than toggling at runtime. |
| `autohide` | `media-controls` (built in) | Controls auto-hide after inactivity automatically. The delay is currently fixed — see Known gaps. |
| `fullscreenelement` | `media-container` | Fullscreen targets the container element. |
| `gesturesdisabled` | `media-gesture disabled` / omit | Disable per gesture element, or leave the gestures out. |
| `nohotkeys` | `media-hotkey disabled` / omit | Disable per hotkey element, or leave them out. |
| `hotkeys="noarrowleft …"` | individual `media-hotkey` | Each shortcut is its own element — remove the ones you don't want. |
| `keyboardforwardseekoffset` / `keyboardbackwardseekoffset` | `value` on `media-hotkey` | Set the signed seek amount per element. |
| `defaultsubtitles` | `media-captions-button` / store | Partial — captions can be toggled; "on by default" isn't a flag yet. |
| `defaultstreamtype` | `streamType` feature | Partial — derived from the media; no pre-load default. |
| `liveedgeoffset` / `seektoliveoffset` | live media engine | Live-edge behavior lives in the playback engine, not a UI attribute. |
| `lang` | i18n translator | Localization is configured through the translator/locale registry. |

### Hotkeys

Media Chrome toggles keyboard shortcuts with `nohotkeys` / `hotkeys`. Video.js declares each shortcut as a `<media-hotkey>` element, so you opt in to exactly the keys you want and set seek offsets inline:

```html
<media-hotkey keys="Space" action="togglePaused"></media-hotkey>
<media-hotkey keys="m" action="toggleMuted"></media-hotkey>
<media-hotkey keys="ArrowRight" action="seekStep" value="5"></media-hotkey>
<media-hotkey keys="ArrowLeft" action="seekStep" value="-5"></media-hotkey>
```

To drop a shortcut, remove its element (or add `disabled`). There's no global "all hotkeys off" switch — omit the elements you don't need.

### Gestures

`gesturesdisabled` becomes per-element `<media-gesture>` controls. Tap and double-tap behavior — click to toggle play, double-tap to seek or go fullscreen — is declared explicitly:

```html
<media-gesture type="tap" action="togglePaused" pointer="mouse" region="center"></media-gesture>
<media-gesture type="doubletap" action="seekStep" value="-10" region="left"></media-gesture>
<media-gesture type="doubletap" action="seekStep" value="10" region="right"></media-gesture>
```

Remove an element or set `disabled` to turn a gesture off.

## Map the elements

Most names match. The renames that bite:

| Media Chrome | Video.js v10 | Note |
|---|---|---|
| `media-controller` | `video-player` + `media-container` | provider + container |
| `media-control-bar` | `media-controls` / `media-controls-group` | grouping |
| `media-time-range` | `media-time-slider` | "range" → "slider" |
| `media-volume-range` | `media-volume-slider` | "range" → "slider" |
| `media-time-display`, `media-duration-display` | `media-time` | one element, set via attribute |
| `media-loading-indicator` | `media-buffering-indicator` | rename |
| `media-poster-image` | `media-poster` | rename |
| `media-seek-backward-button`, `media-seek-forward-button` | `media-seek-button` | one element, direction via attribute |
| `media-rendition-menu` | `media-quality-radio-group` | inside `media-menu` |
| `media-captions-menu` | `media-captions-radio-group` | inside `media-menu` |
| `media-playback-rate-menu` | `media-playback-rate-radio-group` | inside `media-menu` |

Unchanged names: `media-play-button`, `media-mute-button`, `media-fullscreen-button`, `media-pip-button`, `media-airplay-button`, `media-cast-button`, `media-captions-button`, `media-playback-rate-button`, `media-tooltip`, `media-thumbnail`.

Sliders are compound in both, using `media-slider-track`, `media-slider-fill`, and `media-slider-thumb`.

## Rewrite your styles

Media Chrome reflects state as `media*` attributes (`mediapaused`); Video.js uses `data-*`.

```css
/* Media Chrome */
media-play-button[mediapaused] .play-icon { display: inline; }

/* Video.js */
media-play-button[data-paused] .play-icon { display: inline; }
```

Continuous values use CSS custom properties: sliders expose `--media-slider-fill` and `--media-slider-pointer`.

## Themes → skins

Media Chrome `<template>`-based themes (`media-theme`) become Video.js **skins** and **presets**. Start from a preset, then eject and customize (see the [skins](https://videojs.org/docs/framework/html/concepts/skins) and [presets](https://videojs.org/docs/framework/html/concepts/presets) concepts, and the [customize-skins guide](https://videojs.org/docs/framework/html/how-to/customize-skins)) rather than authoring a template.

## React

Media Chrome's React package wraps the custom elements. `@videojs/react` ships native components composed under a `createPlayer` provider, customized with the `render` prop and hooks (`usePlayer`, `useMedia`, `useStore`).

```tsx
import { createPlayer, PlayButton } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export function MyPlayer() {
  return (
    <Player.Provider>
      <Player.Container>
        <Video src="video.mp4" />
        <PlayButton
          render={(props, state) => (
            <button {...props}>{state.paused ? 'Play' : 'Pause'}</button>
          )}
        />
      </Player.Container>
    </Player.Provider>
  );
}
```

## Known gaps

These Media Chrome features have no direct equivalent yet. Several can be approximated — see Workarounds below.

- Chapters are not yet supported in the media and in the time slider UI ([#1441](https://github.com/videojs/v10/issues/1441))
- Cue points are not yet supported in the media ([#1442](https://github.com/videojs/v10/issues/1442))
- No configurable `autohide` delay or disable switch (`autohide="-1"`), and no `autohideovercontrols` ([#1728](https://github.com/videojs/v10/issues/1728))
- No `defaultduration` placeholder before the media loads ([#1729](https://github.com/videojs/v10/issues/1729))
- No preference-persistence opt-outs (`novolumepref`, `nomutedpref`, `nosubtitleslangpref`) ([#1428](https://github.com/videojs/v10/issues/1428), [#1423](https://github.com/videojs/v10/issues/1423))
- No `breakpoints` / container-breakpoint attributes, use CSS container queries instead
- No `seektoliveoffset` / `noautoseektolive` controls

## Workarounds

### Disable autohide (`autohide="-1"`)

The skin hides controls by removing `data-visible` from `<media-controls>`. Keep them (and the cursor) visible by overriding that hidden state in your player CSS:

```css
.media-default-skin--video .media-controls:not([data-visible]) {
  opacity: 1;
  scale: 1;
  filter: none;
  pointer-events: auto;
}

.media-default-skin--video:has(.media-controls:not([data-visible])) {
  cursor: auto;
}
```

To change the *delay* rather than disable it, note the idle timer is a constant inside `controlsFeature`. Fork that feature and swap it into a custom feature list:

```ts
const Player = createPlayer({
  features: videoFeatures.map((f) => (f.name === 'controls' ? myControlsFeature : f)),
});
```

### Breakpoints

The skin root is an inline-size container named `media-root`, so write responsive styles with container queries instead of `breakpoints` attributes (this is exactly how the built-in skins adapt):

```css
@container media-root (width > 40rem) {
  .media-controls { /* wide layout */ }
}
```

### Default duration

There's no store input for a pre-load duration. Use `preload="metadata"` (the default) so the real duration is known almost immediately — only `preload="none"` defers it. If you must defer loading, render your own static placeholder in markup.

### Preference persistence

Media Chrome remembers volume/muted/language across sessions; v10 persists nothing (so its `no*pref` opt-outs don't apply). Restore and save the values yourself from the store. In React, read volume state with `usePlayer(selectVolume)`:

```tsx
import { selectVolume, usePlayer } from '@videojs/react';
import { useEffect } from 'react';

function PersistVolume() {
  const volume = usePlayer(selectVolume);

  useEffect(() => {
    const saved = localStorage.getItem('vjs:volume');
    if (saved) volume.setVolume(Number(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('vjs:volume', String(volume.volume));
  }, [volume.volume]);

  return null;
}
```

In the HTML player, do the same against the store directly — `selectVolume(store.state).setVolume(...)` on init, and `store.subscribe(...)` to save on change.

### Live edge offsets

`seektoliveoffset` / `noautoseektolive` are governed by the playback engine, not the UI layer, so there's no attribute to tune them today. The escape hatch is a custom live control built against the `selectLive` / `selectTime` store state.

## See also

- [Installation](https://videojs.org/docs/framework/html/how-to/installation)
- [UI components concept](https://videojs.org/docs/framework/html/concepts/ui-components)
- [Skins, Presets, Customize skins](https://videojs.org/docs/framework/html/how-to/customize-skins)
