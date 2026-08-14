# Migrate from Mux Player

Mux Player is a single, batteries-included element. Drop in `mux-player` with a `playback-id` and you get HLS playback, an adaptive themed UI, Mux Data analytics, captions, Chromecast, AirPlay, and keyboard support, all wired together.

Video.js v10 is built a bit differently. **The player is composed, not configured.** That means the player you ship is smaller and faster, and when you're ready to customize it, it's easy to go under the hood and build what you need. It also means there's a bit more set-up to get started.

The migration is mostly **splitting one element into a few** and **moving Mux stream parameters into a source object** instead of onto attributes.

## Why switch?

- **📦 You ship less.** Mux Player is one bundle whether or not you use Chromecast, chapters, or a settings menu. In v10 the player, the skin, the media, and analytics are separate imports, so an embed that doesn't cast doesn't pay for casting.
- **🧩 Customization doesn't mean forking.** Mux Player's UI is fixed apart from the attributes it exposes and the CSS variables it documents. v10 skins are plain component trees you can [eject](#ejecting) and edit.
- **⚛️ React is first-class, not a wrapper.** `@videojs/react` gives you providers, components, hooks, and TypeScript types rather than a web component with a React shim over it.
- **🎛️ The same player handles more than Mux.** If some of your content isn't Mux-hosted, the HLS, DASH, Vimeo, and YouTube media components drop into the same player and skin.
- **🔭 Mux stays a first-class citizen.** `<mux-video>` still knows what a playback ID is: it derives the stream URL, the poster, the storyboard, and the DRM license servers for you, and reports the title and poster into player state.

Video.js v10 is still moving toward GA. Configurable playback rates, cue-point APIs, and lazy loading are active areas, so check [Known gaps](#known-gaps) when those features matter to your migration.

---

## Basic migration

Here's a typical Mux Player embed: a playback ID, some Mux Data metadata, and a poster pulled from two seconds in.

```html
<script src="https://cdn.jsdelivr.net/npm/@mux/mux-player" defer></script>

<mux-player
  playback-id="EcHgOK9coz5K…"
  metadata-video-title="Test VOD"
  metadata-viewer-user-id="user-id-007"
  thumbnail-time="2"
></mux-player>
```

### HTML (Web Components)

The easiest path is the CDN. You need two scripts: the player with its default skin, and the Mux media.

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/video.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/media/mux-video.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/media/mux-data.js"></script>

<video-player content-title="Test VOD">
  <video-skin class="aspect-video">
    <mux-video src="https://stream.mux.com/EcHgOK9coz5K….m3u8" poster-time="2" playsinline crossorigin="anonymous"></mux-video>
    <mux-data player-software-name="my-app"></mux-data>
  </video-skin>
</video-player>

<script type="module">
  document.querySelector('mux-data').metadata = {
    video_title: 'Test VOD',
    viewer_user_id: 'user-id-007',
  };
</script>
```

If you prefer not to use the CDN, use the individual modules:

```js
import '@videojs/html/video/player';
import '@videojs/html/video/skin';
import '@videojs/html/video/skin.css';
import '@videojs/html/media/mux-video';
import '@videojs/html/media/mux-data';
```

#### Notes

- **You don't set a poster.** `<mux-video>` derives one from the playback ID and reports it as content data, and the player resolves it into state for the skin's poster image. `poster-time="2"` is the `thumbnail-time` equivalent, and it feeds the derived URL.
- **You don't add a storyboard track.** `<mux-video>` adds and maintains the thumbnail `<track>` from the same playback ID, and drops it for live streams.
- **Mux Data is opt-in, and needs no env key** for Mux-hosted content, because the environment resolves from the playback ID. Leave `<mux-data>` out and there's no analytics and no analytics bytes — that's the answer to Mux Player's `disable-tracking`.
- **Chromecast is opt-in too**, via `<google-cast>`. AirPlay needs nothing extra.
- Set the aspect ratio in your own CSS on the skin. There's no `ratio` attribute.

### React

Install the dependency:

```bash
npm install @videojs/react
```

Then create a reusable player component:

```tsx
'use client';

import '@videojs/react/video/skin.css';
import { createPlayer } from '@videojs/react';
import { VideoSkin, videoFeatures } from '@videojs/react/video';
import { MuxData } from '@videojs/react/media/mux-data';
import { MuxVideo } from '@videojs/react/media/mux-video';

const Player = createPlayer({ features: videoFeatures });

export function VideoPlayer() {
  return (
    <Player.Provider contentTitle="Test VOD">
      <VideoSkin className="aspect-video">
        <MuxVideo source={{ playbackId: 'EcHgOK9coz5K…', poster: { time: 2 } }} playsInline crossOrigin="anonymous" />
        <MuxData playerSoftwareName="my-app" metadata={{ video_title: 'Test VOD', viewer_user_id: 'user-id-007' }} />
      </VideoSkin>
    </Player.Provider>
  );
}
```

#### Notes

- `createPlayer` builds a typed player from a feature set. `videoFeatures` is the standard video composition; there are `audioFeatures`, `liveVideoFeatures`, and `liveAudioFeatures` alongside it.
- There are no `on*` props. See [Events and player state](#events-and-player-state).
- The `'use client'` directive is needed in React Server Components apps because the player owns browser state.

---

## Choosing a Mux media

Mux Player has one playback engine. v10 gives you two, and the import path is what chooses.

| Import | Engine | Use it when |
|---|---|---|
| `@videojs/html/media/mux-video`<br>`@videojs/react/media/mux-video` | hls.js | **Start here.** Supports everything, including TS-packaged assets and DRM. |
| `.../media/mux-video/spf` | SPF (Video.js's own engine) | You want the dramatically smaller bundle and your content and feature needs fit. |
| `.../media/mux-video/hls-js` | hls.js | You need direct access to the hls.js instance or its settings. |

Both flavors register the same `<mux-video>` tag and take the same source, so switching is an import change. Importing two flavors into one build is not supported — one registration wins.

The default is hls.js-backed today because it's the reliable superset. SPF doesn't play TS-packaged media, which currently includes Mux's Plus quality assets, and it doesn't license DRM. Mux accounts with a mixed back catalog should stay on the default until source detection lands; see the [MuxVideo and Legacy Formats PRD](https://app.notion.com/p/mux/PRD-Video-js-v10-MuxVideo-and-Legacy-Formats-38f97a7f89d080979189db5d688f7e74) for where this is going.

`<mux-audio>` follows the same three paths, and pairs with the audio player and audio skins.

---

## Where did my attribute go?

In Mux Player almost everything is a declarative attribute on one element. In Video.js v10 each setting takes one of five paths.

### Fate 1 · Stays a native attribute or prop

Port these straight across.

| Mux Player | Video.js v10 |
|---|---|
| `autoplay` `muted` `loop` `preload` `crossorigin` `playsinline` | the same attributes on `mux-video` |
| `stream-type` | `stream-type` on `mux-video` |
| `thumbnail-time` | `poster-time` on `mux-video` |
| `.media.nativeEl` | `.target` on the element, or a `ref` to the `video` in React |

### Fate 2 · Moves into the Mux source

Mux Player built stream and image URLs for you from its attributes. `<mux-video>` does the same thing from a **source object** — playback identity plus the params that modify it. Assign it as a property in HTML, or pass it as the `source` prop in React.

```js
document.querySelector('mux-video').source = {
  playbackId: 'EcHgOK9coz5K…',
  playback: { maxResolution: '1080p', assetStartTime: 10, assetEndTime: 30 },
  poster: { time: 2, width: 1280 },
};
```

| Mux Player | Video.js v10 |
|---|---|
| `playback-id="ID"` | `source.playbackId` |
| `max-resolution` / `min-resolution` | `source.playback.maxResolution` / `.minResolution` |
| `rendition-order` | `source.playback.renditionOrder` |
| `asset-start-time` / `asset-end-time` | `source.playback.assetStartTime` / `.assetEndTime` |
| `program-start-time` / `program-end-time` | `source.playback.programStartTime` / `.programEndTime` |
| `custom-domain="media.example.com"` | `source.customDomain` |
| `playback-token="JWT"` | `source.playback.token` |
| `thumbnail-token` / `storyboard-token` | `source.poster.token` / `source.storyboard.token` |
| `drm-token` | `source.drm.token` |
| `default-subtitles-lang` | `source.playback.defaultSubtitlesLang` |
| poster tuning (size, crop, rotation, format) | `source.poster.*` |

Camel-case keys under `playback`, `poster`, and `storyboard` are serialized to the `snake_case` query params Mux expects, so `assetStartTime` becomes `asset_start_time`. A signed `token` replaces every other param in its group, exactly as it does with Mux Player, so caps and clipping have to be baked into the JWT.

**The `src` attribute still works.** Set `src` to a `https://stream.mux.com/ID.m3u8?…` URL and `<mux-video>` parses it back into a source, params included. That's the declarative path, and it's what to reach for in markup-only integrations — a source carrying signed tokens has no reasonable room in an attribute, so those get assigned as an object. There's no `playback-id` attribute.

### Fate 3 · Moves to `<mux-data>`

Mux Player's analytics attributes become attributes and properties on a separate `<mux-data>` / `<MuxData>` component that you place inside the player.

| Mux Player | Video.js v10 |
|---|---|
| `metadata-*` / `metadata={…}` | the `metadata` property (same `snake_case` keys, so the values port directly) |
| `env-key` | `env-key` — usually unneeded, since Mux-hosted content resolves its own environment |
| `disable-cookies` | `disable-cookies` |
| `beacon-collection-domain` | `beacon-collection-domain` |
| `player-software-name` / `player-software-version` | `player-software-name` / `player-software-version` |
| `debug` | the `debug` property |
| `disable-tracking` | omit `<mux-data>` |

`metadata` and `MuxDataSdk` are properties rather than attributes, because neither has a sensible string form.

### Fate 4 · Moves to the player, as metadata

Content-level information now lives on the player element rather than the media, so any skin or component can read it. Each value resolves through the same chain: what you set, then what the media reports, then your fallback.

| Mux Player | Video.js v10 |
|---|---|
| `metadata-video-title` (as display text) | `content-title` / `contentTitle` on the player |
| `poster` | `poster` / `poster` on the player — or let `<mux-video>` derive it |
| `placeholder` | `poster-placeholder` / `posterPlaceholder` on the player |

Note that `metadata-video-title` did two jobs in Mux Player: it labelled the video for analytics *and* it was the display title. Those are separate now — `<mux-data>`'s `metadata.video_title` for analytics, `content-title` for what the viewer reads. The video skins render the title in the top-left, and hide the region entirely when there's no title.

The placeholder is a **CSS image**, not a URL, and it's painted as the poster image's own background. Bake the blur into the image the way an image pipeline already hands one back:

```html
<video-player poster-placeholder="url('data:image/webp;base64,…')">
```

Because `<mux-video>` reports a poster it derived from the playback ID, setting `poster` on the player is an override, not a requirement. Set `default-poster` instead when you want a fallback that only applies if the media has nothing.

### Fate 5 · Becomes a composition choice

You set it on a component, or change the component tree. See [Customizing your player](#customizing-your-player).

| Mux Player | Where it lives now |
|---|---|
| hide or reorder a control (`--play-button: none`) | omit or move that component in the tree |
| `nohotkeys` / `hotkeys` | `media-hotkey` elements |
| `forward-seek-offset` / `backward-seek-offset` | `value` on the seek hotkeys and gestures |
| `accent-color` / `primary-color` / `secondary-color` | `--media-accent-color` |
| `theme` | pick the default or minimal skin |
| `audio` | the audio player and audio skin, with `<mux-audio>` |
| `playbackrates` | not configurable yet ([#1404](https://github.com/videojs/v10/issues/1404)) |
| chapters, cue points | see [Chapters and cue points](#chapters-and-cue-points) |

---

## Customizing your player

Three levels, lightest to heaviest.

**1. Use the skin as-is.** `video-skin` / `VideoSkin` for the modern frosted look, `video-minimal-skin` / `MinimalVideoSkin` for something closer to a classic control bar. Both include the controls, a settings menu that appears when quality, speed, audio tracks, or captions are available, tooltips, hotkeys, gestures, and captions.

**2. Restyle it.** Override `--media-*` custom properties. The brand-color case Mux Player covers with `accent-color`:

```css
/* Mux Player */
mux-player {
  --accent-color: rebeccapurple;
}

/* Video.js v10 */
video-skin {
  --media-accent-color: rebeccapurple;
}
```

`--media-accent-color` reaches the sliders, active buttons, and accent surfaces. `--media-accent-text-color` overrides the contrasting text color the skin otherwise derives for you.

**3. Eject.** Copy the skin's component tree into your project and edit it, the way you would a shadcn component. The packaged skin's source *is* that tree, so ejecting starts as copy-and-paste.

Ejecting is what the per-control knobs require. The packaged skins bake their seek step into the hotkeys and gestures, so Mux Player's one-character `forward-seek-offset="30"` becomes editing those template lines:

```html
<media-hotkey keys="ArrowRight" action="seekStep" value="30"></media-hotkey>
<media-hotkey keys="ArrowLeft" action="seekStep" value="-30"></media-hotkey>
<media-gesture type="doubletap" action="seekStep" value="30" region="right"></media-gesture>
```

Neither packaged video skin includes seek *buttons*. `media-seek-button` exists and takes `seconds` (default 30), so add it to your tree if your users expect the skip controls Mux Player's themes show.

An ejected HTML player with 30-second skip buttons, no volume control, and two hotkeys:

```html
<script type="module">
  // Registers video-player, media-container, and every media-* control — no skin.
  import '@videojs/html/video/ui';
  import '@videojs/html/media/mux-video';
</script>

<video-player content-title="Test VOD">
  <media-container>
    <mux-video src="https://stream.mux.com/EcHgOK9coz5K….m3u8" playsinline></mux-video>

    <media-poster><img alt="" decoding="async" /></media-poster>
    <media-title></media-title>

    <media-controls>
      <media-play-button></media-play-button>
      <media-seek-button seconds="-30"></media-seek-button>
      <media-seek-button seconds="30"></media-seek-button>
      <media-time type="current"></media-time>
      <media-time-slider>
        <media-slider-track>
          <media-slider-fill></media-slider-fill>
          <media-slider-buffer></media-slider-buffer>
        </media-slider-track>
        <media-slider-thumb></media-slider-thumb>
      </media-time-slider>
      <media-time type="duration"></media-time>
      <media-fullscreen-button></media-fullscreen-button>
      <!-- no media-mute-button → volume simply doesn't render -->
    </media-controls>

    <media-hotkey keys="Space" action="togglePaused"></media-hotkey>
    <media-hotkey keys="f" action="toggleFullscreen"></media-hotkey>
  </media-container>
</video-player>
```

In React it's the same idea: drop `VideoSkin` and compose the `@videojs/react` control components inside `Player.Provider` yourself.

---

## Advanced migration

### Events and player state

**HTML.** `<mux-video>` is a real media element, so every standard media event (`play`, `timeupdate`, `ended`, `error`, …) fires on it, plus `streamtypechange`, `targetlivewindowchange`, `sourcechange`, and `contentdatachange`. Mux Player event listeners port directly.

For UI state rather than media state, use `PlayerController` in a custom element, with the feature selectors:

```js
import { PlayerController, playerContext, selectTime } from '@videojs/html';

class MyElapsed extends ReactiveElement {
  #time = new PlayerController(this, playerContext, selectTime);
}
```

**React.** There are **no `on*` props**. Subscribe to reactive state through the hook `createPlayer` returns:

```tsx
const Player = createPlayer({ features: videoFeatures });

function Elapsed() {
  const currentTime = Player.usePlayer((state) => state.currentTime);
  return <span>{currentTime}</span>;
}
```

Selectors are available for each feature — `selectPlayback`, `selectTime`, `selectVolume`, `selectQuality`, `selectLive`, `selectTextTrack`, `selectMetadata`, and the rest. For raw media events, attach listeners to a `ref` on `MuxVideo`.

This is the biggest single React migration cost. `onPlay`, `onTimeUpdate`, `onEnded`, and `onError` don't have prop equivalents, so those become hooks or ref listeners ([#1426](https://github.com/videojs/v10/issues/1426), [#1041](https://github.com/videojs/v10/issues/1041)).

### Imperative control

| Mux Player | Video.js v10 |
|---|---|
| `player.play()` / `pause()` | `media.play()` / `pause()`, or the store's `play` / `pause` / `togglePaused` |
| `player.currentTime = 10` | `media.currentTime = 10` |
| `player.volume` / `muted` | `media.volume` / `media.muted` |
| `player.playbackRate` | `media.playbackRate`, or the store's `setPlaybackRate` |
| `player.requestFullscreen()` | the store's `enterFullscreen` / `exitFullscreen` / `toggleFullscreen` |
| `player.addChapters([…])` | add a `<track kind="chapters">` |

### Styling and themes

v10 ships **two** looks — default and minimal — each in a CSS and a Tailwind variant, against Mux Player's five themes. There's no runtime `theme=` switch; you pick the skin at import time.

That's a deliberate product difference rather than a missing feature: fewer, more composable looks, with ejection instead of a theme catalog. `gerwig` and `minimal` have reasonable analogs. `classic`, `microvideo`, and `news` don't ([#181](https://github.com/videojs/v10/issues/181) tracks one additional theme).

### Quality, live, audio, captions

| Capability | Status | Notes |
|---|---|---|
| Live and DVR | 🟢 | Use the live player and live skins: `live-video-player`, `live-video-skin`, `liveVideoFeatures`. `streamType`, `targetLiveWindow`, `liveEdgeStart`, and `media-live-button`. |
| Quality selection | 🟢 | `media-quality-radio-group` / `QualityRadioGroup`, in the settings menu. Manifest-level caps are `source.playback.maxResolution`. |
| Multi-track audio | 🟢 | `media-audio-track-radio-group` / `AudioTrackRadioGroup`, in the settings menu. |
| Captions and subtitles | 🟢 | `toggleSubtitles()`, `selectSubtitlesTrack()`, `media-captions-button`, `media-captions-radio-group`. Rendered natively. |
| Timeline hover previews | 🟢 | Derived from the playback ID; no markup needed. |
| Playback rates | 🟡 | The menu ships, but the rate set is fixed at `0.2`–`2` ([#1404](https://github.com/videojs/v10/issues/1404)). |

Caption *styling* is limited to the positioning custom properties the skins expose. There's no equivalent of a text-track settings dialog.

### Chapters and cue points

**Chapters** work as content, not as an API. Add a `<track kind="chapters">` and the packaged skins segment the time slider and show the chapter title on hover:

```html
<mux-video src="https://stream.mux.com/EcHgOK9coz5K….m3u8">
  <track kind="chapters" src="/chapters.vtt" default />
</mux-video>
```

Mux Player's `addChapters()` has no direct equivalent; you supply a chapters track instead. The store exposes `chaptersCues` as a read-only array, but there's **no `activeChapter` getter and no `chapterchange` event** ([#1441](https://github.com/videojs/v10/issues/1441)), so app code that drives its own UI from the active chapter needs to derive it from `currentTime` and `chaptersCues`.

**Cue points** (`addCuePoint`, `cuePoints`, `activeCuePoint`, `cuepointchange`) are not in yet ([#1442](https://github.com/videojs/v10/issues/1442), [#1267](https://github.com/videojs/v10/issues/1267)).

### Secure playback, DRM, and tokens

**Signed playback** works. Each token is a param in its own group of the source, and each is audience-checked before a URL is built, so a token in the wrong slot produces no URL rather than a rejected request:

```js
muxVideo.source = {
  playbackId: 'EcHgOK9coz5K…',
  playback: { token: '…' },   // audience: v
  poster: { token: '…' },     // audience: t
  storyboard: { token: '…' }, // audience: s
};
```

Neither player refreshes tokens. Mux Player at least *detects* an expired JWT and shows a friendly message; v10 doesn't surface that yet, and has no auto-refresh ([#1432](https://github.com/videojs/v10/issues/1432)).

**DRM** works on the default hls.js-backed `<mux-video>` and on native HLS. Give it a license token and the FairPlay, Widevine, and PlayReady license servers are all derived from it, plus the FairPlay application certificate:

```js
muxVideo.source = {
  playbackId: 'EcHgOK9coz5K…',
  playback: { token: '…' },
  drm: { token: '…' }, // audience: d
};
```

DRM playback is always signed, so `playback.token` is required alongside `drm.token`. You can also name license servers yourself, keyed by EME key system, for content Mux doesn't license — those win key by key over the derived URLs.

The SPF-backed flavor does **not** license DRM ([#1411](https://github.com/videojs/v10/issues/1411)), which is one of the two reasons to stay on the default import.

### Escape hatches

| Mux Player | Video.js v10 |
|---|---|
| `media.nativeEl` | `.target` on the element, or a `ref` to the `video` in React |
| hls.js instance | `.host.engine`, on the hls.js-backed flavor. In React, reachable through a media ref |
| `prefer-playback` | choose the media component: `<mux-video>`, `<mux-video>` from `/spf`, or `<native-hls-video>` |

Program Date Time has no convenience surface: there's no `getStartDate()` or `currentPdt`. Only `liveEdgeStart` and `targetLiveWindow` are exposed. Reach into the engine directly if you need PDT.

---

## Known gaps

- Playback rates are a fixed set (`0.2`–`2`); choosing them isn't supported yet ([#1404](https://github.com/videojs/v10/issues/1404)).
- Chapters expose `chaptersCues` but no `activeChapter` and no `chapterchange` event ([#1441](https://github.com/videojs/v10/issues/1441)). There's no `addChapters()`; use a chapters track.
- Cue points are not implemented ([#1442](https://github.com/videojs/v10/issues/1442), [#1267](https://github.com/videojs/v10/issues/1267)).
- React has no `on*` event props. Subscribe with `usePlayer` and selectors, or attach listeners to a media ref ([#1426](https://github.com/videojs/v10/issues/1426), [#1041](https://github.com/videojs/v10/issues/1041)).
- The SPF-backed `<mux-video>` doesn't license DRM and doesn't play TS-packaged media ([#1411](https://github.com/videojs/v10/issues/1411)). The default hls.js-backed flavor does both.
- Signed playback works, but there's no expired-token message and no token auto-refresh ([#1432](https://github.com/videojs/v10/issues/1432)).
- There's no `playback-id` attribute; use `src` with a stream URL, or assign `source` in JS.
- Lazy loading (`loading="viewport|page"`) has no equivalent.
- Two skins against Mux Player's five themes, and no runtime theme switch ([#181](https://github.com/videojs/v10/issues/181)).
- Neither packaged video skin includes seek buttons; add `media-seek-button` yourself.
- The controls auto-hide delay is not configurable, and there's no `disabled` state for the controls.
- Player setting persistence — volume, captions language, rate, quality — has no equivalent ([#944](https://github.com/videojs/v10/issues/944)). Default subtitle language is tracked at [#1423](https://github.com/videojs/v10/issues/1423), though Mux users can set `source.playback.defaultSubtitlesLang` instead.
- Caption styling is limited to the skins' positioning custom properties; there's no text-track settings dialog.
- Smaller conveniences with homes: resolution controls [#1415](https://github.com/videojs/v10/issues/1415), restore-last-volume and smart unmute [#1425](https://github.com/videojs/v10/issues/1425), debug mode [#1406](https://github.com/videojs/v10/issues/1406), autoplay-with-muted-fallback [#1039](https://github.com/videojs/v10/issues/1039). Several sit under the parity epic [#1535](https://github.com/videojs/v10/issues/1535).
