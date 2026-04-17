export { effect } from '../../core/signals/effect';
export type { SpfMediaAPI } from './adapter';
export { SpfMedia, SpfMediaMixin } from './adapter';
export type { Behavior, Behavior as Feature, Composition, Composition as PlaybackEngine } from './engine';
export { createComposition, createComposition as createPlaybackEngine } from './engine';
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
