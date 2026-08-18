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
// The Medias over these engines are not here: they live behind
// `@videojs/spf/hls-video`, `@videojs/spf/hls-audio`, and
// `@videojs/spf/hls-background-video` so that driving an engine directly doesn't pull
// a Media (and `@videojs/media`) in with it — and so this entry stays the
// engines' own size budget.
export type {
  HlsVideoEngineConfig,
  HlsVideoEngineContext,
  HlsVideoEngineSignals,
  HlsVideoEngineState,
} from './engine';
export { createHlsVideoEngine } from './engine';
export type {
  HlsAudioEngineConfig,
  HlsAudioEngineContext,
  HlsAudioEngineSignals,
  HlsAudioEngineState,
} from './engine-audio-only';
export { createHlsAudioEngine } from './engine-audio-only';
export type {
  BackgroundVideoEngineConfig,
  BackgroundVideoEngineContext,
  BackgroundVideoEngineSignals,
  BackgroundVideoEngineState,
} from './engine-background-video';
export { createBackgroundVideoEngine } from './engine-background-video';
