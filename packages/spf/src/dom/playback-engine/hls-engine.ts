import { type Composition, createComposition } from '../../core/composition/engine';
import type { ReadonlySignal, Signal } from '../../core/signals/primitives';
import type { BandwidthState } from '../../media/abr/bandwidth-estimator';
import { calculatePresentationDuration } from '../../media/features/calculate-presentation-duration';
import { switchQuality } from '../../media/features/quality-switching';
import { resolvePresentation } from '../../media/features/resolve-presentation';
import { resolveTrack } from '../../media/features/resolve-track';
import { selectAudioTrack, selectTextTrack, selectVideoTrack } from '../../media/features/select-tracks';
import { syncPreloadAttribute } from '../../media/features/sync-preload-attribute';
import { endOfStream } from '../features/end-of-stream';
import { loadSegments } from '../features/load-segments';
import { loadTextTrackCues } from '../features/load-text-track-cues';
import { setupMediaSource } from '../features/setup-mediasource';
import { setupSourceBuffers } from '../features/setup-sourcebuffer';
import { syncTextTracks } from '../features/sync-text-tracks';
import type { TextTrackSegmentLoaderActor } from '../features/text-track-segment-loader-actor';
import type { TextTracksActor } from '../features/text-tracks-actor';
import { trackCurrentTime } from '../features/track-current-time';
import { trackPlaybackInitiated } from '../features/track-playback-initiated';
import { updateDuration } from '../features/update-duration';
import type { SourceBufferActor } from '../media/source-buffer-actor';
import { destroyVttParser } from '../text/parse-vtt-segment';

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
export interface HlsPlaybackEngineState {
  // `any` is intentional: the presentation field transitions from unresolved
  // ({ url: string }) to resolved (Presentation) at runtime. Individual behaviors
  // declare narrower constraints and narrow the type themselves. Using a union
  // here would break Signal invariance against the behavior interfaces.
  presentation?: any;
  preload?: 'auto' | 'metadata' | 'none';
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  selectedTextTrackId?: string;
  bandwidthState?: BandwidthState;
  abrDisabled?: boolean;
  currentTime?: number;
  playbackInitiated?: boolean;
}

/**
 * Owners shape for the HLS playback engine.
 *
 * Platform objects and actor references managed by HLS behaviors.
 */
export interface HlsPlaybackEngineOwners {
  mediaElement?: HTMLMediaElement | undefined;
  mediaSource?: MediaSource;
  mediaSourceReadyState?: ReadonlySignal<MediaSource['readyState']>;
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
export interface HlsPlaybackEngineConfig {
  initialBandwidth?: number;
  preferredAudioLanguage?: string;
  preferredSubtitleLanguage?: string;
  includeForcedTracks?: boolean;
  enableDefaultTrack?: boolean;
}

/** Shorthand for the deps shape used by HLS engine behaviors. */
type Deps = {
  state: Signal<HlsPlaybackEngineState>;
  owners: Signal<HlsPlaybackEngineOwners>;
  config: HlsPlaybackEngineConfig;
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
 * const engine = createHlsPlaybackEngine({
 *   initialBandwidth: 2_000_000,
 *   preferredAudioLanguage: 'en',
 * });
 *
 * engine.owners.set({ ...engine.owners.get(), mediaElement: videoEl });
 * engine.state.set({ ...engine.state.get(), presentation: { url: 'https://example.com/stream.m3u8' } });
 *
 * videoEl.play();
 *
 * await engine.destroy();
 * ```
 */
export function createHlsPlaybackEngine(
  config: HlsPlaybackEngineConfig = {}
): Composition<HlsPlaybackEngineState, HlsPlaybackEngineOwners> {
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
      loadTextTrackCues,

      // Module-level VTT parser cleanup
      // TODO: this should be owned by loadTextTrackCues
      () => destroyVttParser(),
    ],
    {
      config,
      initialState: {
        bandwidthState: {
          fastEstimate: 0,
          fastTotalWeight: 0,
          slowEstimate: 0,
          slowTotalWeight: 0,
          bytesSampled: 0,
        },
      } as HlsPlaybackEngineState,
      initialOwners: {} as HlsPlaybackEngineOwners,
    }
  );
}
