---
status: accepted
---

# Player API Design

| Document                           | Purpose                                   |
| ---------------------------------- | ----------------------------------------- |
| [index.md](index.md)               | Overview, principles, model               |
| [api.md](api.md)                   | Surface API (usePlayer, controller)       |
| [features.md](features.md)         | Feature definition, slices, bundles       |
| [primitives.md](primitives.md)     | Library author patterns                   |
| [architecture.md](architecture.md) | Single-store internals                    |
| [decisions.md](decisions.md)       | Problem statement, design rationale       |
| [examples.md](examples.md)         | Progressive journey examples              |
| [html.md](html.md)                 | HTML elements, imports, skins             |
| [feedback.md](feedback.md)         | Collected feedback                        |

## Principles

- Default should be obvious
- Progressive enhancement
- Declarative for common cases, programmatic for custom
- Every name ends in its object
- Code should be self-documenting
- Match developer's mental model
- Critical path bundle size matters
- Features are the primary abstraction
- HTML: Features register via imports, `createPlayer` is escape hatch
- React: Features passed via `createPlayer` config, clear extension point
- Skins adapt to available features

## Model

```
┌─────────────────────────────────────────────────┐
│ <video-player>                                  │  ← Behavior
│   ┌─────────────────────────────────────────┐   │
│   │ <video-skin>                            │   │  ← Appearance
│   │   ┌─────────────────────────────────┐   │   │
│   │   │ <hls-video src="...">           │   │   │  ← Media
│   │   └─────────────────────────────────┘   │   │
│   └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

| Layer      | Responsibility                                  |
| ---------- | ----------------------------------------------- |
| **Player** | Behavior (controls, keyboard, fullscreen, idle) |
| **Skin**   | Layout + styling, adapts to available features  |
| **Media**  | Source handling (native, HLS, DASH)             |
| **Features** | Additive capabilities, feature detection for skins |

## Progressive Workflow

```
Start simple                          Add as needed
     │                                     │
     ▼                                     ▼

┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Player    │ → │    Skin     │ → │  Features   │ → │   Custom    │
│             │   │             │   │             │   │             │
│ <video-     │   │ <video-     │   │ streaming   │   │ createPlayer│
│  player>    │   │  skin>      │   │ ads         │   │ escape hatch│
│             │   │             │   │ chapters    │   │             │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘

     Works            Pretty           Capable          Fully custom
```

## Overview

### React

```tsx
import '@videojs/react/video/skin.css';

import { createPlayer } from '@videojs/react';
import { features } from '@videojs/core/dom';
import { VideoSkin } from '@videojs/react/video/skin';

const { Provider: VideoProvider } = createPlayer({
  features: [...features.video],
});

function App() {
  return (
    <VideoProvider>
      <VideoSkin>
        <video src="video.mp4" />
      </VideoSkin>
    </VideoProvider>
  );
}
```

### HTML

```ts
import '@videojs/html/video/player';
import '@videojs/html/video/skin.css';
import '@videojs/html/video/skin';
```

```html
<video-player>
  <video-skin>
    <video src="video.mp4">
  </video-skin>
</video-player>
```