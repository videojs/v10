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
import { canPlayTrack } from '../../../media/dom/capabilities';
import { resolveVttSegment } from '../../../media/dom/text/resolve-vtt-segment';
import {
  addSubtitlesTracksToMedia,
  getShowingSubtitlesTrackFromMedia,
  removeAllSubtitlesTracksFromMedia,
} from '../../../media/dom/text/text-track-slots';
import { parseMultivariantPlaylist } from '../../../media/hls/parse-multivariant';
import type { AudioTrack, CanPlayTrack, MaybeResolvedPresentation, TextTrack, VideoTrack } from '../../../media/types';
import type { GetCdnId } from '../../../media/utils/cdn';
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
import { deriveCdnPriority } from '../../behaviors/derive-cdn-priority';
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
import { type FailoverMonitorConfig, setupFailoverMonitor } from '../../behaviors/setup-failover-monitor';
import { syncPreload } from '../../behaviors/sync-preload';
import { switchAudioTrack, switchTextTrack, switchVideoTrack } from '../../behaviors/track-switching';

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
  /**
   * Consumer-driven *intent* for text selection, resolved into
   * `selectedTextTrackId` by `switchTextTrack`. A language-based partial
   * (`{ language: 'es' }`) selects captions, `'off'` disables them, and absence
   * means auto (the engine's `preferredSubtitleLanguage` / DEFAULT-track policy).
   * Also the write path for the DOM caption UI (via `syncTextTracks`); unlike the
   * resolved id it persists across source changes (sticky preference).
   */
  userTextTrackSelection?: Partial<TextTrack> | 'off';
  /**
   * The CDNs the source is served from (track-URL origins), in manifest
   * priority order — most-preferred first (mirrors HLS content steering's
   * `PATHWAY-PRIORITY`). Owned by `deriveCdnPriority`, read by
   * `track-switching`'s `preferActiveCdn` scope, which narrows to the
   * highest-priority CDN with surviving tracks so video / audio / text stay on
   * one host. Only meaningful for redundant-stream sources; a single-CDN source
   * has one entry.
   */
  cdnPriority?: string[];
  /**
   * CDN ids (origins) currently in failover cooldown — written by the CDN
   * monitor when a host fails too often, read by `track-switching`'s
   * `excludeFailedCdns` hard constraint, which prunes their tracks so the
   * active-CDN scope falls to the next CDN in `cdnPriority`. Empty / absent
   * means all CDNs are eligible.
   */
  failedCdns?: string[];
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
  /**
   * Codec capability probe injected into `track-switching`'s
   * `excludeUnplayableTracks` constraint — drops renditions the environment
   * can't decode before selection. Defaults to the `MediaSource.isTypeSupported`
   * -backed `canPlayTrack`; supply your own to override (e.g. force-exclude a
   * codec).
   */
  canPlayTrack?: CanPlayTrack;
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
  /**
   * Multi-CDN failover monitor tuning. `cooldownMs` is how long a CDN stays
   * excluded after a failed fetch trips it. Defaults:
   * `DEFAULT_FAILOVER_MONITOR_CONFIG` (300s). Only meaningful for redundant-stream
   * sources.
   */
  failover?: Partial<FailoverMonitorConfig>;
  /**
   * How to derive a CDN grouping key from a track URL — used to build
   * `cdnPriority`, to record the failover trip in `failedCdns`, and by the
   * track-switching CDN scope + failover constraint. One function, read by all of
   * them, so the keys stay comparable. Defaults to the URL origin; override to
   * key on something else (e.g. Mux's `cdn=` query param).
   */
  getCdnId?: GetCdnId;
}

// ============================================================================
// HLS Playback Engine
// ============================================================================

/**
 * Generic `shareSignals` instantiated against the HLS engine's full state
 * and context — captures composition signal refs into the consumer's
 * `onSignalsReady` callback at setup time, and materializes input slots that no
 * composed behavior produces: `user*TrackSelection` (track-switching only reads
 * them). `failedCdns` is owned by `setupFailoverMonitor`, so it's already
 * materialized and reachable on the `onSignalsReady` refs without being listed
 * here.
 */
const shareSignals = makeShareSignals<SimpleHlsEngineState, SimpleHlsEngineContext>([
  'userVideoTrackSelection',
  'userAudioTrackSelection',
  'userTextTrackSelection',
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
    canPlayTrack: config.canPlayTrack ?? canPlayTrack,
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

      // Session-level CDN priority for redundant-stream sources. Owns
      // `cdnPriority`; `track-switching`'s preferActiveCdn scope reads it so
      // every type stays on one CDN. No-op for single-CDN sources.
      //
      // Placed before switch* so `cdnPriority` is set before the first pick —
      // but this ordering is only *mildly* load-bearing, not required for
      // correctness. Selection is reactive: a late `cdnPriority` re-fires the
      // pick and converges on the same result (see the late-arrival test in
      // track-switching.test.ts). Order affects only a transient, and only for
      // an *asymmetric* manifest (a type listing a non-primary CDN first):
      // composing this after switch* would let that type fire one wasted
      // media-playlist fetch to the wrong CDN before correcting. Symmetric
      // redundant streams (the norm) never hit it — the first-listed CDN is
      // already the primary we'd pick anyway.
      deriveCdnPriority,

      // CDN failover cooldown: owns the expiry half of failover — watches
      // `failedCdns` (tripped directly by track resolution on a failed
      // media-playlist fetch) and removes each CDN once its cooldown lapses.
      setupFailoverMonitor,

      // Resolve selected tracks (fetch media playlists). Composed before the
      // switch* slot owners; selection is reactive, so a resolve* re-fires once
      // its switch* sets the id (same convergence for all three types).
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

      // Text selection: resolves `userTextTrackSelection` intent (incl. 'off',
      // or the configured preferred-language / DEFAULT-track policy) against the
      // failed-CDN-pruned, active-CDN-scoped text renditions. Optional selection
      // (captions are opt-in), so it can resolve to none.
      switchTextTrack,

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
