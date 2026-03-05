import { combineLatest } from '../../all';
import { type BandwidthState, sampleBandwidth } from '../../core/abr/bandwidth-estimator';
import { DEFAULT_FORWARD_BUFFER_CONFIG } from '../../core/buffer/forward-buffer';
import { createState, type WritableState } from '../../core/state/create-state';
import type { AddressableObject, Presentation, ResolvedTrack } from '../../core/types';
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

// ============================================================================
// STATE SELECTOR
// ============================================================================

/**
 * The subset of state that drives segment loading decisions.
 * A plain "pick" with one derived field (resolved track ID).
 */
type LoadingInputs = {
  playbackInitiated: boolean | undefined;
  preload: string | undefined;
  currentTime: number | undefined;
  /** @TODO cleanup type precision via inference+generics */
  track: ReturnType<typeof getSelectedTrack>;
};

function selectLoadingInputs(s: SegmentLoadingState, type: MediaTrackType): LoadingInputs {
  const { playbackInitiated, preload, currentTime } = s;
  const track = getSelectedTrack(s, type);
  return {
    playbackInitiated,
    preload,
    currentTime,
    track,
  };
}

/**
 * Equality function encoding the condition hierarchy for relevant changes.
 *
 * Pre-play (!playbackInitiated):
 *   Only preload changes matter. currentTime and resolvedTrackId are ignored
 *   (track changes not supported pre-play; currentTime value is used at
 *   trigger time but changes don't re-trigger).
 *
 * playbackInitiated transition:
 *   Always fires (handled in the subscriber; preload='auto' suppression
 *   applied there since equality functions have no memory of prior values).
 *
 * Post-play (playbackInitiated):
 *   resolvedTrackId changes (track switch or previously-unresolved track
 *   resolving) and currentTime changes both trigger. preload is irrelevant.
 */
/** @TODO move to module scope */
const segmentStartFor = (currentTime: number | undefined, track: ResolvedTrack | undefined) => {
  if (currentTime == null) return undefined;
  return track?.segments.find(
    ({ startTime, duration }, i, segments) =>
      currentTime >= startTime && (currentTime < startTime + duration || i === segments.length - 1)
  )?.startTime;
};

/**
 * Returns true when the inputs are equal (no meaningful change — don't fire).
 * Returns false when the inputs differ in a way that requires a new message.
 *
 * This IS the shouldLoadSegments logic, expressed as an equality function.
 */
function loadingInputsEq(prevState: LoadingInputs, curState: LoadingInputs): boolean {
  // Haven't started playback. Only care about preload changes.
  if (!curState.playbackInitiated) {
    if (curState.preload === 'none') return true; // blocked — equal, don't fire
    return curState.preload === prevState.preload; // equal if preload unchanged
  }
  // Transition: !playbackInitiated → playbackInitiated
  if (!prevState.playbackInitiated && curState.playbackInitiated) {
    if (prevState.preload !== 'auto') return false; // fire — message shape changes
    // preload was 'auto': fall through to segment comparison (suppress if same position)
  }

  // Don't treat as a change if we don't (yet) have a currently resolved track.
  if (!curState.track || !isResolvedTrack(curState.track)) return true;

  // If we *do* have a currently resolved track, treat as a change if the track ids have changed
  if (prevState.track?.id !== curState.track.id && isResolvedTrack(curState.track)) return false;

  // Finally, if playback has initiated *and* we have a resolved track, check if currentTime
  // has changed "significantly" (based on segment time range boundaries) and treat as a change
  // if so (regardless of whether or not the track has changed)
  return (
    segmentStartFor(prevState.currentTime, curState.track as ResolvedTrack) ===
    segmentStartFor(curState.currentTime, curState.track as ResolvedTrack)
  );
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

  // SegmentLoaderActor lifecycle — watch only the actor key in owners so this
  // subscription does not fire on unrelated owners changes.
  const unsubActorLifecycle = owners.subscribe(
    (o) => o[actorKey],
    (actor) => {
      if (actor && !segmentLoader) {
        segmentLoader = createSegmentLoaderActor(actor, fetchBytes);
      } else if (!actor && segmentLoader) {
        segmentLoader.destroy();
        segmentLoader = null;
      }
    }
  );

  let segmentsCanLoad = false;
  const unsubscribeCanLoadSegments = combineLatest([state, owners]).subscribe(([currentState, currentOwners]) => {
    segmentsCanLoad = canLoadSegments(currentState, currentOwners, type);
  });

  const unsubscribeShouldLoadSegments = state.subscribe(
    (state) => selectLoadingInputs(state, type),
    ({ preload, playbackInitiated, currentTime, track }) => {
      if (!segmentsCanLoad || !segmentLoader) return;
      const fullMode = preload === 'auto' || !!playbackInitiated;

      if (!fullMode) {
        // Metadata mode: init only, no range.
        // @ts-expect-error
        segmentLoader.send({ type: 'load', track });
      } else {
        segmentLoader.send({
          type: 'load',

          // @ts-expect-error
          track,
          range: {
            start: currentTime as number,
            end: (currentTime as number) + DEFAULT_FORWARD_BUFFER_CONFIG.bufferDuration,
          },
        });
      }
    },
    { equalityFn: loadingInputsEq }
  );

  return () => {
    unsubscribeCanLoadSegments();
    unsubscribeShouldLoadSegments();
    segmentLoader?.destroy();
    segmentLoader = null;
    owners.current[actorKey]?.destroy();
    unsubActorLifecycle();
  };
}
