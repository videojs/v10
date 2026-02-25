import type { BandwidthState } from '../../core/abr/bandwidth-estimator';
import { sampleBandwidth } from '../../core/abr/bandwidth-estimator';
import { calculateBackBufferFlushPoint } from '../../core/buffer/back-buffer';
import { calculateForwardFlushPoint, getSegmentsToLoad } from '../../core/buffer/forward-buffer';
import { combineLatest } from '../../core/reactive/combine-latest';
import type { WritableState } from '../../core/state/create-state';
import type { AddressableObject, Presentation, Segment } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { BufferKeyByType, getSelectedTrack, type TrackSelectionState } from '../../core/utils/track-selection';
import { appendSegment } from '../media/append-segment';
import { flushBuffer } from '../media/buffer-flusher';
import { fetchResolvable } from '../network/fetch';
import type { MediaTrackType } from './setup-sourcebuffer';

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

  /**
   * True when the loading pipeline ran to completion for this track —
   * the last segment is present and there is nothing left to load.
   * Reset to false at the start of any new loading run (e.g. seek-back)
   * so that a stale last-segment ID from a prior play-through is not
   * mistaken for a freshly completed pipeline.
   */
  completed: boolean;
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
// SUBTASKS (module-level)
// ============================================================================

/**
 * Load initialization segment subtask.
 */
const loadInitSegmentTask = async (
  { initialization, trackId }: { initialization: AddressableObject; trackId: string },
  context: {
    signal: AbortSignal;
    sourceBuffer: SourceBuffer;
    state: WritableState<{ bufferState?: BufferState }>;
    bufferKey: 'video' | 'audio';
  }
): Promise<void> => {
  const response = await fetchResolvable(initialization, { signal: context.signal });
  const initData = await response.arrayBuffer();
  await appendSegment(context.sourceBuffer, initData);

  // Track init segment in buffer state
  const currentBuffer = context.state.current.bufferState?.[context.bufferKey];
  context.state.patch({
    bufferState: {
      ...context.state.current.bufferState,
      [context.bufferKey]: {
        ...currentBuffer,
        initTrackId: trackId,
      },
    },
  });
};

/**
 * Load media segment subtask.
 * Tracks download time/bytes for bandwidth and adds segment to buffer state.
 */
const loadMediaSegmentTask = async (
  { segment, trackId }: { segment: Segment; trackId: string },
  context: {
    signal: AbortSignal;
    sourceBuffer: SourceBuffer;
    state: WritableState<{ bandwidthState?: BandwidthState; bufferState?: BufferState }>;
    bufferKey: 'video' | 'audio';
  }
): Promise<void> => {
  const startTime = performance.now();
  const response = await fetchResolvable(segment, { signal: context.signal });
  const segmentData = await response.arrayBuffer();
  const downloadTime = performance.now() - startTime;

  await appendSegment(context.sourceBuffer, segmentData);

  // Update bandwidth estimate (only when bandwidthState is initialised)
  const currentBandwidth = context.state.current.bandwidthState;
  const updatedBandwidth = currentBandwidth
    ? sampleBandwidth(currentBandwidth, downloadTime, segmentData.byteLength)
    : undefined;

  // Add segment to buffer state
  const currentBuffer = context.state.current.bufferState?.[context.bufferKey];
  const updatedSegments = [...(currentBuffer?.segments || []), { id: segment.id, trackId }];

  context.state.patch({
    ...(updatedBandwidth && { bandwidthState: updatedBandwidth }),
    bufferState: {
      ...context.state.current.bufferState,
      [context.bufferKey]: {
        ...currentBuffer,
        segments: updatedSegments,
      },
    },
  });
};

// ============================================================================
// MAIN TASK (composite - orchestrates subtasks)
// ============================================================================

/**
 * Load segments task (composite - orchestrates init + media segment subtasks).
 */
const loadSegmentsTask = async <T extends MediaTrackType>(
  { currentState }: { currentState: SegmentLoadingState },
  context: {
    signal: AbortSignal;
    sourceBuffer: SourceBuffer;
    state: WritableState<{ bandwidthState?: BandwidthState; bufferState?: BufferState }>;
    config: { type: T };
  }
): Promise<void> => {
  const track = getSelectedTrack(currentState, context.config.type);
  if (!track || !isResolvedTrack(track)) return;

  if (track.segments.length === 0) return;

  const bufferKey = context.config.type as 'video' | 'audio';
  const bufferState = context.state.current.bufferState?.[bufferKey];

  // Metadata mode: load init segment only — satisfies browser's preload="metadata"
  // contract (advances readyState to HAVE_METADATA) without buffering media data.
  const metadataMode = currentState.preload === 'metadata' && !currentState.playbackInitiated;

  // Determine which segments the forward buffer calculator says to load.
  // Metadata mode loads no media segments — just the init segment below.
  const bufferedSegments = resolveBufferedSegments(track.segments, bufferState);
  const currentTime = currentState.currentTime ?? 0;
  const segmentsToLoad = metadataMode ? [] : getSegmentsToLoad(track.segments, bufferedSegments, currentTime);

  // Only load init segment if not already loaded for this track
  const needsInit = bufferState?.initTrackId !== track.id;

  // Compute forward flush point before the early-return guard. We must not
  // bail out early when there are segments beyond the buffer window to remove,
  // even if the load window is already fully satisfied. This is the counterpart
  // to placing the forward-flush check in shouldLoadSegments — both need to be
  // aware of the same "flush or load" condition. See shouldLoadSegments JSDoc.
  const forwardFlushStart = calculateForwardFlushPoint(bufferedSegments, currentTime);

  if (!needsInit && segmentsToLoad.length === 0 && forwardFlushStart === Infinity) return;

  // Reset completed so the end-of-stream orchestrator doesn't mistake a
  // stale last-segment ID (from a prior play-through) for a finished pipeline.
  // Only patch when transitioning true→false to avoid a spurious state change
  // (and its subscriber side-effects) when completed is already false.
  if (segmentsToLoad.length > 0) {
    const currentBuf = context.state.current.bufferState?.[bufferKey];
    if (currentBuf?.completed) {
      context.state.patch({
        bufferState: {
          ...context.state.current.bufferState,
          [bufferKey]: { ...currentBuf, completed: false },
        },
      });
    }
  }

  // Forward buffer management (B5): flush segments too far ahead of currentTime.
  // After seeks, the SourceBuffer can accumulate scattered content from prior
  // positions. Removing it keeps memory bounded and prevents QuotaExceededError
  // on long-form content.
  if (forwardFlushStart < Infinity) {
    await flushBuffer(context.sourceBuffer, forwardFlushStart, Infinity);

    const currentBufferStateForForward = context.state.current.bufferState?.[bufferKey];
    if (currentBufferStateForForward) {
      const remaining = currentBufferStateForForward.segments.filter((s) => {
        const seg = track.segments.find((ts) => ts.id === s.id);
        return seg ? seg.startTime < forwardFlushStart : true;
      });
      context.state.patch({
        bufferState: {
          ...context.state.current.bufferState,
          [bufferKey]: { ...currentBufferStateForForward, segments: remaining },
        },
      });
    }
  }

  // Back buffer management (F6): flush old segments before loading new ones.
  // Uses bufferedSegments (what's actually appended) not track.segments, so we
  // only flush data we've loaded — avoids spurious flushes when seeking into
  // an unloaded region. calculateBackBufferFlushPoint returns 0 when nothing
  // needs flushing.
  const flushEnd = calculateBackBufferFlushPoint(bufferedSegments, currentTime);
  if (flushEnd > 0) {
    await flushBuffer(context.sourceBuffer, 0, flushEnd);

    // Remove flushed segments from bufferState so the forward buffer
    // calculator doesn't consider them buffered (e.g. after a backward seek).
    const currentBufferState = context.state.current.bufferState?.[bufferKey];
    if (currentBufferState) {
      const remaining = currentBufferState.segments.filter((s) => {
        const seg = track.segments.find((ts) => ts.id === s.id);
        return seg ? seg.startTime >= flushEnd : true;
      });
      context.state.patch({
        bufferState: {
          ...context.state.current.bufferState,
          [bufferKey]: { ...currentBufferState, segments: remaining },
        },
      });
    }
  }

  const createInitTask = () =>
    loadInitSegmentTask(
      { initialization: track.initialization, trackId: track.id },
      { signal: context.signal, sourceBuffer: context.sourceBuffer, state: context.state, bufferKey }
    );

  const createMediaTasks = segmentsToLoad.map(
    (segment) => () =>
      loadMediaSegmentTask(
        { segment, trackId: track.id },
        { signal: context.signal, sourceBuffer: context.sourceBuffer, state: context.state, bufferKey }
      )
  );

  // Init first (if needed), then media segments within the buffer window
  const taskFactories = needsInit ? [createInitTask, ...createMediaTasks] : createMediaTasks;

  // Track current subtask (same pattern as main task tracking)
  let currentSubtask: Promise<void> | null = null;

  // Execute subtasks sequentially
  for (const createTask of taskFactories) {
    if (context.signal.aborted) break;

    // Invoke task factory and store promise
    currentSubtask = createTask();

    try {
      await currentSubtask;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') break;
      console.error('Failed to load segment:', error);
      // Continue to next segment (graceful degradation)
    } finally {
      currentSubtask = null;
    }
  }

  // Wait a frame before completing to allow state updates to flush
  await new Promise((resolve) => requestAnimationFrame(resolve));
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
  let currentTask: Promise<void> | null = null;
  let abortController: AbortController | null = null;
  let pendingSnapshot: [SegmentLoadingState, SegmentLoadingOwners] | null = null;
  let taskSegmentIds: Set<string> = new Set();

  // Runs one or more sequential task iterations, picking up pending snapshots
  // after each completion. currentTask stays non-null for the entire duration
  // so subscribers always feed into pendingSnapshot rather than starting a
  // second parallel execution.
  const runTaskLoop = async (initialState: SegmentLoadingState, initialOwners: SegmentLoadingOwners): Promise<void> => {
    let currentState = initialState;
    let currentOwners = initialOwners;

    while (true) {
      if (!shouldLoadSegments(currentState, currentOwners, type)) break;

      const sourceBuffer = currentOwners[BufferKeyByType[type]];
      if (!sourceBuffer) break;

      // Track which segments this iteration intends to load (for seek detection)
      const track = getSelectedTrack(currentState, type);
      if (track && isResolvedTrack(track)) {
        const bufferKey = type as 'video' | 'audio';
        const buffered = resolveBufferedSegments(track.segments, currentState.bufferState?.[bufferKey]);
        taskSegmentIds = new Set(
          getSegmentsToLoad(track.segments, buffered, currentState.currentTime ?? 0).map((s) => s.id)
        );
      }

      abortController = new AbortController();
      currentTask = loadSegmentsTask(
        { currentState },
        { signal: abortController.signal, sourceBuffer, state, config: { type } }
      );

      await currentTask;

      abortController = null;
      taskSegmentIds = new Set();

      // Pick up the latest pending snapshot (if any)
      const pending = pendingSnapshot;
      pendingSnapshot = null;

      if (!pending) break;

      [currentState, currentOwners] = pending;
    }

    // After the loop exits, check whether the loading pipeline reached the
    // natural end of the track. If the last segment's ID is now in bufferState,
    // mark completed so the end-of-stream orchestrator can proceed.
    const bufferKey = type as 'video' | 'audio';
    const latestState = state.current;
    const latestBufState = latestState.bufferState?.[bufferKey];
    const finalTrack = getSelectedTrack(latestState, type);
    if (finalTrack && isResolvedTrack(finalTrack) && finalTrack.segments.length > 0) {
      const lastSeg = finalTrack.segments[finalTrack.segments.length - 1];
      if (lastSeg && latestBufState?.segments?.some((s) => s.id === lastSeg.id) && !latestBufState?.completed) {
        state.patch({
          bufferState: {
            ...latestState.bufferState,
            [bufferKey]: { ...latestBufState, completed: true },
          },
        });
      }
    }

    currentTask = null;
  };

  const cleanup = combineLatest([state, owners]).subscribe(
    async ([currentState, currentOwners]: [SegmentLoadingState, SegmentLoadingOwners]) => {
      if (currentTask) {
        // Store latest state as pending (replaces any previous pending)
        pendingSnapshot = [currentState, currentOwners];

        // Seek detection: abort if the needed segments are completely disjoint
        // from what the current task is loading (currentTime jumped to new position)
        if (taskSegmentIds.size > 0) {
          const track = getSelectedTrack(currentState, type);
          if (track && isResolvedTrack(track)) {
            const bufferKey = type as 'video' | 'audio';
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
    cleanup();
  };
}
