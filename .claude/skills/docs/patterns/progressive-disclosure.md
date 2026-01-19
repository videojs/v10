# Progressive Disclosure Pattern

How to layer information for different audiences.

## Four-Tier Information Hierarchy

| Tier | Purpose | Audience | Length |
|------|---------|----------|--------|
| **Quick Start** | First success in <5 min | Everyone | 1 page |
| **Concepts** | Mental models | Learning | 2-5 pages |
| **Guides** | Task completion | Building | Per-task |
| **API Reference** | Complete spec | Referencing | Comprehensive |

## Quick Start Pattern

Goal: Working code in under 5 minutes.

```markdown
## Quick Start

### Install

npm install @videojs/react

### Use

import { Player } from '@videojs/react';

function App() {
  return <Player src="video.mp4" />;
}

That's it. [See the full guide →](/guides/getting-started)
```

**Rules:**
- Max 3 code blocks
- No configuration options
- No edge cases
- Link to "full guide" for more

## Expandable Sections

Use `<details>` for optional depth:

```markdown
## Configuration

const player = createPlayer({ src: 'video.mp4' });

<details>
<summary>All configuration options</summary>

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `src` | `string` | — | Source URL |
| `autoplay` | `boolean` | `false` | Auto-start |
| `muted` | `boolean` | `false` | Start muted |
| ... | ... | ... | ... |

</details>
```

## Tabbed Complexity

Simple → Advanced in tabs:

```markdown
## Creating a Player

<Tabs>
<Tab label="Basic">
const player = createPlayer({ src: 'video.mp4' });
</Tab>
<Tab label="With Options">
const player = createPlayer({
  src: 'video.mp4',
  autoplay: true,
  muted: true,
  tracks: [{ kind: 'subtitles', src: 'en.vtt' }],
});
</Tab>
<Tab label="Full Control">
const player = createPlayer({
  src: 'video.mp4',
  autoplay: true,
  muted: true,
  loop: false,
  preload: 'metadata',
  crossOrigin: 'anonymous',
  tracks: [
    { kind: 'subtitles', src: 'en.vtt', label: 'English', default: true },
    { kind: 'subtitles', src: 'es.vtt', label: 'Español' },
  ],
  plugins: [analyticsPlugin(), adsPlugin()],
  onPlay: () => console.log('play'),
  onError: (e) => console.error(e),
});
</Tab>
</Tabs>
```

## "See Also" Sections

End every page with related content:

```markdown
## See Also

- [Events Guide](/guides/events) — Listen to player events
- [Styling Guide](/guides/styling) — Customize appearance
- [API Reference](/api/player) — Full Player API
```

## Callout Boxes

For important asides without breaking flow:

```markdown
:::note
The player must be attached before calling `play()`.
:::

:::warning
`autoplay` requires `muted` in most browsers.
:::

:::tip
Use `preload="metadata"` for faster initial load.
:::
```

## Inline Links

Link concepts on first mention:

```markdown
Create a [player](/api/player) and attach it to a 
[media element](/concepts/media-elements). The player uses
[requests](/concepts/requests) to coordinate state changes.
```

## Layered Examples

Same feature, increasing detail:

```markdown
## Playing Media

### Basic

player.play();

### With Error Handling

try {
  await player.play();
} catch (error) {
  if (error.name === 'NotAllowedError') {
    // Autoplay blocked, show play button
  }
}

### With Request API

const result = await player.request.play();

if (!result.success) {
  switch (result.error.code) {
    case 'NOT_ALLOWED':
      // Show play button
      break;
    case 'NOT_SUPPORTED':
      // Show format error
      break;
  }
}
```

## Feature Flags

Document experimental features separately:

```markdown
## Experimental Features

:::warning
These features may change or be removed.
:::

### Picture-in-Picture

Enable with the `experimentalPiP` flag:

const player = createPlayer({
  src: 'video.mp4',
  experimentalPiP: true,
});
```

## Version-Specific Content

Show version differences:

```markdown
## Migration from v9

<Tabs>
<Tab label="v9 (Old)">
videojs('player', { sources: [{ src: 'video.mp4' }] });
</Tab>
<Tab label="v10 (New)">
createPlayer({ src: 'video.mp4' });
</Tab>
</Tabs>

### What Changed

| v9 | v10 |
|----|-----|
| `videojs()` function | `createPlayer()` |
| `sources` array | `src` string |
| jQuery-style API | Modern async API |
```

## Audience Markers

Signal who content is for:

```markdown
## Advanced: Custom Tech

> This section is for library authors building custom playback engines.

A Tech is the abstraction layer between the player and the media element...
```

## Prerequisites

State requirements upfront:

```markdown
## Building Plugins

### Prerequisites

- Familiarity with the [Player API](/api/player)
- Understanding of [Events](/concepts/events)
- Node.js 18+

### Before You Start

Complete the [Getting Started](/guides/getting-started) guide first.
```

## Summary Boxes

TL;DR for skimmers:

```markdown
## State Management

:::summary
- State is readonly — use requests to change it
- Requests are async and can fail
- Subscribe to state changes with `subscribe()`
:::

The player uses a unidirectional data flow...
```

## Code Annotations

Explain complex code inline:

```ts
const player = createPlayer({
  src: 'video.mp4',
  // 1. Autoplay requires muted in most browsers
  autoplay: true,
  muted: true,
  // 2. Preload metadata for faster start
  preload: 'metadata',
  // 3. Enable CORS for cross-origin sources
  crossOrigin: 'anonymous',
});
```

## Skip Links

Let users jump to what they need:

```markdown
## Player Configuration

**Jump to:** [Basic](#basic) | [Sources](#sources) | [Tracks](#tracks) | [Events](#events) | [Plugins](#plugins)

### Basic
...

### Sources
...
```
