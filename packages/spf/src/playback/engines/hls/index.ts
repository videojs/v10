// HLS media-playlist metadata, including `playlistType` ('VOD' | 'EVENT'). Lets
// consumers distinguish an EVENT / DVR source from sliding-window live directly
// from the manifest, rather than inferring it from the seekable window size.
export type { MediaPlaylistMetadata } from '../../../media/types';
export { getMediaPlaylistMetadata } from '../../../media/types';
// Non-zero-PTS relocation (spike): the reduce-seam type + Tier-1 default, for a
// consumer swapping the tier policy via `config.deriveStartMediaTime`.
export {
  type DeriveStartMediaTime,
  derivePerTypeStartMediaTime,
} from '../../behaviors/establish-start-media-time';
export type { SimpleHlsMediaAPI, SimpleHlsMediaProps } from './adapter';
export { SimpleHlsMediaElement, SimpleHlsMediaMixin, simpleHlsMediaDefaultProps } from './adapter';
export type { SimpleHlsAudioOnlyMediaAPI, SimpleHlsAudioOnlyMediaProps } from './adapter-audio-only';
export {
  SimpleHlsAudioOnlyMediaElement,
  SimpleHlsAudioOnlyMediaMixin,
  simpleHlsAudioOnlyMediaDefaultProps,
} from './adapter-audio-only';
export type {
  SimpleHlsEngineConfig,
  SimpleHlsEngineContext,
  SimpleHlsEngineSignals,
  SimpleHlsEngineState,
} from './engine';
export { createSimpleHlsEngine } from './engine';
export type {
  SimpleHlsAudioOnlyEngineConfig,
  SimpleHlsAudioOnlyEngineContext,
  SimpleHlsAudioOnlyEngineSignals,
  SimpleHlsAudioOnlyEngineState,
} from './engine-audio-only';
export { createHlsAudioOnlyEngine } from './engine-audio-only';
