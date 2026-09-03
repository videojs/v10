# @videojs/mux-data

Mux Data telemetry for Video.js. This package owns the supported `mux-embed` runtime and can monitor native playback,
hls.js, dash.js, and other Video.js Media implementations without installing a playback engine.
It is an extension: it adds behavior to whichever media the player is playing.

## Installation

```bash
pnpm add @videojs/html @videojs/mux-data
# or
pnpm add @videojs/react @videojs/mux-data
```

## Usage

```ts
import '@videojs/html/extensions/mux-data';
```

```tsx
import { MuxDataExtension } from '@videojs/react/extensions/mux-data';
```

Low-level consumers can import the framework-neutral `MuxDataExtension` extension from `@videojs/mux-data`.

## License

[Apache-2.0](../../LICENSE)
