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
};

export type AppendInitMessage = { type: 'append-init'; data: ArrayBuffer; meta: { trackId: Track['id'] } };
export type AppendSegmentMessage = { type: 'append-segment'; data: ArrayBuffer; meta: AppendSegmentMeta };
export type RemoveMessage = { type: 'remove'; start: number; end: number };
export type SourceBufferMessage = AppendInitMessage | AppendSegmentMessage | RemoveMessage;

/** Finite (bounded) operational modes of the actor. */
export type SourceBufferActorStatus = 'idle' | 'updating';

/** Non-finite (extended) data managed by the actor — the XState "context". */
export interface SourceBufferActorContext {
  initTrackId?: string | undefined;
  segments: Array<Pick<Segment, 'id' | 'startTime' | 'duration'> & { trackId: Track['id'] }>;
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
// Implementation
// =============================================================================

export function createSourceBufferActor(sourceBuffer: SourceBuffer): SourceBufferActor {
  const state = createState<SourceBufferActorSnapshot>({
    status: 'idle',
    context: { segments: [], bufferedRanges: [], initTrackId: undefined },
  });

  let destroyed = false;
  const runner = new SerialRunner();

  // Translates a message into a Task. Context is read lazily via getCtx at
  // task execution time — not at creation time — so the task always operates
  // on the most recent context regardless of when it was scheduled.
  function messageToTask(
    message: SourceBufferMessage,
    signal: AbortSignal,
    getCtx: () => SourceBufferActorContext
  ): Task<SourceBufferActorContext> {
    if (message.type === 'append-init') {
      return new Task(
        async (taskSignal) => {
          const ctx = getCtx();
          if (taskSignal.aborted) return ctx;
          await appendSegment(sourceBuffer, message.data);
          if (taskSignal.aborted) return ctx;
          return { ...ctx, initTrackId: message.meta.trackId };
        },
        { signal }
      );
    }

    if (message.type === 'append-segment') {
      return new Task(
        async (taskSignal) => {
          const ctx = getCtx();
          if (taskSignal.aborted) return ctx;
          await appendSegment(sourceBuffer, message.data);
          if (taskSignal.aborted) return ctx;
          const { meta } = message;
          const newEnd = meta.startTime + meta.duration;
          const filtered = ctx.segments.filter(
            (s) => !(s.startTime < newEnd && s.startTime + s.duration > meta.startTime)
          );
          return {
            ...ctx,
            segments: [
              ...filtered,
              { id: meta.id, startTime: meta.startTime, duration: meta.duration, trackId: meta.trackId },
            ],
            bufferedRanges: snapshotBuffered(sourceBuffer.buffered),
          };
        },
        { signal }
      );
    }

    // 'remove'
    return new Task(
      async (taskSignal) => {
        const ctx = getCtx();
        if (taskSignal.aborted) return ctx;
        await flushBuffer(sourceBuffer, message.start, message.end);
        if (taskSignal.aborted) return ctx;
        const { start, end } = message;
        const filtered = ctx.segments.filter((s) => !(s.startTime < end && s.startTime + s.duration > start));
        return { ...ctx, segments: filtered, bufferedRanges: snapshotBuffered(sourceBuffer.buffered) };
      },
      { signal }
    );
  }

  // Applies the completed context atomically with the idle transition and
  // flushes synchronously so consumers observe the final snapshot when their
  // awaited Promise resolves.
  function applyResult(newContext: SourceBufferActorContext): void {
    state.patch({ status: 'idle', context: newContext });
    state.flush();
  }

  function handleError(e: unknown): never {
    state.patch({ status: 'idle' });
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
      if (destroyed || state.current.status !== 'idle') {
        return Promise.reject(
          new SourceBufferActorError(`send() called while actor is ${destroyed ? 'destroyed' : 'updating'}`)
        );
      }

      // Transition synchronously so any subsequent send/batch within the same
      // tick is rejected — the actor is now committed to this operation.
      state.patch({ status: 'updating' });

      const task = messageToTask(message, signal, () => state.current.context);

      return runner.schedule(task).then(applyResult).catch(handleError);
    },

    batch(messages: SourceBufferMessage[], signal: AbortSignal): Promise<void> {
      if (destroyed || state.current.status !== 'idle') {
        return Promise.reject(
          new SourceBufferActorError(`batch() called while actor is ${destroyed ? 'destroyed' : 'updating'}`)
        );
      }

      if (messages.length === 0) return Promise.resolve();

      // Transition synchronously — the entire batch is one 'updating' period.
      state.patch({ status: 'updating' });

      // Each message is its own Task on the runner, executed in submission order.
      // workingCtx threads the result of each task into the next without
      // patching shared state between steps — context is only written to state
      // atomically when the last task completes.
      let workingCtx = state.current.context;

      for (const message of messages.slice(0, -1)) {
        const task = messageToTask(message, signal, () => workingCtx);
        const result = runner.schedule(task);
        result.then((newCtx) => {
          workingCtx = newCtx;
        });
      }

      const lastTask = messageToTask(messages[messages.length - 1]!, signal, () => workingCtx);
      return runner.schedule(lastTask).then(applyResult).catch(handleError);
    },

    destroy(): void {
      destroyed = true;
      runner.destroy();
    },
  };
}
