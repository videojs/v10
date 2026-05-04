import {
  type Composition,
  type ContextSignals,
  createComposition,
  type StateSignals,
} from '../../../core/composition/create-composition';
import type { BandwidthState } from '../../../media/abr/bandwidth-estimator';
import { resolveVttSegment } from '../../../media/dom/text/resolve-vtt-segment';
import type { MaybeResolvedPresentation } from '../../../media/types';
import type { SourceBufferActor } from '../../actors/dom/source-buffer';
import type { TextTracksActor } from '../../actors/dom/text-tracks';
import type { TextTrackSegmentLoaderActor, TextTrackSegmentResolver } from '../../actors/text-track-segment-loader';
import { calculatePresentationDuration } from '../../behaviors/calculate-presentation-duration';
import { endOfStream } from '../../behaviors/dom/end-of-stream';
import { loadSegments } from '../../behaviors/dom/load-segments';
import { setupMediaSource } from '../../behaviors/dom/setup-mediasource';
import { setupSourceBuffers } from '../../behaviors/dom/setup-sourcebuffer';
import { setupTextTrackActors } from '../../behaviors/dom/setup-text-track-actors';
import { syncTextTracks } from '../../behaviors/dom/sync-text-tracks';
import { trackCurrentTime } from '../../behaviors/dom/track-current-time';
import { trackPlaybackInitiated } from '../../behaviors/dom/track-playback-initiated';
import { updateDuration } from '../../behaviors/dom/update-duration';
import { loadTextTrackCues } from '../../behaviors/load-text-track-cues';
import { switchQuality } from '../../behaviors/quality-switching';
import { resolvePresentation } from '../../behaviors/resolve-presentation';
import { resolveTrack } from '../../behaviors/resolve-track';
import { selectAudioTrack, selectTextTrack, selectVideoTrack } from '../../behaviors/select-tracks';
import { syncPreloadAttribute } from '../../behaviors/sync-preload-attribute';

// ============================================================================
// HLS Engine State & Context
// ============================================================================

/**
 * State shape for the HLS playback engine.
 *
 * This is the union of all state required by the behaviors composed into
 * the HLS engine. Each behavior declares its own state interface; this
 * type satisfies all of them.
 */
export interface SimpleHlsEngineState {
  /**
   * The presentation being played. A caller writes `{ url }`;
   * `resolvePresentation` parses the manifest and populates the rest.
   */
  presentation?: MaybeResolvedPresentation;
  preload?: 'auto' | 'metadata' | 'none';
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  selectedTextTrackId?: string;
  bandwidthState?: BandwidthState;
  abrDisabled?: boolean;
  currentTime?: number;
  playbackInitiated?: boolean;
  mediaSourceReadyState?: MediaSource['readyState'];
}

/**
 * Context shape for the HLS playback engine.
 *
 * Platform objects and actor references managed by HLS behaviors.
 */
export interface SimpleHlsEngineContext {
  mediaElement?: HTMLMediaElement | undefined;
  mediaSource?: MediaSource;
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
  textTracksActor?: TextTracksActor;
  segmentLoaderActor?: TextTrackSegmentLoaderActor;
}

/**
 * Configuration for the HLS playback engine.
 *
 * Each option is consumed by the appropriate behavior — the engine itself
 * has no config beyond what its behaviors read.
 */
export interface SimpleHlsEngineConfig {
  initialBandwidth?: number;
  preferredAudioLanguage?: string;
  preferredSubtitleLanguage?: string;
  includeForcedTracks?: boolean;
  enableDefaultTrack?: boolean;
  /**
   * Resolver that turns a text-track segment fetch into VTT cues.
   * Defaults to the DOM-bound `resolveVttSegment` resolver, which uses an
   * offscreen `<track>` element to parse WebVTT.
   */
  resolveTextTrackSegment?: TextTrackSegmentResolver<VTTCue>;
}

/** Shorthand for the deps shape used by HLS engine behaviors. */
type Deps = {
  state: StateSignals<SimpleHlsEngineState>;
  context: ContextSignals<SimpleHlsEngineContext>;
  config: SimpleHlsEngineConfig;
};

// ============================================================================
// Behavior wrappers
//
// All wrappers reshape the engine `config` into a use-case-specific config
// for the underlying behavior — typically by injecting a `type` discriminant
// and forwarding the engine config. Extra engine-config fields beyond what
// each behavior's own config type declares are structurally tolerated.
// ============================================================================

const loadVideoSegments = {
  stateKeys: loadSegments.stateKeys,
  contextKeys: loadSegments.contextKeys,
  setup: ({ config, ...deps }: Deps) => loadSegments.setup({ ...deps, config: { type: 'video', ...config } }),
};

const loadAudioSegments = {
  stateKeys: loadSegments.stateKeys,
  contextKeys: loadSegments.contextKeys,
  setup: ({ config, ...deps }: Deps) => loadSegments.setup({ ...deps, config: { type: 'audio', ...config } }),
};

const resolveVideoTrack = {
  stateKeys: resolveTrack.stateKeys,
  contextKeys: resolveTrack.contextKeys,
  setup: ({ config, ...deps }: Deps) => resolveTrack.setup({ ...deps, config: { type: 'video' as const, ...config } }),
};

const resolveAudioTrack = {
  stateKeys: resolveTrack.stateKeys,
  contextKeys: resolveTrack.contextKeys,
  setup: ({ config, ...deps }: Deps) => resolveTrack.setup({ ...deps, config: { type: 'audio' as const, ...config } }),
};

const resolveTextTrack = {
  stateKeys: resolveTrack.stateKeys,
  contextKeys: resolveTrack.contextKeys,
  setup: ({ config, ...deps }: Deps) => resolveTrack.setup({ ...deps, config: { type: 'text' as const, ...config } }),
};

// ============================================================================
// HLS Playback Engine
// ============================================================================

/**
 * Create an HLS playback engine.
 *
 * Composes SPF behaviors into a reactive pipeline for HLS playback over MSE:
 * manifest resolution, track selection, ABR, segment loading, and
 * end-of-stream coordination.
 *
 * @example
 * ```ts
 * const engine = createSimpleHlsEngine({
 *   initialBandwidth: 2_000_000,
 *   preferredAudioLanguage: 'en',
 * });
 *
 * engine.context.mediaElement.set(videoEl);
 * engine.state.presentation.set({ url: 'https://example.com/stream.m3u8' });
 *
 * videoEl.play();
 *
 * await engine.destroy();
 * ```
 */
export function createSimpleHlsEngine(
  config: SimpleHlsEngineConfig = {}
): Composition<SimpleHlsEngineState, SimpleHlsEngineContext> {
  const finalConfig = {
    ...config,
    resolveTextTrackSegment: config.resolveTextTrackSegment ?? resolveVttSegment,
  };

  return createComposition(
    [
      syncPreloadAttribute,
      trackPlaybackInitiated,
      resolvePresentation,

      // Track selection (reads config for initial preferences)
      selectVideoTrack,
      selectAudioTrack,
      selectTextTrack,

      // Resolve selected tracks (fetch media playlists)
      resolveVideoTrack,
      resolveAudioTrack,
      resolveTextTrack,

      // Presentation duration
      calculatePresentationDuration,

      // MSE setup
      setupMediaSource,
      updateDuration,
      setupSourceBuffers,

      // Playback tracking
      trackCurrentTime,
      switchQuality,

      // Segment loading
      loadVideoSegments,
      loadAudioSegments,

      // End of stream coordination
      endOfStream,

      // Text tracks
      syncTextTracks,
      setupTextTrackActors,
      loadTextTrackCues,
    ],
    {
      config: finalConfig,
      // Seed bandwidthState so switchQuality fires on initial subscribe
      // with the `initialBandwidth` fallback rather than waiting for the
      // first chunk. The empty sample buffer means `getBandwidthEstimate`
      // returns the configured initial bandwidth until real samples land.
      initialState: {
        bandwidthState: {
          fastEstimate: 0,
          fastTotalWeight: 0,
          slowEstimate: 0,
          slowTotalWeight: 0,
          bytesSampled: 0,
        },
      },
    }
  );
}
