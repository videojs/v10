/**
 * The Media over the audio-only HLS engine. Sibling of
 * `@videojs/spf/hls-video`; see that entry point for why the Medias ship
 * separately from `@videojs/spf/hls`.
 */
export type { HlsAudioMediaAPI, HlsAudioMediaProps } from './adapter';
export {
  HlsAudioMediaElement,
  HlsAudioMediaMixin,
  hlsAudioMediaDefaultProps,
} from './adapter';
export { HlsAudioMedia } from './media';
