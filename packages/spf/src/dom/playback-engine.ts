import { createEventStream } from '../core/events/create-event-stream';
import { resolvePresentation } from '../core/features/resolve-presentation';
import { resolveTrack } from '../core/features/resolve-track';
import { selectAudioTrack, selectVideoTrack } from '../core/features/select-tracks';
import { createState } from '../core/state/create-state';
import { setupMediaSource } from './features/setup-mediasource';
import { setupSourceBuffer } from './features/setup-sourcebuffer';

/**
 * Configuration for the playback engine.
 */
export interface PlaybackEngineConfig {
  /**
   * HLS playlist URL to load.
   */
  url: string;

  /**
   * HTMLMediaElement to attach MediaSource to.
   */
  mediaElement: HTMLMediaElement;

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
}

/**
 * Combined state shape for the playback engine.
 * Includes all state needed by orchestrations.
 */
export interface PlaybackEngineState {
  // Presentation state
  presentation?: any;

  // Track selection state
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  selectedTextTrackId?: string;
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
 *   url: 'https://example.com/playlist.m3u8',
 *   mediaElement: document.querySelector('video'),
 *   initialBandwidth: 2_000_000,
 *   preferredAudioLanguage: 'en',
 * });
 *
 * // Inspect state
 * console.log(engine.state.current);
 *
 * // Cleanup
 * engine.destroy();
 */
export function createPlaybackEngine(config: PlaybackEngineConfig): PlaybackEngine {
  // Create reactive state and owners
  const state = createState<PlaybackEngineState>({
    presentation: { url: config.url } as any,
  });
  const owners = createState<PlaybackEngineOwners>({
    mediaElement: config.mediaElement,
  });

  // Create event streams for orchestrations
  const presentationEvents = createEventStream<{ type: 'play' } | { type: 'pause' } | { type: 'load'; url: string }>();
  const videoTrackEvents = createEventStream<{ type: 'play' } | { type: 'pause' }>();
  const audioTrackEvents = createEventStream<{ type: 'play' } | { type: 'pause' }>();
  const trackSelectionEvents = createEventStream<{ type: 'presentation-loaded' }>();

  // Wire up orchestrations
  const cleanups = [
    // 1. Resolve presentation (URL already in state)
    resolvePresentation({ state, events: presentationEvents }),

    // 2. Select initial tracks (when presentation loads)
    selectVideoTrack(
      { state, owners: owners as any, events: trackSelectionEvents },
      {
        type: 'video',
        ...(config.initialBandwidth !== undefined && { initialBandwidth: config.initialBandwidth }),
      }
    ),
    selectAudioTrack(
      { state, owners: owners as any, events: trackSelectionEvents },
      {
        type: 'audio',
        ...(config.preferredAudioLanguage !== undefined && { preferredAudioLanguage: config.preferredAudioLanguage }),
      }
    ),

    // 3. Resolve selected tracks (fetch media playlists)
    resolveTrack({ state, events: videoTrackEvents }, { type: 'video' as const }),
    resolveTrack({ state, events: audioTrackEvents }, { type: 'audio' as const }),

    // 4. Setup MediaSource (when presentation loaded)
    setupMediaSource({ state, owners }),

    // 5. Setup SourceBuffers (when MediaSource ready and tracks resolved)
    setupSourceBuffer({ state, owners }, { type: 'video' }),
    setupSourceBuffer({ state, owners }, { type: 'audio' }),
  ];

  // Trigger initial presentation load
  presentationEvents.dispatch({ type: 'load', url: config.url });

  // Return engine instance
  return {
    state,
    owners,
    destroy: () => {
      cleanups.forEach((cleanup) => cleanup());
    },
  };
}
