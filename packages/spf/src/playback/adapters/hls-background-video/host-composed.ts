import { autoplayCapability, seekCapability, sourceCapability, volumeCapability } from '@videojs/media';
import { createMediaHost } from '@videojs/media/dom/media-host';

/**
 * EXPLORATION (do not merge as-is): `BackgroundVideoHost` rebuilt from capability descriptors.
 *
 * Granularity finding — the hand-rolled host exposes exactly four properties (`loop`, `muted`, `autoplay`,
 * `preload`), but capabilities are contract-sized: `loop` arrives inside seek (with `currentTime`, `duration`,
 * `seeking`), `muted` inside volume (with `volume`, `defaultMuted`), `preload` inside source (with `src`,
 * `currentSrc`, `readyState`, `crossOrigin`, `load()`, `canPlayType()`). The closest composition therefore carries
 * fourteen members the background player never reads, plus `MediaHostBase`'s event mirroring and media-component
 * registry in place of a bare `EventTarget` — and it puts `@videojs/media` back into an entry whose pitch is being
 * free of it.
 */
export const BackgroundVideoHostComposed = createMediaHost([
  seekCapability,
  volumeCapability,
  autoplayCapability,
  sourceCapability,
] as const);
