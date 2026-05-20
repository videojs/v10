import type Hls from 'hls.js';

/** HLS playlist `EXT-X-PLAYLIST-TYPE` values. */
export type HlsPlaylistTypes = 'VOD' | 'EVENT' | null | undefined;

/** Minimal host exposing an `Hls` engine instance and its render target. */
export interface HlsEngineHost extends EventTarget {
  /** Active hls.js engine, or `null` when not attached. */
  readonly engine?: Hls | null;
  /** Render target (typically the `<video>` element). */
  readonly target?: HTMLMediaElement | null;
}
