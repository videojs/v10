import { type BandwidthState, sampleBandwidth } from '../../core/abr/bandwidth-estimator';
import { DEFAULT_FORWARD_BUFFER_CONFIG } from '../../core/buffer/forward-buffer';
import { createState, type WritableState } from '../../core/state/create-state';
import type { AddressableObject, Presentation, Segment } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { getSelectedTrack, type TrackSelectionState } from '../../core/utils/track-selection';
import type { SourceBufferActor } from '../media/source-buffer-actor';
import { fetchResolvableBytes } from '../network/fetch';
import {
  type BufferState,
  createSegmentLoaderActor,
  type SegmentLoaderActor,
  type SourceBufferState,
} from './segment-loader-actor';
import type { MediaTrackType } from './setup-sourcebuffer';

// Re-export buffer state types for consumers that import them from this module.
export type { BufferState, SourceBufferState };

// Map track type to SourceBufferActor owner property key.
const ActorKeyByType = {
  video: 'videoBufferActor',
  audio: 'audioBufferActor',
} as const;

// ============================================================================
// TRACKED FETCH
// ============================================================================

/**
 * Creates a fetch function that transparently samples bandwidth after each
 * completed request. Callers receive bytes; throughput tracking is invisible.
 *
 * `onSample` is an optional callback invoked after each sample is recorded,
 * used for bridging throughput state outward (e.g. migration bridge to global
 * state). A callback is used rather than a subscription so that no immediate
 * fire occurs at setup time — subscriptions fire on registration and would
 * trigger spurious state changes before any work has started.
 */
function createTrackedFetch(
  throughput: WritableState<BandwidthState>,
  onSample?: (next: BandwidthState) => void
): (addressable: AddressableObject, options?: RequestInit) => Promise<ArrayBuffer> {
  return async (addressable, options) => {
    const start = performance.now();
    const data = await fetchResolvableBytes(addressable, options);
    const elapsed = performance.now() - start;
    const next = sampleBandwidth(throughput.current, elapsed, data.byteLength);
    throughput.patch(next);
    onSample?.(next);
    return data;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Find the start time of the segment that contains `currentTime`.
 * Returns the startTime of the last segment whose startTime ≤ currentTime,
 * or null if no segment precedes or matches currentTime.
 *
 * Assumes segments are ordered by startTime (standard for HLS/DASH playlists).
 * O(n) scan — negligible at the fire rate of the segment boundary selector.
 */
function segmentStartTimeFor(currentTime: number, segments: readonly Segment[]): number | null {
  let result: number | null = null;
  for (const seg of segments) {
    if (seg.startTime <= currentTime) result = seg.startTime;
    else break;
  }
  return result;
}

// ============================================================================
// STATE & OWNERS
// ============================================================================

/**
 * State shape for segment loading.
 */
export interface SegmentLoadingState extends TrackSelectionState {
  presentation?: Presentation;
  preload?: string;
  bandwidthState?: BandwidthState;
  /** Current playback position in seconds. Defaults to 0 when undefined. */
  currentTime?: number;
  /** True once the user has initiated playback. Allows segment loading regardless of preload setting. */
  playbackInitiated?: boolean;
}

/**
 * Owners shape for segment loading.
 */
export interface SegmentLoadingOwners {
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
}

// ============================================================================
// LOAD DECISION HELPERS
// ============================================================================

/**
 * Check if the preconditions for segment loading are met.
 *
 * Requires:
 * - Selected track exists AND is fully resolved (has segments + init URL)
 * - SourceBufferActor exists in owners for this track type
 *
 * Note: track selection changes before playbackInitiated are not supported.
 * If selectedTrackId changes before play starts, the actor has not yet been
 * created (setup-sourcebuffer fires after track resolution), so this will
 * return false until the new track resolves and its actor appears in owners.
 */
export function canLoadSegments(
  state: SegmentLoadingState,
  owners: SegmentLoadingOwners,
  type: MediaTrackType
): boolean {
  const track = getSelectedTrack(state, type);
  if (!track || !isResolvedTrack(track)) return false;

  const actorKey = ActorKeyByType[type];
  return !!owners[actorKey];
}

/**
 * Check if loading is enabled in the current preload/playback mode.
 *
 * Three modes:
 * - Full mode (preload='auto' OR playbackInitiated): load init + media segments.
 * - Metadata mode (preload='metadata', !playbackInitiated): load init only.
 * - Blocked (preload='none' or unset, !playbackInitiated): load nothing.
 *
 * Note: this is a mode gate only — it does not check whether there is actual
 * work to do (e.g. which segments are missing). The SegmentLoaderActor owns
 * that decision.
 */
export function shouldLoadSegments(state: SegmentLoadingState, type: MediaTrackType): boolean {
  const fullMode = state.preload === 'auto' || !!state.playbackInitiated;
  const metadataMode = state.preload === 'metadata' && !state.playbackInitiated;
  return fullMode || metadataMode;
}

// ============================================================================
// STATE SELECTOR
// ============================================================================

/**
 * Discriminated union representing the dimensions tracked by the state selector.
 *
 * Pre-play tier (!playbackInitiated):
 *   - Only preload matters (determines mode and whether loading is enabled).
 *   - currentTime changes do NOT trigger re-sends (range is based on
 *     currentTime at trigger time, but we don't react to it changing).
 *   - Track selection changes are not supported in this tier; the actor
 *     lifecycle (actor appearing in owners) handles the initial trigger when
 *     the track resolves and its SourceBuffer+actor are created.
 *
 * Playing tier (playbackInitiated):
 *   - preload is irrelevant (always full mode).
 *   - resolvedTrackId: fires on track switch or when an unresolved track
 *     resolves (null when selected track is not yet resolved).
 *   - segmentStart: fires only when the playhead crosses a segment boundary,
 *     keeping send frequency to ~1 per segment duration rather than every tick.
 */
type SegmentLoadingKey =
  | { playing: false; preload: string | undefined }
  | { playing: true; resolvedTrackId: string | null; segmentStart: number | null };

function makeSegmentLoadingKey(s: SegmentLoadingState, type: MediaTrackType): SegmentLoadingKey {
  if (!s.playbackInitiated) {
    return { playing: false, preload: s.preload };
  }

  const track = getSelectedTrack(s, type);
  const resolvedTrackId = track && isResolvedTrack(track) ? track.id : null;
  const currentTime = s.currentTime ?? 0;
  const segments = resolvedTrackId && isResolvedTrack(track!) ? track!.segments : [];

  return {
    playing: true,
    resolvedTrackId,
    segmentStart: segmentStartTimeFor(currentTime, segments as readonly Segment[]),
  };
}

function segmentLoadingKeyEq(a: SegmentLoadingKey, b: SegmentLoadingKey): boolean {
  if (a.playing !== b.playing) return false;
  if (!a.playing && !b.playing) return a.preload === b.preload;
  if (a.playing && b.playing) {
    return a.resolvedTrackId === b.resolvedTrackId && a.segmentStart === b.segmentStart;
  }
  return false;
}

// ============================================================================
// REACTOR
// ============================================================================

/**
 * Load segments orchestration — Reactor layer.
 *
 * Sends typed load messages to a SegmentLoaderActor when relevant conditions
 * change. Uses targeted subscriptions rather than broad combineLatest so only
 * meaningful state changes trigger evaluation.
 *
 * Condition hierarchy (see SegmentLoadingKey for detail):
 *
 *   !playbackInitiated
 *     preload==='none' (or unset)  → dormant; no trigger
 *     preload==='metadata'         → trigger on transition to 'metadata'
 *     preload==='auto'             → trigger on transition to 'auto'
 *
 *   !playbackInitiated → playbackInitiated
 *     preload !== 'auto'           → trigger (message shape changes)
 *     preload === 'auto'           → suppressed (was already full-range mode;
 *                                    let segmentStart take over post-play)
 *                                    KNOWN LIMITATION: seek-before-play with
 *                                    preload='auto' is not supported — if the
 *                                    user seeks before pressing play, the
 *                                    first re-send is delayed until the next
 *                                    segment boundary crossing post-play.
 *
 *   playbackInitiated
 *     resolvedTrackId changes      → trigger
 *     segmentStart(currentTime) changes → trigger (segment boundary only)
 *
 * @example
 * const cleanup = loadSegments({ state, owners }, { type: 'video' });
 */
export function loadSegments(
  {
    state,
    owners,
  }: {
    state: WritableState<SegmentLoadingState>;
    owners: WritableState<SegmentLoadingOwners>;
  },
  config: { type: MediaTrackType }
): () => void {
  const { type } = config;
  const actorKey = ActorKeyByType[type];

  // Local throughput state — owns BandwidthState for this track's fetch loop.
  // Sampling is handled transparently inside fetchBytes; callers never touch it.
  //
  // MIGRATION BRIDGE: the onSample callback below keeps global state.bandwidthState
  // in sync so ABR (selectVideoTrack) continues to work unchanged. Remove this
  // bridge once ABR reads from throughput directly.
  const initialBandwidth = state.current.bandwidthState;
  const throughput = createState<BandwidthState>(
    initialBandwidth ?? {
      fastEstimate: 0,
      fastTotalWeight: 0,
      slowEstimate: 0,
      slowTotalWeight: 0,
      bytesSampled: 0,
    }
  );

  const fetchBytes = createTrackedFetch(
    throughput,
    initialBandwidth !== undefined ? (next) => state.patch({ bandwidthState: next }) : undefined
  );

  let segmentLoader: SegmentLoaderActor | null = null;

  // Derive and send a load message if all conditions are met.
  const tryToSend = () => {
    if (!segmentLoader) return;
    const currentState = state.current;
    const currentOwners = owners.current;

    if (!canLoadSegments(currentState, currentOwners, type)) return;
    if (!shouldLoadSegments(currentState, type)) return;

    const track = getSelectedTrack(currentState, type)!;
    const fullMode = currentState.preload === 'auto' || !!currentState.playbackInitiated;

    if (!fullMode) {
      // Metadata mode: init only, no range.
      segmentLoader.send({ type: 'load', track });
    } else {
      const currentTime = currentState.currentTime ?? 0;
      segmentLoader.send({
        type: 'load',
        track,
        range: {
          start: currentTime,
          end: currentTime + DEFAULT_FORWARD_BUFFER_CONFIG.bufferDuration,
        },
      });
    }
  };

  // SegmentLoaderActor lifecycle — watch only the actor key in owners so this
  // subscription does not fire on unrelated owners changes.
  const unsubActorLifecycle = owners.subscribe(
    (o) => o[actorKey],
    (actor) => {
      if (actor && !segmentLoader) {
        segmentLoader = createSegmentLoaderActor(actor, fetchBytes);
        tryToSend();
      } else if (!actor && segmentLoader) {
        segmentLoader.destroy();
        segmentLoader = null;
      }
    }
  );

  // Track previous playbackInitiated to detect the !playing→playing transition
  // and apply the preload='auto' suppression logic.
  let prevPlaybackInitiated = !!state.current.playbackInitiated;

  // State selector — fires only when a dimension relevant to the current tier
  // changes. See SegmentLoadingKey and the condition hierarchy in the JSDoc above.
  const unsubState = state.subscribe(
    (s) => makeSegmentLoadingKey(s, type),
    () => {
      const currentState = state.current;

      const isPlayTransition = !prevPlaybackInitiated && !!currentState.playbackInitiated;
      prevPlaybackInitiated = !!currentState.playbackInitiated;

      // Suppress the playbackInitiated transition when preload='auto': the actor
      // was already receiving full-range messages in the pre-play phase.
      // See KNOWN LIMITATION in JSDoc above regarding seek-before-play.
      if (isPlayTransition && currentState.preload === 'auto') return;

      tryToSend();
    },
    { equalityFn: segmentLoadingKeyEq }
  );

  return () => {
    segmentLoader?.destroy();
    segmentLoader = null;
    owners.current[actorKey]?.destroy();
    unsubActorLifecycle();
    unsubState();
  };
}
