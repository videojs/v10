import {
  type Composition,
  type ContextSignals,
  createComposition,
  type StateSignals,
} from '../../../core/composition/create-composition';
import { makeShareSignals, type ShareSignalsConfig } from '../../../core/composition/share-signals';
import type { BackBufferConfig } from '../../../media/buffer/back-buffer';
import type { ForwardBufferConfig } from '../../../media/buffer/forward-buffer';
import { canPlayTrack } from '../../../media/dom/capabilities';
import { attachMediaSourceAsSourceElement } from '../../../media/dom/mse/mediasource-setup';
import type { SvtaError } from '../../../media/errors';
import { parseMultivariantPlaylist } from '../../../media/hls/parse-multivariant';
import type { AudioTrack, CanPlayTrack, MaybeResolvedPresentation, MediaContainerData } from '../../../media/types';
import type { GetCdnId } from '../../../media/utils/cdn';
import { getResolvedSelectedTrackDuration } from '../../../media/utils/track-selection';
import type { SegmentLoaderActor } from '../../actors/dom/segment-loader';
import type { SourceBufferActor } from '../../actors/dom/source-buffer';
import {
  calculatePresentationDuration,
  type PresentationDurationResolver,
} from '../../behaviors/calculate-presentation-duration';
import { collectErrors } from '../../behaviors/collect-errors';
import { deriveCdnPriority } from '../../behaviors/derive-cdn-priority';
import { setupAirPlay } from '../../behaviors/dom/airplay';
import { applyStartPosition } from '../../behaviors/dom/apply-start-position';
import { endOfStream } from '../../behaviors/dom/end-of-stream';
import { loadAudioSegments } from '../../behaviors/dom/load-segments';
import { recoverEndStall } from '../../behaviors/dom/recover-end-stall';
import { setupAudioBufferActors } from '../../behaviors/dom/setup-buffer-actors';
import { setupMediaSource } from '../../behaviors/dom/setup-mediasource';
import { trackCurrentTime } from '../../behaviors/dom/track-current-time';
import { trackLoadTriggers } from '../../behaviors/dom/track-load-triggers';
import { updateMediaSourceDuration } from '../../behaviors/dom/update-mediasource-duration';
// Non-zero-PTS relocation (spike): remove this import, the composed reactor, the
// `audioMessagePipelines` finalConfig entry, the `mediaContainerData` state slot,
// and the `deriveStartMediaTime` config field to drop relocation from audio-only.
import {
  type DeriveStartMediaTime,
  deriveSharedMinStartMediaTime,
  establishStartMediaTime,
} from '../../behaviors/establish-start-media-time';
import { type ParsePresentation, resolvePresentation } from '../../behaviors/resolve-presentation';
import { resolveAudioTrack } from '../../behaviors/resolve-track';
import { type FailoverMonitorConfig, setupFailoverMonitor } from '../../behaviors/setup-failover-monitor';
import { syncPreload } from '../../behaviors/sync-preload';
import { switchAudioTrack } from '../../behaviors/track-switching';
import { relocationPipelinesFor } from '../../primitives/relocation-pipelines';
import {
  type ReportUnsupportedTrackConditions,
  reportUnsupportedTrackConditions,
} from '../../primitives/report-track-conditions';

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
  // Non-zero-PTS relocation (spike): transient per-track container data owned by
  // `establishStartMediaTime`. Remove with the composed reactor.
  mediaContainerData?: Record<string, MediaContainerData>;
  /**
   * Consumer-driven constraint narrowing the audio candidate set. Sibling
   * of `userVideoTrackSelection` in the default engine. Partial-track
   * shape — `{ language: 'es' }`, `{ id: 'audio-en' }`, etc.
   * `selectAudioTrack` reads this and re-picks when it changes.
   * Multi-language-audio Tier 2 programmatic-write path.
   */
  userAudioTrackSelection?: Partial<AudioTrack>;
  /**
   * The CDNs the source is served from, in manifest priority order (mirrors
   * HLS content steering's `PATHWAY-PRIORITY`). Owned by `deriveCdnPriority`,
   * read by `track-switching`'s `preferActiveCdn` scope. Only meaningful for
   * redundant-stream sources; a single-CDN source has one entry.
   */
  cdnPriority?: string[];
  /**
   * CDN ids currently in failover cooldown — read by `track-switching`'s
   * `excludeFailedCdns` constraint, which prunes their tracks so the active-CDN
   * scope falls to the next CDN. Empty / absent means all CDNs are eligible.
   */
  failedCdns?: string[];
  /**
   * Conditions reported during playback, in order — appended by whichever
   * behavior detects one, owned and cleared per source by `collectErrors`.
   * Severity is decided above the engine. Audio-only makes an all-audio-pruned
   * source unrecoverable: there's no video fallback to fall back to.
   */
  errors?: SvtaError[];
  currentTime?: number;
  loadActivated?: boolean;
  /**
   * One-shot command: start the current source at this position
   * (presentation-timeline seconds). Written by consumers or by
   * `setupAirPlay`'s session-end snapshot; consumed (cleared) by
   * `applyStartPosition` once the element seeks. See
   * `behaviors/dom/apply-start-position.ts`.
   */
  startPosition?: number;
  /**
   * Intent-level loading policy: initiate no new loading work while `true`.
   * Written by `setupAirPlay` (the only behavior declaring the key) while a
   * remote-playback session owns presentation; observed by `loadAudioSegments`
   * (parks in `'dormant'`) and by `setupMediaSource` (a pending rebuild
   * waits). See `SegmentLoadingState['loadingSuspended']`.
   */
  loadingSuspended?: boolean;
  /**
   * Author intent for the AirPlay/remote-playback picker, written by the media
   * adapter's `disableRemotePlayback` IDL property. `true` is an explicit
   * opt-out: `setupAirPlay` reads it at attach and sets nothing up, leaving the
   * element's remote playback disabled. Distinct from the underlying media
   * element's own `disableRemotePlayback`, which stays programmatically managed
   * (ManagedMediaSource / AirPlay).
   */
  disableRemotePlayback?: boolean;
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
  /**
   * Codec capability probe read by `track-switching`'s `excludeUnplayableTracks`
   * constraint. Defaults to the `MediaSource.isTypeSupported`-backed
   * `canPlayTrack`; override to force-exclude a codec. Mirrors the default
   * engine — without it, capability probing (and TS / raw-AAC detection) would
   * be inert for audio-only playback.
   */
  canPlayTrack?: CanPlayTrack;
  /**
   * Conditions reported about each rendition as it resolves — the *causes* behind
   * a later verdict, and the copy a verdict reuses when they agree. Defaults to
   * {@link reportUnsupportedTrackConditions}, which reports non-fMP4 containers
   * and encryption; supply your own to report a different set (a provider that
   * never ships MPEG-TS can drop that check) or `() => []` to report nothing.
   */
  reportUnsupportedTrackConditions?: ReportUnsupportedTrackConditions;
  resolveDuration?: PresentationDurationResolver;
  parsePresentation?: ParsePresentation;
  forwardBuffer?: Partial<ForwardBufferConfig>;
  backBuffer?: Partial<BackBufferConfig>;
  /** Multi-CDN failover monitor tuning. Defaults: `DEFAULT_FAILOVER_MONITOR_CONFIG`. */
  failover?: Partial<FailoverMonitorConfig>;
  /**
   * Derive a CDN grouping key from a track URL (used by `cdnPriority`, the
   * failover trip, and the track-switching CDN rules — one function read by all).
   * Defaults to the URL origin; override to key on e.g. Mux's `cdn=` param.
   */
  getCdnId?: GetCdnId;
  /** Non-zero-PTS relocation (spike): the reduce seam (tier knob); defaults to per-track own. */
  deriveStartMediaTime?: DeriveStartMediaTime;
}

// ============================================================================
// Audio-Only HLS Playback Engine
// ============================================================================

// Materializes input slots no composed behavior produces — `userAudioTrackSelection`
// (switchAudioTrack only reads it) and `disableRemotePlayback` (setupAirPlay only
// reads it) — in addition to forwarding refs. `failedCdns` is owned by
// `setupFailoverMonitor`, so it's already materialized and reachable on the
// `onSignalsReady` refs without being listed here.
const shareSignals = makeShareSignals<SimpleHlsAudioOnlyEngineState, SimpleHlsAudioOnlyEngineContext>([
  'userAudioTrackSelection',
  'disableRemotePlayback',
]);

/**
 * Create an audio-only HLS playback engine.
 *
 * Subtractive composition variant of `createSimpleHlsEngine`: omits
 * video-side behaviors (`resolveVideoTrack`, `switchVideoTrack`,
 * `setupVideoBufferActors`, `loadVideoSegments`) and text-track behaviors
 * (`switchTextTrack`, `resolveTextTrack`, `syncTextTracks`,
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
  const deriveStartMediaTime = config.deriveStartMediaTime ?? deriveSharedMinStartMediaTime;
  const finalConfig = {
    ...config,
    deriveStartMediaTime,
    // Baked (not user-overridable): this engine composes `setupAirPlay`,
    // whose native fallback `<source>` requires the MSE attachment to keep
    // sibling source alternatives part of resource selection. The helper's
    // `video/mp4` source type is inert here — resource selection probes it
    // with `canPlayType`, which answers `'maybe'` on an audio element too.
    attachMediaSource: attachMediaSourceAsSourceElement,
    canPlayTrack: config.canPlayTrack ?? canPlayTrack,
    reportUnsupportedTrackConditions: config.reportUnsupportedTrackConditions ?? reportUnsupportedTrackConditions,
    resolveDuration: config.resolveDuration ?? getResolvedSelectedTrackDuration,
    parsePresentation: config.parsePresentation ?? parseMultivariantPlaylist,
    // Non-zero-PTS relocation (spike): pair the audio loader with the relocation steps
    // `establishStartMediaTime` derives from; same `deriveStartMediaTime` seam. Remove
    // with the reactor.
    audioMessagePipelines: relocationPipelinesFor('audio', deriveStartMediaTime),
  };

  return createComposition(
    [
      syncPreload,
      trackLoadTriggers,
      resolvePresentation,

      // Session-level CDN priority for redundant-stream sources. Owns
      // `cdnPriority`; switchAudioTrack's preferActiveCdn scope reads it. No-op
      // for single-CDN sources.
      //
      // With a single track type there's no cross-type coherence to enforce and
      // the first pick is the primary CDN regardless, so composition order is
      // not load-bearing here today. It earns its place for forward-consistency
      // with the default engine and for future failover / steering, where the
      // active CDN changes dynamically (and selection stays reactive either way).
      deriveCdnPriority,

      // CDN failover cooldown: watches `failedCdns` (tripped directly by audio
      // track resolution on a failed media-playlist fetch) and removes each CDN
      // once its cooldown lapses.
      setupFailoverMonitor,

      // Owns `errors` and its per-source lifecycle; reporters append into it.
      collectErrors,

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

      // Non-zero-PTS relocation (spike): establishes per-track startMediaTime;
      // MUST precede setupAudioBufferActors. Remove this line + the import + the
      // finalConfig/state entries to drop relocation. (Selection is optional in the
      // reactor, so it works with only audio in scope.)
      establishStartMediaTime,

      setupAudioBufferActors,

      // AirPlay/MSE bridge (WebKit only; no-op elsewhere). Audio-only sources
      // AirPlay to audio receivers (HomePod, AirPlay speakers) through the same
      // native-HLS fallback `<source>`; `webkitCurrentPlaybackTargetIsWireless`
      // and the picker are HTMLMediaElement-level, so an `<audio>` host is
      // AirPlay-capable on the same terms as a `<video>` one.
      setupAirPlay,

      // Playback tracking
      trackCurrentTime,
      // After trackCurrentTime: the one-shot currentTime seed must land after
      // the mirror's attach-time sync (see apply-start-position.ts).
      applyStartPosition,

      // Segment loading — audio only.
      loadAudioSegments,

      // End of stream coordination. `endOfStream` iterates buffer actors via
      // `[videoBufferActor, audioBufferActor].filter(Boolean)` and reads
      // `mediaSource.sourceBuffers` aggregately — composes unchanged with
      // only audio in scope.
      endOfStream,
      // Force native `ended` if Chrome freezes the playhead short of the buffered end
      // after `endOfStream`. Inert for a clean-ending single-track source.
      recoverEndStall,

      // Adapter signal callback.
      shareSignals,
    ],
    {
      config: finalConfig,
    }
  );
}
