import type { BandwidthState } from '../../core/abr/bandwidth-estimator';
import { sampleBandwidth } from '../../core/abr/bandwidth-estimator';
import { combineLatest } from '../../core/reactive/combine-latest';
import type { WritableState } from '../../core/state/create-state';
import type { AddressableObject, Presentation, Segment } from '../../core/types';
import { isResolvedTrack } from '../../core/types';
import { appendSegment } from '../media/append-segment';
import { fetchResolvable } from '../network/fetch';

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

  // Update bandwidth estimate
  const currentBandwidth = context.state.current.bandwidthState!;
  const updatedBandwidth = sampleBandwidth(currentBandwidth, downloadTime, segmentData.byteLength);

  // Add segment to buffer state
  const currentBuffer = context.state.current.bufferState?.[context.bufferKey];
  const updatedSegments = [...(currentBuffer?.segments || []), { id: segment.id, trackId }];

  context.state.patch({
    bandwidthState: updatedBandwidth,
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

  const segments = track.segments;
  if (segments.length === 0) return;

  // Build array of subtask invocation functions
  const bufferKey = context.config.type as 'video' | 'audio';

  const createInitTask = () =>
    loadInitSegmentTask(
      { initialization: track.initialization, trackId: track.id },
      { signal: context.signal, sourceBuffer: context.sourceBuffer, state: context.state, bufferKey }
    );

  const createMediaTasks = segments.map(
    (segment) => () =>
      loadMediaSegmentTask(
        { segment, trackId: track.id },
        { signal: context.signal, sourceBuffer: context.sourceBuffer, state: context.state, bufferKey }
      )
  );

  // Combine: init task first, then media segment tasks
  // Future: Can conditionally include init or filter segments here
  const taskFactories = [createInitTask, ...createMediaTasks];

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
export interface SegmentLoadingState {
  selectedVideoTrackId?: string;
  presentation?: Presentation;
  preload?: string;
  bandwidthState?: BandwidthState;
}

/**
 * Owners shape for segment loading.
 */
export interface SegmentLoadingOwners {
  videoBuffer?: SourceBuffer;
}

/**
 * Check if we can load segments.
 *
 * Requires:
 * - Selected video track ID exists
 * - VideoSourceBuffer exists
 */
export function canLoadSegments(state: SegmentLoadingState, owners: SegmentLoadingOwners): boolean {
  return !!state.selectedVideoTrackId && !!owners.videoBuffer;
}

/**
 * Check if we should load segments.
 *
 * Only load if:
 * - Track is resolved (has segments)
 * - Track has at least one segment
 * - SourceBuffer is not already buffered (simple check for POC)
 */
export function shouldLoadSegments(state: SegmentLoadingState, owners: SegmentLoadingOwners): boolean {
  if (!canLoadSegments(state, owners)) {
    return false;
  }

  const track = findSelectedVideoTrack(state);
  if (!track || !isResolvedTrack(track) || track.segments.length === 0) {
    return false;
  }

  // For POC: simple check - if SourceBuffer has any buffered data, skip
  // TODO: More sophisticated buffering logic (check ranges, append new segments only)
  const sourceBuffer = owners.videoBuffer;
  if (sourceBuffer && sourceBuffer.buffered.length > 0) {
    return false;
  }

  return true;
}

/**
 * Load segments orchestration (F4 + P11 POC).
 *
 * Triggers when:
 * - Video track is selected and resolved
 * - VideoSourceBuffer exists
 * - No segments loaded yet
 *
 * Fetches and appends segments sequentially.
 * Continues on segment errors to provide partial playback.
 *
 * @example
 * const cleanup = loadSegments({ state, owners });
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

  const cleanup = combineLatest([state, owners]).subscribe(
    async ([currentState, currentOwners]: [SegmentLoadingState, SegmentLoadingOwners]) => {
      if (currentTask) return; // Task already in progress
      if (!shouldLoadSegments(currentState, currentOwners, type)) return;

      const sourceBuffer = currentOwners[BufferKeyByType[type]];
      if (!sourceBuffer) return;

      // Create abort controller and invoke task
      abortController = new AbortController();
      currentTask = loadSegmentsTask(
        { currentState },
        { signal: abortController.signal, sourceBuffer, state, config: { type } }
      );

      try {
        await currentTask;
      } finally {
        // Cleanup orchestration state
        currentTask = null;
        abortController = null;
      }
    }
  );

  // Return cleanup function that aborts pending task
  return () => {
    abortController?.abort();
    cleanup();
  };
}
