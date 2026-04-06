import { createActor, type MessageActor } from '../../core/create-actor';
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
export type IndividualSourceBufferMessage = AppendInitMessage | AppendSegmentMessage | RemoveMessage;
export type BatchMessage = { type: 'batch'; messages: IndividualSourceBufferMessage[] };

/**
 * All messages accepted by a SourceBufferActor.
 * Each top-level send carries its own AbortSignal — signal is per-message,
 * not per-actor, so each call site controls its own cancellation scope.
 */
export type SourceBufferMessage = (IndividualSourceBufferMessage | BatchMessage) & { signal: AbortSignal };

/** Finite states of the actor. */
export type SourceBufferActorState = 'idle' | 'updating' | 'destroyed';

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

/** SourceBuffer actor: queues operations, owns its snapshot. */
export type SourceBufferActor = MessageActor<SourceBufferActorState, SourceBufferActorContext, SourceBufferMessage>;

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

type MessageTaskFactory<T extends IndividualSourceBufferMessage> = (
  message: T,
  options: MessageTaskOptions
) => Task<SourceBufferActorContext>;

const messageTaskFactories = {
  'append-init': appendInitTask,
  'append-segment': appendSegmentTask,
  remove: removeTask,
} satisfies {
  [K in IndividualSourceBufferMessage['type']]: MessageTaskFactory<Extract<IndividualSourceBufferMessage, { type: K }>>;
};

function messageToTask(
  message: IndividualSourceBufferMessage,
  options: MessageTaskOptions
): Task<SourceBufferActorContext> {
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
  type UserState = Exclude<SourceBufferActorState, 'destroyed'>;

  const handleError = (e: unknown): void => {
    if (!(e instanceof Error && e.name === 'AbortError')) {
      console.error('SourceBuffer operation failed:', e);
    }
  };

  return createActor<UserState, SourceBufferActorContext, SourceBufferMessage, () => SerialRunner>({
    runner: () => new SerialRunner(),
    initial: 'idle',
    context: { segments: [], bufferedRanges: [], initTrackId: undefined, ...initialContext },
    states: {
      idle: {
        on: {
          'append-init': (msg, { transition, setContext, getContext, runner }) => {
            transition('updating');
            const task = appendInitTask(msg, {
              signal: msg.signal,
              getCtx: getContext,
              sourceBuffer,
              onPartialContext: setContext,
            });
            runner.schedule(task).then(setContext, handleError);
          },
          'append-segment': (msg, { transition, setContext, getContext, runner }) => {
            transition('updating');
            const task = appendSegmentTask(msg, {
              signal: msg.signal,
              getCtx: getContext,
              sourceBuffer,
              onPartialContext: setContext,
            });
            runner.schedule(task).then(setContext, handleError);
          },
          remove: (msg, { transition, setContext, getContext, runner }) => {
            transition('updating');
            const task = removeTask(msg, {
              signal: msg.signal,
              getCtx: getContext,
              sourceBuffer,
              onPartialContext: setContext,
            });
            runner.schedule(task).then(setContext, handleError);
          },
          batch: (msg, { transition, setContext, getContext, runner }) => {
            const { messages, signal } = msg;
            if (messages.length === 0) return;

            transition('updating');

            for (const subMsg of messages) {
              const task = messageToTask(subMsg, {
                signal,
                getCtx: getContext,
                sourceBuffer,
                onPartialContext: setContext,
              });
              runner.schedule(task).then(setContext, handleError);
            }
          },
        },
      },
      updating: {
        // Automatically return to idle once all scheduled tasks settle.
        onSettled: 'idle',
      },
    },
  });
}
