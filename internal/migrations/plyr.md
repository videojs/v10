# Migrate from Plyr

Video.js v10 is not a drop-in replacement for Plyr. Plyr wraps one media element with a constructor and an options object; Video.js 10 is built a bit differently. The player is composed, not configured. That means that the player you ship is smaller and faster — most users will see a reduction in bundle size. And that means that when you’re ready to customize your player, it’s easy to go under the hood and build what you need. It also means there’s a bit more set-up to get started. 

The migration is mostly **moving configuration into markup** and replacing Plyr's instance API with native media APIs or Video.js store state.

## Why switch?

Plyr is simple and familiar, so the reason to migrate should be practical. These are the strongest wins when your app can use HTML5, HLS, DASH, Vimeo, or Mux-backed media. We've taken our vast experience building some of the best players and thrown it all into Video.js v10. 

- **♿ Accessibility starts in the component model.** Plyr has long-running reports around WCAG compliance, slider semantics, keyboard behavior, focus visibility, and menu roles ([#905](https://github.com/sampotts/plyr/issues/905), [#103](https://github.com/sampotts/plyr/issues/103)). Video.js v10 exposes buttons, sliders, menus, radio groups, and tooltips as focused components with state attributes and accessibility behavior built into each part.
- **📺 Streaming controls are first-class media state.** Streaming was an afterthought in Plyr. HLS quality switching is one of Plyr's most-requested gaps ([#1741](https://github.com/sampotts/plyr/issues/1741), [#218](https://github.com/sampotts/plyr/issues/218)). Video.js v10 models HLS, DASH, and Mux-backed media directly, so quality UI can read rendition state instead of parsing manifests and wiring hls.js in application code.
- **🧩 Composition keeps player code cleaner.** Providers, media elements, skins, controls, gestures, and hotkeys are separate pieces. You can replace one part without wrapping or forking the whole player.
- **✨ Two polished skins are ready to use.** Minimal is the closest starting point for Plyr migrations, while Default gives you a modern, frosted design. Both can be [ejected](#ejecting) when you want to customize the layout, styling, or icons.
- **📡 Remote playback is part of the built-in video UI.** Plyr has an open Google Cast request dating back years ([#112](https://github.com/sampotts/plyr/issues/112)). Video.js v10 includes Cast and AirPlay controls through a shared remote playback feature.
- **⚛️ React gets a native API.** Plyr integrations in React tend to wrap an imperative constructor around framework-owned DOM ([#254](https://github.com/sampotts/plyr/issues/254)), and lifecycle cleanup can get awkward when routes or components unmount ([#1001](https://github.com/sampotts/plyr/issues/1001)). `@videojs/react` gives you providers, components, hooks, and TypeScript types instead.
- **🎛️ Layout and skins are easier to own.** Plyr's iframe and aspect-ratio behavior has produced workarounds for cropping and fullscreen sizing ([#339](https://github.com/sampotts/plyr/issues/339)). Video.js v10 separates the provider, container, media, and skin, so sizing belongs to the container or skin and the UI can be [ejected](#ejecting) when you need full control.
- **⌨️ Input behavior is explicit.** Plyr has recurring mobile tap and fullscreen threads ([#718](https://github.com/sampotts/plyr/issues/718), [#1190](https://github.com/sampotts/plyr/issues/1190)). Video.js v10 has common gestures and hotkey support built into the skins - you can [eject](#ejecting) to customize them. 

Video.js v10 is still moving toward GA. Features like ads, playlists, chapters, YouTube, preference persistence, and audio-track selection are active areas, so check Known gaps when those features matter to your migration.

---

## Basic migration

Let's start with the most basic example of getting Plyr up and running and replace it with a Video.js v10 HTML player. 

This snippet will render a basic video player with thumbnail previews, captions and a poster image. 

```html
<link rel="stylesheet" href="path/to/plyr.css" />

<video id="player" src="/path/to/video.mp4" playsinline controls data-poster="/path/to/poster.jpg">
  <track kind="captions" label="English" src="/path/to/captions/en.vtt" srclang="en" default />
</video>

<script src="https://cdn.plyr.io/3.8.4/plyr.js"></script>

<script>
const player = new Plyr('#player', {
  previewThumbnails: {
    enabled: true,
    src: '/path/to/storyboard.vtt',
  },
});
</script>
```

The closest Video.js skin to the Plyr skin would be the "Minimal" skin, so we'll use that for this example. 

### HTML (Web Components)

The easiest path if you want to use HTML (Web Components) would be to use the CDN:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/video-minimal.js"></script>

<video-player>
  <video-minimal-skin>
    <video src="/path/to/video.mp4" playsinline controls>
      <track kind="captions" label="English" src="/path/to/captions/en.vtt" srclang="en" default />
      <track kind="metadata" label="thumbnails" src="/path/to/storyboard.vtt" default />
    </video>
    
    <img slot="poster" src="/path/to/poster.jpg" alt="Video poster" />
  </video-minimal-skin>
</video-player>
```

If you prefer not to use the CDN, you can use the individual modules:

```js
import '@videojs/html/video/player';
import '@videojs/html/video/minimal-skin';
import '@videojs/html/video/minimal-skin.css';
```

#### Notes 

- CSS styles are injected automatically into the Shadow DOM we create for the player. 
- The poster image is provided via a slotted `img` element rather than a `poster` attribute. This is so we have greater control over it's appearance, much like Plyr's `data-poster`. 
- There's also a new default skin with a modern, frosted appearance that some may prefer. You can try that by removing `-minimal` suffix from the script src if using the CDN or the `minimal-` prefix from imports. 

### React

If you're building a React app, the approach is a little different. Firstly, install the dependency:

```bash
npm install @videojs/react 
```

Create a reusable `VideoPlayer` component in your app:

```js
'use client';

import '@videojs/react/video/minimal-skin.css';
import { createPlayer } from '@videojs/react';
import { MinimalVideoSkin, Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

interface VideoPlayerProps {
  origin: string;
}

export function VideoPlayer({ origin }: VideoPlayerProps) {
  return (
    <Player.Provider>
      <MinimalVideoSkin>
        <Video src={`${origin}/video.mp4`} poster={`${origin}/poster.jpg`} playsInline>
          <track kind="captions" label="English" src={`${origin}/captions/en.vtt`} srclang="en" default />
          <track kind="metadata" label="thumbnails" src={`${origin}/storyboard.vtt`} default />
        </Video>
      </MinimalVideoSkin>
    </Player.Provider>
  );
}
```

#### Notes

- This basic component example assumes all your files for a given asset live in the same path, using consistent filenames. This will almost certainly need adjusting according to your implementation. 
- There's also a new default skin with a modern, frosted appearance that some may prefer. You can try that by switching the CSS import filename to `skin.css` and `MinimalVideoSkin` import and usage to `VideoSkin`. 

--- 

## Advanced migration

### Streaming

If you're using HLS or Dash to stream your media, you're in luck; we have prebuilt components you can slot in with much improved integration over Plyr implementations.

#### HLS

For **HTML (Web Components)**, replace `<video>` with `<hls-video>` and if you're using the CDN, add an additional script:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/media/hls-video.js"></script>
```

or add an additional import:

```js 
import '@videojs/html/media/hls-video';
```

For **React**, replace `<Video>` with `<HlsVideo>` and add the import:

```js 
import { HlsVideo } from '@videojs/react/media/hls-video';
```

In both instances, you should set the `src` attribute to the URL for the m3u manifest. 

#### Dash

Very similar to HLS in that we have a drop in component. For **HTML (Web Components)**, replace `<video>` with `<dash-video>` and if you're using the CDN, add an additional script:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/media/dash-video.js"></script>
```

or add an additional import:

```js 
import '@videojs/html/media/dash-video';
```

For **React**, replace `<Video>` with `<DashVideo>` and update your import:

```js 
import { DashVideo } from '@videojs/react/media/dash-video';
```

In both instances, you should set the `src` attribute to the URL for the mpd manifest. 

### Vimeo

Vimeo is currently supported and works in a similar way to streaming in that we have a prebuilt component for it. For **HTML (Web Components)**, replace `<video>` with `<vimeo-video>` and if you're using the CDN, add an additional script:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/media/vimeo-video.js"></script>
```

or add an additional import:

```js 
import '@videojs/html/media/vimeo-video';
```

For **React**, replace `<Video>` with `<VimeoVideo>` and add the import:

```js 
import { VimeoVideo } from '@videojs/react/media/vimeo-video';
```

In both instances, you should set the `src` attribute to the URL for the Vimeo video (e.g. `https://vimeo.com/648359100`). 

### YouTube

Video.js v10 doesn't currently support YouTube media but it's on target for GA and can be [tracked here](https://github.com/videojs/v10/issues/1434). 

### Internationalization

Video.js v10 ships with English labels by default and includes locale packs for:

`ar`, `az`, `bg`, `bn`, `bs`, `ca`, `cs`, `cy`, `da`, `de`, `el`, `es`, `et`, `eu`, `fa`, `fi`, `fr`, `gd`, `gl`, `he`, `hi`, `hr`, `hu`, `it`, `ja`, `ko`, `lv`, `mr`, `nb`, `ne`, `nl`, `nn`, `oc`, `pl`, `pt-BR`, `pt-PT`, `ro`, `ru`, `sk`, `sl`, `sr`, `sv`, `te`, `th`, `tr`, `uk`, `vi`, `zh-CN`, and `zh-TW`.

The shorthand tags `pt` and `zh` are also available as aliases.

#### HTML i18n overrides

For CDN users:

```html
<script type="module">
  import { registerI18n } from 'https://cdn.jsdelivr.net/npm/@videojs/html/cdn/i18n.js';

  registerI18n('en', {
    play: 'Start video',
    pause: 'Pause video',
    menuSettings: 'Options',
  });
</script>

<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/video-minimal.js"></script>

<video-player>
  <video-minimal-skin>
    <video src="/video.mp4" playsinline></video>
  </video-minimal-skin>
</video-player>
```

For package users, same idea but import from @videojs/html/i18n.

#### React i18n overrides

Use the React provider when you want scoped overrides:

```js
'use client'

import '@videojs/react/video/minimal-skin.css';
import { I18nProvider } from '@videojs/react/i18n';
import { createPlayer } from '@videojs/react';
import { MinimalVideoSkin, Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export function MyPlayer() {
  return (
    <Player.Provider>
      <I18nProvider
        locale="en"
        translations={{
          play: 'Start video',
          pause: 'Pause video',
          menuSettings: 'Options',
        }}
      >
        <MinimalVideoSkin>
          <Video src="/video.mp4" playsInline />
        </MinimalVideoSkin>
      </I18nProvider>
    </Player.Provider>
  );
}
```

## Configuration

Plyr uses an object to set configuration options whereas Video.js v10 utilises a component structure and attributes instead. We're using a composition model rather than a configuration model. This reduces bundle size and only includes functionality you actually require. 

Here's a matrix for configuration options in Plyr and how it maps to Video.js v10:

| Plyr option | Video.js v10 |
|---|---|
| `controls` | The skins include all the common controls, laid out in a familiar way that users would expect. However, if you want to customize the skin beyond basic colors, you can elect to [eject the skin](#ejecting) and change layout, styles, or icons. |
| `settings` | Included automatically in the skins when quality, speed, or captions are available. |
| `autoplay`, `muted`, `loop`, `playsinline`, `preload` | These are attributes on your media (e.g. `<video>`) component. |
| `poster` / `data-poster` | As above; use the `poster` slot in HTML or React's `poster` prop on the media component. |
| `ratio` | Set `aspect-ratio` in CSS on the skin component. |
| `hideControls` | Preset skins auto-hide controls based on activity. The delay is currently not configurable. |
| `clickToPlay` | Preset video skins include click and tap gestures. [Eject the skin](#ejecting) to remove or change them. |
| `keyboard` | Preset video skins include common hotkeys. [Eject the skin](#ejecting) to remove or change them. |
| `tooltips` | Preset skins include tooltips for common controls. [Eject the skin](#ejecting) to customize them. |
| `captions` | Add `<track kind="captions">` or `<track kind="subtitles">`; preset skins show captions controls when tracks are available. |
| `previewThumbnails` | Add `<track kind="metadata" label="thumbnails">`; preset video skins show slider thumbnails when thumbnail cues are available. |
| `quality` | Works when the media provider exposes renditions. Plain MP4 source arrays do not currently become a quality menu automatically. |
| `speed` | Included in the preset settings menu when playback rates are available. |
| `fullscreen` | Native fullscreen is supported; Plyr's full-window fallback is not a matching feature. |
| `provider: 'vimeo'` | Use the Vimeo media component inside the player skin as shown in [Vimeo](#vimeo) above. |
| `storage` | Unsupported at this time. |
| `i18n` | The most common languages are available by default but you can also provide custom translations, if required. See [Internationalization](#internationalization) above for more info. |
| `ads` | Unsupported at this time. |

## Dynamic sources

In Video.js v10 you can simply swap out the src or media component itself and the UI will update. 

## Imperative API

Use the media element for standard playback operations:

| Plyr | Video.js v10 |
|---|---|
| `player.play()` | `video.play()` or player action |
| `player.pause()` | `video.pause()` or player action |
| `player.currentTime = 10` | `video.currentTime = 10` |
| `player.volume = 0.5` | `video.volume = 0.5` |
| `player.muted = true` | `video.muted = true` |
| `player.speed = 1.5` | `video.playbackRate = 1.5` |
| `player.fullscreen.enter()` | Fullscreen feature or fullscreen control |
| `player.toggleCaptions()` | Text-track feature or captions control |

For custom UI, read and write through the Video.js player store. In React, use `Player.usePlayer()` or selectors. In HTML custom elements, use `PlayerController`.

## Rewrite styles

Video.js v10 skins offer similar color customization via CSS variables. [Eject the skin](#ejecting) when you need deeper control over layout, control structure, icons, or interaction styling.

```css
/* Plyr */
.video-player {
  --plyr-color-main: rebeccapurple;
}

/* Video.js */
.video-player {
  --media-color-primary: rebeccapurple;
}
```

## Ejecting

If you need extra customization of layout, styles or icons, you can elect to "eject" the skin into your application, much like a shadcn installation. Then you have complete control over the skin.

⚠️ The process for ejecting is TBD. 

## Known gaps

- YouTube media is not implemented as a first-class Video.js v10 media element; see [#1434](https://github.com/videojs/v10/issues/1434).
- Plyr's ads option has no built-in equivalent.
- Plyr's `storage` option has no built-in equivalent for persisted volume, captions language, muted state, speed, or quality. Volume and muted persistence are tracked in [#1428](https://github.com/videojs/v10/issues/1428); subtitle language preference is tracked in [#1423](https://github.com/videojs/v10/issues/1423).
- Plyr's full-window fullscreen fallback has no matching Video.js feature. This was designed to be a fallback when the fullscreen API wasn't supported but given the [browser support for fullscreen is ~96%](https://caniuse.com/fullscreen), this unlikely to be required.
- Plain MP4 source arrays with `size` metadata do not automatically create a quality menu. Use Mux, HLS, or DASH for adaptive quality when possible. A simpler source-driven quality menu may be considered later.
- Chapter UI and cue-point APIs are not complete yet; see [#1441](https://github.com/videojs/v10/issues/1441) and [#1442](https://github.com/videojs/v10/issues/1442).
- The controls auto-hide delay and disabled state are not configurable yet.
- Native controls are not automatically removed when custom controls load; see [#1160](https://github.com/videojs/v10/issues/1160).

