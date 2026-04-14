export { effect } from '../../core/signals/effect';
export type { SpfMediaAPI } from './adapter';
export { SpfMedia, SpfMediaMixin } from './adapter';
export type { PlaybackEngine } from './engine';
export { createPlaybackEngine } from './engine';
// Backwards compatibility — re-export HLS types under the old names.
// TODO: remove once downstream consumers migrate to Hls-prefixed names.
export type {
  HlsPlaybackEngineConfig,
  HlsPlaybackEngineConfig as PlaybackEngineConfig,
  HlsPlaybackEngineOwners,
  HlsPlaybackEngineOwners as PlaybackEngineOwners,
  HlsPlaybackEngineState,
  HlsPlaybackEngineState as PlaybackEngineState,
} from './hls-engine';
export { createHlsPlaybackEngine } from './hls-engine';
