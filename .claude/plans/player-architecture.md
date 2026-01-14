# Player Architecture

Unified API for Media and Container concerns. Two stores internally, one API for users.

## Quick Start

### React

```tsx
import { createPlayer, presets } from '@videojs/react';

const { Provider, Container, usePlayer } = createPlayer(presets.website);

function App() {
  return (
    <Provider>
      <Container>
        <Video src="video.mp4" />
        <Controls />
      </Container>
    </Provider>
  );
}

function Controls() {
  const paused = usePlayer((s) => s.paused);
  const { play, pause } = usePlayer().request;
  return <button onClick={paused ? play : pause} />;
}
```

### HTML

```ts
import { createPlayer, presets } from '@videojs/html';

const { PlayerElement } = createPlayer(presets.website);

PlayerElement.define('my-player');
```

```html
<my-player>
  <video src="video.mp4"></video>
</my-player>
```

---

## Surface API

### createPlayer

```ts
// Shorthand — preset or slice array
createPlayer(presets.website);
createPlayer([slices.playback, slices.fullscreen]);

// Config object — extensible
createPlayer({
  slices: presets.website,
  // future: devTools, middleware, etc.
});
```

### Returns (React)

```ts
const {
  Provider, // Creates both stores
  Container, // Attaches player store to element

  usePlayer, // Player state + requests
  useMedia, // Media state + requests (escape hatch)
  useTasks, // Task state (loading, error, etc.)
} = createPlayer(presets.website);
```

### Returns (HTML)

```ts
const {
  PlayerElement, // Ready-to-use element with .define()
  PlayerMixin, // Combined mixin for custom elements
  MediaMixin, // Media store only (advanced)
  ContainerMixin, // Player store only (advanced)

  SelectorController, // Bound to player store
  RequestController,
  TasksController,

  MediaController, // Bound to media store (escape hatch)
} = createPlayer(presets.website);
```

### usePlayer

```ts
const player = usePlayer(); // full store
const paused = usePlayer((s) => s.paused); // selector
const play = usePlayer().request.play; // request

player.state.paused;
player.request.play();
player.request.enterFullscreen();
```

### useMedia (escape hatch)

Direct media access. Rarely needed — use when player slices don't expose what you need.

```ts
const isMediaFullscreen = useMedia((s) => s.isFullscreen);
const mediaRequest = useMedia().request;
```

---

## Presets

Pre-built slice configurations for common use cases.

| Preset               | Use Case                             |
| -------------------- | ------------------------------------ |
| `presets.website`    | Default website player **(default)** |
| `presets.background` | Background/hero video                |
| `presets.news`       | Article embeds (NewsWeek, NY Times)  |
| `presets.creator`    | Creator platforms (YouTube, Patreon) |
| `presets.swipe`      | Short-form video (TikTok)            |
| `presets.streaming`  | Streaming apps (Netflix, Disney)     |
| `presets.live`       | Interactive live (Twitch)            |
| `presets.all`        | Everything                           |

### Extending Presets

```ts
createPlayer({
  slices: [...presets.background, slices.keyboard],
});
```

> **Note:** Duplicate slices are automatically deduplicated. A warning is logged if you add a slice that already exists in the preset.

---

## Slices

Flat exports, type-discriminated.

```ts
import { slices } from '@videojs/react';

slices.playback; // play, pause, ended
slices.volume; // volume, muted
slices.time; // currentTime, duration, seeking
slices.fullscreen; // isFullscreen, enter/exit
slices.keyboard; // keyboard shortcuts
slices.idle; // idle detection
slices.gestures; // touch gestures
slices.quality; // quality levels (requires adapter)
slices.captions; // text tracks
slices.chapters; // chapter markers
```

### Slice Types

```ts
interface MediaSlice {
  type: 'media'; /* ... */
}
interface PlayerSlice {
  type: 'player'; /* ... */
}
```

`createPlayer` filters slices by type, builds both stores, returns unified API.

---

## Skins and Presets

**Skins are tied to presets.** Stores don't live in or extend from skins.

Skins are organized under their preset:

```
packages/react/src/
└── presets/
    └── website/
        ├── index.ts              # preset slices
        └── skins/
            └── frosted/
                ├── index.ts      # FrostedSkin component
                └── ui/           # UI components only
```

```tsx
// Skin exported from preset
import { FrostedSkin } from '@videojs/react/presets/website';

<FrostedSkin>
  <Video src="video.mp4" />
</FrostedSkin>;
```

To customize, create your own player with a different preset:

```tsx
import { createPlayer, presets } from '@videojs/react';
import { FrostedSkin } from '@videojs/react/presets/website';

const { Provider, Container } = createPlayer(presets.streaming);

<Provider>
  <Container>
    <Video />
    <FrostedSkin /> {/* UI components only, no store */}
  </Container>
</Provider>;
```

---

## Usage Examples

### React

#### Declarative (Skin)

```tsx
import { FrostedSkin } from '@videojs/react/presets/website';

<FrostedSkin>
  <Video src="video.mp4" />
</FrostedSkin>;
```

#### Custom Player (Preset)

```tsx
import { createPlayer, presets, Video } from '@videojs/react';

const { Provider, Container, usePlayer } = createPlayer(presets.website);

function App() {
  return (
    <Provider>
      <Container>
        <Video src="video.mp4" />
        <Controls />
      </Container>
    </Provider>
  );
}

function Controls() {
  const paused = usePlayer((s) => s.paused);
  const isFullscreen = usePlayer((s) => s.isFullscreen);
  const { play, pause, toggleFullscreen } = usePlayer().request;

  return (
    <div>
      <button onClick={paused ? play : pause} />
      <button onClick={toggleFullscreen} />
    </div>
  );
}
```

#### Extended Preset

```tsx
import { createPlayer, presets, slices, Video } from '@videojs/react';

const { Provider, Container, usePlayer } = createPlayer({
  slices: [...presets.background, slices.keyboard, analyticsSlice],
});
```

#### Media Escape Hatch

```tsx
import { createPlayer, presets } from '@videojs/react';

const { usePlayer, useMedia } = createPlayer(presets.website);

function DebugPanel() {
  // Player state (preferred)
  const isFullscreen = usePlayer((s) => s.isFullscreen);

  // Media state directly (escape hatch)
  const mediaFullscreen = useMedia((s) => s.isFullscreen);
  const readyState = useMedia((s) => s.readyState);

  return <pre>{JSON.stringify({ isFullscreen, mediaFullscreen, readyState })}</pre>;
}
```

#### Headless (No UI)

```tsx
import { createMedia, media } from '@videojs/react';

const { Provider, useMedia } = createMedia([media.playback, media.time]);

function AudioPlayer() {
  const currentTime = useMedia((s) => s.currentTime);
  const { play, pause } = useMedia().request;
  // Programmatic control, no UI
}
```

---

### HTML

#### Declarative (Skin)

```html
<script type="module">
  import '@videojs/html/presets/website/skins/frosted.js';
</script>

<vjs-frosted-skin>
  <video src="video.mp4"></video>
</vjs-frosted-skin>
```

#### Custom Player (Preset)

```ts
import { createPlayer, presets } from '@videojs/html';

const { PlayerElement, SelectorController, RequestController } = createPlayer(presets.website);

PlayerElement.define('my-player');
```

```ts
// Custom controls element
class MyControls extends LitElement {
  #paused = new SelectorController(this, (s) => s.paused);
  #request = new RequestController(this);

  render() {
    return html`
      <button @click=${this.#paused.value ? this.#request.play : this.#request.pause}>
        ${this.#paused.value ? 'Play' : 'Pause'}
      </button>
    `;
  }
}
```

#### Extended Preset

```ts
import { createPlayer, presets, slices } from '@videojs/html';

const { PlayerElement } = createPlayer({
  slices: [...presets.background, slices.keyboard],
});

PlayerElement.define('background-player');
```

#### Split Provider/Container

When media element and fullscreen target need different DOM locations.

```ts
import { createPlayer, presets } from '@videojs/html';

const { MediaMixin, ContainerMixin } = createPlayer(presets.website);

class MediaProvider extends MediaMixin(LitElement) {}
class MediaContainer extends ContainerMixin(LitElement) {}

customElements.define('media-provider', MediaProvider);
customElements.define('media-container', MediaContainer);
```

```html
<media-provider>
  <video src="video.mp4"></video>
  <media-container>
    <my-controls></my-controls>
  </media-container>
</media-provider>
```

#### Headless (No UI)

```ts
import { createMedia, media } from '@videojs/html';

const { MediaMixin } = createMedia([media.playback, media.time]);

class AudioController extends MediaMixin(LitElement) {
  // Programmatic control, no UI
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              createPlayer()                                  │
│  config: presets.website | { slices: [...] }                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                            filters by slice.type
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
      ┌──────────────────────────┐        ┌──────────────────────────┐
      │  createStore()           │        │  createStore()           │
      │  type: 'media' slices    │        │  type: 'player' slices   │
      └──────────────────────────┘        └──────────────────────────┘
                    │                                   │
                    ▼                                   ▼
      ┌──────────────────────────┐        ┌──────────────────────────┐
      │      Media Store         │◄───────│     Player Store         │
      │  target: MediaTarget     │        │  target: PlayerTarget    │
      │                          │        │                          │
      │  state: paused, volume   │        │  state: isFullscreen     │
      │  request: play, pause    │        │  request: toggleFS       │
      └──────────────────────────┘        └──────────────────────────┘
                                                      │
                                           target.media.getSlice()
                                                      │
                                          ┌───────────┴───────────┐
                                          ▼                       ▼
                                   Read media state        Call media requests
                                   (iOS fallback)          (keyboard shortcuts)
```

**Key insight:** Player Store's target includes a reference to the Media Store. This enables coordination without tight coupling.

---

## Cross-Store Access

Player slices access media via `store.getSlice()`:

```ts
const fullscreen = createPlayerSlice({
  request: {
    enterFullscreen: (_, { target }) => {
      // Try container fullscreen
      if (document.fullscreenEnabled) {
        target.container.requestFullscreen();
        return;
      }

      // iOS fallback — use media fullscreen
      const mediaFS = target.media.getSlice(media.fullscreen);
      mediaFS?.request.enterFullscreen();
    },
  },

  subscribe: ({ target, update, signal }) => {
    // Subscribe to media fullscreen changes (iOS)
    target.media.getSlice(media.fullscreen)?.subscribe((s) => s.isFullscreen, update, { signal });
  },
});
```

---

## Player Slices

### Fullscreen

```ts
export const fullscreen = createPlayerSlice({
  initialState: {
    isFullscreen: false,
    fullscreenTarget: null as 'container' | 'media' | null,
  },

  getSnapshot: ({ target }) => {
    const containerFS = document.fullscreenElement === target.container;
    const mediaFS = target.media.getSlice(media.fullscreen)?.state.isFullscreen;
    return {
      isFullscreen: containerFS || mediaFS || false,
      fullscreenTarget: containerFS ? 'container' : mediaFS ? 'media' : null,
    };
  },

  subscribe: ({ target, update, signal }) => {
    // Container fullscreen
    listen(document, 'fullscreenchange', update, { signal });

    // iOS: media fullscreen
    target.media.getSlice(media.fullscreen)?.subscribe((s) => s.isFullscreen, update, { signal });
  },

  request: {
    enterFullscreen: (_, { target }) => {
      // container.requestFullscreen() || media fallback
    },
    exitFullscreen: (_, { target }) => {
      // document.exitFullscreen() || media fallback
    },
    toggleFullscreen: (_, { target, state }) => {
      // state.isFullscreen ? exit : enter
    },
  },
});
```

**Notes:**

- iOS Safari lacks container fullscreen — falls back to `media.fullscreen` slice
- `fullscreenTarget` indicates which element is fullscreen

### Other Slices

**Idle** — Tracks user activity. Resets on `pointermove`, `pointerdown`, `keydown`. Optionally resets when media plays.

**Keyboard** — Keyboard shortcuts. Maps keys to requests (e.g., `Space` → `togglePlay`, `f` → `toggleFullscreen`).

**Gestures** — Touch gestures. Double-tap seek, swipe volume, pinch zoom.

---

## Extending

One place to extend: player slices.

```ts
import { createPlayerSlice } from '@videojs/react';

const analytics = createPlayerSlice({
  initialState: { events: [] },

  subscribe: ({ target, update }) => {
    target.media.subscribe(
      (s) => s.paused,
      (paused) => {
        track(paused ? 'pause' : 'play');
        update();
      }
    );
  },

  request: {
    trackEvent: (event, { target }) => {
      target.container; // container DOM element
      target.media.state.paused; // read media state
      target.media.request.play(); // control media (traced, queued)
    },
  },
});

createPlayer({
  slices: [...presets.website, analytics],
});
```

### PlayerTarget

```ts
interface PlayerTarget {
  media: Store<MediaTarget>;
  container: HTMLElement;
}
```

### Media Slices (rare)

Only for core media capabilities. Most extensions are player slices.

```ts
import { createMediaSlice, media } from '@videojs/react';

// Direct media slices for headless/programmatic use
createMedia([media.playback, media.time]);
```

---

## Under the Hood

### Why Two Stores

| Reason                | Explanation                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| **Different targets** | Media slices target `MediaTarget`. Player slices target `PlayerTarget`.                           |
| **Attachment timing** | `<Video>` and `<Container>` mount at different times, possibly different tree locations.          |
| **Config dependency** | Player slices configure against typed media store. Media store must exist first.                  |
| **Observability**     | Player→media interactions go through store. Enables debugging, tracing, request queuing.          |
| **Standalone media**  | Headless player, audio-only, programmatic control. Media store works alone.                       |
| **Type safety**       | Player slices declare required media capabilities. TypeScript catches mismatches at compile time. |

---

## Progressive Complexity

| Level         | Example                                       | Sees "store"? |
| ------------- | --------------------------------------------- | ------------- |
| Use skin      | `<FrostedSkin>`                               | No            |
| Use preset    | `createPlayer(presets.website)`               | No            |
| Custom slices | `createPlayer([...presets.website, mySlice])` | No            |
| Use hooks     | `usePlayer(s => s.paused)`                    | No            |
| Write slice   | `createPlayerSlice({ ... })`                  | Yes           |

"Store" appears when authoring slices — that's when targets, state, requests, subscriptions matter.

---

## Naming

| Concept       | Name                    | Rationale                           |
| ------------- | ----------------------- | ----------------------------------- |
| Factory       | `createPlayer`          | Users think "I'm creating a player" |
| Hooks         | `usePlayer`, `useMedia` | Simple, clear purpose               |
| Slice factory | `createPlayerSlice`     | "Slice" appears at authoring level  |

Simplified from original:

| Before                 | After                 |
| ---------------------- | --------------------- |
| `useMediaSelector`     | `useMedia`            |
| `useContainerSelector` | `usePlayer`           |
| `useMediaRequest`      | `useMedia().request`  |
| `useContainerRequest`  | `usePlayer().request` |

---

## File Structure

```
packages/html/src/
├── create-player.ts
└── presets/
    ├── website/
    │   ├── index.ts              # preset slices
    │   └── skins/
    │       └── frosted/
    │           ├── index.ts
    │           └── define.ts
    ├── background/
    ├── streaming/
    └── ...

packages/react/src/
├── create-player.tsx
└── presets/
    └── website/
        ├── index.ts
        └── skins/
            └── frosted/

packages/core/src/dom/
├── slices/
│   ├── media/                    # media slices
│   └── player/                   # player slices
└── index.ts
```

---

## Concerns & Decisions

### Naming: "Player" vs "Store"

**Decision:** Use `createPlayer`, `usePlayer` — users think "I'm creating a player."

**Concern:** We teach users the player has three parts (State, UI, Media) but call just the State piece "player." Not fully consistent, but acceptable as the primary entry point.

### Naming: "Media" Ambiguity

**Concern:** "Media" is overloaded — there's a whole third of the vjs ecosystem also called "media." `createMedia()` may be unclear.

**Alternative considered:** `createMediaStore()` / `mediaStore` — makes the internal concept explicit for this advanced use case.

### Slice Factory Naming

**Decision:** `createPlayerSlice` for now.

**Alternative considered:** `createPlayerStoreSlice` — more verbose but "PlayerSlice" has no real meaning in isolation.

### Why Two Stores (Not One)

**Concern raised:** With player store depending heavily on media store and coordinating, is the "clean separation" real? A single store gives one clear place for devs and plugin authors to extend.

**Decision:** Two stores because:

- Different targets (`MediaTarget` vs `PlayerTarget`)
- Different attachment timing (`<Video>` vs `<Container>`)
- Config dependency (player slices need typed media store reference)
- Standalone media (headless, audio-only works without player store)

**Trade-off:** Plugin authors navigate two stores, but most extend only player store.

### Container ≠ Provider

**Principle:** Container is purely UI attachment. Provider owns state.

```tsx
<Provider>
  {' '}
  {/* ← state lives here (both stores) */}
  <Skin>
    {' '}
    {/* ← UI only, no store creation */}
    <Video /> {/* ← media */}
  </Skin>
</Provider>
```

Container inside skin just attaches to existing store — doesn't provide one. This keeps the mental model clean: State → UI → Media.

### Open Questions

- **"In-between" functionality:** Where does functionality that's not clearly media or UI go? Examples needed.
- **Plugin author experience:** How many concepts must they learn? Two stores vs one affects this.

---

## Constraints

- Player slices live in `@videojs/core/dom`
- `createPlayer` lives in `@videojs/html` and `@videojs/react`
- Skins are tied to presets — stores don't extend from skins
- Two stores internally, one API externally
- "Store" concept hidden until slice authoring
