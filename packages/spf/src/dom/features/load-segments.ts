import { type BandwidthState, sampleBandwidth } from '../../core/abr/bandwidth-estimator';
import {
  calculateForwardFlushPoint,
  DEFAULT_FORWARD_BUFFER_CONFIG,
  getSegmentsToLoad,
} from '../../core/buffer/forward-buffer';
import { combineLatest } from '../../core/reactive/combine-latest';
import { createState, type WritableState } from '../../core/state/create-state';
import type { AddressableObject, Presentation } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { BufferKeyByType, getSelectedTrack, type TrackSelectionState } from '../../core/utils/track-selection';
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
 * - Blocked (preload='none' or undefined, not yet played): load nothing.
 *
 * Reads live buffer state from SourceBufferActor (via owners) rather than
 * from a stale state projection.
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

  const actorKey = ActorKeyByType[type];
  const actor = owners[actorKey];

  if (metadataMode) {
    return actor?.snapshot.context.initTrackId !== track.id;
  }

  // Full mode: check actor context directly (has timing — no bridge needed).
  if (track.segments.length === 0) return false;
  const actorCtx = actor?.snapshot.context;
  const bufferedIds = new Set(actorCtx?.segments.map((s) => s.id) ?? []);
  const bufferedSegments = track.segments.filter((s) => bufferedIds.has(s.id));
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
 * messages to a SegmentLoaderActor. The actor (created by setupSourceBuffer
 * alongside its SourceBuffer) is received via owners — this file no longer
 * creates or destroys SourceBufferActors.
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

  // SegmentLoaderActor lifecycle — driven by SourceBufferActor appearing in owners.
  // SourceBufferActor is created by setupSourceBuffer alongside its SourceBuffer
  // in a single owners.patch, so both arrive simultaneously.
  let segmentLoader: SegmentLoaderActor | null = null;

  const unsubActorLifecycle = owners.subscribe((currentOwners) => {
    const actor = currentOwners[actorKey];
    if (actor && !segmentLoader) {
      segmentLoader = createSegmentLoaderActor(actor, fetchBytes);
    } else if (!actor && segmentLoader) {
      segmentLoader.destroy();
      segmentLoader = null;
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
    // Destroy the SourceBufferActor that was created by setupSourceBuffer.
    owners.current[actorKey]?.destroy();
    unsubActorLifecycle();
    cleanup();
  };
}
