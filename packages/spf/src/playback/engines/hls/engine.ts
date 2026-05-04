import {
  type Composition,
  type ContextSignals,
  createComposition,
  type StateSignals,
} from '../../../core/composition/create-composition';
import { signal } from '../../../core/signals/primitives';
import type { BandwidthState } from '../../../media/abr/bandwidth-estimator';
import { resolveVttSegment } from '../../../media/dom/text/resolve-vtt-segment';
import type { MaybeResolvedPresentation } from '../../../media/types';
import type { SourceBufferActor } from '../../actors/dom/source-buffer';
import type { TextTracksActor } from '../../actors/dom/text-tracks';
import type { TextTrackSegmentLoaderActor } from '../../actors/text-track-segment-loader';
import { calculatePresentationDuration } from '../../behaviors/calculate-presentation-duration';
import { endOfStream } from '../../behaviors/dom/end-of-stream';
import { loadSegments } from '../../behaviors/dom/load-segments';
import { setupMediaSource } from '../../behaviors/dom/setup-mediasource';
import { setupSourceBuffers } from '../../behaviors/dom/setup-sourcebuffer';
import { setupTextTrackActors as _setupTextTrackActors } from '../../behaviors/dom/setup-text-track-actors';
import { syncTextTracks } from '../../behaviors/dom/sync-text-tracks';
import { trackCurrentTime } from '../../behaviors/dom/track-current-time';
import { trackPlaybackInitiated } from '../../behaviors/dom/track-playback-initiated';
import { updateDuration } from '../../behaviors/dom/update-duration';
import { loadTextTrackCues } from '../../behaviors/load-text-track-cues';
import { switchQuality as _switchQuality } from '../../behaviors/quality-switching';
import { resolvePresentation } from '../../behaviors/resolve-presentation';
import { resolveTrack } from '../../behaviors/resolve-track';
import { selectTextTrack as _selectTextTrack, selectMediaTrack } from '../../behaviors/select-tracks';
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
}

/** Shorthand for the deps shape used by HLS engine behaviors. */
type Deps = {
  state: StateSignals<SimpleHlsEngineState>;
  context: ContextSignals<SimpleHlsEngineContext>;
  config: SimpleHlsEngineConfig;
};

// ============================================================================
// Thin media-type wrappers
//
// Behaviors parameterized by media type get thin wrappers that close over
// the type value, so the engine composition reads as a flat list of
// behaviors without inline config.
// ============================================================================

const loadVideoSegments = (deps: Deps) => loadSegments(deps, { type: 'video' });
const loadAudioSegments = (deps: Deps) => loadSegments(deps, { type: 'audio' });

const resolveVideoTrack = (deps: Deps) => resolveTrack(deps, { type: 'video' as const });
const resolveAudioTrack = (deps: Deps) => resolveTrack(deps, { type: 'audio' as const });
const resolveTextTrack = (deps: Deps) => resolveTrack(deps, { type: 'text' as const });

const setupTextTrackActors = ({ context }: Deps) =>
  _setupTextTrackActors({ context, config: { resolveTextTrackSegment: resolveVttSegment } });

// ============================================================================
// Config-aware behavior wrappers
//
// Behaviors that read from engine config get wrappers that close over the
// media-type discriminant and forward the engine config. Each behavior
// picks out the fields it cares about from its own config type — extra
// fields on the spread are structurally tolerated.
// ============================================================================

const selectVideoTrack = ({ config, ...deps }: Deps) => selectMediaTrack(deps, { type: 'video', ...config });

const selectAudioTrack = ({ config, ...deps }: Deps) => selectMediaTrack(deps, { type: 'audio', ...config });

const selectTextTrack = ({ config, ...deps }: Deps) => _selectTextTrack(deps, { type: 'text', ...config });

const switchQuality = ({ config, ...deps }: Deps) =>
  _switchQuality(deps, { defaultBandwidth: config.initialBandwidth });

// ============================================================================
// Signal-map factories
// ============================================================================

function createStateSignals(): StateSignals<SimpleHlsEngineState> {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(undefined),
    preload: signal<'auto' | 'metadata' | 'none' | undefined>(undefined),
    selectedVideoTrackId: signal<string | undefined>(undefined),
    selectedAudioTrackId: signal<string | undefined>(undefined),
    selectedTextTrackId: signal<string | undefined>(undefined),
    bandwidthState: signal<BandwidthState | undefined>({
      fastEstimate: 0,
      fastTotalWeight: 0,
      slowEstimate: 0,
      slowTotalWeight: 0,
      bytesSampled: 0,
    }),
    abrDisabled: signal<boolean | undefined>(undefined),
    currentTime: signal<number | undefined>(undefined),
    playbackInitiated: signal<boolean | undefined>(undefined),
    mediaSourceReadyState: signal<MediaSource['readyState'] | undefined>(undefined),
  };
}

function createContextSignals(): ContextSignals<SimpleHlsEngineContext> {
  return {
    mediaElement: signal<HTMLMediaElement | undefined>(undefined),
    mediaSource: signal<MediaSource | undefined>(undefined),
    videoBuffer: signal<SourceBuffer | undefined>(undefined),
    audioBuffer: signal<SourceBuffer | undefined>(undefined),
    videoBufferActor: signal<SourceBufferActor | undefined>(undefined),
    audioBufferActor: signal<SourceBufferActor | undefined>(undefined),
    textTracksActor: signal<TextTracksActor | undefined>(undefined),
    segmentLoaderActor: signal<TextTrackSegmentLoaderActor | undefined>(undefined),
  };
}

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
      config,
      state: createStateSignals(),
      context: createContextSignals(),
    }
  );
}
