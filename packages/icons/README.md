# @videojs/icons

SVG icon library for Video.js. Ships optimized icons as **React components** and **HTML strings**, organized into icon sets.

## Icon Sets

Icons are grouped into visual sets. Each set contains the same icon names with different designs.

| Set | Description |
| --- | --- |
| `default` | Standard icon set used by the default skin |
| `minimal` | Simplified icon set used by the minimal skin |

### Available Icons

| Icon | React Export | HTML Export |
| --- | --- | --- |
| `fullscreen-enter` | `FullscreenEnterIcon` | `fullscreenEnterIcon` |
| `fullscreen-exit` | `FullscreenExitIcon` | `fullscreenExitIcon` |
| `pause` | `PauseIcon` | `pauseIcon` |
| `pip-enter` | `PipEnterIcon` | `pipEnterIcon` |
| `pip-exit` | `PipExitIcon` | `pipExitIcon` |
| `play` | `PlayIcon` | `playIcon` |
| `restart` | `RestartIcon` | `restartIcon` |
| `seek` | `SeekIcon` | `seekIcon` |
| `spinner` | `SpinnerIcon` | `spinnerIcon` |
| `volume-high` | `VolumeHighIcon` | `volumeHighIcon` |
| `volume-low` | `VolumeLowIcon` | `volumeLowIcon` |
| `volume-off` | `VolumeOffIcon` | `volumeOffIcon` |

## Usage

### React

Import icons as React components. They accept standard SVG props and support ref forwarding.

```tsx
import { PlayIcon, PauseIcon } from '@videojs/icons/react';

function Controls() {
  return (
    <button>
      <PlayIcon className="icon" aria-hidden="true" />
    </button>
  );
}
```

Import from a specific icon set:

```tsx
import { PlayIcon } from '@videojs/icons/react/minimal';
```

### HTML

Import icons as SVG strings for use in plain HTML or web components.

```ts
import { playIcon, pauseIcon } from '@videojs/icons/html';

button.innerHTML = playIcon;
```

Import from a specific icon set:

```ts
import { playIcon } from '@videojs/icons/html/minimal';
```

## Styling

All icons use `fill="currentColor"`, so they inherit the text color of their parent element. Size and color can be controlled with CSS:

```css
.icon {
  width: 18px;
  height: 18px;
  color: white;
}
```

Icons are designed on an **18×18 grid**. Rendering at `18px` (or exact multiples like `36px`) produces the crispest result. Other sizes may introduce sub-pixel rendering artifacts.

## Adding Icons

1. Add an SVG file to `src/assets/<set>/` (e.g., `src/assets/default/my-icon.svg`).
2. Run `pnpm -F @videojs/icons build`.
3. The build script optimizes the SVG with SVGO and generates React components and HTML string exports.

The build automatically:

- Removes hardcoded `fill`, `stroke`, `clip-rule`, and `fill-rule` attributes.
- Adds `fill="currentColor"` for dynamic styling.
- Preserves the `viewBox` attribute.
- Generates `.js`, `.d.ts`, and `.tsx` files for each icon.

## Adding an Icon Set

Create a new directory under `src/assets/` (e.g., `src/assets/custom/`), add SVG files, and rebuild. The set is automatically available via:

```ts
import { PlayIcon } from '@videojs/icons/react/custom';
import { playIcon } from '@videojs/icons/html/custom';
```

## Development

Running `pnpm -F @videojs/icons dev` starts the build in watch mode. Any changes to `.svg` files under `src/assets/` trigger an automatic rebuild, including new icons and new icon sets — no restart required.

## Scripts

```bash
pnpm -F @videojs/icons build        # Build all icon sets
pnpm -F @videojs/icons dev          # Build and watch for changes
pnpm -F @videojs/icons clean        # Remove build output
```
