/**
 * The Mux background-video Media over the SPF background-video engine — a
 * muted, looping, chrome-less video from a Mux stream URL.
 *
 * `src` is the whole surface. Capping which rendition is fetched is a Mux URL
 * param (`?max_resolution=720p`) rather than a property here, which keeps the
 * excluded renditions out of the manifest instead of merely unpicked.
 *
 * Shares the engine with `@videojs/spf/background-video` but not the adapter:
 * that one exposes a client-side `maxResolution` and binds no host, so it has
 * no Media to hand an element. Both are the muted-looping case, so a change to
 * one usually belongs in the other.
 *
 * Its host is local and narrow, so this entry carries no `@videojs/media`
 * dependency either.
 */
export type { MuxBackgroundVideoMediaAPI, MuxBackgroundVideoMediaProps } from './adapter';
export {
  MuxBackgroundVideoMediaElement,
  MuxBackgroundVideoMediaMixin,
  muxBackgroundVideoMediaDefaultProps,
} from './adapter';
export { MuxBackgroundVideoMedia } from './media';
