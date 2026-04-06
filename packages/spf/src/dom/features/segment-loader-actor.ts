import { calculateBackBufferFlushPoint } from '../../core/buffer/back-buffer';
import { calculateForwardFlushPoint, getSegmentsToLoad } from '../../core/buffer/forward-buffer';
import { createActor, type HandlerContext, type MessageActor } from '../../core/create-actor';
import { effect } from '../../core/signals/effect';
import { SerialRunner, Task } from '../../core/task';
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

/** Finite states of the actor. */
export type SegmentLoaderActorState = 'idle' | 'loading' | 'destroyed';

/** Non-finite (extended) data managed by the actor. */
export interface SegmentLoaderActorContext {
  /** Track ID of the init segment currently being fetched/appended, or null. */
  inFlightInitTrackId: string | null;
  /** Segment ID currently being fetched/appended, or null. */
  inFlightSegmentId: string | null;
}

export type SegmentLoaderActor = MessageActor<SegmentLoaderActorState, SegmentLoaderActorContext, SegmentLoaderMessage>;

// ============================================================================
// HELPERS
// ============================================================================

type FetchBytes = (
  addressable: AddressableObject,
  options?: RequestInit & { minChunkSize?: number }
) => Promise<AsyncIterable<Uint8Array>>;

/**
 * Resolves when the SourceBufferActor snapshot reaches 'idle'.
 * Rejects if the signal is aborted or the actor is destroyed.
 *
 * Used to sequence SourceBufferActor operations without awaiting send()
 * directly — send() is fire-and-forget; callers observe completion via
 * state transition.
 */
function waitForIdle(snapshot: SourceBufferActor['snapshot'], signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (snapshot.get().value === 'idle') {
      resolve();
      return;
    }
    if (snapshot.get().value === 'destroyed') {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    let stop: (() => void) | undefined;

    const cleanup = (fn: () => void) => {
      stop?.();
      signal.removeEventListener('abort', onAbort);
      fn();
    };

    const onAbort = () => cleanup(() => reject(signal.reason));

    stop = effect(() => {
      const value = snapshot.get().value;
      if (value === 'idle') cleanup(resolve);
      else if (value === 'destroyed') cleanup(() => reject(new DOMException('Aborted', 'AbortError')));
    });

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

// ============================================================================
// LOAD TASK FACTORY
// ============================================================================

interface LoadTaskOptions {
  getContext: () => SegmentLoaderActorContext;
  setContext: (ctx: SegmentLoaderActorContext) => void;
  fetchBytes: FetchBytes;
  sourceBufferActor: SourceBufferActor;
}

/**
 * Wraps a LoadTask descriptor into a Task that fetches (if needed) and
 * forwards to SourceBufferActor. Updates in-flight context around async
 * operations so the loading handler can make accurate continue/preempt
 * decisions at any point.
 */
function makeLoadTask(
  op: LoadTask,
  { getContext, setContext, fetchBytes, sourceBufferActor }: LoadTaskOptions
): Task<void> {
  return new Task(async (taskSignal) => {
    if (taskSignal.aborted) return;

    if (op.type === 'remove') {
      sourceBufferActor.send(op);
      await waitForIdle(sourceBufferActor.snapshot, taskSignal);
      return;
    }

    if (op.type === 'append-init') {
      setContext({ ...getContext(), inFlightInitTrackId: op.meta.trackId });
      try {
        // Init segments are small and need the full body before appending.
        // minChunkSize: Infinity accumulates all chunks into one before yielding.
        const data = await fetchBytes(op, { signal: taskSignal, minChunkSize: Infinity });
        if (!taskSignal.aborted) {
          sourceBufferActor.send({ type: 'append-init', data, meta: op.meta });
          await waitForIdle(sourceBufferActor.snapshot, taskSignal);
        }
      } finally {
        setContext({ ...getContext(), inFlightInitTrackId: null });
      }
      return;
    }

    // append-segment: await headers eagerly (starts the HTTP connection and
    // records the fetch in observers like tests), then pass the body stream
    // directly to the actor so chunks are appended as they arrive.
    setContext({ ...getContext(), inFlightSegmentId: op.meta.id });
    try {
      const stream = await fetchBytes(op, { signal: taskSignal });
      if (!taskSignal.aborted) {
        sourceBufferActor.send({ type: 'append-segment', data: stream, meta: op.meta });
        await waitForIdle(sourceBufferActor.snapshot, taskSignal);
      }
    } finally {
      setContext({ ...getContext(), inFlightSegmentId: null });
    }
  });
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
 * Planning (Cases 1–3) happens in the `load` handler on every incoming
 * message, producing an ordered LoadTask list. The runner drains that list
 * sequentially via SerialRunner. When a new message arrives mid-run, the
 * handler replans and either continues the in-flight operation (abortPending
 * + schedule new remainder) or preempts it (abortAll + cancel SourceBuffer
 * if needed + schedule new plan).
 *
 * @param sourceBufferActor - Shared SourceBufferActor reference (not owned)
 * @param fetchBytes - Tracked fetch closure (owns throughput sampling for segments).
 *   Accepts an optional `minChunkSize` in options; init segments pass `Infinity`
 *   so the entire body accumulates as one chunk before appending.
 */
export function createSegmentLoaderActor(
  sourceBufferActor: SourceBufferActor,
  fetchBytes: FetchBytes
): SegmentLoaderActor {
  type UserState = Exclude<SegmentLoaderActorState, 'destroyed'>;
  type Ctx = HandlerContext<UserState, SegmentLoaderActorContext, () => SerialRunner>;

  const getBufferedSegments = (allSegments: readonly Segment[]): Segment[] => {
    // Exclude partial segments — they are still being streamed and must not be
    // treated as fully buffered for load planning or buffer window calculations.
    const bufferedIds = new Set(
      sourceBufferActor.snapshot
        .get()
        .context.segments.filter((s) => !s.partial)
        .map((s) => s.id)
    );
    return allSegments.filter((s) => bufferedIds.has(s.id));
  };

  /**
   * Translate a load message into an ordered LoadTask list based on committed
   * actor state. In-flight awareness is handled separately in the load handler.
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
    const actorCtx = sourceBufferActor.snapshot.get().context;
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

  const scheduleAll = (tasks: LoadTask[], { getContext, setContext, runner }: Ctx): void => {
    tasks.forEach((op) => {
      runner
        .schedule(makeLoadTask(op, { getContext, setContext, fetchBytes, sourceBufferActor }))
        .then(undefined, (e: unknown) => {
          if (e instanceof Error && e.name === 'AbortError') return;
          // On unexpected fetch/append errors, abort remaining tasks so a failed
          // init doesn't cause segment fetches to proceed with no init segment.
          console.error('Unexpected error in segment loader:', e);
          runner.abortPending();
        });
    });
  };

  return createActor<UserState, SegmentLoaderActorContext, SegmentLoaderMessage, () => SerialRunner>({
    runner: () => new SerialRunner(),
    initial: 'idle',
    context: { inFlightInitTrackId: null, inFlightSegmentId: null },
    states: {
      idle: {
        on: {
          load: (msg, ctx) => {
            const allTasks = planTasks(msg);
            if (allTasks.length === 0) return;
            ctx.transition('loading');
            scheduleAll(allTasks, ctx);
          },
        },
      },
      loading: {
        onSettled: 'idle',
        on: {
          load: (msg, ctx) => {
            const { context, runner } = ctx;
            const allTasks = planTasks(msg);

            // Determine whether the in-flight operation is still needed.
            const inFlightStillNeeded =
              (context.inFlightSegmentId !== null &&
                allTasks.some((t) => t.type === 'append-segment' && t.meta.id === context.inFlightSegmentId)) ||
              (context.inFlightInitTrackId !== null &&
                allTasks.some((t) => t.type === 'append-init' && t.meta.trackId === context.inFlightInitTrackId));

            if (inFlightStillNeeded) {
              // Continue: abort only the pending queue, let the in-flight task finish.
              // Schedule everything except the in-flight item — it covers that slot.
              runner.abortPending();
              scheduleAll(
                allTasks.filter(
                  (t) =>
                    !(t.type === 'append-segment' && t.meta.id === context.inFlightSegmentId) &&
                    !(t.type === 'append-init' && t.meta.trackId === context.inFlightInitTrackId)
                ),
                ctx
              );
            } else {
              // Preempt: abort everything and replan.
              runner.abortAll();
              // Cancel SourceBufferActor tasks when a segment is in-flight (always
              // discard) or when a track switch is happening (new track's init follows).
              // For a same-track seek with an in-flight init, skip cancel — the task's
              // signal is not aborted (abortAll was called on the runner, but the init
              // task already completed or will complete via its own signal path).
              const cancelSourceBuffer =
                context.inFlightSegmentId !== null ||
                (context.inFlightInitTrackId !== null &&
                  allTasks.some((t) => t.type === 'append-init' && t.meta.trackId !== context.inFlightInitTrackId));
              if (cancelSourceBuffer) {
                sourceBufferActor.send({ type: 'cancel' });
              }
              scheduleAll(allTasks, ctx);
            }
          },
        },
      },
    },
  });
}
