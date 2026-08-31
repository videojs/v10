import { autoplayCapability, seekCapability, sourceCapability, volumeCapability } from '@videojs/media';
import { createMediaHost } from '@videojs/media/dom/media-host';

/**
 * EXPLORATION (replaces the hand-rolled host — see #2573): the background-video host built from capability
 * descriptors instead of a bespoke `EventTarget` subclass.
 *
 * The hand-rolled host exposed exactly four properties — `loop`, `muted`, `autoplay`, `preload` — but capabilities
 * are contract-sized, so each arrives with its siblings: `loop` inside seek (with `currentTime`, `duration`,
 * `seeking`), `muted` inside volume (with `volume`, `defaultMuted`), `preload` inside source (with `src`,
 * `currentSrc`, `readyState`, `crossOrigin`, `load()`, `canPlayType()`). This is the smallest composition covering
 * the four, and it therefore carries fourteen members the background player never reads, `MediaHostBase`'s event
 * mirroring and media-component registry in place of a bare `EventTarget`, and a `@videojs/media` dependency in an
 * entry that was deliberately free of one (measured: +650 B brotli on the entry). A member-pick or finer-grained
 * descriptor form is what would close that gap.
 */
export const BackgroundVideoHost = createMediaHost([
  seekCapability,
  volumeCapability,
  autoplayCapability,
  sourceCapability,
] as const);
