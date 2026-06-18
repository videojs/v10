# Migrate from Media Chrome

Video.js v10's HTML player uses the same `media-*` custom-element convention as Media Chrome, so most of the work is **renaming and reshaping**, not rewriting. This guide maps Media Chrome's API to Video.js v10 for both the HTML and React players.

> Scoped to apps that compose their own player from Media Chrome elements. If you use `<mux-player>`, see the Mux Player guide instead.

## Before you begin

Install Video.js and pick a preset/skin (see the installation guide). The fastest path is to start from a preset, then replace its controls with your migrated markup.

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

Media Chrome `<template>`-based themes (`media-theme`) become Video.js **skins** and **presets**. Start from a preset, then eject and customize (see the skins and presets concepts, and the customize-skins guide) rather than authoring a template.

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

- **Native controls aren't auto-removed when custom controls load** ([#1160](https://github.com/videojs/v10/issues/1160)). Omit the `controls` attribute on the underlying media to avoid double controls.
- **`videoTracks` (multiple video tracks/angles) is not yet supported** ([#1163](https://github.com/videojs/v10/issues/1163)).

## See also

- Installation
- UI components concept
- Skins, Presets, Customize skins
- Component reference pages
