/**
 * The Mux-flavored name for `HlsBackgroundVideo` — the same component, not a
 * wrapper. Kept because `MuxBackgroundVideo` is what the standalone package this
 * replaces exported.
 *
 * There is no Mux identity to add, because there is no Mux input to take: `src` is
 * an HLS URL, and capping which rendition is fetched is a param on it rather than
 * a prop. `../hls-background-video` carries the whole surface, including the
 * `Props` namespace member the alias inherits with it.
 */
export {
  HlsBackgroundVideo as MuxBackgroundVideo,
  type HlsBackgroundVideoProps as MuxBackgroundVideoProps,
} from '../hls-background-video';
