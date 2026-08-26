/**
 * The Media over the background-video engine — SPF's public playback surface for the muted, looping, chrome-less case,
 * from an HLS URL.
 *
 * `src` is the whole input surface and `error` the one output; selection pins the largest rendition that fits the
 * screen and holds it for the session. Narrowing further is a delivery concern rather than a property here — a Mux
 * stream URL's `?max_resolution=720p`, for one, keeps the renditions it excludes out of the manifest instead of merely
 * unpicked.
 *
 * Separate from `@videojs/spf/hls`, where the engine itself ships beside the other HLS engines, for the same reason the
 * HLS Medias are: wiring an engine directly shouldn't pull an adapter in with it. Its host is local and narrow, so this
 * entry carries no `@videojs/media` dependency either.
 *
 * `@videojs/spf/mux-background-video` re-exports everything here under Mux-flavored names. Same classes, so the import
 * path is a naming choice and nothing more.
 */
export type { HlsBackgroundVideoMediaAPI, HlsBackgroundVideoMediaProps, HlsVideoMediaError } from './adapter';
export {
  HlsBackgroundVideoMediaElement,
  HlsBackgroundVideoMediaMixin,
  hlsBackgroundVideoMediaDefaultProps,
} from './adapter';
export { HlsBackgroundVideoMedia } from './media';
