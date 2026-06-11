import {
  type Composition,
  type ContextSignals,
  createComposition,
  type StateSignals,
} from '../../../core/composition/create-composition';
import { makeShareSignals, type ShareSignalsConfig } from '../../../core/composition/share-signals';
import type { QualityConfig } from '../../../media/abr/quality-selection';
import type { BackBufferConfig } from '../../../media/buffer/back-buffer';
import type { ForwardBufferConfig } from '../../../media/buffer/forward-buffer';
import { resolveVttSegment } from '../../../media/dom/text/resolve-vtt-segment';
import {
  addSubtitlesTracksToMedia,
  getShowingSubtitlesTrackFromMedia,
  removeAllSubtitlesTracksFromMedia,
} from '../../../media/dom/text/text-track-slots';
import { parseMultivariantPlaylist } from '../../../media/hls/parse-multivariant';
import type { AudioTrack, MaybeResolvedPresentation, VideoTrack } from '../../../media/types';
import { getResolvedSelectedTrackDuration } from '../../../media/utils/track-selection';
import type { BandwidthConfig, BandwidthState } from '../../../network/bandwidth-estimator';
import type { SegmentLoaderActor } from '../../actors/dom/segment-loader';
import type { SourceBufferActor } from '../../actors/dom/source-buffer';
import type { TextTracksActor } from '../../actors/dom/text-tracks';
import type { TextTrackSegmentLoaderActor, TextTrackSegmentResolver } from '../../actors/text-track-segment-loader';
import {
  calculatePresentationDuration,
  type PresentationDurationResolver,
} from '../../behaviors/calculate-presentation-duration';
import { endOfStream } from '../../behaviors/dom/end-of-stream';
import { loadAudioSegments, loadTextTrackSegments, loadVideoSegments } from '../../behaviors/dom/load-segments';
import { setupAudioBufferActors, setupVideoBufferActors } from '../../behaviors/dom/setup-buffer-actors';
import { setupMediaSource } from '../../behaviors/dom/setup-mediasource';
import { setupTextTrackActors } from '../../behaviors/dom/setup-text-track-actors';
import { syncTextTracks } from '../../behaviors/dom/sync-text-tracks';
import { trackCurrentTime } from '../../behaviors/dom/track-current-time';
import { trackLoadTriggers } from '../../behaviors/dom/track-load-triggers';
import { updateMediaSourceDuration } from '../../behaviors/dom/update-mediasource-duration';
import { type ParsePresentation, resolvePresentation } from '../../behaviors/resolve-presentation';
import { resolveAudioTrack, resolveTextTrack, resolveVideoTrack } from '../../behaviors/resolve-track';
import { selectTextTrack } from '../../behaviors/select-tracks';
import { syncPreload } from '../../behaviors/sync-preload';
import { switchAudioTrack, switchVideoTrack } from '../../behaviors/track-switching';

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
  userVideoTrackSelection?: Partial<VideoTrack>;
  /**
   * Consumer-driven constraint narrowing the audio candidate set. Sibling
   * of `userVideoTrackSelection`. Partial-track shape — `{ language: 'es' }`,
   * `{ id: 'audio-en' }`, etc. `selectAudioTrack` reads this and re-picks
   * when it changes. Multi-language-audio Tier 2 programmatic-write path.
   */
  userAudioTrackSelection?: Partial<AudioTrack>;
  currentTime?: number;
  loadActivated?: boolean;
}

/**
 * Context shape for the HLS playback engine.
 *
 * Platform objects and actor references managed by HLS behaviors.
 */
export interface SimpleHlsEngineContext {
  mediaElement?: HTMLMediaElement | undefined;
  mediaSource?: MediaSource;
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
  videoSegmentLoaderActor?: SegmentLoaderActor;
  audioSegmentLoaderActor?: SegmentLoaderActor;
  textTracksActor?: TextTracksActor;
  textTrackSegmentLoaderActor?: TextTrackSegmentLoaderActor;
}

/**
 * The composition signal refs handed to `onSignalsReady` callers — the
 * canonical way to drive the engine externally (writes) or observe its
 * state (reads) without touching `composition.state` / `composition.context`
 * directly.
 */
export type SimpleHlsEngineSignals = {
  state: StateSignals<SimpleHlsEngineState>;
  context: ContextSignals<SimpleHlsEngineContext>;
};

/**
 * Configuration for the HLS playback engine.
 *
 * Each option is consumed by the appropriate behavior — the engine itself
 * has no config beyond what its behaviors read.
 */
export interface SimpleHlsEngineConfig extends ShareSignalsConfig<SimpleHlsEngineState, SimpleHlsEngineContext> {
  /**
   * Bandwidth estimate in bps to use before enough samples have been
   * collected. Default: `DEFAULT_INITIAL_BANDWIDTH` (5 Mbps).
   */
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
  /**
   * Resolver for `presentation.duration`. Defaults to picking the first
   * resolved selected track's duration (video preferred, audio fallback) —
   * appropriate for VoD and audio-only. Live engines should supply a
   * resolver that returns `Number.POSITIVE_INFINITY` once the presentation
   * is established as live; downstream `updateMediaSourceDuration` propagates
   * that value to `mediaSource.duration` per the MSE spec.
   */
  resolveDuration?: PresentationDurationResolver;
  /**
   * Manifest parser handed to `resolvePresentation`. Defaults to the HLS
   * multivariant-playlist parser; supply your own for alternate format
   * support without forking the engine.
   */
  parsePresentation?: ParsePresentation;
  /**
   * Allocate SPF-owned text-track slots on the media element. Defaults to
   * the standard `<track>`-element implementation in
   * `media/dom/text/text-track-slots`.
   */
  addSubtitlesTracksToMedia?: typeof addSubtitlesTracksToMedia;
  /**
   * Return the SPF-owned subtitle/caption `TextTrack` currently in showing
   * mode. Defaults to the standard selector-based implementation in
   * `media/dom/text/text-track-slots`.
   */
  getShowingSubtitlesTrackFromMedia?: typeof getShowingSubtitlesTrackFromMedia;
  /**
   * Evict all SPF-owned text-track slots from the media element. Defaults to
   * the standard selector-based implementation in
   * `media/dom/text/text-track-slots`.
   */
  removeAllSubtitlesTracksFromMedia?: typeof removeAllSubtitlesTracksFromMedia;
  /**
   * Forward-buffer tuning. `bufferDuration` controls how far ahead of the
   * playhead segments are loaded (and where forward-flush kicks in).
   * Defaults: see `DEFAULT_FORWARD_BUFFER_CONFIG` (30 seconds). Threaded to
   * segment-loader actors (v/a + text) at construction time and to
   * `loadXSegments` dispatchers for the load-message range.
   */
  forwardBuffer?: Partial<ForwardBufferConfig>;
  /**
   * Back-buffer tuning. `keepSegments` controls how many segments stay
   * behind the playhead before eviction. Defaults: see
   * `DEFAULT_BACK_BUFFER_CONFIG` (2 segments). Threaded to the v/a
   * segment-loader actor only (text tracks don't use back-buffer eviction).
   */
  backBuffer?: Partial<BackBufferConfig>;
  /**
   * Bandwidth-estimator tuning. Overrides any field of `BandwidthConfig`
   * (`fastHalfLife`, `slowHalfLife`, `minTotalBytes`, `minBytes`,
   * `minDuration`). `bandwidth.minTotalBytes` supersedes the flat
   * `minTotalBytes` field above. Defaults: see `DEFAULT_BANDWIDTH_CONFIG`.
   */
  bandwidth?: Partial<BandwidthConfig>;
  /**
   * Quality-selection tuning. `safetyMargin` is the bandwidth-headroom
   * multiplier used by `selectQuality`; `upgradeMargin` is the hysteresis
   * ratio gating ABR upgrades. Defaults: `DEFAULT_QUALITY_CONFIG` (0.85 / 1.15).
   */
  quality?: Partial<QualityConfig>;
}

// ============================================================================
// HLS Playback Engine
// ============================================================================

/**
 * Generic `shareSignals` instantiated against the HLS engine's full state
 * and context — captures composition signal refs into the consumer's
 * `onSignalsReady` callback at setup time, and materializes the consumer-input
 * slots (`user*TrackSelection`) that no behavior produces: the track-switching
 * behaviors only *read* them, so shareSignals owns bringing them into existence.
 */
const shareSignals = makeShareSignals<SimpleHlsEngineState, SimpleHlsEngineContext>([
  'userVideoTrackSelection',
  'userAudioTrackSelection',
]);

/**
 * Create an HLS playback engine.
 *
 * Composes SPF behaviors into a reactive pipeline for HLS playback over MSE:
 * manifest resolution, track selection, ABR, segment loading, and
 * end-of-stream coordination.
 *
 * @example
 * ```ts
 * let signals: SimpleHlsEngineSignals;
 * const engine = createSimpleHlsEngine({
 *   initialBandwidth: 2_000_000,
 *   preferredAudioLanguage: 'en',
 *   onSignalsReady: (refs) => {
 *     signals = refs;
 *   },
 * });
 *
 * signals.context.mediaElement.set(videoEl);
 * signals.state.presentation.set({ url: 'https://example.com/stream.m3u8' });
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
    resolveDuration: config.resolveDuration ?? getResolvedSelectedTrackDuration,
    parsePresentation: config.parsePresentation ?? parseMultivariantPlaylist,
    addSubtitlesTracksToMedia: config.addSubtitlesTracksToMedia ?? addSubtitlesTracksToMedia,
    getShowingSubtitlesTrackFromMedia: config.getShowingSubtitlesTrackFromMedia ?? getShowingSubtitlesTrackFromMedia,
    removeAllSubtitlesTracksFromMedia: config.removeAllSubtitlesTracksFromMedia ?? removeAllSubtitlesTracksFromMedia,
  };

  return createComposition(
    [
      syncPreload,
      trackLoadTriggers,
      resolvePresentation,

      // Track selection (reads config for initial preferences).
      // Video selection lives in switchVideoTrack (composed below);
      // audio selection lives in switchAudioTrack (composed below) —
      // both are slot owners with filter-reactivity, mirroring shapes.
      selectTextTrack,

      // Resolve selected tracks (fetch media playlists)
      resolveVideoTrack,
      resolveAudioTrack,
      resolveTextTrack,

      // Presentation duration
      calculatePresentationDuration,

      // MSE setup. Video cluster is registered first so that, when both
      // per-type variants flip to `'buffer-ready'` on the shared gate's
      // monitor evaluation, `addSourceBuffer(video)` runs before
      // `addSourceBuffer(audio)` — see the Firefox `mozHasAudio` invariant
      // in setup-buffer-actors.ts.
      setupMediaSource,
      updateMediaSourceDuration,
      setupVideoBufferActors,
      setupAudioBufferActors,

      // Playback tracking
      trackCurrentTime,
      switchVideoTrack,
      switchAudioTrack,
      // Mid-stream audio-buffer flush on language switch is handled in
      // `segment-loader`'s `planTasks` (predicate: language differs from
      // the previously-buffered track) — not in switchAudioTrack itself.

      // Segment loading
      loadVideoSegments,
      loadAudioSegments,

      // End of stream coordination
      endOfStream,

      // Text tracks
      syncTextTracks,
      setupTextTrackActors,
      loadTextTrackSegments,

      // Behavior whose sole purpose is to use a callback to allow for signal writing from the outside (e.g. an adapter)
      // NOTE: While not required, adding at the end since behaviors are setup in order, so this increases the likelihood
      // that initial signal setup will have occurred before shareSignals' callback is invoked. (CJP)
      shareSignals,
    ],
    {
      config: finalConfig,
      // Seed bandwidthState so switchVideoTrack fires on initial subscribe
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
