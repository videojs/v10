import { createEventStream } from '../core/events/create-event-stream';
import { type PresentationAction, resolvePresentation } from '../core/features/resolve-presentation';
import { resolveTrack, type TrackResolutionAction } from '../core/features/resolve-track';
import {
  selectAudioTrack,
  selectTextTrack,
  selectVideoTrack,
  type TrackSelectionAction,
} from '../core/features/select-tracks';
import { createState } from '../core/state/create-state';
import { setupMediaSource } from './features/setup-mediasource';
import { setupSourceBuffer } from './features/setup-sourcebuffer';
import { setupTextTracks } from './features/setup-text-tracks';
import { syncTextTrackModes } from './features/sync-text-track-modes';

/**
 * Union of all action types used by playback engine orchestrations.
 * Includes synthetic @@INITIALIZE@@ event for combineLatest bootstrapping.
 */
export type PlaybackEngineAction =
  | PresentationAction
  | TrackResolutionAction
  | TrackSelectionAction
  | { type: '@@INITIALIZE@@' };

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
  preload?: string;

  // Track selection state
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  // NOTE: Text Tracks (subtitles/ccs) can be unselected
  selectedTextTrackId?: string | undefined;
}

/**
 * Combined owners shape for the playback engine.
 * Includes all mutable platform objects.
 */
export interface PlaybackEngineOwners {
  // Media element
  mediaElement?: HTMLMediaElement;

  // MediaSource
  mediaSource?: MediaSource;

  // SourceBuffers
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;

  // Text tracks (track elements by ID)
  textTracks?: Map<string, HTMLTrackElement>;
}

/**
 * Playback engine instance.
 */
export interface PlaybackEngine {
  /**
   * Reactive state (for inspection/testing).
   */
  state: ReturnType<typeof createState<PlaybackEngineState>>;

  /**
   * Mutable owners (for inspection/testing).
   */
  owners: ReturnType<typeof createState<PlaybackEngineOwners>>;

  /**
   * Shared event stream (for inspection/testing/triggering events).
   */
  events: ReturnType<typeof createEventStream<PlaybackEngineAction>>;

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
 * // Initialize by patching state and owners
 * engine.owners.patch({ mediaElement: document.querySelector('video') });
 * engine.state.patch({
 *   presentation: { url: 'https://example.com/playlist.m3u8' },
 *   preload: 'auto',
 * });
 *
 * // Inspect state
 * console.log(engine.state.current);
 *
 * // Cleanup
 * engine.destroy();
 */
export function createPlaybackEngine(config: PlaybackEngineConfig = {}): PlaybackEngine {
  // Create reactive state and owners (initially empty)
  const state = createState<PlaybackEngineState>({});
  const owners = createState<PlaybackEngineOwners>({});

  // Create single shared event stream for all orchestrations
  const events = createEventStream<PlaybackEngineAction>();

  // Wire up orchestrations (all share single event stream)
  // Note: @ts-expect-error needed due to EventStream invariance - each orchestration expects
  // specific event types, but shared stream has union of all types. Proper fix would
  // require making EventStream covariant or refactoring event system.
  const cleanups = [
    // 1. Resolve presentation (URL already in state)
    // @ts-expect-error - EventStream type variance
    resolvePresentation({ state, events }),

    // 2. Select initial tracks (when presentation loads)
    selectVideoTrack(
      // @ts-expect-error - Owners and EventStream type compatibility
      { state, owners, events },
      {
        type: 'video',
        ...(config.initialBandwidth !== undefined && { initialBandwidth: config.initialBandwidth }),
      }
    ),
    selectAudioTrack(
      // @ts-expect-error - Owners and EventStream type compatibility
      { state, owners, events },
      {
        type: 'audio',
        ...(config.preferredAudioLanguage !== undefined && { preferredAudioLanguage: config.preferredAudioLanguage }),
      }
    ),
    selectTextTrack(
      // @ts-expect-error - Owners and EventStream type compatibility
      { state, owners, events },
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
    // @ts-expect-error - EventStream type variance
    resolveTrack({ state, events }, { type: 'video' as const }),
    // @ts-expect-error - EventStream type variance
    resolveTrack({ state, events }, { type: 'audio' as const }),
    // @ts-expect-error - EventStream type variance
    resolveTrack({ state, events }, { type: 'text' as const }),

    // 4. Setup MediaSource (when presentation loaded)
    setupMediaSource({ state, owners }),

    // 5. Setup SourceBuffers (when MediaSource ready and tracks resolved)
    setupSourceBuffer({ state, owners }, { type: 'video' }),
    setupSourceBuffer({ state, owners }, { type: 'audio' }),

    // 6. Setup text tracks (when mediaElement and presentation ready)
    setupTextTracks({ state, owners }),

    // 7. Sync text track modes (when track selected and track elements created)
    syncTextTrackModes({ state, owners }),
  ];

  // Dispatch synthetic initialize event to satisfy combineLatest
  // (combineLatest waits for all sources to emit before triggering listeners)
  events.dispatch({ type: '@@INITIALIZE@@' });

  // Return engine instance
  return {
    state,
    owners,
    events,
    destroy: () => {
      cleanups.forEach((cleanup) => cleanup());
    },
  };
}
