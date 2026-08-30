# Demo Patterns

File structure and conventions for interactive component demos.

## Directory Structure

```
site/src/components/docs/demos/{component}/
├── html/css/
│   ├── BasicUsage.astro     # Astro wrapper (renders HTML, imports CSS, bundles script)
│   ├── BasicUsage.html      # Markup only (no <style> or <script>)
│   ├── BasicUsage.css       # Styles
│   └── BasicUsage.ts        # Side-effect imports for custom element registration
└── react/css/
    ├── BasicUsage.tsx        # React component
    └── BasicUsage.css        # Styles
```

## CSS Scoping

Give every demo a unique root class using `{framework}-{component}-{variant}`. Use flat semantic names for additional
component or part hooks:

```
html-play-button-basic          /* HTML framework, root */
html-play-button-basic-button   /* HTML framework, button */
react-play-button-basic         /* React framework, root */
react-play-button-basic-button  /* React framework, button */
```

The framework prefix (`html-` / `react-`) prevents CSS leaking between HTML and React demos on the same page (both
render but one is hidden). React and HTML demos for the same variant should use matching semantic hooks.

## HTML Demo Files

### .astro wrapper

```astro
---
import HtmlDemo from '@/components/docs/demos/HtmlDemo.astro';
import html from './BasicUsage.html?raw';
import './BasicUsage.css';
---
<HtmlDemo html={html} />
<script>
  import './BasicUsage.ts';
</script>
```

The `.astro` wrapper is required because only Astro `<script>` tags go through Vite's bundling pipeline.

### .html (markup only)

```html
<video-player class="html-mute-button-basic">
    <video
        src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
        autoplay
        muted
        playsinline
        loop
    ></video>
    <media-mute-button class="html-mute-button-basic-button">
        <span class="show-when-muted">Unmute</span>
        <span class="show-when-unmuted">Mute</span>
    </media-mute-button>
</video-player>
```

- No `<style>` or `<script>` tags
- Video attributes: `autoplay muted playsinline loop`
- State labels use CSS class names toggled by data attributes

### .css (styles)

```css
.html-mute-button-basic {
  position: relative;
}

.html-mute-button-basic video {
  width: 100%;
}

.html-mute-button-basic-button {
  padding-block: 8px;
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  color: black;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 9999px;
  padding-inline: 20px;
  cursor: pointer;
}

/* State-based visibility via data attributes */
.html-mute-button-basic-button .show-when-muted { display: none; }
.html-mute-button-basic-button .show-when-unmuted { display: none; }
.html-mute-button-basic-button[data-muted] .show-when-muted { display: inline; }
.html-mute-button-basic-button:not([data-muted]) .show-when-unmuted { display: inline; }
```

### .ts (registration imports)

```ts
import '@videojs/html/video/player';
import '@videojs/html/ui/container';
import '@videojs/html/ui/mute-button';
```

Import registration for:

- `@videojs/html/video/player` — always needed (registers `<video-player>`)
- `@videojs/html/ui/container` — registers the layout and fullscreen boundary
- `@videojs/html/ui/{component}` — registers the component's custom element

## React Demo Files

### .tsx (component)

```tsx
import { Container, createPlayer, MuteButton } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const { Player } = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player>
      <Container className="react-mute-button-basic">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <MuteButton
          className="react-mute-button-basic-button"
          render={(props, state) => (
            <button {...props}>{state.muted ? 'Unmute' : 'Mute'}</button>
          )}
        />
      </Container>
    </Player>
  );
}
```

Key patterns:

- `createPlayer({ features: videoFeatures })` creates the player
- Video attributes: `autoPlay muted playsInline loop` (React camelCase)
- `render` prop for state-based rendering: `render={(props, state) => ...}`
- Spread `{...props}` on the rendered element for accessibility attributes

### .css (styles)

Use the same semantic hooks as HTML with the `react-` demo prefix:

```css
.react-mute-button-basic {
  position: relative;
}

.react-mute-button-basic video {
  width: 100%;
}

.react-mute-button-basic-button {
  padding-block: 8px;
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  color: black;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 9999px;
  padding-inline: 20px;
  cursor: pointer;
}
```

React CSS files typically don't need data-attribute selectors since the `render` prop handles state-based rendering. Include them only when CSS state reflection is used.

## State Reflection Patterns

### HTML: Data attribute selectors

Components expose state via `data-*` attributes. CSS toggles visibility:

```css
/* Hide all by default */
.html-play-button-basic-button .show-when-paused { display: none; }
.html-play-button-basic-button .show-when-playing { display: none; }

/* Show based on state */
.html-play-button-basic-button[data-paused] .show-when-paused { display: inline; }
.html-play-button-basic-button:not([data-paused]) .show-when-playing { display: inline; }
```

For multi-value attributes (e.g., `data-volume-level`):

```css
.html-mute-button-volume-levels-button .level-off,
.html-mute-button-volume-levels-button .level-low,
.html-mute-button-volume-levels-button .level-medium,
.html-mute-button-volume-levels-button .level-high {
  display: none;
}

.html-mute-button-volume-levels-button[data-volume-level="off"] .level-off { display: inline; }
.html-mute-button-volume-levels-button[data-volume-level="low"] .level-low { display: inline; }
```

### React: Render prop

```tsx
<MuteButton
  render={(props, state) => (
    <button {...props}>
      {state.volumeLevel === 'off'
        ? 'Off'
        : state.volumeLevel === 'low'
          ? 'Low'
          : state.volumeLevel === 'medium'
            ? 'Medium'
            : 'High'}
    </button>
  )}
/>
```

### Three-state pattern (Play/Pause/Replay)

HTML uses `:not()` combinators to handle mutually exclusive states:

```css
.html-play-button-basic-button[data-paused]:not([data-ended]) .show-when-paused { display: inline; }
.html-play-button-basic-button:not([data-paused]) .show-when-playing { display: inline; }
.html-play-button-basic-button[data-ended] .show-when-ended { display: inline; }
```

React uses nested ternary in the render prop:

```tsx
render={(props, state) => (
  <button {...props}>{state.ended ? 'Replay' : state.paused ? 'Play' : 'Pause'}</button>
)}
```

## Video Sources

- **Video**: `https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4`
- **Poster**: `https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/thumbnail.jpg`

## Base Button Styles

All button demos share this base overlay style:

```css
.demo-button {
  padding-block: 8px;
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  color: black;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 9999px;
  padding-inline: 20px;
  cursor: pointer;
}
```
