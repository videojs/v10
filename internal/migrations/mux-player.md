# Migrate from Mux Player

Mux Player is one element that does everything. You drop in `<mux-player>` with a playback ID and you get HLS playback, a themed UI, analytics, captions, Chromecast, AirPlay, and keyboard shortcuts, all wired together.

Video.js v10 asks you to name the pieces you want. That sounds like more work, and for the first five minutes it is. In exchange, the player you ship only contains what you asked for, and when you need to change how something behaves you can open it up instead of hoping there's an attribute for it.

This guide walks you from a working Mux Player embed to a working Video.js player, then covers the things you'll reach for next.

## Three pieces instead of one

Mux Player packs three jobs into a single element. Video.js splits them up, so it helps to learn the names before you write any code.

**The player** is the outer element. It holds state — is it paused, how loud is it, what's the title — and hands that state to everything inside it. It draws nothing.

**The media** is the thing that plays the video. `<mux-video>` is the one you want: it knows what a playback ID is and how to talk to Mux. Swap it for `<hls-video>`, `<dash-video>`, or `<youtube-video>` and the rest of your player keeps working.

**The skin** is the UI: the controls, the poster, the captions, the settings menu, the keyboard shortcuts. It's a pre-built arrangement of smaller components, and you can use it as-is, restyle it, or take it apart.

So a Mux Player embed becomes a player wrapped around a skin wrapped around a media:

```html
<video-player>
  <video-skin>
    <mux-video></mux-video>
  </video-skin>
</video-player>
```

Everything else in this guide is about which of those three a given Mux Player attribute now belongs to.

## Your first player

Here's a typical Mux Player embed. A playback ID, a title and viewer ID for analytics, and a poster pulled from two seconds in.

```html
<script src="https://cdn.jsdelivr.net/npm/@mux/mux-player" defer></script>

<mux-player
  playback-id="EcHgOK9coz5K…"
  metadata-video-title="Test VOD"
  metadata-viewer-user-id="user-id-007"
  thumbnail-time="2"
></mux-player>
```

### HTML

Each piece is its own import. From the CDN, that's one script for the player and its skin, one for the Mux media, and one for analytics:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/video.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/media/mux-video.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/media/mux-data.js"></script>

<video-player content-title="Test VOD">
  <video-skin class="aspect-video">
    <mux-video
      src="https://stream.mux.com/EcHgOK9coz5K….m3u8"
      poster-time="2"
      playsinline
      crossorigin="anonymous"
    ></mux-video>
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

If you use a bundler instead of the CDN, the imports are the same three pieces:

```js
import '@videojs/html/video/player';
import '@videojs/html/video/skin';
import '@videojs/html/video/skin.css';
import '@videojs/html/media/mux-video';
import '@videojs/html/media/mux-data';
```

A few things worth calling out, because they're all cases where Video.js does more for you than the markup suggests:

- **You didn't set a poster, and you get one.** `<mux-video>` builds a poster URL from the playback ID, tells the player about it, and the skin paints it. `poster-time="2"` is Mux Player's `thumbnail-time`, and it feeds that URL.
- **You didn't add a storyboard track, and you get hover previews.** `<mux-video>` adds and maintains the thumbnail track itself, and removes it for live streams, where storyboards don't exist.
- **Analytics needs no environment key.** Mux resolves the environment from the playback ID.
- **Set the aspect ratio yourself,** in your own CSS on the skin. There's no `ratio` attribute, because sizing belongs to your layout.

Two things are opt-in that used to be automatic. Analytics is the `<mux-data>` element, and Chromecast is a `<google-cast>` element. Leave either out and you don't ship its code. That, incidentally, is the answer to Mux Player's `disable-tracking`: don't include `<mux-data>`.

### React

`@videojs/react` gives you real React components rather than a wrapper around a custom element.

```bash
npm install @videojs/react
```

One extra step here: you build your player type up front with `createPlayer`, telling it which **features** you want. A feature is a slice of player state and the behavior behind it: volume, fullscreen, captions, and so on. `videoFeatures` is the standard set for video, and it's what you want unless you're doing something unusual.

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

`createPlayer` gives you back a `Provider` to wrap your player in and a `usePlayer` hook to read state from, both typed to the features you picked. Call it once, outside your component, and reuse it.

The `'use client'` directive is there because the player owns browser state. There are also no `on*` props, which is the one part of a React migration that takes real work. See [Read player state](#read-player-state).

## Mux settings live in a source object

Mux Player has an attribute for every Mux stream parameter: `max-resolution`, `asset-start-time`, `custom-domain`, and a dozen more. Video.js collects them into a single **source** object that describes what to play and how.

```js
document.querySelector('mux-video').source = {
  playbackId: 'EcHgOK9coz5K…',
  playback: { maxResolution: '1080p', assetStartTime: 10, assetEndTime: 30 },
  poster: { time: 2, width: 1280 },
};
```

The groups map to the three URLs Mux serves. `playback` modifies the video stream, `poster` modifies the still image, and `storyboard` modifies the hover-preview track. Video.js builds all three URLs and converts your camel-case keys to the `snake_case` query parameters Mux expects, so `assetStartTime` goes out as `asset_start_time`.

You can also skip the object entirely and set `src` to a full Mux URL. `<mux-video>` parses it back into a source, query parameters included, which is what you want in markup you can't run JavaScript against:

```html
<mux-video src="https://stream.mux.com/EcHgOK9coz5K….m3u8?max_resolution=1080p"></mux-video>
```

There's no `playback-id` attribute, so declarative markup uses the URL form.

Here's where each Mux Player attribute lands:

| Mux Player | Video.js v10 |
|---|---|
| `playback-id` | `source.playbackId` |
| `custom-domain` | `source.customDomain` |
| `max-resolution`, `min-resolution` | `source.playback.maxResolution`, `.minResolution` |
| `rendition-order` | `source.playback.renditionOrder` |
| `asset-start-time`, `asset-end-time` | `source.playback.assetStartTime`, `.assetEndTime` |
| `program-start-time`, `program-end-time` | `source.playback.programStartTime`, `.programEndTime` |
| `default-subtitles-lang` | `source.playback.defaultSubtitlesLang` |
| `playback-token` | `source.playback.token` |
| `thumbnail-token`, `storyboard-token` | `source.poster.token`, `source.storyboard.token` |
| `drm-token` | `source.drm.token` |
| `thumbnail-time` | `poster-time` attribute, or `source.poster.time` |
| poster size, crop, rotation, format | `source.poster.*` |

Signed playback behaves the way it does in Mux Player: a token replaces every other parameter in its group, so caps and clipping have to be baked into the token itself.

## Analytics moves to its own element

Mux Player's analytics attributes become attributes and properties on `<mux-data>`, placed inside the player.

| Mux Player | Video.js v10 |
|---|---|
| `metadata-*`, `metadata={…}` | the `metadata` property |
| `env-key` | `env-key`, rarely needed for Mux-hosted content |
| `disable-cookies` | `disable-cookies` |
| `beacon-collection-domain` | `beacon-collection-domain` |
| `player-software-name`, `player-software-version` | `player-software-name`, `player-software-version` |
| `debug` | the `debug` property |
| `disable-tracking` | omit `<mux-data>` |

Your metadata keys don't change. They're the same `snake_case` names Mux Data has always taken, so the values port across untouched. `metadata` is a property rather than an attribute because an object has no sensible string form.

## Titles and posters belong to the player

`metadata-video-title` quietly did two jobs in Mux Player. It labelled the video for analytics, and it was the title the viewer read. Those are separate now, which is worth knowing before you go looking for the one attribute that used to do both:

- For analytics, it's `metadata.video_title` on `<mux-data>`.
- For display, it's `content-title` on the player.

Display information sits on the player rather than the media so that any component can read it:

```html
<video-player content-title="Test VOD" poster="https://image.mux.com/…" poster-placeholder="url('data:image/webp;base64,…')">
```

In React those are props on `Player.Provider`: `contentTitle`, `poster`, and `posterPlaceholder`. The video skins render the title in the top-left corner, and hide that whole region when there's no title, so you don't get an empty gradient.

Each of these resolves through a chain, which is what makes the Mux integration feel automatic. The player prefers what you set, falls back to what the media reports, then falls back to a default you supply:

```
what you set  →  what <mux-video> derived  →  your default  →  nothing
```

That's why the first example got a poster without asking. `<mux-video>` derived one and nothing overrode it. Setting `poster` on the player replaces that; setting `default-poster` only fills in when the media has nothing to offer.

The placeholder is the blurred stand-in shown while the real poster loads, Mux Player's `placeholder`. Two differences: it's a CSS image rather than a bare URL, and the blur has to be baked into the image. Image pipelines like Next.js already hand you a pre-blurred data URL, so this is usually what you already have.

## Customize your player

Mux Player gives you attributes and documented CSS variables. Past that, you're stuck. Video.js gives you three levels, and you should try them in order.

### Level 1: pick a skin

Two are packaged. `video-skin` is a modern, frosted look. `video-minimal-skin` is closer to a classic control bar. Both bring controls, tooltips, captions, keyboard shortcuts, touch gestures, and a settings menu that appears when there's something to put in it.

In React they're `VideoSkin` and `MinimalVideoSkin`, and each comes in a CSS and a Tailwind variant.

### Level 2: restyle it

Set custom properties. The common case, a brand color:

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

`--media-accent-color` reaches the sliders, the active buttons, and the accent surfaces. Video.js derives a readable text color to sit on top of it; override that with `--media-accent-text-color` if you'd rather choose.

### Level 3: eject

**Ejecting** means copying the skin's source into your project and editing it, the way you would a shadcn component. The packaged skin isn't compiled magic — it's a tree of `media-*` components — so ejecting starts as copy and paste.

This is the level that per-control tweaks need, and it's a genuine step up in effort from a Mux Player attribute. `forward-seek-offset="30"` was one character. In Video.js, the skins bake their seek step into their keyboard shortcuts and gestures, so changing it means editing those lines:

```html
<media-hotkey keys="ArrowRight" action="seekStep" value="30"></media-hotkey>
<media-hotkey keys="ArrowLeft" action="seekStep" value="-30"></media-hotkey>
<media-gesture type="doubletap" action="seekStep" value="30" region="right"></media-gesture>
```

While you're in there: neither packaged video skin includes skip *buttons*. Mux Player's themes show them, so if your users expect them, add `media-seek-button`, which takes `seconds` and defaults to 30.

Here's an ejected player with skip buttons, no volume control, and two shortcuts. Note that the import gives you the components without a skin, and that you now assemble the poster and title yourself:

```html
<script type="module">
  // Registers video-player, media-container, and every media-* control. No skin.
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
      <!-- No media-mute-button, so no volume control renders. -->
    </media-controls>

    <media-hotkey keys="Space" action="togglePaused"></media-hotkey>
    <media-hotkey keys="f" action="toggleFullscreen"></media-hotkey>
  </media-container>
</video-player>
```

Removing a control is removing a line. That's the trade you get for the extra setup.

React works the same way: drop `VideoSkin` and compose the control components inside `Player.Provider` yourself.

## Read player state

### HTML

`<mux-video>` is a real media element, so every media event you already listen for still fires on it: `play`, `timeupdate`, `ended`, `error`, and the rest. Mux Player listeners port directly. There are a few extras: `streamtypechange`, `targetlivewindowchange`, `sourcechange`, and `contentdatachange`.

For UI state rather than media state, use `PlayerController` inside a custom element. Give it a selector for the feature you care about and it keeps your element in sync:

```js
import { PlayerController, playerContext, selectTime } from '@videojs/html';

class MyElapsed extends ReactiveElement {
  #time = new PlayerController(this, playerContext, selectTime);
}
```

### React

There are **no `on*` props**. Read state through the hook `createPlayer` handed you:

```tsx
const Player = createPlayer({ features: videoFeatures });

function Elapsed() {
  const currentTime = Player.usePlayer((state) => state.currentTime);
  return <span>{currentTime}</span>;
}
```

Every feature has a selector (`selectPlayback`, `selectTime`, `selectVolume`, `selectQuality`, `selectLive`, `selectTextTrack`, `selectMetadata`, and so on) for when you want a whole slice rather than one value.

Be honest with yourself about this one when you plan the work. If your app leans on `onPlay`, `onTimeUpdate`, `onEnded`, and `onError`, there's no line-by-line port; those become hooks, or listeners you attach to a `ref` on `MuxVideo` ([#1426](https://github.com/videojs/v10/issues/1426), [#1041](https://github.com/videojs/v10/issues/1041)).

### Drive playback

| Mux Player | Video.js v10 |
|---|---|
| `player.play()`, `player.pause()` | `media.play()`, `media.pause()`, or the store's `togglePaused` |
| `player.currentTime = 10` | `media.currentTime = 10` |
| `player.volume`, `player.muted` | `media.volume`, `media.muted` |
| `player.playbackRate` | `media.playbackRate`, or the store's `setPlaybackRate` |
| `player.requestFullscreen()` | the store's `enterFullscreen`, `exitFullscreen`, `toggleFullscreen` |
| `player.addChapters([…])` | a `<track kind="chapters">`, covered below |

Anything that's a standard media property you set on the media. Anything the browser doesn't own — fullscreen, captions, quality — goes through the player, because the player is what tracks it.

## Which Mux media should you use?

You can skip this section until you hit one of the two problems in it.

`<mux-video>` comes in two flavors, backed by two different playback engines, and the import path chooses:

| Import | Engine | When |
|---|---|---|
| `.../media/mux-video` | hls.js | **The default. Start here.** |
| `.../media/mux-video/spf` | SPF | You want a much smaller bundle and neither problem below applies. |
| `.../media/mux-video/hls-js` | hls.js | You need to reach the hls.js instance or its settings directly. |

SPF is Video.js's own playback engine, and it's the reason v10 can be as small as it is. It doesn't yet do two things hls.js does:

- **TS-packaged media.** Mux's Plus quality assets are currently packaged as TS. If any of your catalog is Plus quality, stay on the default.
- **DRM.** SPF doesn't license protected content.

Both flavors register the same `<mux-video>` tag and take the same source, so moving between them is an import change and nothing else. Don't import both into one build; only one registration wins.

The plan is for the default import to detect the content and pick the engine for you, so you won't have to think about this. Until then, the default is the safe choice. See the [MuxVideo and Legacy Formats PRD](https://app.notion.com/p/mux/PRD-Video-js-v10-MuxVideo-and-Legacy-Formats-38f97a7f89d080979189db5d688f7e74) for the full plan.

`<mux-audio>` follows the same three paths, and pairs with the audio player and audio skins.

## Live, quality, audio tracks, and captions

Live streams use a different player and skin, because live has different state and a different UI:

```html
<live-video-player>
  <live-video-skin>
    <mux-video src="https://stream.mux.com/EcHgOK9coz5K….m3u8"></mux-video>
  </live-video-skin>
</live-video-player>
```

In React that's `liveVideoFeatures` passed to `createPlayer`, with `LiveVideoSkin`. You get `streamType`, `targetLiveWindow`, and `liveEdgeStart` in state, plus a `media-live-button` that jumps to the live edge.

For everything else, the settings menu in both skins appears on its own when there's something to show:

| What | Component | Notes |
|---|---|---|
| Quality | `media-quality-radio-group` | Lets a viewer pick a rendition. To cap the manifest instead, use `source.playback.maxResolution`. |
| Audio tracks | `media-audio-track-radio-group` | For multi-language audio. |
| Captions | `media-captions-button`, `media-captions-radio-group` | Rendered by the browser. |
| Speed | `media-playback-rate-radio-group` | The rate set is fixed at `0.2`–`2` for now ([#1404](https://github.com/videojs/v10/issues/1404)). |

Caption *styling* is limited to the positioning custom properties the skins expose. There's no equivalent of a text-track settings dialog.

## Chapters and cue points

Chapters are content, not an API call. Add a chapters track and the skins segment the time slider and show the chapter title on hover:

```html
<mux-video src="https://stream.mux.com/EcHgOK9coz5K….m3u8">
  <track kind="chapters" src="/chapters.vtt" default />
</mux-video>
```

There's no `addChapters()`. If you were building that VTT on the fly, you'll still need to, but you point the player at it instead of passing an array.

Two gaps to plan around. The player exposes `chaptersCues` as a read-only array, but there's no `activeChapter` and no `chapterchange` event ([#1441](https://github.com/videojs/v10/issues/1441)). If your app highlights the current chapter in its own UI, derive it from `currentTime` and `chaptersCues`. Cue points aren't implemented at all ([#1442](https://github.com/videojs/v10/issues/1442), [#1267](https://github.com/videojs/v10/issues/1267)).

## Signed playback and DRM

**Signed playback works today.** Each token is a parameter in its own group, and Video.js checks each one's audience before building a URL, so a token in the wrong slot produces no URL rather than a request Mux would reject:

```js
muxVideo.source = {
  playbackId: 'EcHgOK9coz5K…',
  playback: { token: '…' },   // audience: v
  poster: { token: '…' },     // audience: t
  storyboard: { token: '…' }, // audience: s
};
```

Neither player refreshes tokens. Mux Player at least notices an expired one and shows a friendly message; Video.js doesn't surface that yet ([#1432](https://github.com/videojs/v10/issues/1432)).

**DRM works on the default `<mux-video>`** and on native HLS. Hand it a license token and Video.js derives the FairPlay, Widevine, and PlayReady license servers from it, along with the FairPlay application certificate:

```js
muxVideo.source = {
  playbackId: 'EcHgOK9coz5K…',
  playback: { token: '…' },
  drm: { token: '…' }, // audience: d
};
```

DRM playback is always signed, so `drm.token` needs a `playback.token` beside it. For content Mux doesn't license, name license servers yourself, keyed by key system; yours win over the derived ones key by key.

The SPF flavor doesn't license DRM ([#1411](https://github.com/videojs/v10/issues/1411)), which is one of the two reasons to stay on the default import.

## Escape hatches

| Mux Player | Video.js v10 |
|---|---|
| `media.nativeEl` | `.target` on the element, or a `ref` to the `video` in React |
| the hls.js instance | `.host.engine` on the hls.js-backed flavor; in React, through a media ref |
| `prefer-playback` | pick the media: `<mux-video>`, `<mux-video>` from `/spf`, or `<native-hls-video>` |

Program Date Time has no convenience surface: no `getStartDate()`, no `currentPdt`. The player exposes `liveEdgeStart` and `targetLiveWindow`; for PDT itself, reach into the engine.

## Known gaps

Ordered roughly by how many migrations they'll touch.

- React has no `on*` event props. Use `usePlayer` and selectors, or listeners on a media ref ([#1426](https://github.com/videojs/v10/issues/1426), [#1041](https://github.com/videojs/v10/issues/1041)).
- Playback rates are fixed at `0.2`–`2`; you can't choose the set yet ([#1404](https://github.com/videojs/v10/issues/1404)).
- Two skins, against Mux Player's five themes, and no runtime theme switch ([#181](https://github.com/videojs/v10/issues/181)). That's a deliberate trade — fewer looks, each one ejectable — but it's a real difference if you shipped `theme="classic"`.
- Chapters have no `activeChapter` and no `chapterchange` event ([#1441](https://github.com/videojs/v10/issues/1441)), and no `addChapters()`.
- Cue points aren't implemented ([#1442](https://github.com/videojs/v10/issues/1442), [#1267](https://github.com/videojs/v10/issues/1267)).
- No `playback-id` attribute; use a `src` URL or assign `source` in JavaScript.
- Lazy loading (`loading="viewport|page"`) has no equivalent.
- The SPF `<mux-video>` doesn't license DRM and doesn't play TS-packaged media ([#1411](https://github.com/videojs/v10/issues/1411)). The default flavor does both.
- Signed playback works, but there's no expired-token message and no auto-refresh ([#1432](https://github.com/videojs/v10/issues/1432)).
- Neither packaged video skin includes skip buttons; add `media-seek-button`.
- The controls auto-hide delay isn't configurable, and there's no disabled state for the controls.
- Nothing persists between sessions: volume, captions language, speed, quality ([#944](https://github.com/videojs/v10/issues/944)). Default subtitle language is tracked at [#1423](https://github.com/videojs/v10/issues/1423), though Mux users can set `source.playback.defaultSubtitlesLang` and let the manifest decide.
- Caption styling is limited to the skins' positioning custom properties.
- Smaller conveniences with homes: resolution controls [#1415](https://github.com/videojs/v10/issues/1415), restore-last-volume and smart unmute [#1425](https://github.com/videojs/v10/issues/1425), debug mode [#1406](https://github.com/videojs/v10/issues/1406), autoplay with muted fallback [#1039](https://github.com/videojs/v10/issues/1039). Several sit under the parity epic [#1535](https://github.com/videojs/v10/issues/1535).
