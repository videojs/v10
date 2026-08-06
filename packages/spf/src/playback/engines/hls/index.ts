// SVTA 2070 error vocabulary — the codes reported on `state.errors` and
// surfaced through the adapter's `error`.
export type { SvtaError } from '../../../media/errors';
export { SVTA_UNSUPPORTED_PLAYBACK_FEATURE, svtaCategory, svtaIndex } from '../../../media/errors';
// HLS media-playlist metadata, including `playlistType` ('VOD' | 'EVENT'). Lets
// consumers distinguish an EVENT / DVR source from sliding-window live directly
// from the manifest, rather than inferring it from the seekable window size.
export type { MediaPlaylistMetadata } from '../../../media/types';
export { getMediaPlaylistMetadata } from '../../../media/types';
// Non-zero-PTS relocation (spike): the coordination seam type + the shared-`min`
// default and the per-type alternative, for a consumer swapping the policy via
// `config.deriveStartMediaTime`.
export {
  type DeriveStartMediaTime,
  derivePerTypeStartMediaTime,
  deriveSharedMinStartMediaTime,
} from '../../behaviors/establish-start-media-time';
export type {
  SimpleHlsMediaAPI,
  SimpleHlsMediaError,
  SimpleHlsMediaProps,
  SimpleHlsMediaStreamType,
} from './adapter';
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
