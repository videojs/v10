import {
  type Composition,
  type ContextSignals,
  createComposition,
  type StateSignals,
} from '../../../core/composition/create-composition';
import { makeShareSignals, type ShareSignalsConfig } from '../../../core/composition/share-signals';
import type { BackBufferConfig } from '../../../media/buffer/back-buffer';
import type { ForwardBufferConfig } from '../../../media/buffer/forward-buffer';
import { parseMultivariantPlaylist } from '../../../media/hls/parse-multivariant';
import type { AudioTrack, MaybeResolvedPresentation } from '../../../media/types';
import { getResolvedSelectedTrackDuration } from '../../../media/utils/track-selection';
import type { SegmentLoaderActor } from '../../actors/dom/segment-loader';
import type { SourceBufferActor } from '../../actors/dom/source-buffer';
import {
  calculatePresentationDuration,
  type PresentationDurationResolver,
} from '../../behaviors/calculate-presentation-duration';
import { endOfStream } from '../../behaviors/dom/end-of-stream';
import { loadAudioSegments } from '../../behaviors/dom/load-segments';
import { setupAudioBufferActors } from '../../behaviors/dom/setup-buffer-actors';
import { setupMediaSource } from '../../behaviors/dom/setup-mediasource';
import { trackCurrentTime } from '../../behaviors/dom/track-current-time';
import { trackLoadTriggers } from '../../behaviors/dom/track-load-triggers';
import { updateMediaSourceDuration } from '../../behaviors/dom/update-mediasource-duration';
import { type ParsePresentation, resolvePresentation } from '../../behaviors/resolve-presentation';
import { resolveAudioTrack } from '../../behaviors/resolve-track';
import { syncPreload } from '../../behaviors/sync-preload';
import { switchAudioTrack } from '../../behaviors/track-switching';

// ============================================================================
// Audio-Only HLS Engine State & Context
// ============================================================================

/**
 * State shape for the audio-only HLS playback engine.
 *
 * Subset of `SimpleHlsEngineState` covering only the slots written and read
 * by audio-side behaviors. Video and text-track slots are absent —
 * subtractive composition removes the behaviors that declare them.
 */
export interface SimpleHlsAudioOnlyEngineState {
  presentation?: MaybeResolvedPresentation;
  preload?: 'auto' | 'metadata' | 'none';
  selectedAudioTrackId?: string;
  /**
   * Consumer-driven constraint narrowing the audio candidate set. Sibling
   * of `userVideoTrackSelection` in the default engine. Partial-track
   * shape — `{ language: 'es' }`, `{ id: 'audio-en' }`, etc.
   * `selectAudioTrack` reads this and re-picks when it changes.
   * Multi-language-audio Tier 2 programmatic-write path.
   */
  userAudioTrackSelection?: Partial<AudioTrack>;
  currentTime?: number;
  loadActivated?: boolean;
}

/**
 * Context shape for the audio-only HLS playback engine.
 *
 * Subset of `SimpleHlsEngineContext` covering only the platform objects and
 * actor refs managed by audio-side behaviors.
 */
export interface SimpleHlsAudioOnlyEngineContext {
  mediaElement?: HTMLMediaElement | undefined;
  mediaSource?: MediaSource;
  audioBufferActor?: SourceBufferActor;
  audioSegmentLoaderActor?: SegmentLoaderActor;
}

export type SimpleHlsAudioOnlyEngineSignals = {
  state: StateSignals<SimpleHlsAudioOnlyEngineState>;
  context: ContextSignals<SimpleHlsAudioOnlyEngineContext>;
};

/**
 * Configuration for the audio-only HLS playback engine.
 *
 * Subset of `SimpleHlsEngineConfig` — video-quality, bandwidth-estimator,
 * and text-track config fields are omitted (no behavior consumes them).
 */
export interface SimpleHlsAudioOnlyEngineConfig
  extends ShareSignalsConfig<SimpleHlsAudioOnlyEngineState, SimpleHlsAudioOnlyEngineContext> {
  preferredAudioLanguage?: string;
  resolveDuration?: PresentationDurationResolver;
  parsePresentation?: ParsePresentation;
  forwardBuffer?: Partial<ForwardBufferConfig>;
  backBuffer?: Partial<BackBufferConfig>;
}

// ============================================================================
// Audio-Only HLS Playback Engine
// ============================================================================

// Materializes the consumer-input slot `userAudioTrackSelection` (only read by
// switchAudioTrack, produced by no behavior) in addition to forwarding refs.
const shareSignals = makeShareSignals<SimpleHlsAudioOnlyEngineState, SimpleHlsAudioOnlyEngineContext>([
  'userAudioTrackSelection',
]);

/**
 * Create an audio-only HLS playback engine.
 *
 * Subtractive composition variant of `createSimpleHlsEngine`: omits
 * video-side behaviors (`resolveVideoTrack`, `switchVideoTrack`,
 * `setupVideoBufferActors`, `loadVideoSegments`) and text-track behaviors
 * (`selectTextTrack`, `resolveTextTrack`, `syncTextTracks`,
 * `setupTextTrackActors`, `loadTextTrackSegments`). The remaining audio
 * pipeline composes unchanged.
 *
 * Handles both truly audio-only HLS sources (no video stream-inf) and
 * mixed-AV HLS sources where the audio rendition is selected and video /
 * subtitle renditions are ignored at composition time. The variant decision
 * is encoded by adapter choice; this engine does not branch on source
 * shape.
 *
 * @example
 * ```ts
 * let signals: SimpleHlsAudioOnlyEngineSignals;
 * const engine = createHlsAudioOnlyEngine({
 *   preferredAudioLanguage: 'en',
 *   onSignalsReady: (refs) => {
 *     signals = refs;
 *   },
 * });
 *
 * signals.context.mediaElement.set(audioEl);
 * signals.state.presentation.set({ url: 'https://example.com/stream.m3u8' });
 * ```
 */
export function createHlsAudioOnlyEngine(
  config: SimpleHlsAudioOnlyEngineConfig = {}
): Composition<SimpleHlsAudioOnlyEngineState, SimpleHlsAudioOnlyEngineContext> {
  const finalConfig = {
    ...config,
    resolveDuration: config.resolveDuration ?? getResolvedSelectedTrackDuration,
    parsePresentation: config.parsePresentation ?? parseMultivariantPlaylist,
  };

  return createComposition(
    [
      syncPreload,
      trackLoadTriggers,
      resolvePresentation,

      // Audio track selection — slot owner with filter reactivity.
      // Mid-stream flush on language switch is handled in segment-loader's
      // planTasks, not here.
      switchAudioTrack,

      // Resolve selected tracks — audio only.
      resolveAudioTrack,

      // Presentation duration
      calculatePresentationDuration,

      // MSE setup. Single audio buffer; no video buffer to coordinate with,
      // so the Firefox `mozHasAudio` registration ordering is moot here.
      setupMediaSource,
      updateMediaSourceDuration,
      setupAudioBufferActors,

      // Playback tracking
      trackCurrentTime,

      // Segment loading — audio only.
      loadAudioSegments,

      // End of stream coordination. `endOfStream` iterates buffer actors via
      // `[videoBufferActor, audioBufferActor].filter(Boolean)` and reads
      // `mediaSource.sourceBuffers` aggregately — composes unchanged with
      // only audio in scope.
      endOfStream,

      // Adapter signal callback.
      shareSignals,
    ],
    {
      config: finalConfig,
    }
  );
}
