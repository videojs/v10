import { calculateBackBufferFlushPoint } from '../../core/buffer/back-buffer';
import { calculateForwardFlushPoint, getSegmentsToLoad } from '../../core/buffer/forward-buffer';
import type { AddressableObject, AudioTrack, Segment, VideoTrack } from '../../core/types';
import type {
  AppendInitMessage,
  AppendSegmentMessage,
  RemoveMessage,
  SourceBufferActor,
} from '../media/source-buffer-actor';

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
// LOAD TASK
// ============================================================================

/**
 * A LoadTask is the intent to perform one unit of SegmentLoader work.
 * Unlike SourceBufferMessage, fetch-based tasks carry a URL rather than
 * pre-fetched data — the runner fetches and appends them in sequence.
 *
 * Derived from SourceBufferMessage types by removing `data` and adding
 * a fetch URL via AddressableObject.
 *
 * @todo Rename — "LoadTask" risks confusion with the `Task` class used for
 * SourceBufferActor scheduling. These are closer to operation descriptors or
 * messages than tasks in that sense.
 */
export type LoadTask =
  | (Omit<AppendInitMessage, 'data'> & AddressableObject)
  | (Omit<AppendSegmentMessage, 'data'> & AddressableObject)
  | RemoveMessage;

// ============================================================================
// ACTOR INTERFACE
// ============================================================================

export interface SegmentLoaderActor {
  send(message: SegmentLoaderMessage): void;
  destroy(): void;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

/**
 * Creates a SegmentLoaderActor for one track type (video or audio).
 *
 * Receives load assignments via `send()` and owns all execution: planning,
 * removes, fetches, and appends. Coordinates with the SourceBufferActor for
 * all physical SourceBuffer operations.
 *
 * Planning (Cases 1–3) happens in `send()` on every incoming message, producing
 * an ordered LoadTask list. The runner drains that list sequentially. When a new
 * message arrives mid-run, send() replans and either continues the in-flight
 * operation (if still needed) or preempts it.
 *
 * @param sourceBufferActor - Shared SourceBufferActor reference (not owned)
 * @param fetchBytes - Tracked fetch closure (owns throughput sampling for segments).
 *   Accepts an optional `minChunkSize` in options; init segments pass `Infinity`
 *   so the entire body accumulates as one chunk before appending.
 */
export function createSegmentLoaderActor(
  sourceBufferActor: SourceBufferActor,
  fetchBytes: (
    addressable: AddressableObject,
    options?: RequestInit & { minChunkSize?: number }
  ) => Promise<AsyncIterable<Uint8Array>>
): SegmentLoaderActor {
  let pendingTasks: LoadTask[] | null = null;
  let inFlightInitTrackId: string | null = null;
  let inFlightSegmentId: string | null = null;
  let abortController: AbortController | null = null;
  let running = false;
  let destroyed = false;

  const getBufferedSegments = (allSegments: readonly Segment[]): Segment[] => {
    // Exclude partial segments — they are still being streamed and must not be
    // treated as fully buffered for load planning or buffer window calculations.
    const bufferedIds = new Set(sourceBufferActor.snapshot.context.segments.filter((s) => !s.partial).map((s) => s.id));
    return allSegments.filter((s) => bufferedIds.has(s.id));
  };

  /**
   * Translate a load message into an ordered LoadTask list based on committed
   * actor state. In-flight awareness is handled separately in send().
   *
   * @todo Rename alongside LoadTask (e.g. planOps).
   *
   * Case 1 — Removes: forward and back buffer flush points, segment-aligned.
   *   No flush on track switch: appending new content overwrites existing buffer
   *   ranges, and the actor's time-aligned deduplication keeps the segment model
   *   accurate as new segments arrive.
   *
   * Case 2 — Init: schedule if not yet committed for this track.
   *
   * Case 3 — Segments: all segments in the load window not yet committed.
   */
  const planTasks = (message: SegmentLoaderMessage): LoadTask[] => {
    const { track, range } = message;
    const actorCtx = sourceBufferActor.snapshot.context;
    const bufferedSegments = getBufferedSegments(track.segments);
    const currentTime = range?.start ?? 0;
    const tasks: LoadTask[] = [];

    // Case 1: Removes
    if (range) {
      const forwardFlushStart = calculateForwardFlushPoint(bufferedSegments, currentTime);
      if (forwardFlushStart < Infinity) {
        tasks.push({ type: 'remove', start: forwardFlushStart, end: Infinity });
      }
      const backFlushEnd = calculateBackBufferFlushPoint(bufferedSegments, currentTime);
      if (backFlushEnd > 0) {
        tasks.push({ type: 'remove', start: 0, end: backFlushEnd });
      }
    }

    // Case 2: Init
    if (actorCtx.initTrackId !== track.id) {
      tasks.push({
        type: 'append-init',
        meta: { trackId: track.id },
        url: track.initialization.url,
        ...(track.initialization.byteRange !== undefined && { byteRange: track.initialization.byteRange }),
      });
    }

    // Case 3: Segments
    if (range) {
      const EPSILON = 0.0001;
      const segmentsToLoad = getSegmentsToLoad(track.segments, bufferedSegments, currentTime).filter((seg) => {
        // Quality-aware filter: skip segments already covered by equal-or-higher-quality
        // content in the actor context. Preserves buffered high-quality content during
        // ABR downgrades; loads during upgrades and for uncovered positions.
        const existing = actorCtx.segments.find((s) => Math.abs(s.startTime - seg.startTime) < EPSILON);
        // Partial segments are still streaming — treat as not buffered so they
        // are always re-planned (avoids relying on incomplete data).
        if (existing?.partial) return true;
        if (!existing?.trackBandwidth || !track.bandwidth) return true;
        return track.bandwidth > existing.trackBandwidth;
      });
      for (const segment of segmentsToLoad) {
        tasks.push({
          type: 'append-segment',
          meta: {
            id: segment.id,
            startTime: segment.startTime,
            duration: segment.duration,
            trackId: track.id,
            trackBandwidth: track.bandwidth,
          },
          url: segment.url,
          ...(segment.byteRange !== undefined && { byteRange: segment.byteRange }),
        });
      }
    }

    return tasks;
  };

  /**
   * Execute a single LoadTask: fetch (if needed) then forward to SourceBufferActor.
   * Sets/clears in-flight tracking around async operations so send() can make
   * accurate continue/preempt decisions at any point during execution.
   *
   * @todo Rename alongside LoadTask (e.g. executeOp).
   */
  const executeLoadTask = async (task: LoadTask): Promise<void> => {
    const signal = abortController!.signal;
    try {
      if (task.type === 'remove') {
        await sourceBufferActor.send(task, signal);
        return;
      }

      if (task.type === 'append-init') {
        inFlightInitTrackId = task.meta.trackId;
        if (!signal.aborted) {
          // Init segments are small and need the full body before the
          // same-track-seek vs track-switch commit decision can be made.
          // minChunkSize: Infinity causes ChunkedStreamIterable to accumulate
          // all chunks and yield exactly one — equivalent to arrayBuffer() but
          // through the same streaming path as media segments.
          const data = await fetchBytes(task, { signal, minChunkSize: Infinity });
          // For seeks on the same track: commit even if aborted — avoids re-fetching the
          // same init next time. For track switches: don't commit the old track's init;
          // the new track's init follows in pendingTasks.
          const isTrackSwitch = pendingTasks?.some(
            (t) => t.type === 'append-init' && t.meta.trackId !== task.meta.trackId
          );
          if (!signal.aborted || !isTrackSwitch) {
            const appendSignal = signal.aborted ? new AbortController().signal : signal;
            await sourceBufferActor.send({ type: 'append-init', data, meta: task.meta }, appendSignal);
          }
        }
        return;
      }

      // append-segment: await headers eagerly (starts the HTTP connection and
      // records the fetch in observers like tests), then pass the body stream
      // directly to the actor so chunks are appended as they arrive.
      inFlightSegmentId = task.meta.id;
      if (!signal.aborted) {
        const stream = await fetchBytes(task, { signal });
        if (!signal.aborted) {
          await sourceBufferActor.send({ type: 'append-segment', data: stream, meta: task.meta }, signal);
        }
      }
    } finally {
      inFlightInitTrackId = null;
      inFlightSegmentId = null;
    }
  };

  /**
   * Drain the scheduled task list sequentially.
   * After each task completes, checks for a pending replacement plan from send().
   * If the signal was aborted and no new plan arrived, stops immediately.
   */
  const runScheduled = async (initialTasks: LoadTask[]): Promise<void> => {
    running = true;
    abortController = new AbortController();
    let scheduled = initialTasks;

    while (scheduled.length > 0 && !destroyed) {
      const task = scheduled[0]!;
      scheduled = scheduled.slice(1);

      try {
        await executeLoadTask(task);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Abort is handled in the post-task check below.
        } else {
          console.error('Unexpected error in segment loader:', error);
          // Non-abort error (e.g. network failure on init): don't continue with
          // remaining tasks in this sequence — they depend on the failed step.
          // A pending replacement plan (if any) will still be picked up below.
          scheduled = [];
        }
      }

      if (pendingTasks !== null) {
        // A new plan arrived while this task was running — switch to it.
        scheduled = pendingTasks;
        pendingTasks = null;
        abortController = new AbortController();
      } else if (abortController.signal.aborted) {
        // Aborted with no replacement plan — stop.
        break;
      }
    }

    abortController = null;
    running = false;
  };

  return {
    send(message: SegmentLoaderMessage) {
      if (destroyed) return;

      const allTasks = planTasks(message);

      if (!running) {
        if (allTasks.length === 0) return;
        runScheduled(allTasks);
        return;
      }

      // Determine whether the in-flight operation is still needed for the new plan.
      const inFlightStillNeeded =
        (inFlightSegmentId !== null &&
          allTasks.some((t) => t.type === 'append-segment' && t.meta.id === inFlightSegmentId)) ||
        (inFlightInitTrackId !== null &&
          allTasks.some((t) => t.type === 'append-init' && t.meta.trackId === inFlightInitTrackId));

      if (inFlightStillNeeded) {
        // Continue: the in-flight operation covers something the new plan needs.
        // Queue everything except the in-flight item — it will complete on its own.
        pendingTasks = allTasks.filter(
          (t) =>
            !(t.type === 'append-segment' && t.meta.id === inFlightSegmentId) &&
            !(t.type === 'append-init' && t.meta.trackId === inFlightInitTrackId)
        );
      } else {
        // Preempt: in-flight work is not needed for the new plan. Abort and replan.
        pendingTasks = allTasks;
        abortController?.abort();
      }
    },

    destroy() {
      destroyed = true;
      abortController?.abort();
    },
  };
}
