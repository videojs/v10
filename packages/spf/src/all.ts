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
  BandwidthConfig,
  BandwidthState,
} from './core/abr/bandwidth-estimator';
export {
  DEFAULT_BANDWIDTH_CONFIG,
  getBandwidthEstimate,
  hasGoodEstimate,
  sampleBandwidth,
} from './core/abr/bandwidth-estimator';
export type { QualityConfig } from './core/abr/quality-selection';
export { DEFAULT_QUALITY_CONFIG, selectQuality } from './core/abr/quality-selection';

// =============================================================================
// Buffer Management (P8, P9)
// =============================================================================

export type { BackBufferConfig } from './core/buffer/back-buffer';
export { calculateBackBufferFlushPoint, DEFAULT_BACK_BUFFER_CONFIG } from './core/buffer/back-buffer';
export type { ForwardBufferConfig } from './core/buffer/forward-buffer';
export { DEFAULT_FORWARD_BUFFER_CONFIG, getSegmentsToLoad } from './core/buffer/forward-buffer';

// =============================================================================
// Types (P15)
// =============================================================================

export type {
  AudioTrack,
  FrameRate,
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
} from './core/types';
export { hasPresentationDuration, isResolvedTrack } from './core/types';

// =============================================================================
// DOM APIs (P4, P12, P16)
// =============================================================================

export type {
  AttachMediaSourceResult,
  CreateMediaSourceOptions,
} from './dom/media/mediasource-setup';
export {
  attachMediaSource,
  createMediaSource,
  createSourceBuffer,
  isCodecSupported,
  supportsManagedMediaSource,
  supportsMediaSource,
  waitForSourceOpen,
} from './dom/media/mediasource-setup';
export type { ResponseLike } from './dom/network/fetch';
export { fetchResolvable, getResponseText } from './dom/network/fetch';

// =============================================================================
// Events (F1)
// =============================================================================

export type { EventListener, EventStream } from './core/events/create-event-stream';
export { createEventStream, isEventStream } from './core/events/create-event-stream';

// =============================================================================
// Reactive Composition (F1)
// =============================================================================

export type { InferObservableValues, Observable } from './core/reactive/combine-latest';
export { combineLatest } from './core/reactive/combine-latest';

// =============================================================================
// Features (F1)
// =============================================================================

export type {
  PlatformOwners,
  PresentationAction,
  PresentationState,
  UnresolvedPresentation,
} from './core/features/resolve-presentation';
export {
  canResolve,
  isUnresolved,
  resolvePresentation,
  shouldResolve,
  syncPreloadAttribute,
} from './core/features/resolve-presentation';
