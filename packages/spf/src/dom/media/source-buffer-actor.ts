import type { Actor, ActorSnapshot } from '../../core/actor';
import { createState } from '../../core/state/create-state';
import { SerialRunner, Task } from '../../core/task';
import type { Segment, Track } from '../../core/types';
import { appendSegment } from './append-segment';
import { flushBuffer } from './buffer-flusher';

// =============================================================================
// Types
// =============================================================================

export interface BufferedRange {
  start: number;
  end: number;
}

export type AppendSegmentMeta = Pick<Segment, 'id' | 'startTime' | 'duration'> & {
  trackId: Track['id'];
  /** Declared track bandwidth in bps (from playlist BANDWIDTH attribute). */
  trackBandwidth?: number;
};

export type AppendInitMessage = { type: 'append-init'; data: ArrayBuffer; meta: { trackId: Track['id'] } };
export type AppendSegmentMessage = { type: 'append-segment'; data: ArrayBuffer; meta: AppendSegmentMeta };
export type RemoveMessage = { type: 'remove'; start: number; end: number };
export type SourceBufferMessage = AppendInitMessage | AppendSegmentMessage | RemoveMessage;

/** Finite (bounded) operational modes of the actor. */
export type SourceBufferActorStatus = 'idle' | 'updating' | 'destroyed';

/** Non-finite (extended) data managed by the actor — the XState "context". */
export interface SourceBufferActorContext {
  initTrackId?: string | undefined;
  segments: Array<Pick<Segment, 'id' | 'startTime' | 'duration'> & { trackId: Track['id']; trackBandwidth?: number }>;
  bufferedRanges: BufferedRange[];
}

/** Complete snapshot of a SourceBufferActor. */
export type SourceBufferActorSnapshot = ActorSnapshot<SourceBufferActorStatus, SourceBufferActorContext>;

/**
 * Thrown when a message is sent to the actor in a state that does not
 * accept messages (currently: 'updating').
 */
export class SourceBufferActorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceBufferActorError';
  }
}

/** SourceBuffer actor: queues operations, owns its snapshot. */
export interface SourceBufferActor extends Actor<SourceBufferActorStatus, SourceBufferActorContext> {
  send(message: SourceBufferMessage, signal: AbortSignal): Promise<void>;
  batch(messages: SourceBufferMessage[], signal: AbortSignal): Promise<void>;
}

// =============================================================================
// Helpers
// =============================================================================

function snapshotBuffered(buffered: TimeRanges): BufferedRange[] {
  const ranges: BufferedRange[] = [];
  for (let i = 0; i < buffered.length; i++) {
    ranges.push({ start: buffered.start(i), end: buffered.end(i) });
  }
  return ranges;
}

// =============================================================================
// Message task factories
// =============================================================================

// Context is read lazily via getCtx at task execution time — not at creation
// time — so each task always operates on the most recent context regardless of
// when it was scheduled.

interface MessageTaskOptions {
  signal: AbortSignal;
  getCtx: () => SourceBufferActorContext;
  sourceBuffer: SourceBuffer;
}

function appendInitTask(
  message: AppendInitMessage,
  { signal, getCtx, sourceBuffer }: MessageTaskOptions
): Task<SourceBufferActorContext> {
  return new Task(
    async (taskSignal) => {
      const ctx = getCtx();
      if (taskSignal.aborted) return ctx;
      await appendSegment(sourceBuffer, message.data);
      // No abort check here: the physical SourceBuffer has been modified, so
      // the model must be updated to match regardless of signal state.
      return { ...ctx, initTrackId: message.meta.trackId };
    },
    { signal }
  );
}

function appendSegmentTask(
  message: AppendSegmentMessage,
  { signal, getCtx, sourceBuffer }: MessageTaskOptions
): Task<SourceBufferActorContext> {
  return new Task(
    async (taskSignal) => {
      const ctx = getCtx();
      if (taskSignal.aborted) return ctx;
      await appendSegment(sourceBuffer, message.data);
      // No abort check here: the physical SourceBuffer has been modified, so
      // the model must be updated to match regardless of signal state.
      const { meta } = message;
      // Remove any existing entry at the same start time (same "slot" in the
      // timeline), then record the new segment. Assumes time-aligned segments
      // across playlists. The epsilon guards against floating-point drift in
      // parsed timestamps.
      const EPSILON = 0.0001;
      const filtered = ctx.segments.filter((s) => Math.abs(s.startTime - meta.startTime) >= EPSILON);
      return {
        ...ctx,
        segments: [
          ...filtered,
          {
            id: meta.id,
            startTime: meta.startTime,
            duration: meta.duration,
            trackId: meta.trackId,
            ...(meta.trackBandwidth !== undefined && { trackBandwidth: meta.trackBandwidth }),
          },
        ],
        bufferedRanges: snapshotBuffered(sourceBuffer.buffered),
      };
    },
    { signal }
  );
}

function removeTask(
  message: RemoveMessage,
  { signal, getCtx, sourceBuffer }: MessageTaskOptions
): Task<SourceBufferActorContext> {
  return new Task(
    async (taskSignal) => {
      const ctx = getCtx();
      if (taskSignal.aborted) return ctx;
      await flushBuffer(sourceBuffer, message.start, message.end);
      // No abort check here: the physical SourceBuffer has been modified, so
      // the model must be updated to match regardless of signal state.
      //
      // Use the post-flush buffered ranges as ground truth. A segment is kept
      // in the model only if its midpoint falls within a buffered range.
      // Midpoint-based membership handles flush boundaries that don't align
      // exactly with segment edges without over-removing adjacent segments.
      const bufferedRanges = snapshotBuffered(sourceBuffer.buffered);
      const filtered = ctx.segments.filter((s) => {
        const midpoint = s.startTime + s.duration / 2;
        return bufferedRanges.some((r) => midpoint >= r.start && midpoint < r.end);
      });
      return { ...ctx, segments: filtered, bufferedRanges };
    },
    { signal }
  );
}

type MessageTaskFactory<T extends SourceBufferMessage> = (
  message: T,
  options: MessageTaskOptions
) => Task<SourceBufferActorContext>;

const messageTaskFactories = {
  'append-init': appendInitTask,
  'append-segment': appendSegmentTask,
  remove: removeTask,
} satisfies { [K in SourceBufferMessage['type']]: MessageTaskFactory<Extract<SourceBufferMessage, { type: K }>> };

function messageToTask(message: SourceBufferMessage, options: MessageTaskOptions): Task<SourceBufferActorContext> {
  const factory = messageTaskFactories[message.type] as MessageTaskFactory<typeof message>;
  return factory(message, options);
}

// =============================================================================
// Implementation
// =============================================================================

export function createSourceBufferActor(
  sourceBuffer: SourceBuffer,
  initialContext?: Partial<SourceBufferActorContext>
): SourceBufferActor {
  const state = createState<SourceBufferActorSnapshot>({
    status: 'idle',
    context: { segments: [], bufferedRanges: [], initTrackId: undefined, ...initialContext },
  });

  const runner = new SerialRunner();

  // Applies the completed context atomically with the idle transition and
  // flushes synchronously so consumers observe the final snapshot when their
  // awaited Promise resolves.
  // If the actor was destroyed while the operation was in flight, preserve
  // 'destroyed' — do not regress to 'idle'.
  function applyResult(newContext: SourceBufferActorContext): void {
    const status = state.current.status === 'destroyed' ? 'destroyed' : 'idle';
    state.patch({ status, context: newContext });
    state.flush();
  }

  function handleError(e: unknown): never {
    // TODO: QuotaExceededError and other SourceBuffer errors leave the physical
    // buffer in an unknown partial state while context goes unchanged. A future
    // improvement should detect QuotaExceededError specifically and use total
    // bytes-in-buffer as a heuristic to identify the effective buffer capacity,
    // enabling targeted flush-and-retry rather than silent model drift.
    const status = state.current.status === 'destroyed' ? 'destroyed' : 'idle';
    state.patch({ status });
    state.flush();
    throw e;
  }

  return {
    get snapshot(): SourceBufferActorSnapshot {
      return state.current;
    },

    subscribe(listener: (snapshot: SourceBufferActorSnapshot) => void): () => void {
      return state.subscribe(listener);
    },

    send(message: SourceBufferMessage, signal: AbortSignal): Promise<void> {
      if (state.current.status !== 'idle') {
        return Promise.reject(new SourceBufferActorError(`send() called while actor is ${state.current.status}`));
      }

      // Transition synchronously so any subsequent send/batch within the same
      // tick is rejected — the actor is now committed to this operation.
      state.patch({ status: 'updating' });

      const task = messageToTask(message, { signal, getCtx: () => state.current.context, sourceBuffer });

      return runner.schedule(task).then(applyResult).catch(handleError);
    },

    batch(messages: SourceBufferMessage[], signal: AbortSignal): Promise<void> {
      if (state.current.status !== 'idle') {
        return Promise.reject(new SourceBufferActorError(`batch() called while actor is ${state.current.status}`));
      }

      if (messages.length === 0) return Promise.resolve();

      // Transition synchronously — the entire batch is one 'updating' period.
      state.patch({ status: 'updating' });

      // Each message is its own Task on the runner, executed in submission order.
      // workingCtx threads the result of each task into the next without
      // patching shared state between steps — context is only written to state
      // atomically when the last task completes.
      //
      // workingCtx is captured here (synchronously after status → 'updating'),
      // so it reflects the current context at the moment the batch was accepted.
      // This is correct: status is now 'updating' so no other sender can modify
      // context between this line and the first task executing.
      //
      // NOTE: if an intermediate task fails (e.g. SourceBuffer error event),
      // workingCtx is not updated for that step and subsequent tasks in the
      // batch will operate on a stale context. This is an edge case — happy-path
      // appends do not fail — but worth revisiting if MSE error recovery lands.
      let workingCtx = state.current.context;

      for (const message of messages.slice(0, -1)) {
        const task = messageToTask(message, { signal, getCtx: () => workingCtx, sourceBuffer });
        const result = runner.schedule(task);
        result.then((newCtx) => {
          workingCtx = newCtx;
        });
      }

      const lastTask = messageToTask(messages[messages.length - 1]!, {
        signal,
        getCtx: () => workingCtx,
        sourceBuffer,
      });
      return runner.schedule(lastTask).then(applyResult).catch(handleError);
    },

    destroy(): void {
      state.patch({ status: 'destroyed' });
      state.flush();
      runner.destroy();
    },
  };
}
