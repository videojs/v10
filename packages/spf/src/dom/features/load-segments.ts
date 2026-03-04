import { type BandwidthState, sampleBandwidth } from '../../core/abr/bandwidth-estimator';
import { calculateBackBufferFlushPoint } from '../../core/buffer/back-buffer';
import { calculateForwardFlushPoint, getSegmentsToLoad } from '../../core/buffer/forward-buffer';
import { combineLatest } from '../../core/reactive/combine-latest';
import { createState, type WritableState } from '../../core/state/create-state';
import type { AddressableObject, Presentation, Segment } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { BufferKeyByType, getSelectedTrack, type TrackSelectionState } from '../../core/utils/track-selection';
import {
  createSourceBufferActor,
  type SourceBufferActor,
  type SourceBufferMessage,
} from '../media/source-buffer-actor';
import { fetchResolvableBytes } from '../network/fetch';
import type { MediaTrackType } from './setup-sourcebuffer';

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
// BUFFER STATE TYPES
// ============================================================================

/**
 * Buffer state for a single SourceBuffer.
 * Tracks which init segment and media segments are loaded.
 */
export interface SourceBufferState {
  /** Track ID of the loaded init segment */
  initTrackId?: string;

  /** Loaded media segments (unordered - selectors derive ordering) */
  segments: Array<{
    id: string;
    trackId: string;
  }>;
}

/**
 * Buffer state for all SourceBuffers.
 */
export interface BufferState {
  video?: SourceBufferState;
  audio?: SourceBufferState;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Resolve full Segment objects from buffer state IDs.
 * Bridges the { id, trackId } records in SourceBufferState back to Segment
 * objects with startTime/duration that getSegmentsToLoad requires.
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
// MAIN TASK (composite - orchestrates fetch + actor operations)
// ============================================================================

/**
 * Load segments task.
 *
 * Two-phase approach:
 *   1. Fetch — sequential network I/O, interruptible by abort signal.
 *              Bandwidth is sampled per segment immediately after each fetch.
 *   2. Execute — all SourceBuffer operations (removes + appends) submitted
 *                to the actor as a single batch so they are atomic. A remove
 *                and a subsequent append can never be observed independently
 *                by other subscribers, eliminating the class of model-drift
 *                bugs the actor was designed to prevent.
 */
const loadSegmentsTask = async <T extends MediaTrackType>(
  { currentState }: { currentState: SegmentLoadingState },
  context: {
    signal: AbortSignal;
    actor: SourceBufferActor;
    fetchBytes: (addressable: AddressableObject, options?: RequestInit) => Promise<ArrayBuffer>;
    state: WritableState<{ bufferState?: BufferState }>;
    config: { type: T };
  }
): Promise<void> => {
  const track = getSelectedTrack(currentState, context.config.type);
  if (!track || !isResolvedTrack(track)) return;
  if (track.segments.length === 0) return;

  const bufferKey = context.config.type as 'video' | 'audio';

  // Sync actor context → state.bufferState at task exit (success, abort, or
  // error) so endOfStream and shouldLoadSegments always see accurate state.
  // This is done via finally rather than a subscribe bridge to avoid
  // intermediate fires between removes and appends within a single task.
  const syncActorToState = () => {
    const ctx = context.actor.snapshot.context;
    context.state.patch({
      bufferState: {
        ...context.state.current.bufferState,
        [bufferKey]: {
          initTrackId: ctx.initTrackId,
          segments: ctx.segments.map((s) => ({ id: s.id, trackId: s.trackId })),
        },
      },
    });
  };

  try {
    const bufferState = context.state.current.bufferState?.[bufferKey];

    const metadataMode = currentState.preload === 'metadata' && !currentState.playbackInitiated;
    const bufferedSegments = resolveBufferedSegments(track.segments, bufferState);
    const currentTime = currentState.currentTime ?? 0;
    const segmentsToLoad = metadataMode ? [] : getSegmentsToLoad(track.segments, bufferedSegments, currentTime);

    const needsInit = bufferState?.initTrackId !== track.id;
    const isTrackSwitch = needsInit && !!bufferState?.initTrackId;
    const forwardFlushStart = calculateForwardFlushPoint(bufferedSegments, currentTime);

    if (!needsInit && segmentsToLoad.length === 0 && forwardFlushStart === Infinity) return;

    // ==========================================================================
    // Phase 1: Remove (flush operations before fetching)
    //
    // Removes are submitted to the actor first — before any network I/O — so
    // the model stays consistent with the physical SourceBuffer state even if
    // the signal is aborted mid-task. init + media appends are batched together
    // as a separate operation after all segment data has been fetched.
    // ==========================================================================

    const removeMessages: SourceBufferMessage[] = [];

    if (isTrackSwitch) {
      removeMessages.push({ type: 'remove', start: 0, end: Infinity });
    } else {
      if (forwardFlushStart < Infinity) {
        removeMessages.push({ type: 'remove', start: forwardFlushStart, end: Infinity });
      }
      const flushEnd = calculateBackBufferFlushPoint(bufferedSegments, currentTime);
      if (flushEnd > 0) {
        removeMessages.push({ type: 'remove', start: 0, end: flushEnd });
      }
    }

    if (removeMessages.length > 0) {
      if (removeMessages.length === 1) {
        await context.actor.send(removeMessages[0]!, context.signal);
      } else {
        await context.actor.batch(removeMessages, context.signal);
      }
      if (context.signal.aborted) return;
    }

    // ==========================================================================
    // Phase 2: Fetch (network I/O, interruptible)
    // ==========================================================================

    let initData: ArrayBuffer | null = null;
    if (needsInit) {
      if (context.signal.aborted) return;
      initData = await context.fetchBytes(track.initialization, { signal: context.signal });
    }

    const fetchedSegments: Array<{ segment: Segment; data: ArrayBuffer }> = [];
    for (const segment of segmentsToLoad) {
      if (context.signal.aborted) break;
      const data = await context.fetchBytes(segment, { signal: context.signal });
      fetchedSegments.push({ segment, data });
    }

    // ==========================================================================
    // Phase 3: Append (init + media segments batched together)
    //
    // Init is always appended if downloaded, even when the signal was aborted
    // mid-fetch. It is codec metadata — appending it is position-independent
    // and prevents a redundant re-fetch on the next task. Media segments are
    // skipped when aborted since they belong to the pre-seek buffer window.
    //
    // When appending init-only after an abort we create a fresh signal so the
    // actor's task factories (which guard against pre-aborted signals) don't
    // skip the operation.
    // ==========================================================================

    const appendMessages: SourceBufferMessage[] = [];

    if (initData) {
      appendMessages.push({ type: 'append-init', data: initData, meta: { trackId: track.id } });
    }

    if (!context.signal.aborted) {
      for (const { segment, data } of fetchedSegments) {
        appendMessages.push({
          type: 'append-segment',
          data,
          meta: {
            id: segment.id,
            startTime: segment.startTime,
            duration: segment.duration,
            trackId: track.id,
          },
        });
      }
    }

    if (appendMessages.length === 0) return;

    const appendSignal = context.signal.aborted ? new AbortController().signal : context.signal;

    if (appendMessages.length === 1) {
      await context.actor.send(appendMessages[0]!, appendSignal);
    } else {
      await context.actor.batch(appendMessages, appendSignal);
    }

    // Wait a frame to allow state updates to flush before the loop re-evaluates.
    await new Promise((resolve) => requestAnimationFrame(resolve));
  } finally {
    syncActorToState();
  }
};

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
 * Check if we should run a segment task (loading or flushing).
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
 * because `loadSegmentsTask` owns both loading and flushing in V1, and the
 * task must be triggered even when nothing new needs loading (e.g. after a
 * seek-back where far-ahead content needs to be removed but the load window
 * is already satisfied). A cleaner architecture would separate these concerns:
 * a dedicated flush orchestrator would subscribe independently to `currentTime`
 * changes and handle SourceBuffer trimming without coupling to the load path.
 * The root issue is that `SourceBufferState` (and our broader buffer model) does
 * not yet capture enough information to reason about the physical state of the
 * SourceBuffer independently of the loading pipeline.
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
    // Metadata mode: only proceed if init segment hasn't been loaded yet
    return state.bufferState?.[bufferKey]?.initTrackId !== track.id;
  }

  // Full mode: run the task if there are segments to load OR stale forward
  // content to flush. See JSDoc above for why these are combined here rather
  // than in a separate orchestrator.
  if (track.segments.length === 0) return false;
  const bufferedSegments = resolveBufferedSegments(track.segments, state.bufferState?.[bufferKey]);
  const currentTime = state.currentTime ?? 0;

  return (
    getSegmentsToLoad(track.segments, bufferedSegments, currentTime).length > 0 ||
    calculateForwardFlushPoint(bufferedSegments, currentTime) < Infinity
  );
}

/**
 * Load segments orchestration (F4 + F5).
 *
 * Triggers when:
 * - Track is selected and resolved (video or audio)
 * - SourceBuffer exists for track type
 * - Forward buffer calculator says segments are needed
 *
 * Seek handling: at most one executing task and one pending slot.
 * When a seek is detected (needed segments are completely disjoint from
 * what the current task is loading), the current task is aborted.
 * The latest state is always stored as pending and picked up once the
 * current task finishes (via abort or natural completion).
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

  // SourceBufferActor lifecycle — co-located with its consumer to avoid
  // triggering extra notification cycles on other owners subscribers.
  // Managed in a dedicated owners subscription registered before the main
  // combineLatest loop, so the actor is created exactly once when the
  // SourceBuffer first appears and destroyed only on genuine teardown.
  let actor: SourceBufferActor | null = null;

  const unsubActorLifecycle = owners.subscribe((currentOwners) => {
    const sourceBuffer = currentOwners[BufferKeyByType[type]];
    if (sourceBuffer && !actor) {
      // Sync any existing bufferState into the actor's initial context so it
      // starts consistent with whatever was already loaded before this actor
      // was created (e.g. tests that pre-seed state, or future session restore).
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

      // No subscribe bridge here — state.bufferState is synced explicitly at
      // the end of each loadSegmentsTask via try/finally. Bridging on every
      // actor idle transition causes intermediate fires (between removes and
      // appends) that confuse shouldLoadSegments and trigger re-fetches.
      actor = createSourceBufferActor(sourceBuffer, initialContext);
    } else if (!sourceBuffer && actor) {
      actor.destroy();
      actor = null;
    }
  });

  let currentTask: Promise<void> | null = null;
  let abortController: AbortController | null = null;
  let pendingSnapshot: [SegmentLoadingState, SegmentLoadingOwners] | null = null;
  let taskSegmentIds: Set<string> = new Set();

  const runTaskLoop = async (initialState: SegmentLoadingState, initialOwners: SegmentLoadingOwners): Promise<void> => {
    let currentState = initialState;
    let currentOwners = initialOwners;

    while (true) {
      if (!shouldLoadSegments(currentState, currentOwners, type)) {
        break;
      }

      if (!actor) {
        break;
      }

      // Track which segments this iteration intends to load (for seek detection)
      const track = getSelectedTrack(currentState, type);
      if (track && isResolvedTrack(track)) {
        const buffered = resolveBufferedSegments(track.segments, currentState.bufferState?.[bufferKey]);
        taskSegmentIds = new Set(
          getSegmentsToLoad(track.segments, buffered, currentState.currentTime ?? 0).map((s) => s.id)
        );
      }

      abortController = new AbortController();
      currentTask = loadSegmentsTask(
        { currentState },
        { signal: abortController.signal, actor, fetchBytes, state, config: { type } }
      );

      try {
        await currentTask;
      } catch (error) {
        // AbortErrors are expected when a seek aborts the current task.
        // Non-abort errors are logged but don't crash the loop.
        if (!(error instanceof Error && error.name === 'AbortError')) {
          console.error('Unexpected error in segment loading task:', error);
        }
      }

      abortController = null;
      taskSegmentIds = new Set();

      const pending = pendingSnapshot;
      pendingSnapshot = null;

      if (!pending) {
        break;
      }

      [currentState, currentOwners] = pending;
    }

    currentTask = null;
  };

  const cleanup = combineLatest([state, owners]).subscribe(
    async ([currentState, currentOwners]: [SegmentLoadingState, SegmentLoadingOwners]) => {
      if (currentTask) {
        pendingSnapshot = [currentState, currentOwners];

        if (taskSegmentIds.size > 0) {
          const track = getSelectedTrack(currentState, type);
          if (track && isResolvedTrack(track)) {
            const buffered = resolveBufferedSegments(track.segments, currentState.bufferState?.[bufferKey]);
            const needed = getSegmentsToLoad(track.segments, buffered, currentState.currentTime ?? 0);
            if (needed.length > 0 && needed.every((s) => !taskSegmentIds.has(s.id))) {
              abortController?.abort();
            }
          }
        }
        return;
      }

      await runTaskLoop(currentState, currentOwners);
    }
  );

  return () => {
    abortController?.abort();
    actor?.destroy();
    unsubActorLifecycle();
    cleanup();
  };
}
