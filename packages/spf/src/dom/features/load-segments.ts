import { type BandwidthState, sampleBandwidth } from '../../core/abr/bandwidth-estimator';
import {
  calculateForwardFlushPoint,
  DEFAULT_FORWARD_BUFFER_CONFIG,
  getSegmentsToLoad,
} from '../../core/buffer/forward-buffer';
import { combineLatest } from '../../core/reactive/combine-latest';
import { createState, type WritableState } from '../../core/state/create-state';
import type { AddressableObject, Presentation, Segment } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { BufferKeyByType, getSelectedTrack, type TrackSelectionState } from '../../core/utils/track-selection';
import { createSourceBufferActor, type SourceBufferActor } from '../media/source-buffer-actor';
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

// ============================================================================
// TRACKED FETCH
// ============================================================================

/**
 * Creates a fetch function that transparently samples bandwidth after each
 * completed request. Callers receive bytes; throughput tracking is invisible.
 *
 * The returned function closes over `throughput` — sampling and model updates
 * happen internally with no action required at the call site.
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
 * Resolve full Segment objects from buffer state IDs.
 * Used by shouldLoadSegments to bridge state.bufferState (ID-only) back to
 * Segment objects with timing for window calculations.
 */
function resolveBufferedSegments(
  allSegments: readonly Segment[],
  bufferState: SourceBufferState | undefined
): Segment[] {
  if (!bufferState?.segments?.length) return [];
  const bufferedIds = new Set(bufferState.segments.map((s) => s.id));
  return allSegments.filter((seg) => bufferedIds.has(seg.id));
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
  /** Buffer state tracking which segments have been loaded per track type. */
  bufferState?: BufferState;
  /** True once the user has initiated playback. Allows segment loading regardless of preload setting. */
  playbackInitiated?: boolean;
}

/**
 * Owners shape for segment loading.
 */
export interface SegmentLoadingOwners {
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
}

// ============================================================================
// LOAD DECISION HELPERS
// ============================================================================

/**
 * Check if we can load segments.
 *
 * Requires:
 * - Selected track ID exists
 * - SourceBuffer exists for track type
 */
export function canLoadSegments(
  state: SegmentLoadingState,
  owners: SegmentLoadingOwners,
  type: MediaTrackType
): boolean {
  const track = getSelectedTrack(state, type);
  if (!track) return false;

  const bufferKey = BufferKeyByType[type];
  const sourceBuffer = owners[bufferKey];
  return !!sourceBuffer;
}

/**
 * Check if we should send a load message to the SegmentLoaderActor.
 *
 * Three loading modes based on preload + playbackInitiated:
 *
 * - Full mode (preload='auto' OR playbackInitiated): load init + media segments.
 * - Metadata mode (preload='metadata', not yet played): load init segment only.
 *   The init segment (moov box) advances readyState to HAVE_METADATA, satisfying
 *   the browser's preload="metadata" contract and avoiding a stuck HAVE_NOTHING state.
 * - Blocked (preload='none' or undefined, not yet played): load nothing.
 *
 * @note Architectural debt: this function conflates two distinct concerns —
 * "should we load new data?" and "should we flush stale forward-buffer data?".
 * The forward-flush check (`calculateForwardFlushPoint`) is included here
 * because the actor owns both loading and flushing in V1, and the message
 * must be sent even when nothing new needs loading (e.g. after a seek-back
 * where far-ahead content needs to be removed but the load window is already
 * satisfied). See segment-loader-actor.ts for the flush logic.
 */
export function shouldLoadSegments(
  state: SegmentLoadingState,
  owners: SegmentLoadingOwners,
  type: MediaTrackType
): boolean {
  if (!canLoadSegments(state, owners, type)) {
    return false;
  }

  const fullMode = state.preload === 'auto' || !!state.playbackInitiated;
  const metadataMode = state.preload === 'metadata' && !state.playbackInitiated;

  if (!fullMode && !metadataMode) {
    return false;
  }

  const track = getSelectedTrack(state, type);
  if (!track || !isResolvedTrack(track)) {
    return false;
  }

  const bufferKey = type as 'video' | 'audio';

  if (metadataMode) {
    return state.bufferState?.[bufferKey]?.initTrackId !== track.id;
  }

  if (track.segments.length === 0) return false;
  const bufferedSegments = resolveBufferedSegments(track.segments, state.bufferState?.[bufferKey]);
  const currentTime = state.currentTime ?? 0;

  return (
    getSegmentsToLoad(track.segments, bufferedSegments, currentTime).length > 0 ||
    calculateForwardFlushPoint(bufferedSegments, currentTime) < Infinity
  );
}

// ============================================================================
// REACTOR
// ============================================================================

/**
 * Load segments orchestration — Reactor layer.
 *
 * Watches state and owners for meaningful changes, then sends typed load
 * messages to a SegmentLoaderActor. The actor owns all execution logic:
 * removes, fetches, appends, seek detection, and task scheduling.
 *
 * Loading modes are interpreted here and encoded into the message shape:
 * - Metadata mode (preload='metadata', !playbackInitiated): no range → actor
 *   loads init only.
 * - Full mode (preload='auto' or playbackInitiated): range [currentTime,
 *   currentTime + bufferDuration] → actor loads init + segments in window.
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
  const bufferKey = type as 'video' | 'audio';

  // Local throughput state — owns BandwidthState for this track's fetch loop.
  // Sampling is handled transparently inside fetchBytes; callers never touch it.
  //
  // MIGRATION BRIDGE: the onSample callback below keeps global state.bandwidthState
  // in sync so ABR (selectVideoTrack) continues to work unchanged. Remove this
  // bridge once ABR reads from throughput directly.
  //
  // A callback is used (not a subscription) because subscriptions fire immediately
  // on registration, which would cause a spurious state.patch before any work
  // starts and trigger unnecessary combineLatest re-evaluations.
  //
  // The bridge is only installed when bandwidthState was initially configured,
  // preserving the previous behaviour of not writing bandwidthState in contexts
  // (e.g. tests) where it was never set.
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

  // SourceBufferActor + SegmentLoaderActor lifecycle.
  // Both are created together when a SourceBuffer becomes available and
  // destroyed together when it is removed. The SegmentLoaderActor receives
  // the SourceBufferActor as a construction-time dependency.
  let sourceBufferActorInstance: SourceBufferActor | null = null;
  let segmentLoader: SegmentLoaderActor | null = null;

  const unsubActorLifecycle = owners.subscribe((currentOwners) => {
    const sourceBuffer = currentOwners[BufferKeyByType[type]];
    if (sourceBuffer && !sourceBufferActorInstance) {
      // Seed the SourceBufferActor's initial context from existing bufferState
      // so it starts consistent with whatever was already loaded before this
      // actor was created (e.g. tests that pre-seed state, session restore).
      const existingBufState = state.current.bufferState?.[bufferKey];
      const existingTrack = getSelectedTrack(state.current, type);
      const initialContext =
        existingBufState && existingTrack && isResolvedTrack(existingTrack)
          ? {
              initTrackId: existingBufState.initTrackId,
              segments: existingBufState.segments.flatMap((bs) => {
                const seg = existingTrack.segments.find((s) => s.id === bs.id);
                return seg
                  ? [{ id: seg.id, startTime: seg.startTime, duration: seg.duration, trackId: bs.trackId }]
                  : [];
              }),
            }
          : undefined;

      sourceBufferActorInstance = createSourceBufferActor(sourceBuffer, initialContext);
      segmentLoader = createSegmentLoaderActor(sourceBufferActorInstance, fetchBytes, state, config);
    } else if (!sourceBuffer && sourceBufferActorInstance) {
      segmentLoader?.destroy();
      segmentLoader = null;
      sourceBufferActorInstance.destroy();
      sourceBufferActorInstance = null;
    }
  });

  // Reactor: derive a SegmentLoaderMessage from the current state snapshot
  // and send it to the actor. The actor owns all scheduling and execution.
  const cleanup = combineLatest([state, owners]).subscribe(
    ([currentState, currentOwners]: [SegmentLoadingState, SegmentLoadingOwners]) => {
      if (!segmentLoader) return;
      if (!shouldLoadSegments(currentState, currentOwners, type)) return;

      const track = getSelectedTrack(currentState, type);
      if (!track || !isResolvedTrack(track)) return;

      const fullMode = currentState.preload === 'auto' || !!currentState.playbackInitiated;
      const metadataMode = currentState.preload === 'metadata' && !currentState.playbackInitiated;

      if (metadataMode) {
        segmentLoader.send({ type: 'load', track });
      } else if (fullMode) {
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
    }
  );

  return () => {
    segmentLoader?.destroy();
    segmentLoader = null;
    sourceBufferActorInstance?.destroy();
    sourceBufferActorInstance = null;
    unsubActorLifecycle();
    cleanup();
  };
}
