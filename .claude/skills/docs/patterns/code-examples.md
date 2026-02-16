# Code Examples Pattern

How to write effective code examples across documentation — site pages, READMEs, and JSDoc.

## Core Principles

1. **Self-contained** — include all imports
2. **Copy-paste ready** — works immediately
3. **TypeScript-first** — show types, leverage inference
4. **Minimal** — only what's needed to demonstrate the concept
5. **Real** — use realistic values, not `foo`/`bar`

## Self-Contained Examples

```tsx
// ❌ Missing imports — won't work when copied
function App() {
  return (
    <Player.Container>
      <Video src="video.mp4" />
      <PlayButton />
    </Player.Container>
  );
}

// ✅ Complete — copy, paste, run
import { createPlayer, features, PlayButton } from '@videojs/react';
import { Video } from '@videojs/react/video';

const Player = createPlayer({ features: [...features.video] });

function App() {
  return (
    <Player.Provider>
      <Player.Container>
        <Video src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4" />
        <PlayButton />
      </Player.Container>
    </Player.Provider>
  );
}
```

## TypeScript Best Practices

### Show Type Inference

```ts
// ✅ Let inference work — cleaner
const store = createStore<HTMLMediaElement>()(volumeSlice);

// ❌ Redundant annotation
const store: Store<HTMLMediaElement, VolumeState> = createStore<HTMLMediaElement>()(volumeSlice);
```

### Annotate When Helpful

```ts
// ✅ Annotation clarifies complex return
import type { InferSliceState } from '@videojs/store';

type VolumeState = InferSliceState<typeof volumeSlice>;
// { volume: number; muted: boolean; setVolume: ...; toggleMute: ... }
```

### Show Type Imports

```ts
// ✅ Separate type imports
import { createStore, defineSlice } from '@videojs/store';
import type { InferStoreState } from '@videojs/store';
```

## Framework-Specific Code

Site pages use `<FrameworkCase>` and `<StyleCase>` to show code per framework. Never use generic `<Tabs>` for framework switching.

**React:**

```tsx
import { createPlayer, features, PlayButton } from '@videojs/react';
import { Video } from '@videojs/react/video';

const Player = createPlayer({ features: [...features.video] });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="player">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
        />
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

**HTML:**

```html
<video-player class="player">
  <video
    src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
    autoplay
    muted
    playsinline
  ></video>
  <media-play-button>
    <span class="show-when-paused">Play</span>
    <span class="show-when-playing">Pause</span>
  </media-play-button>
</video-player>
```

## Progressive Examples

Start simple, add complexity in later sections:

```markdown
## Basic Usage

const volumeSlice = defineSlice<HTMLMediaElement>()({
  state: () => ({ volume: 1 }),
  attach: ({ target, set, signal }) => {
    const sync = () => set({ volume: target.volume });
    target.addEventListener('volumechange', sync, { signal });
  },
});

## With Actions

const volumeSlice = defineSlice<HTMLMediaElement>()({
  state: ({ target }) => ({
    volume: 1,
    setVolume(value: number) {
      target().volume = Math.max(0, Math.min(1, value));
    },
  }),
  attach: ({ target, set, signal }) => {
    const sync = () => set({ volume: target.volume });
    sync();
    target.addEventListener('volumechange', sync, { signal });
  },
});

## Combining Slices

const mediaSlice = combine(volumeSlice, playbackSlice);
const store = createStore<HTMLMediaElement>()(mediaSlice);
```

## Do/Don't Contrasts

Use `// ❌ Don't` / `// ✅ Do` pairs. Always explain *why* the wrong way is wrong:

```ts
// ❌ Don't — creates new Set on every render
const trackedRef = useRef(new Set<string>());

// ✅ Do — initializer only runs once
const [tracked] = useState(() => new Set<string>());
```

```ts
// ❌ Don't — redundant type annotation
const value = someFunction() as SomeType;

// ✅ Do — let inference work
const value = someFunction();
```

## Show Output

Include expected output as comments when the result isn't obvious:

```ts
import type { InferSliceState } from '@videojs/store';

type VolumeState = InferSliceState<typeof volumeSlice>;
// { volume: number; setVolume: (value: number) => void }

const store = createStore<HTMLMediaElement>()(volumeSlice);
store.attach(videoElement);

const { volume } = store;
// volume: 1
```

## Error Examples

Show what errors look like and how to handle them:

```ts
import { isStoreError } from '@videojs/store';

try {
  await store.play();
} catch (error) {
  if (isStoreError(error)) {
    switch (error.code) {
      case 'NO_TARGET':
        // No media element attached
        break;
      case 'DESTROYED':
        // Store was destroyed
        break;
    }
  }
}
```

## Filename Headers

Show which file code belongs to when multiple files are involved:

````markdown
```tsx title="App.tsx"
import { createPlayer, features, PlayButton } from '@videojs/react';
import { Video } from '@videojs/react/video';
import './App.css';

const Player = createPlayer({ features: [...features.video] });

export default function App() {
  return (
    <Player.Provider>
      <Player.Container className="player">
        <Video src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4" />
        <PlayButton />
      </Player.Container>
    </Player.Provider>
  );
}
```

```css title="App.css"
.player {
  --player-accent-color: #3b82f6;
}
```
````

## Realistic Values

```ts
// ❌ Meaningless
const slice = defineSlice<Foo>()({
  state: () => ({ bar: 'baz' }),
});

// ✅ Realistic
const volumeSlice = defineSlice<HTMLMediaElement>()({
  state: () => ({ volume: 1, muted: false }),
  attach: ({ target, set, signal }) => {
    const sync = () => set({ volume: target.volume, muted: target.muted });
    sync();
    target.addEventListener('volumechange', sync, { signal });
  },
});
```

## Console Examples

For installation and CLI:

```bash
# Install the package
npm install @videojs/store

# Or with other package managers
pnpm add @videojs/store
```

## Demo Files (Site Pages)

Live demos in reference pages use the `<Demo>` component with `?raw` imports for source code display. See the `api-reference` skill for full patterns.

```mdx
import BasicUsageDemo from "@/components/docs/demos/play-button/react/css/BasicUsage";
import basicUsageTsx from "@/components/docs/demos/play-button/react/css/BasicUsage.tsx?raw";
import basicUsageCss from "@/components/docs/demos/play-button/react/css/BasicUsage.css?raw";

<FrameworkCase frameworks={["react"]}>
  <StyleCase styles={["css"]}>
    <Demo files={[
      { title: "App.tsx", code: basicUsageTsx, lang: "tsx" },
      { title: "App.css", code: basicUsageCss, lang: "css" },
    ]}>
      <BasicUsageDemo client:idle />
    </Demo>
  </StyleCase>
</FrameworkCase>
```
