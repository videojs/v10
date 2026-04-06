import type { ActorSnapshot, SignalActor } from '../../core/actor';
import { type ReadonlySignal, signal, update } from '../../core/signals/primitives';
import { SerialRunner, Task } from '../../core/task';
import type { Segment, Track } from '../../core/types';
import { type AppendData, appendSegment } from './append-segment';
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

export type { AppendData };

export type AppendInitMessage = { type: 'append-init'; data: AppendData; meta: { trackId: Track['id'] } };
export type AppendSegmentMessage = { type: 'append-segment'; data: AppendData; meta: AppendSegmentMeta };
export type RemoveMessage = { type: 'remove'; start: number; end: number };
export type SourceBufferMessage = AppendInitMessage | AppendSegmentMessage | RemoveMessage;

/** Finite (bounded) operational modes of the actor. */
export type SourceBufferActorStatus = 'idle' | 'updating' | 'destroyed';

/** Non-finite (extended) data managed by the actor — the XState "context". */
export interface SourceBufferActorContext {
  initTrackId?: string | undefined;
  segments: Array<
    Pick<Segment, 'id' | 'startTime' | 'duration'> & {
      trackId: Track['id'];
      trackBandwidth?: number;
      /**
       * True while a streaming append is in progress for this segment.
       * The segment's data is partially present in the SourceBuffer.
       * Downstream code must not treat a partial segment as fully buffered.
       */
      partial?: boolean;
    }
  >;
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
export interface SourceBufferActor extends SignalActor<SourceBufferActorStatus, SourceBufferActorContext> {
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
  /**
   * Called when a streaming append transitions to a partial state — i.e.
   * the first chunk of an AsyncIterable has been committed and the segment
   * now has data in the SourceBuffer but is not yet complete. Not called for
   * full ArrayBuffer appends (which are atomic).
   */
  onPartialContext: (ctx: SourceBufferActorContext) => void;
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
  { signal, getCtx, sourceBuffer, onPartialContext }: MessageTaskOptions
): Task<SourceBufferActorContext> {
  return new Task(
    async (taskSignal) => {
      const ctx = getCtx();
      if (taskSignal.aborted) return ctx;

      const { meta } = message;
      // Remove any existing entry at the same start time (same "slot" in the
      // timeline), then record the new segment. Assumes time-aligned segments
      // across playlists. The epsilon guards against floating-point drift in
      // parsed timestamps.
      const EPSILON = 0.0001;
      const filtered = ctx.segments.filter((s) => Math.abs(s.startTime - meta.startTime) >= EPSILON);

      // For streaming data: emit partial state before the first chunk so
      // downstream code can see the in-progress segment and treat it as
      // incomplete. ArrayBuffer appends are atomic so no partial state is
      // needed — context is updated once at task completion.
      if (!(message.data instanceof ArrayBuffer)) {
        onPartialContext({
          ...ctx,
          segments: [
            ...filtered,
            {
              id: meta.id,
              startTime: meta.startTime,
              duration: meta.duration,
              trackId: meta.trackId,
              ...(meta.trackBandwidth !== undefined && { trackBandwidth: meta.trackBandwidth }),
              partial: true,
            },
          ],
          bufferedRanges: ctx.bufferedRanges,
        });
      }

      await appendSegment(sourceBuffer, message.data, taskSignal);
      // No abort check here: the physical SourceBuffer has been modified, so
      // the model must be updated to match regardless of signal state.
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
  const snapshotSignal = signal<SourceBufferActorSnapshot>({
    status: 'idle',
    context: { segments: [], bufferedRanges: [], initTrackId: undefined, ...initialContext },
  });

  const runner = new SerialRunner();

  // Applies the completed context atomically with the idle transition.
  // If the actor was destroyed while the operation was in flight, preserve
  // 'destroyed' — do not regress to 'idle'.
  function applyResult(newContext: SourceBufferActorContext): void {
    const status = snapshotSignal.get().status === 'destroyed' ? 'destroyed' : 'idle';
    snapshotSignal.set({ status, context: newContext });
  }

  function handleError(e: unknown): never {
    // TODO: QuotaExceededError and other SourceBuffer errors leave the physical
    // buffer in an unknown partial state while context goes unchanged. A future
    // improvement should detect QuotaExceededError specifically and use total
    // bytes-in-buffer as a heuristic to identify the effective buffer capacity,
    // enabling targeted flush-and-retry rather than silent model drift.
    const status = snapshotSignal.get().status === 'destroyed' ? 'destroyed' : 'idle';
    update(snapshotSignal, { status });
    throw e;
  }

  return {
    get snapshot(): ReadonlySignal<SourceBufferActorSnapshot> {
      return snapshotSignal;
    },

    send(message: SourceBufferMessage, signal: AbortSignal): Promise<void> {
      if (snapshotSignal.get().status !== 'idle') {
        return Promise.reject(
          new SourceBufferActorError(`send() called while actor is ${snapshotSignal.get().status}`)
        );
      }

      // Transition synchronously so any subsequent send/batch within the same
      // tick is rejected — the actor is now committed to this operation.
      update(snapshotSignal, { status: 'updating' });

      const onPartialContext = (ctx: SourceBufferActorContext) => {
        snapshotSignal.set({ status: 'updating', context: ctx });
      };

      const task = messageToTask(message, {
        signal,
        getCtx: () => snapshotSignal.get().context,
        sourceBuffer,
        onPartialContext,
      });

      return runner.schedule(task).then(applyResult).catch(handleError);
    },

    batch(messages: SourceBufferMessage[], signal: AbortSignal): Promise<void> {
      if (snapshotSignal.get().status !== 'idle') {
        return Promise.reject(
          new SourceBufferActorError(`batch() called while actor is ${snapshotSignal.get().status}`)
        );
      }

      if (messages.length === 0) return Promise.resolve();

      // Transition synchronously — the entire batch is one 'updating' period.
      update(snapshotSignal, { status: 'updating' });

      // Each message is its own Task on the runner, executed in submission order.
      // workingCtx threads the result of each task into the next without
      // writing to the signal between steps — context is only written atomically
      // when the last task completes.
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
      let workingCtx = snapshotSignal.get().context;

      // Partial context updates from streaming appends write to the signal
      // directly so external subscribers see in-progress state, but workingCtx
      // is only advanced on task completion to preserve batch context threading.
      const onPartialContext = (ctx: SourceBufferActorContext) => {
        snapshotSignal.set({ status: 'updating', context: ctx });
      };

      for (const message of messages.slice(0, -1)) {
        const task = messageToTask(message, { signal, getCtx: () => workingCtx, sourceBuffer, onPartialContext });
        const result = runner.schedule(task);
        result.then((newCtx) => {
          workingCtx = newCtx;
        });
      }

      const lastTask = messageToTask(messages[messages.length - 1]!, {
        signal,
        getCtx: () => workingCtx,
        sourceBuffer,
        onPartialContext,
      });
      return runner.schedule(lastTask).then(applyResult).catch(handleError);
    },

    destroy(): void {
      update(snapshotSignal, { status: 'destroyed' });
      runner.destroy();
    },
  };
}
