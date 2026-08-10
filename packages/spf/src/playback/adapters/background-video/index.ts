/**
 * The Media over the background-video engine — SPF's public playback surface
 * for the muted, looping, chrome-less case.
 *
 * Separate from `@videojs/spf/hls`, where the engine itself ships beside the
 * other HLS engines, for the same reason the HLS Medias are: wiring an engine
 * directly shouldn't pull an adapter in with it.
 *
 * Unlike `SimpleHlsMedia`, there is no host-bound Media class here — nothing
 * consumes one, and binding it to `HTMLVideoElementHost` would give this entry
 * a `@videojs/media` dependency it does not otherwise have.
 * `BackgroundVideoMediaMixin` composes over any base when that changes.
 */
export type { BackgroundVideoMediaAPI, BackgroundVideoMediaProps } from './adapter';
export {
  BackgroundVideoMediaElement,
  BackgroundVideoMediaMixin,
  backgroundVideoMediaDefaultProps,
} from './adapter';
