import {
  type Composition,
  type ContextSignals,
  createComposition,
  type StateSignals,
} from '../../../core/composition/create-composition';
import { makeShareSignals, type ShareSignalsConfig } from '../../../core/composition/share-signals';
import { parseMultivariantPlaylist } from '../../../media/hls/parse-multivariant';
import { pickHighestResolutionVideoTrack, type TrackPicker } from '../../../media/primitives/select-tracks';
import type { MaybeResolvedPresentation } from '../../../media/types';
import { getResolvedSelectedTrackDuration } from '../../../media/utils/track-selection';
import type { SegmentLoaderActor } from '../../actors/dom/segment-loader';
import type { SourceBufferActor } from '../../actors/dom/source-buffer';
import { calculatePresentationDuration } from '../../behaviors/calculate-presentation-duration';
import { endOfStream } from '../../behaviors/dom/end-of-stream';
import { loadVideoSegments } from '../../behaviors/dom/load-segments';
import { setupVideoBufferActors } from '../../behaviors/dom/setup-buffer-actors';
import { setupMediaSource } from '../../behaviors/dom/setup-mediasource';
import { trackCurrentTime } from '../../behaviors/dom/track-current-time';
import { updateMediaSourceDuration } from '../../behaviors/dom/update-mediasource-duration';
import { type ParsePresentation, resolvePresentation } from '../../behaviors/resolve-presentation';
import { resolveVideoTrack } from '../../behaviors/resolve-track';
import { type SelectVideoTrackConfig, selectVideoTrack } from '../../behaviors/select-tracks';

// ============================================================================
// Background-looping-video engine state & context
// ============================================================================

/**
 * State shape for the background-looping-video playback engine.
 *
 * Narrower than `SimpleHlsEngineState`: audio/text track slots are absent
 * because their selection/resolution behaviors are subtracted. `bandwidthState`
 * is present because `setupVideoBufferActors` declares it and `loadVideoSegments`
 * samples into it (wasted work in this variant — a Phase 3 alt-impl will skip
 * sampling).
 */
export interface BackgroundLoopingVideoEngineState {
  /**
   * The presentation being played. A caller writes `{ url }`;
   * `resolvePresentation` parses the manifest and populates the rest.
   */
  presentation?: MaybeResolvedPresentation;
  preload?: 'auto' | 'metadata' | 'none';
  selectedVideoTrackId?: string;
  loadActivated?: boolean;
}

/**
 * Context shape for the background-looping-video engine.
 */
export interface BackgroundLoopingVideoEngineContext {
  mediaElement?: HTMLMediaElement | undefined;
  mediaSource?: MediaSource;
  videoBufferActor?: SourceBufferActor;
  videoSegmentLoaderActor?: SegmentLoaderActor;
}

/**
 * The composition signal refs handed to `onSignalsReady` callers — the
 * canonical way to drive the engine externally (writes) or observe its
 * state (reads) without touching `composition.state` / `composition.context`
 * directly.
 */
export type BackgroundLoopingVideoEngineSignals = {
  state: StateSignals<BackgroundLoopingVideoEngineState>;
  context: ContextSignals<BackgroundLoopingVideoEngineContext>;
};

/**
 * Configuration for the background-looping-video engine.
 *
 * Each option is consumed by the appropriate behavior — the engine itself
 * has no config beyond what its behaviors read. Compared to
 * `SimpleHlsEngineConfig`, audio/text/ABR/bandwidth/quality knobs are
 * dropped: the variant subtracts the behaviors that read them.
 */
export interface BackgroundLoopingVideoEngineConfig
  extends ShareSignalsConfig<BackgroundLoopingVideoEngineState, BackgroundLoopingVideoEngineContext> {
  /**
   * Track picker handed to `selectVideoTrack`. Default:
   * `pickHighestResolutionVideoTrack` — picks the highest-resolution variant on
   * presentation resolve and pins it for the session. Override for
   * mobile-aware or content-aware caps.
   *
   * Adapters (e.g. `BackgroundLoopingVideoMediaElement`) install their own
   * picker; this default applies when the engine is constructed directly.
   */
  picker?: TrackPicker<SelectVideoTrackConfig>;
  /**
   * Manifest parser handed to `resolvePresentation`. Defaults to the HLS
   * multivariant-playlist parser.
   */
  parsePresentation?: ParsePresentation;
}

// ============================================================================
// Background-looping-video playback engine
// ============================================================================

const shareSignals = makeShareSignals<BackgroundLoopingVideoEngineState, BackgroundLoopingVideoEngineContext>();

/**
 * Create a background-looping-video playback engine.
 *
 * Subtractive composition over the HLS engine baseline:
 * audio-side, text-side, ABR-driven, preload-monitoring, and play/seek
 * load-trigger behaviors are removed. `selectVideoTrack` (with a
 * max-resolution picker by default) replaces `switchVideoQuality`, pinning
 * a single rendition for the session. The initial state seeds
 * `loadActivated: true` so the composition behaves as if preload has
 * already been activated — appropriate for ambient / hero / GIF-replacement
 * surfaces that should start loading the moment a src is set.
 *
 * Native `loop` / `muted` / `autoplay` are adapter concerns and live on
 * `BackgroundLoopingVideoMediaElement` rather than the engine.
 *
 * @example
 * ```ts
 * let signals: BackgroundLoopingVideoEngineSignals;
 * const engine = createBackgroundLoopingVideoEngine({
 *   onSignalsReady: (refs) => {
 *     signals = refs;
 *   },
 * });
 *
 * signals.context.mediaElement.set(videoEl);
 * signals.state.presentation.set({ url: 'https://example.com/stream.m3u8' });
 *
 * await engine.destroy();
 * ```
 */
export function createBackgroundLoopingVideoEngine(
  config: BackgroundLoopingVideoEngineConfig = {}
): Composition<BackgroundLoopingVideoEngineState, BackgroundLoopingVideoEngineContext> {
  const finalConfig = {
    ...config,
    picker: config.picker ?? pickHighestResolutionVideoTrack,
    parsePresentation: config.parsePresentation ?? parseMultivariantPlaylist,
    resolveDuration: getResolvedSelectedTrackDuration,
  };

  return createComposition(
    [
      resolvePresentation,
      // Presentation duration
      calculatePresentationDuration,

      // Track selection - pinned single-rendition pick on presentation resolve.
      selectVideoTrack,
      // Resolve selected video track (fetch its media playlist)
      resolveVideoTrack,
      // Segment loading — video-only.
      loadVideoSegments,

      // MSE setup — video-only.
      setupMediaSource,
      updateMediaSourceDuration,
      setupVideoBufferActors,

      // Playback tracking
      trackCurrentTime,

      // End of stream coordination
      endOfStream,

      // Behavior whose sole purpose is to expose signal refs via a callback
      // (e.g. to an adapter). Listed last so initial signal setup has run
      // before the callback fires.
      shareSignals,
    ],
    {
      config: finalConfig,
      initialState: {
        // Note: Set to true until we add preload configuration
        loadActivated: true,
      },
    }
  );
}
