import { calculateBackBufferFlushPoint } from '../../core/buffer/back-buffer';
import { calculateForwardFlushPoint, getSegmentsToLoad } from '../../core/buffer/forward-buffer';
import type { AddressableObject, AudioTrack, Segment, VideoTrack } from '../../core/types';
import type { SourceBufferActor, SourceBufferMessage } from '../media/source-buffer-actor';
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
  segments: Array<{ id: string; trackId: string }>;
}

/**
 * Buffer state for all SourceBuffers.
 */
export interface BufferState {
  video?: SourceBufferState;
  audio?: SourceBufferState;
}

// ============================================================================
// MESSAGE PROTOCOL
// ============================================================================

/** Track types that have SourceBuffers (video and audio only). */
export type SegmentLoaderTrack = VideoTrack | AudioTrack;

/**
 * Message sent to a SegmentLoaderActor.
 *
 * `range` is optional to distinguish loading modes:
 * - No range: load init segment only (metadata preload mode)
 * - With range: load init + all segments overlapping [start, end]
 *
 * `start` and `end` are raw time values — no segment snapping.
 * The actor maps them onto segment boundaries internally.
 */
export type SegmentLoaderMessage = {
  type: 'load';
  track: SegmentLoaderTrack;
  range?: { start: number; end: number };
};

// ============================================================================
// ACTOR INTERFACE
// ============================================================================

export interface SegmentLoaderActor {
  send(message: SegmentLoaderMessage): void;
  destroy(): void;
}

// ============================================================================
// MIGRATION ARTIFACT
// ============================================================================

/**
 * Minimal state interface required by the actor during migration.
 *
 * The actor syncs its buffer model to global state so endOfStream continues
 * to work without changes. Remove this dependency once endOfStream reads
 * from SourceBufferActor directly.
 */
interface MigrationState {
  current: { bufferState?: BufferState };
  patch(update: { bufferState?: BufferState }): void;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

/**
 * Creates a SegmentLoaderActor for one track type (video or audio).
 *
 * The actor receives load assignments via `send()` and owns all execution:
 * removes, fetches, and appends. It coordinates with the SourceBufferActor
 * for all physical SourceBuffer operations.
 *
 * Step 1 implementation: behaviour is identical to the previous loadSegmentsTask
 * — batch fetch then batch append. The actor boundary is established here;
 * streaming and continue/preempt logic are future steps.
 *
 * @param sourceBufferActor - Shared SourceBufferActor reference (not owned)
 * @param fetchBytes - Tracked fetch closure (owns throughput sampling)
 * @param state - Global state reference (migration artifact for syncActorToState)
 * @param config - Track type configuration
 */
export function createSegmentLoaderActor(
  sourceBufferActor: SourceBufferActor,
  fetchBytes: (addressable: AddressableObject, options?: RequestInit) => Promise<ArrayBuffer>,
  state: MigrationState,
  config: { type: MediaTrackType }
): SegmentLoaderActor {
  const bufferKey = config.type as 'video' | 'audio';

  let currentTask: Promise<void> | null = null;
  let abortController: AbortController | null = null;
  let pendingMessage: SegmentLoaderMessage | null = null;
  let taskSegmentIds: Set<string> = new Set();
  let destroyed = false;

  // Sync SourceBufferActor committed context → global state.bufferState.
  // Migration artifact: allows endOfStream to read buffer state without
  // access to the actor. Remove once endOfStream reads from SourceBufferActor.
  const syncActorToState = () => {
    const ctx = sourceBufferActor.snapshot.context;
    state.patch({
      bufferState: {
        ...state.current.bufferState,
        [bufferKey]: {
          initTrackId: ctx.initTrackId,
          segments: ctx.segments.map((s) => ({ id: s.id, trackId: s.trackId })),
        },
      },
    });
  };

  // Resolve full Segment objects from the actor's committed context.
  // Uses actor context directly (has timing), avoiding the resolveBufferedSegments bridge.
  const getBufferedSegments = (allSegments: readonly Segment[]): Segment[] => {
    const bufferedIds = new Set(sourceBufferActor.snapshot.context.segments.map((s) => s.id));
    return allSegments.filter((s) => bufferedIds.has(s.id));
  };

  // Execute one load task for the given message.
  // Step 1: batch fetch-then-append, identical behaviour to the previous loadSegmentsTask.
  const executeTask = async (message: SegmentLoaderMessage, signal: AbortSignal): Promise<void> => {
    const { track, range } = message;
    const bufferedSegments = getBufferedSegments(track.segments);
    const currentTime = range?.start ?? 0;
    const segmentsToLoad = range ? getSegmentsToLoad(track.segments, bufferedSegments, currentTime) : [];

    const actorCtx = sourceBufferActor.snapshot.context;
    const needsInit = actorCtx.initTrackId !== track.id;
    const isTrackSwitch = needsInit && !!actorCtx.initTrackId;
    const forwardFlushStart = calculateForwardFlushPoint(bufferedSegments, currentTime);

    if (!needsInit && segmentsToLoad.length === 0 && forwardFlushStart === Infinity) return;

    try {
      // Phase 1: Remove
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
          await sourceBufferActor.send(removeMessages[0]!, signal);
        } else {
          await sourceBufferActor.batch(removeMessages, signal);
        }
        if (signal.aborted) return;
      }

      // Phase 2: Fetch
      let initData: ArrayBuffer | null = null;
      if (needsInit) {
        if (signal.aborted) return;
        initData = await fetchBytes(track.initialization, { signal });
      }

      const fetchedSegments: Array<{ segment: Segment; data: ArrayBuffer }> = [];
      for (const segment of segmentsToLoad) {
        if (signal.aborted) break;
        const data = await fetchBytes(segment, { signal });
        fetchedSegments.push({ segment, data });
      }

      // Phase 3: Append
      const appendMessages: SourceBufferMessage[] = [];

      if (initData) {
        appendMessages.push({ type: 'append-init', data: initData, meta: { trackId: track.id } });
      }

      if (!signal.aborted) {
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

      const appendSignal = signal.aborted ? new AbortController().signal : signal;

      if (appendMessages.length === 1) {
        await sourceBufferActor.send(appendMessages[0]!, appendSignal);
      } else {
        await sourceBufferActor.batch(appendMessages, appendSignal);
      }

      await new Promise((resolve) => requestAnimationFrame(resolve));
    } finally {
      syncActorToState();
    }
  };

  // Run the task loop for an initial message, picking up pending messages after
  // each task completes. Mirrors the previous runTaskLoop pattern.
  const runLoop = async (initialMessage: SegmentLoaderMessage): Promise<void> => {
    let current = initialMessage;

    while (true) {
      if (destroyed) break;

      // Check whether there is actually work to do for this message.
      const bufferedSegments = getBufferedSegments(current.track.segments);
      const currentTime = current.range?.start ?? 0;
      const actorCtx = sourceBufferActor.snapshot.context;
      const needsInit = actorCtx.initTrackId !== current.track.id;

      if (!needsInit) {
        if (!current.range) break; // metadata mode: init already loaded, nothing more to do
        const segmentsToLoad = getSegmentsToLoad(current.track.segments, bufferedSegments, currentTime);
        const forwardFlushStart = calculateForwardFlushPoint(bufferedSegments, currentTime);
        if (segmentsToLoad.length === 0 && forwardFlushStart === Infinity) break;
      }

      // Track intended segment IDs for seek detection in send().
      if (current.range) {
        taskSegmentIds = new Set(
          getSegmentsToLoad(current.track.segments, bufferedSegments, currentTime).map((s) => s.id)
        );
      } else {
        taskSegmentIds = new Set();
      }

      abortController = new AbortController();
      currentTask = executeTask(current, abortController.signal);

      try {
        await currentTask;
      } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError')) {
          console.error('Unexpected error in segment loader task:', error);
        }
      }

      abortController = null;
      taskSegmentIds = new Set();

      const pending = pendingMessage;
      pendingMessage = null;

      if (!pending) break;
      current = pending;
    }

    currentTask = null;
  };

  return {
    send(message: SegmentLoaderMessage) {
      if (destroyed) return;

      if (currentTask) {
        pendingMessage = message;

        // Seek detection: if needed segments are completely disjoint from what
        // the current task is loading, abort to restart at the new position.
        if (taskSegmentIds.size > 0 && message.range) {
          const buffered = getBufferedSegments(message.track.segments);
          const needed = getSegmentsToLoad(message.track.segments, buffered, message.range.start);
          if (needed.length > 0 && needed.every((s) => !taskSegmentIds.has(s.id))) {
            abortController?.abort();
          }
        }
        return;
      }

      runLoop(message);
    },

    destroy() {
      destroyed = true;
      abortController?.abort();
    },
  };
}
