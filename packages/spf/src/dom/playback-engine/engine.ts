import type { BandwidthState } from '../../core/abr/bandwidth-estimator';
import { calculatePresentationDuration } from '../../core/features/calculate-presentation-duration';
import { switchQuality } from '../../core/features/quality-switching';
import { resolvePresentation } from '../../core/features/resolve-presentation';
import { resolveTrack } from '../../core/features/resolve-track';
import { selectAudioTrack, selectTextTrack, selectVideoTrack } from '../../core/features/select-tracks';
import { syncPreloadAttribute } from '../../core/features/sync-preload-attribute';
import type { ReadonlySignal, Signal } from '../../core/signals/primitives';
import { signal } from '../../core/signals/primitives';
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

/**
 * Configuration for the playback engine.
 */
export interface PlaybackEngineConfig {
  /**
   * Initial bandwidth estimate for cold start (bits per second).
   * Default: 1 Mbps (conservative).
   */
  initialBandwidth?: number;

  /**
   * Preferred audio language (ISO 639 code, e.g., "en", "es").
   * If not specified, selects first audio track.
   */
  preferredAudioLanguage?: string;

  /**
   * Preferred subtitle language (ISO 639 code, e.g., "en", "es").
   * If specified, selects matching text track if available.
   */
  preferredSubtitleLanguage?: string;

  /**
   * Include FORCED subtitle tracks in selection.
   * Default: false (follows hls.js/http-streaming pattern)
   */
  includeForcedTracks?: boolean;

  /**
   * Auto-select DEFAULT track (requires DEFAULT=YES + AUTOSELECT=YES in HLS).
   * Default: false (user opt-in, matches hls.js/http-streaming)
   */
  enableDefaultTrack?: boolean;
}

/**
 * Combined state shape for the playback engine.
 * Includes all state needed by orchestrations.
 */
export interface PlaybackEngineState {
  // Presentation state
  presentation?: any;
  preload?: 'auto' | 'metadata' | 'none';

  // Track selection state
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  // NOTE: Text Tracks (subtitles/ccs) can be unselected
  selectedTextTrackId?: string;

  // Bandwidth estimation state
  bandwidthState?: BandwidthState;

  // ABR control — set to true to suppress automatic quality switching (manual selection mode).
  // TODO: replace with separate manualVideoTrackId / abrVideoTrackId fields so the two
  // concerns don't share a field; see quality-switching.ts for the full design note.
  abrDisabled?: boolean;

  // Current playback position (mirrored from mediaElement via trackCurrentTime)
  currentTime?: number;

  // True once the user has initiated playback (enables segment loading regardless of preload)
  playbackInitiated?: boolean;
}

/**
 * Combined owners shape for the playback engine.
 * Includes all mutable platform objects.
 */
export interface PlaybackEngineOwners {
  // Media element
  mediaElement?: HTMLMediaElement | undefined;

  // MediaSource
  mediaSource?: MediaSource;
  /** Reactive mirror of `mediaSource.readyState` — updated via DOM events. */
  mediaSourceReadyState?: ReadonlySignal<MediaSource['readyState']>;

  // SourceBuffers and their actors (created together by setupSourceBuffer)
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;

  // Text track actors (written by loadTextTrackCues; destroyed by engine on destroy)
  textTracksActor?: TextTracksActor;
  segmentLoaderActor?: TextTrackSegmentLoaderActor;
}

/**
 * Playback engine instance.
 */
export interface PlaybackEngine {
  /**
   * Reactive state signal (for inspection/testing).
   */
  state: Signal<PlaybackEngineState>;

  /**
   * Mutable owners signal (for inspection/testing).
   */
  owners: Signal<PlaybackEngineOwners>;

  /**
   * Cleanup function to destroy all orchestrations.
   */
  destroy: () => void;
}

/**
 * Create a POC playback engine.
 *
 * Wires together all orchestrations to create a reactive playback pipeline:
 * 1. Resolve presentation (multivariant playlist)
 * 2. Select initial video and audio tracks
 * 3. Resolve selected tracks (media playlists)
 * 4. Setup MediaSource
 * 5. Setup SourceBuffers for video and audio
 *
 * Note: This is a POC - does not yet load/append segments.
 *
 * @param config - Playback engine configuration
 * @returns Playback engine instance with state, owners, and destroy function
 *
 * @example
 * const engine = createPlaybackEngine({
 *   initialBandwidth: 2_000_000,
 *   preferredAudioLanguage: 'en',
 * });
 *
 * // Initialize by setting state and owners
 * engine.owners.set({ ...engine.owners.get(), mediaElement: document.querySelector('video') });
 * engine.state.set({
 *   ...engine.state.get(),
 *   presentation: { url: 'https://example.com/playlist.m3u8' },
 *   preload: 'auto',
 * });
 *
 * // Inspect state
 * console.log(engine.state.get());
 *
 * // Cleanup
 * engine.destroy();
 */
export function createPlaybackEngine(config: PlaybackEngineConfig = {}): PlaybackEngine {
  // Create reactive state and owners as signals
  const state = signal<PlaybackEngineState>({
    bandwidthState: {
      fastEstimate: 0,
      fastTotalWeight: 0,
      slowEstimate: 0,
      slowTotalWeight: 0,
      bytesSampled: 0,
    },
  });
  const owners = signal<PlaybackEngineOwners>({});

  // Wire up orchestrations
  const cleanups = [
    // 0a. Sync preload attribute from mediaElement → state.preload
    //     Normalises '' (absent attribute) to 'auto' (browser default).
    syncPreloadAttribute({ state, owners }),

    // 0b. Track media element play event → state.playbackInitiated
    //     Enables preload="none" resolution via native controls / element.play()
    trackPlaybackInitiated({ state, owners }),

    // 1. Resolve presentation (URL already in state)
    resolvePresentation({ state }),

    // 2. Select initial tracks (when presentation loads)
    selectVideoTrack(
      { state },
      {
        type: 'video',
        ...(config.initialBandwidth !== undefined && { initialBandwidth: config.initialBandwidth }),
      }
    ),
    selectAudioTrack(
      { state },
      {
        type: 'audio',
        ...(config.preferredAudioLanguage !== undefined && { preferredAudioLanguage: config.preferredAudioLanguage }),
      }
    ),
    selectTextTrack(
      { state },
      {
        type: 'text',
        ...(config.preferredSubtitleLanguage !== undefined && {
          preferredSubtitleLanguage: config.preferredSubtitleLanguage,
        }),
        ...(config.includeForcedTracks !== undefined && { includeForcedTracks: config.includeForcedTracks }),
        ...(config.enableDefaultTrack !== undefined && { enableDefaultTrack: config.enableDefaultTrack }),
      }
    ),

    // 3. Resolve selected tracks (fetch media playlists)
    resolveTrack({ state }, { type: 'video' as const }),
    resolveTrack({ state }, { type: 'audio' as const }),
    resolveTrack({ state }, { type: 'text' as const }),

    // 3.5. Calculate presentation duration from resolved tracks
    calculatePresentationDuration({ state }),

    // 4. Setup MediaSource (when presentation loaded)
    setupMediaSource({ state, owners }),

    // 4.5. Update MediaSource duration (when presentation duration available)
    updateDuration({ state, owners }),

    // 5. Setup SourceBuffers (when MediaSource ready and all selected tracks resolved)
    // Both SourceBuffers are created in a single synchronous operation to guarantee
    // neither is visible to loadSegments before the other exists — preventing the
    // Firefox bug where appending video data before audio SB is created causes
    // mozHasAudio to be permanently false.
    setupSourceBuffers({ state, owners }),

    // 5.5. Track currentTime from mediaElement (feeds forward buffer management)
    //
    // NOTE: SourceBufferActor wiring is intentionally absent here in Phase 1.
    //
    // Attempting to wire actors into the engine at this layer revealed a
    // brittleness in the current architecture: every patch to `owners` —
    // regardless of which field changed — wakes up ALL combineLatest subscribers
    // (loadSegments, endOfStream, etc.). Storing actor references in owners
    // caused loadSegments to re-evaluate mid-task, store a spurious pending
    // state, and run a second loading cycle on completion.
    //
    // This means any future feature that needs to introduce new reactive state
    // alongside SourceBuffers faces the same hazard. The right fix is for
    // loadSegments (and other orchestrations) to route their MSE operations
    // through the actor directly, at which point the actor lifecycle is
    // co-located with its consumer rather than managed centrally here.
    //
    // Actor wiring will be introduced in Phase 2 as part of the loadSegments
    // refactor. See .claude/plans/spf/buffer-state-shadow-actual-model.md.
    trackCurrentTime({ state, owners }),

    // 5.75. ABR quality switching (reacts to bandwidth samples from loadSegments)
    switchQuality(
      { state },
      config.initialBandwidth !== undefined ? { defaultBandwidth: config.initialBandwidth } : {}
    ),

    // 6. Load segments (when SourceBuffer ready and track resolved)
    loadSegments({ state, owners }, { type: 'video' }),
    loadSegments({ state, owners }, { type: 'audio' }),

    // 6.5. Signal end of stream when all segments loaded
    endOfStream({ state, owners }),

    // 7-8.5. Text track sync: setup, mode sync, and DOM bridge.
    //        Consolidates setupTextTracks, syncTextTrackModes, syncSelectedTextTrackFromDom.
    syncTextTracks({ state, owners }),

    // 9. Load text track cues (when track resolved and mode set)
    loadTextTrackCues({ state, owners }),
  ];

  // Return engine instance
  return {
    state,
    owners,
    destroy: () => {
      cleanups.forEach((cleanup) => (typeof cleanup === 'function' ? cleanup() : cleanup.destroy()));
      // Destroy any actors that orchestrations wrote into owners during their lifetime.
      for (const value of Object.values(owners.get())) {
        if (
          value !== null &&
          typeof value === 'object' &&
          typeof (value as { destroy?: unknown }).destroy === 'function'
        ) {
          (value as { destroy(): void }).destroy();
        }
      }
      destroyVttParser();
    },
  };
}
