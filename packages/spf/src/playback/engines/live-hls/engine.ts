/**
 * Live HLS playback engine (experimental).
 *
 * Reuses the VoD HLS engine's MSE / segment-loading / ABR behaviors, swapping
 * one-shot track resolution for the per-type live reload loop, adding the
 * stream-origin timeline anchor, and defaulting `resolveDuration` to `Infinity`.
 * Demuxed audio + video; text and discontinuity handling are out of scope for
 * now. Built to validate live playback end-to-end against a real CMAF/LL-HLS
 * stream — see [live-presentation-modeling.md](../../../../../internal/design/spf/live-presentation-modeling.md).
 *
 * Distinct engine (not a refactor of `createSimpleHlsEngine`) so the VoD path
 * stays untouched while the live composition stabilizes.
 */
import { type Composition, createComposition } from '../../../core/composition/create-composition';
import { makeShareSignals } from '../../../core/composition/share-signals';
import { delayedReschedule } from '../../../core/tasks/delayed-reschedule';
import { canPlayTrack } from '../../../media/dom/capabilities';
import { parseMultivariantPlaylist } from '../../../media/hls/parse-multivariant';
import { mediaPlaylistReloadDelay } from '../../../media/hls/reload-policy';
import { anchorLiveTracks } from '../../behaviors/anchor-live-tracks';
import { calculatePresentationDuration } from '../../behaviors/calculate-presentation-duration';
import { deriveCdnPriority } from '../../behaviors/derive-cdn-priority';
import { endOfStream } from '../../behaviors/dom/end-of-stream';
import { loadAudioSegments, loadVideoSegments } from '../../behaviors/dom/load-segments';
import { seekToLiveEdge } from '../../behaviors/dom/seek-to-live-edge';
import { setupAudioBufferActors, setupVideoBufferActors } from '../../behaviors/dom/setup-buffer-actors';
import { setupMediaSource } from '../../behaviors/dom/setup-mediasource';
import { trackCurrentTime } from '../../behaviors/dom/track-current-time';
import { trackLoadTriggers } from '../../behaviors/dom/track-load-triggers';
import { updateMediaSourceDuration } from '../../behaviors/dom/update-mediasource-duration';
import { resolvePresentation } from '../../behaviors/resolve-presentation';
import { resolveAudioTrack, resolveVideoTrack } from '../../behaviors/resolve-track';
import { setupFailoverMonitor } from '../../behaviors/setup-failover-monitor';
import { syncPreload } from '../../behaviors/sync-preload';
import { switchAudioTrack, switchVideoTrack } from '../../behaviors/track-switching';
import type {
  SimpleHlsEngineConfig,
  SimpleHlsEngineContext,
  SimpleHlsEngineSignals,
  SimpleHlsEngineState,
} from '../hls/engine';

/** Config for the live HLS engine: the VoD config plus live-only options. */
export interface LiveHlsEngineConfig extends SimpleHlsEngineConfig {
  /**
   * Sequence number assumed to be the stream origin (time 0) for the
   * timeline anchor. Default 0. See `anchorTrackToSequenceOrigin`.
   */
  startSequence?: number;
}

export type LiveHlsEngineState = SimpleHlsEngineState;
export type LiveHlsEngineContext = SimpleHlsEngineContext;
export type LiveHlsEngineSignals = SimpleHlsEngineSignals;

const shareSignals = makeShareSignals<LiveHlsEngineState, LiveHlsEngineContext>([
  'userVideoTrackSelection',
  'userAudioTrackSelection',
]);

/**
 * Create a live HLS playback engine.
 *
 * Drive it like the VoD engine: capture signals via `onSignalsReady`, set
 * `context.mediaElement`, then `state.presentation = { url }`.
 */
export function createLiveHlsEngine(
  config: LiveHlsEngineConfig = {}
): Composition<LiveHlsEngineState, LiveHlsEngineContext> {
  const finalConfig = {
    ...config,
    canPlayTrack: config.canPlayTrack ?? canPlayTrack,
    parsePresentation: config.parsePresentation ?? parseMultivariantPlaylist,
    // Live: duration is unbounded. `updateMediaSourceDuration` propagates
    // Infinity to `mediaSource.duration` per the MSE spec.
    resolveDuration: config.resolveDuration ?? (() => Number.POSITIVE_INFINITY),
    startSequence: config.startSequence ?? 0,
    // Reload the selected playlists via the loaders' RecurringRunner — the
    // target-duration cadence, start-anchored + made awaitable by `delayedReschedule`.
    reschedule: config.reschedule ?? delayedReschedule(mediaPlaylistReloadDelay),
  };

  return createComposition(
    [
      syncPreload,
      trackLoadTriggers,
      resolvePresentation,

      deriveCdnPriority,
      setupFailoverMonitor,

      // Loader (category [1]): resolves the selected track and, via its
      // RecurringRunner + `reschedule`, re-fetches it on a target-duration
      // cadence until #EXT-X-ENDLIST, carrying the timeline forward.
      resolveVideoTrack,
      resolveAudioTrack,

      // Anchor selected tracks' timelines to the estimated stream origin so
      // segment.startTime ≈ native PTS (what the loader matches currentTime
      // against). Downstream of reload, upstream of load.
      anchorLiveTracks,

      calculatePresentationDuration,

      setupMediaSource,
      updateMediaSourceDuration,
      setupVideoBufferActors,
      setupAudioBufferActors,

      trackCurrentTime,
      switchVideoTrack,
      switchAudioTrack,

      loadVideoSegments,
      loadAudioSegments,

      // Seek the playhead into the (native-PTS) buffered window once segments
      // land, so playback can start.
      seekToLiveEdge,

      // No-op for unbounded live (no EXT-X-ENDLIST), composed for parity.
      endOfStream,

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
