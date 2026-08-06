/**
 * The Media over the audio-only HLS engine. Sibling of
 * `@videojs/spf/simple-hls`; see that entry point for why the Medias ship
 * separately from `@videojs/spf/hls`.
 */
export type { SimpleHlsAudioOnlyMediaAPI, SimpleHlsAudioOnlyMediaProps } from './adapter';
export {
  SimpleHlsAudioOnlyMediaElement,
  SimpleHlsAudioOnlyMediaMixin,
  simpleHlsAudioOnlyMediaDefaultProps,
} from './adapter';
export { SimpleHlsAudioOnlyMedia } from './media';
