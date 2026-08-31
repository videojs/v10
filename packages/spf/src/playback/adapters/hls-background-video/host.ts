import { autoplayCapability, seekCapability, sourceCapability } from '@videojs/media';
import { createMediaHost } from '@videojs/media/dom/media-host';

/**
 * EXPLORATION (replaces the hand-rolled host — see #2573): the background-video host built from capability
 * descriptors instead of a bespoke `EventTarget` subclass.
 *
 * No volume capability: background video is video-only by design — the engine composes no audio, and `muted` on the
 * element is the autoplay-policy workaround the adapter writes directly onto the target during `attach` (alongside
 * `loop`, `autoplay`, `preload`). The hand-rolled host exposed `muted` only as read-back of that element state, and
 * nothing consumes it, so the media API drops it — a worked example of "aren't ever" API subtraction.
 *
 * The remaining granularity cost stands: capabilities are contract-sized, so `loop` arrives inside seek (with
 * `currentTime`, `duration`, `seeking`) and `preload` inside source (with `src`, `currentSrc`, `readyState`,
 * `crossOrigin`, `load()`, `canPlayType()`), plus `MediaHostBase`'s event mirroring and media-component registry in
 * place of a bare `EventTarget`, and a `@videojs/media` dependency this entry used to avoid. A member-pick or
 * finer-grained descriptor form is what would close that gap — and the same "fixed by attach, read by nobody" logic
 * that removed volume arguably applies to the `loop`/`autoplay`/`preload` read-backs too.
 */
export const BackgroundVideoHost = createMediaHost([
  seekCapability,
  autoplayCapability,
  sourceCapability,
] as const);
