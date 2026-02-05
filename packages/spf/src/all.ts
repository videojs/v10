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
// State Management (O1)
// =============================================================================

export type {
  SelectorListener,
  SelectorOptions,
  State,
  StateConfig,
  StateListener,
  StateSelector,
  WritableState,
} from './core/state/create-state';
export { createState, isState } from './core/state/create-state';

// =============================================================================
// HLS Parsing (P1, P2, P3)
// =============================================================================

export { parseMediaPlaylist } from './core/hls/parse-media-playlist';
export { parseMultivariantPlaylist } from './core/hls/parse-multivariant';
export { resolveUrl } from './core/hls/resolve-url';

// =============================================================================
// ABR (P6, P7)
// =============================================================================

export type {
  BandwidthEstimate,
  BandwidthEstimator,
  BandwidthSample,
} from './core/abr/bandwidth-estimator';
export { createBandwidthEstimator } from './core/abr/bandwidth-estimator';
export type {
  QualitySelectionOptions,
  QualitySelectionResult,
} from './core/abr/quality-selection';
export { selectQuality } from './core/abr/quality-selection';

// =============================================================================
// Buffer Management (P8, P9)
// =============================================================================

export type {
  BackBufferConfig,
  BackBufferResult,
} from './core/buffer/back-buffer';
export { calculateBackBuffer } from './core/buffer/back-buffer';
export type {
  ForwardBufferConfig,
  ForwardBufferResult,
} from './core/buffer/forward-buffer';
export { calculateForwardBuffer } from './core/buffer/forward-buffer';

// =============================================================================
// Types (P15)
// =============================================================================

export type {
  AudioTrack,
  CmafTrack,
  FrameRate,
  MediaInitialization,
  Presentation,
  Segment,
  SegmentIdentity,
  SelectionSet,
  SelectionStrategy,
  TextTrack,
  Track,
  UnresolvedAudioTrack,
  UnresolvedTextTrack,
  UnresolvedTrack,
  UnresolvedVideoTrack,
  VideoTrack,
} from './core/types';
export { hasPresentationDuration, isResolvedTrack } from './core/types';

// =============================================================================
// DOM APIs (P4, P12, P16)
// =============================================================================

export type {
  MediaSourceConfig,
  MediaSourceSetup,
  SourceBufferConfig,
} from './dom/media/mediasource-setup';
export { setupMediaSource } from './dom/media/mediasource-setup';
export type { FetchOptions, FetchResult } from './dom/network/fetch';
export { fetchResource } from './dom/network/fetch';
export type { PreloadState } from './dom/utils/preload';
export { readPreloadState } from './dom/utils/preload';
