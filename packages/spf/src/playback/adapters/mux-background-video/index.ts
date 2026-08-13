/**
 * The Mux-flavored name for `@videojs/spf/hls-background-video` — a muted,
 * looping, chrome-less video from a Mux stream URL.
 *
 * An alias, not a variant: every export below is the same class or value that
 * entry exposes, renamed. There is no Mux identity to carry, because there is no
 * Mux input to take — `src` is an HLS URL, and capping which rendition is fetched
 * is a param on it (`?max_resolution=720p`) rather than a property. Playback-ID
 * identity, poster, and storyboard belong to `@videojs/spf/mux-video`; none of
 * them mean anything without controls to hang them on.
 *
 * So the import path is a naming choice and nothing more. Kept because
 * `<mux-background-video>` is what the standalone package this replaces was
 * called, and because a Mux-shaped app reads better importing a Mux-shaped name.
 */
export type {
  HlsBackgroundVideoMediaAPI as MuxBackgroundVideoMediaAPI,
  HlsBackgroundVideoMediaProps as MuxBackgroundVideoMediaProps,
} from '../hls-background-video/adapter';
export {
  HlsBackgroundVideoMediaElement as MuxBackgroundVideoMediaElement,
  HlsBackgroundVideoMediaMixin as MuxBackgroundVideoMediaMixin,
  hlsBackgroundVideoMediaDefaultProps as muxBackgroundVideoMediaDefaultProps,
} from '../hls-background-video/adapter';
export { HlsBackgroundVideoMedia as MuxBackgroundVideoMedia } from '../hls-background-video/media';
