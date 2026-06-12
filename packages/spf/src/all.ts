/**
 * All SPF exports (public + internal) for bundle size measurement.
 *
 * This file exports everything implemented in SPF, including internal APIs.
 * Use this for accurate bundle size measurements during development.
 *
 * For the public API, import from './index' instead.
 */

// Re-export everything from public API
export * from './index';

// =============================================================================
// HLS Parsing (P1, P2, P3)
// =============================================================================

export { parseMediaPlaylist } from './media/hls/parse-media-playlist';
export { parseMultivariantPlaylist } from './media/hls/parse-multivariant';
export { resolveUrl } from './media/hls/resolve-url';

// =============================================================================
// ABR (P6, P7)
// =============================================================================

export type { QualityConfig } from './media/abr/quality-selection';
export { DEFAULT_QUALITY_CONFIG, selectQuality } from './media/abr/quality-selection';
export type {
  BandwidthConfig,
  BandwidthState,
} from './network/bandwidth-estimator';
export {
  DEFAULT_BANDWIDTH_CONFIG,
  getBandwidthEstimate,
  hasGoodEstimate,
  sampleBandwidth,
} from './network/bandwidth-estimator';

// =============================================================================
// Buffer Management (P8, P9)
// =============================================================================

export type { BackBufferConfig } from './media/buffer/back-buffer';
export { calculateBackBufferFlushPoint, DEFAULT_BACK_BUFFER_CONFIG } from './media/buffer/back-buffer';
export type { ForwardBufferConfig } from './media/buffer/forward-buffer';
export { DEFAULT_FORWARD_BUFFER_CONFIG, getSegmentsToLoad } from './media/buffer/forward-buffer';

// =============================================================================
// Types (P15)
// =============================================================================

export type {
  AudioTrack,
  FrameRate,
  MaybeResolvedPresentation,
  MediaElementLike,
  PartiallyResolvedAudioTrack,
  PartiallyResolvedTextTrack,
  PartiallyResolvedTrack,
  PartiallyResolvedVideoTrack,
  Presentation,
  Segment,
  SelectionSet,
  TextTrack,
  Track,
  VideoTrack,
} from './media/types';
export { hasPresentationDuration, isResolvedPresentation, isResolvedTrack } from './media/types';

// =============================================================================
// DOM APIs (P4, P12, P16)
// =============================================================================

export type {
  AttachMediaSourceResult,
  CreateMediaSourceOptions,
} from './media/dom/mse/mediasource-setup';
export {
  attachMediaSource,
  createMediaSource,
  createSourceBuffer,
  isCodecSupported,
  supportsManagedMediaSource,
  supportsMediaSource,
} from './media/dom/mse/mediasource-setup';
export type { ResponseLike } from './network/fetch';
export { fetchResolvable, getResponseText } from './network/fetch';

// =============================================================================
// Features (F1)
// =============================================================================

export type {
  ParsePresentation,
  PresentationState,
  ResolvePresentationConfig,
} from './playback/behaviors/resolve-presentation';
export { resolvePresentation } from './playback/behaviors/resolve-presentation';
export { syncPreload } from './playback/behaviors/sync-preload';

// =============================================================================
// Features — Track Switching (video ABR + audio language selection)
// =============================================================================

export type { SwitchVideoTrackConfig, TrackSwitchingState } from './playback/behaviors/track-switching';
export { DEFAULT_INITIAL_BANDWIDTH, switchAudioTrack, switchVideoTrack } from './playback/behaviors/track-switching';
