import { createMachineActor, type HandlerContext, type MessageActor } from '../../core/actors/create-machine-actor';
import { SerialRunner, Task } from '../../core/tasks/task';
import type { Segment, Track } from '../../media/types';
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
export type CancelMessage = { type: 'cancel' };

/** All messages accepted by a SourceBufferActor. */
export type SourceBufferMessage = IndividualSourceBufferMessage | BatchMessage | CancelMessage;

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

// Context is read lazily via getContext at task execution time — not at creation
// time — so each task always operates on the most recent context regardless of
// when it was scheduled.

interface MessageTaskOptions {
  getContext: () => SourceBufferActorContext;
  sourceBuffer: SourceBuffer;
  setContext: (ctx: SourceBufferActorContext) => void;
}

function appendInitTask(
  message: AppendInitMessage,
  { getContext, sourceBuffer }: MessageTaskOptions
): Task<SourceBufferActorContext> {
  return new Task(async (taskSignal) => {
    const ctx = getContext();
    if (taskSignal.aborted) return ctx;
    await appendSegment(sourceBuffer, message.data);
    // No abort check here: the physical SourceBuffer has been modified, so
    // the model must be updated to match regardless of signal state.
    return { ...ctx, initTrackId: message.meta.trackId };
  });
}

function appendSegmentTask(
  message: AppendSegmentMessage,
  { getContext, sourceBuffer, setContext }: MessageTaskOptions
): Task<SourceBufferActorContext> {
  return new Task(async (taskSignal) => {
    const ctx = getContext();
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
      setContext({
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
  });
}

function removeTask(
  message: RemoveMessage,
  { getContext, sourceBuffer }: MessageTaskOptions
): Task<SourceBufferActorContext> {
  return new Task(async (taskSignal) => {
    const ctx = getContext();
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
  });
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

  type Ctx = HandlerContext<UserState, SourceBufferActorContext, () => SerialRunner>;

  const onMessage = (msg: IndividualSourceBufferMessage, { transition, setContext, getContext, runner }: Ctx): void => {
    transition('updating');
    const task = messageToTask(msg, { getContext, sourceBuffer, setContext });
    runner.schedule(task).then(setContext, handleError);
  };

  return createMachineActor<UserState, SourceBufferActorContext, SourceBufferMessage, () => SerialRunner>({
    runner: () => new SerialRunner(),
    initial: 'idle',
    context: { segments: [], bufferedRanges: [], initTrackId: undefined, ...initialContext },
    states: {
      idle: {
        on: {
          'append-init': onMessage,
          'append-segment': onMessage,
          remove: onMessage,
          batch: (msg, { transition, setContext, getContext, runner }) => {
            const { messages } = msg;
            if (messages.length === 0) return;

            transition('updating');
            messages.forEach((msg) => {
              const task = messageToTask(msg, { getContext, sourceBuffer, setContext });
              runner.schedule(task).then(setContext, handleError);
            });
          },
        },
      },
      updating: {
        // Automatically return to idle once all scheduled tasks settle.
        onSettled: 'idle',
        on: {
          // Abort all in-progress and pending tasks. onSettled handles → 'idle'
          // once the aborted tasks drain.
          cancel: (_, { runner }) => {
            runner.abortAll();
          },
        },
      },
    },
  });
}
