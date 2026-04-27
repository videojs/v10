import { type Composition, createComposition } from '../../../core/composition/create-composition';
import type { Signal } from '../../../core/signals/primitives';
import type { BandwidthState } from '../../../media/abr/bandwidth-estimator';
import { resolveVttSegment } from '../../../media/dom/text/resolve-vtt-segment';
import type { Presentation } from '../../../media/types';
import type { SourceBufferActor } from '../../actors/dom/source-buffer';
import type { TextTracksActor } from '../../actors/dom/text-tracks';
import type { TextTrackSegmentLoaderActor } from '../../actors/text-track-segment-loader';
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
// HLS Engine State & Owners
// ============================================================================

/**
 * State shape for the HLS playback engine.
 *
 * This is the union of all state required by the behaviors composed into
 * the HLS engine. Each behavior declares its own state interface; this
 * type satisfies all of them.
 */
export interface SimpleHlsEngineState {
  /** Input: URL of the manifest to play. The engine watches this slot. */
  presentationUrl?: string;
  /** Output: parsed manifest, written by `resolvePresentation`. */
  presentation?: Presentation;
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
 * Owners shape for the HLS playback engine.
 *
 * Platform objects and actor references managed by HLS behaviors.
 */
export interface SimpleHlsEngineOwners {
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
  state: Signal<SimpleHlsEngineState>;
  owners: Signal<SimpleHlsEngineOwners>;
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

const setupDomTextTrackActors = ({ owners }: Deps) =>
  setupTextTrackActors({ owners, config: { resolveTextTrackSegment: resolveVttSegment } });

// ============================================================================
// Config-aware behavior wrappers
//
// Behaviors that read from engine config get wrappers that thread the
// relevant config fields into the behavior's own config parameter.
// ============================================================================

const selectVideoTrackFromConfig = ({ config, ...deps }: Deps) =>
  selectVideoTrack(deps, {
    type: 'video',
    ...(config.initialBandwidth !== undefined && { initialBandwidth: config.initialBandwidth }),
  });

const selectAudioTrackFromConfig = ({ config, ...deps }: Deps) =>
  selectAudioTrack(deps, {
    type: 'audio',
    ...(config.preferredAudioLanguage !== undefined && {
      preferredAudioLanguage: config.preferredAudioLanguage,
    }),
  });

const selectTextTrackFromConfig = ({ config, ...deps }: Deps) =>
  selectTextTrack(deps, {
    type: 'text',
    ...(config.preferredSubtitleLanguage !== undefined && {
      preferredSubtitleLanguage: config.preferredSubtitleLanguage,
    }),
    ...(config.includeForcedTracks !== undefined && { includeForcedTracks: config.includeForcedTracks }),
    ...(config.enableDefaultTrack !== undefined && { enableDefaultTrack: config.enableDefaultTrack }),
  });

const switchQualityFromConfig = ({ config, ...deps }: Deps) =>
  switchQuality(deps, config.initialBandwidth !== undefined ? { defaultBandwidth: config.initialBandwidth } : {});

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
 * engine.owners.set({ ...engine.owners.get(), mediaElement: videoEl });
 * engine.state.set({ ...engine.state.get(), presentationUrl: 'https://example.com/stream.m3u8' });
 *
 * videoEl.play();
 *
 * await engine.destroy();
 * ```
 */
export function createSimpleHlsEngine(
  config: SimpleHlsEngineConfig = {}
): Composition<SimpleHlsEngineState, SimpleHlsEngineOwners> {
  return createComposition(
    [
      syncPreloadAttribute,
      trackPlaybackInitiated,
      resolvePresentation,

      // Track selection (reads config for initial preferences)
      selectVideoTrackFromConfig,
      selectAudioTrackFromConfig,
      selectTextTrackFromConfig,

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
      switchQualityFromConfig,

      // Segment loading
      loadVideoSegments,
      loadAudioSegments,

      // End of stream coordination
      endOfStream,

      // Text tracks
      syncTextTracks,
      setupDomTextTrackActors,
      loadTextTrackCues,
    ],
    {
      config,
      // The cast is a workaround for a TypeScript inference quirk in the
      // composition list — when every behavior in the array takes typed
      // deps, the inferred state shape collapses and drops fields like
      // `bandwidthState`. Casting reasserts the engine's full state shape.
      // See friction list in docs/hls-engine.md.
      initialState: {
        bandwidthState: {
          fastEstimate: 0,
          fastTotalWeight: 0,
          slowEstimate: 0,
          slowTotalWeight: 0,
          bytesSampled: 0,
        },
      } as SimpleHlsEngineState,
      initialOwners: {},
    }
  );
}
