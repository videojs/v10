# Code Examples Pattern

How to write effective code examples for documentation.

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
  const player = usePlayer();
  return <Player src="video.mp4" />;
}

// ✅ Complete — copy, paste, run
import { Player, usePlayer } from '@videojs/react';

function App() {
  const player = usePlayer();
  return <Player src="video.mp4" />;
}
```

## TypeScript Best Practices

### Show Type Inference

```ts
// ✅ Let inference work — cleaner
const player = createPlayer({
  src: 'video.mp4',
  autoplay: true,
});
// player is inferred as Player

// ❌ Redundant annotation
const player: Player = createPlayer({
  src: 'video.mp4',
  autoplay: true,
});
```

### Annotate When Helpful

```ts
// ✅ Annotation clarifies complex return
function usePlayerState(): {
  state: PlayerState;
  request: RequestAPI;
} {
  // ...
}

// ✅ Annotation shows expected shape
const options: PlayerOptions = {
  src: 'video.mp4',
  tracks: [
    { kind: 'subtitles', src: 'en.vtt', label: 'English' },
  ],
};
```

### Show Type Imports

```ts
// ✅ Show type imports for complex types
import type { PlayerOptions, TextTrack } from '@videojs/core';

const tracks: TextTrack[] = [
  { kind: 'subtitles', src: 'en.vtt', label: 'English' },
];
```

## Framework Tabs

Use tabs for multi-framework examples:

````markdown
<Tabs>
<Tab label="React">
```tsx
import { Player } from '@videojs/react';

function App() {
  return <Player src="video.mp4" />;
}
```
</Tab>
<Tab label="Vue">
```vue
<script setup>
import { Player } from '@videojs/vue';
</script>

<template>
  <Player src="video.mp4" />
</template>
```
</Tab>
<Tab label="Svelte">
```svelte
<script>
  import { Player } from '@videojs/svelte';
</script>

<Player src="video.mp4" />
```
</Tab>
<Tab label="Vanilla">
```ts
import { createPlayer } from '@videojs/core';

const player = createPlayer({
  target: document.getElementById('player'),
  src: 'video.mp4',
});
```
</Tab>
</Tabs>
````

## Progressive Examples

Start simple, add complexity:

```markdown
## Basic Usage

const player = createPlayer({ src: 'video.mp4' });

## With Options

const player = createPlayer({
  src: 'video.mp4',
  autoplay: true,
  muted: true,
});

## With Event Handling

const player = createPlayer({
  src: 'video.mp4',
  onPlay: () => console.log('Playing'),
  onError: (e) => console.error(e),
});

## Full Configuration

const player = createPlayer({
  src: 'video.mp4',
  autoplay: true,
  muted: true,
  loop: false,
  preload: 'metadata',
  tracks: [
    { kind: 'subtitles', src: 'en.vtt', label: 'English', default: true },
  ],
  onPlay: () => analytics.track('video_play'),
  onError: (e) => errorReporter.capture(e),
});
```

## Highlight Key Lines

Use comments to draw attention:

```ts
const player = createPlayer({
  src: 'video.mp4',
  // highlight-next-line
  autoplay: true, // ← Starts playing automatically
});
```

Or diff-style:

```ts
const player = createPlayer({
  src: 'video.mp4',
- autoplay: false,
+ autoplay: true,
});
```

## Show Output

Include expected output as comments:

```ts
console.log(player.state.currentTime);
// => 0

await player.request.seek(30);
console.log(player.state.currentTime);
// => 30
```

## Error Examples

Show what errors look like:

```ts
// This will throw:
player.play();
// => Error: Player not attached to media element

// Do this instead:
await player.attach(videoElement);
player.play();
```

## Interactive Examples

Link to StackBlitz/CodeSandbox:

```markdown
```tsx
import { Player } from '@videojs/react';

function App() {
  return <Player src="video.mp4" />;
}
```

[Open in StackBlitz →](https://stackblitz.com/edit/videojs-react-basic)
```

## Copy Buttons

All code blocks should have copy functionality. In MDX:

```mdx
<CodeBlock copy>
const player = createPlayer({ src: 'video.mp4' });
</CodeBlock>
```

## Filename Headers

Show which file the code belongs to:

````markdown
```tsx title="App.tsx"
import { Player } from '@videojs/react';

export function App() {
  return <Player src="video.mp4" />;
}
```

```css title="player.css"
.player {
  --player-accent-color: #3b82f6;
}
```
````

## Do/Don't Examples

Show contrast:

```markdown
### Event Handling

// ❌ Don't — inline handlers get recreated
<Player
  onTimeUpdate={(t) => setTime(t)}
/>

// ✅ Do — stable callback reference
const handleTimeUpdate = useCallback((t) => setTime(t), []);
<Player onTimeUpdate={handleTimeUpdate} />
```

## Realistic Values

```ts
// ❌ Meaningless
const foo = createBar({ baz: 'qux' });

// ✅ Realistic
const player = createPlayer({
  src: 'https://example.com/video.mp4',
  poster: 'https://example.com/poster.jpg',
});
```

## Console Examples

For CLI documentation:

```bash
# Install the package
npm install @videojs/core

# Or with other package managers
pnpm add @videojs/core
yarn add @videojs/core
```

## API Response Examples

For async operations:

```ts
const result = await player.request.play();
// => { success: true, state: 'playing' }

const error = await player.request.play();
// => { success: false, error: { code: 'NOT_ALLOWED', message: '...' } }
```

## Configuration Comparison

Show equivalent configs:

```markdown
### JavaScript

const player = createPlayer({
  src: 'video.mp4',
  autoplay: true,
});

### HTML Data Attributes

<video
  data-player
  data-src="video.mp4"
  data-autoplay
></video>

### React Props

<Player src="video.mp4" autoplay />
```
