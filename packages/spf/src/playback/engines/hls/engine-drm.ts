/**
 * DRM-composed variant of the HLS video engine: the standard composition plus
 * `setupMediaKeys` (EME lifecycle + license exchange, gating segment loading
 * on `awaitingMediaKeys`), with the capability probe and the resolved-track
 * condition reporter swapped for their DRM-aware counterparts so renditions a
 * configured key system can serve are played instead of pruned.
 *
 * A separate factory rather than a `drm`-conditional inside
 * `createHlsVideoEngine` so DRM-free consumers never carry the EME machinery
 * (composition-time distinction per drm-support.md). The behavior list is
 * duplicated from `engine.ts` — the additive-variant drift cost the
 * subtractive variants (audio-only, background-video) already accept; keep it
 * in sync when the base composition changes.
 *
 * First slice (Widevine on Chrome against a Mux DRM source); the FairPlay /
 * PlayReady specifics, `encrypted`-event fallback, and key-status reactivity
 * are tracked in `internal/design/spf/features/drm-support.md`.
 */
import type { Composition, ContextSignals, StateSignals } from '../../../core/composition/create-composition';
import { createComposition } from '../../../core/composition/create-composition';
import { makeShareSignals, type ShareSignalsConfig } from '../../../core/composition/share-signals';
import { delayedReschedule } from '../../../core/tasks/delayed-reschedule';
import { makeCanPlayTrackWithDrm } from '../../../media/dom/capabilities';
import { attachMediaSourceAsSourceElement } from '../../../media/dom/mse/mediasource-setup';
import { resolveVttSegment } from '../../../media/dom/text/resolve-vtt-segment';
import {
  addSubtitlesTracksToMedia,
  getShowingSubtitlesTrackFromMedia,
  removeAllSubtitlesTracksFromMedia,
} from '../../../media/dom/text/text-track-slots';
import type { DrmSystemsConfig } from '../../../media/drm';
import { parseMultivariantPlaylist } from '../../../media/hls/parse-multivariant';
import { mediaPlaylistReloadDelay, resolveLiveLatency } from '../../../media/hls/reload-policy';
import { getResolvedSelectedTrackDuration } from '../../../media/utils/track-selection';
import { calculatePresentationDuration } from '../../behaviors/calculate-presentation-duration';
import { collectErrors } from '../../behaviors/collect-errors';
import { deriveCdnPriority } from '../../behaviors/derive-cdn-priority';
import { setupAirPlay } from '../../behaviors/dom/airplay';
import { applyStartPosition } from '../../behaviors/dom/apply-start-position';
import { endOfStream } from '../../behaviors/dom/end-of-stream';
import { loadAudioSegments, loadTextTrackSegments, loadVideoSegments } from '../../behaviors/dom/load-segments';
import { recoverEndStall } from '../../behaviors/dom/recover-end-stall';
import { seekToLiveEdge } from '../../behaviors/dom/seek-to-live-edge';
import { setupAudioBufferActors, setupVideoBufferActors } from '../../behaviors/dom/setup-buffer-actors';
import { setupMediaKeys } from '../../behaviors/dom/setup-media-keys';
import { setupMediaSource } from '../../behaviors/dom/setup-mediasource';
import { setupTextTrackActors } from '../../behaviors/dom/setup-text-track-actors';
import { syncLiveSeekableRange } from '../../behaviors/dom/sync-live-seekable-range';
import { syncTextTracks } from '../../behaviors/dom/sync-text-tracks';
import { trackCurrentTime } from '../../behaviors/dom/track-current-time';
import { trackLoadTriggers } from '../../behaviors/dom/track-load-triggers';
import { updateMediaSourceDuration } from '../../behaviors/dom/update-mediasource-duration';
import {
  deriveSharedMinStartMediaTime,
  establishStartMediaTime,
  gateFirstParseOnAnchor,
} from '../../behaviors/establish-start-media-time';
import { resolvePresentation } from '../../behaviors/resolve-presentation';
import { resolveAudioTrack, resolveTextTrack, resolveVideoTrack } from '../../behaviors/resolve-track';
import { setupFailoverMonitor } from '../../behaviors/setup-failover-monitor';
import { syncPreload } from '../../behaviors/sync-preload';
import { switchAudioTrack, switchTextTrack, switchVideoTrack } from '../../behaviors/track-switching';
import { relocatingTextPipelines, relocationPipelinesFor } from '../../primitives/relocation-pipelines';
import { makeReportUnsupportedTrackConditionsWithDrm } from '../../primitives/report-track-conditions';
import type { HlsVideoEngineConfig, HlsVideoEngineContext, HlsVideoEngineState } from './engine';

/**
 * State shape for the DRM HLS engine — the standard engine's slots plus the
 * DRM key-readiness gate `setupMediaKeys` owns.
 */
export interface DrmHlsVideoEngineState extends HlsVideoEngineState {
  /** DRM load gate; semantics on `SegmentLoadingState['awaitingMediaKeys']`. */
  awaitingMediaKeys?: boolean;
}

/**
 * Context shape for the DRM HLS engine — the standard engine's slots plus the
 * attached MediaKeys `setupMediaKeys` owns.
 */
export interface DrmHlsVideoEngineContext extends HlsVideoEngineContext {
  mediaKeys?: MediaKeys;
}

/** The composition signal refs handed to `onSignalsReady` callers. */
export type DrmHlsVideoEngineSignals = {
  state: StateSignals<DrmHlsVideoEngineState>;
  context: ContextSignals<DrmHlsVideoEngineContext>;
};

/**
 * Configuration for the DRM HLS engine: the standard engine's options plus
 * the required license-server map. `canPlayTrack` and
 * `reportUnsupportedTrackConditions` default to the DRM-aware variants built
 * over `drm` rather than the standard refusals.
 */
export interface DrmHlsVideoEngineConfig
  extends Omit<HlsVideoEngineConfig, 'onSignalsReady'>,
    ShareSignalsConfig<DrmHlsVideoEngineState, DrmHlsVideoEngineContext> {
  /**
   * License servers keyed by EME key-system id — `source.drm`'s shape.
   * Required: a DRM engine without a license server can never negotiate keys;
   * consumers without one want `createHlsVideoEngine`.
   */
  drm: DrmSystemsConfig;
}

/** See `engine.ts` — same materialized input slots, DRM-typed. */
const shareSignals = makeShareSignals<DrmHlsVideoEngineState, DrmHlsVideoEngineContext>([
  'userVideoTrackSelection',
  'userAudioTrackSelection',
  'userTextTrackSelection',
  'disableRemotePlayback',
]);

/**
 * Create a DRM-capable HLS playback engine. `createHlsVideoEngine` plus EME:
 * MediaKeys setup, manifest-driven license exchange, and key-readiness gating
 * of segment loading.
 *
 * @example
 * ```ts
 * const engine = createDrmHlsVideoEngine({
 *   drm: {
 *     'com.widevine.alpha': { licenseUrl: 'https://license.example.com/widevine' },
 *   },
 *   onSignalsReady: (refs) => {
 *     signals = refs;
 *   },
 * });
 * ```
 */
export function createDrmHlsVideoEngine(
  config: DrmHlsVideoEngineConfig
): Composition<DrmHlsVideoEngineState, DrmHlsVideoEngineContext> {
  const deriveStartMediaTime = config.deriveStartMediaTime ?? deriveSharedMinStartMediaTime;
  const finalConfig = {
    ...config,
    deriveStartMediaTime,
    attachMediaSource: attachMediaSourceAsSourceElement,
    // The DRM-aware capability probe + condition reporter: renditions whose
    // declared keys reach a configured system play; unservable ones stay
    // pruned and reported, exactly like the standard engine's refusals.
    canPlayTrack: config.canPlayTrack ?? makeCanPlayTrackWithDrm(config.drm),
    reportUnsupportedTrackConditions:
      config.reportUnsupportedTrackConditions ?? makeReportUnsupportedTrackConditionsWithDrm(config.drm),
    resolveTextTrackSegment: config.resolveTextTrackSegment ?? resolveVttSegment,
    textMessagePipelines: relocatingTextPipelines,
    resolveDuration: config.resolveDuration ?? getResolvedSelectedTrackDuration,
    parsePresentation: config.parsePresentation ?? parseMultivariantPlaylist,
    addSubtitlesTracksToMedia: config.addSubtitlesTracksToMedia ?? addSubtitlesTracksToMedia,
    getShowingSubtitlesTrackFromMedia: config.getShowingSubtitlesTrackFromMedia ?? getShowingSubtitlesTrackFromMedia,
    removeAllSubtitlesTracksFromMedia: config.removeAllSubtitlesTracksFromMedia ?? removeAllSubtitlesTracksFromMedia,
    videoMessagePipelines: relocationPipelinesFor('video', deriveStartMediaTime),
    audioMessagePipelines: relocationPipelinesFor('audio', deriveStartMediaTime),
    gateFirstParse: gateFirstParseOnAnchor,
    resolveLiveLatency,
    reschedule: config.reschedule ?? delayedReschedule(mediaPlaylistReloadDelay),
  };

  return createComposition(
    [
      syncPreload,
      trackLoadTriggers,
      resolvePresentation,
      deriveCdnPriority,
      setupFailoverMonitor,
      collectErrors,
      resolveVideoTrack,
      resolveAudioTrack,
      resolveTextTrack,
      calculatePresentationDuration,
      setupMediaSource,
      updateMediaSourceDuration,

      // EME lifecycle. Composed right after MSE setup and — load-bearing —
      // before the `load*Segments` dispatchers, so the `awaitingMediaKeys`
      // gate is up before their first dispatch of encrypted segments.
      setupMediaKeys,

      establishStartMediaTime,
      setupVideoBufferActors,
      setupAudioBufferActors,
      setupAirPlay,
      trackCurrentTime,
      applyStartPosition,
      switchVideoTrack,
      switchAudioTrack,
      switchTextTrack,
      loadVideoSegments,
      loadAudioSegments,
      syncLiveSeekableRange,
      seekToLiveEdge,
      endOfStream,
      recoverEndStall,
      syncTextTracks,
      setupTextTrackActors,
      loadTextTrackSegments,
      shareSignals,
    ],
    {
      config: finalConfig,
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
