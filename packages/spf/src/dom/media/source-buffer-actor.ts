import type { Actor, ActorSnapshot } from '../../core/actor';
import { createState } from '../../core/state/create-state';
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
  initTrackId?: string;
  segments: Array<Pick<Segment, 'id' | 'startTime' | 'duration'> & { trackId: Track['id'] }>;
  bufferedRanges: BufferedRange[];
}

/** Complete snapshot of a SourceBufferActor. */
export type SourceBufferActorSnapshot = ActorSnapshot<SourceBufferActorStatus, SourceBufferActorContext>;

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

interface QueueEntry {
  fn: () => Promise<void>;
  resolve: () => void;
  reject: (e: unknown) => void;
}

export function createSourceBufferActor(sourceBuffer: SourceBuffer): SourceBufferActor {
  const state = createState<SourceBufferActorSnapshot>({
    status: 'idle',
    context: { segments: [], bufferedRanges: [] },
  });

  let destroyed = false;
  let draining = false;
  const queue: QueueEntry[] = [];

  function patchContext(update: Partial<SourceBufferActorContext>): void {
    state.patch({ context: { ...state.current.context, ...update } });
  }

  async function drain(): Promise<void> {
    if (draining) return;
    draining = true;

    while (queue.length > 0) {
      const entry = queue.shift()!;
      state.patch({ status: 'updating' });
      try {
        await entry.fn();
        // Transition back to idle and flush before resolving so consumers
        // observe the final snapshot when their awaited promise resolves.
        if (queue.length === 0) {
          state.patch({ status: 'idle' });
          state.flush();
        }
        entry.resolve();
      } catch (e) {
        state.patch({ status: 'idle' });
        state.flush();
        entry.reject(e);
      }
    }

    draining = false;
  }

  function enqueue(fn: () => Promise<void>, signal: AbortSignal): Promise<void> {
    if (destroyed) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      queue.push({
        fn: () => {
          if (signal.aborted) return Promise.resolve();
          return fn();
        },
        resolve,
        reject,
      });
      drain();
    });
  }

  async function execute(message: SourceBufferMessage, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return;

    if (message.type === 'append-init') {
      await appendSegment(sourceBuffer, message.data);
      if (signal.aborted) return;
      patchContext({
        initTrackId: message.meta.trackId,
        bufferedRanges: snapshotBuffered(sourceBuffer.buffered),
      });
    } else if (message.type === 'append-segment') {
      await appendSegment(sourceBuffer, message.data);
      if (signal.aborted) return;
      const { meta } = message;
      const newEnd = meta.startTime + meta.duration;
      const filtered = state.current.context.segments.filter(
        (s) => !(s.startTime < newEnd && s.startTime + s.duration > meta.startTime)
      );
      patchContext({
        segments: [
          ...filtered,
          { id: meta.id, startTime: meta.startTime, duration: meta.duration, trackId: meta.trackId },
        ],
        bufferedRanges: snapshotBuffered(sourceBuffer.buffered),
      });
    } else if (message.type === 'remove') {
      await flushBuffer(sourceBuffer, message.start, message.end);
      if (signal.aborted) return;
      const { start, end } = message;
      const filtered = state.current.context.segments.filter(
        (s) => !(s.startTime < end && s.startTime + s.duration > start)
      );
      patchContext({
        segments: filtered,
        bufferedRanges: snapshotBuffered(sourceBuffer.buffered),
      });
    }
  }

  return {
    get snapshot(): SourceBufferActorSnapshot {
      return state.current;
    },

    subscribe(listener: (snapshot: SourceBufferActorSnapshot) => void): () => void {
      return state.subscribe(listener);
    },

    send(message: SourceBufferMessage, signal: AbortSignal): Promise<void> {
      return enqueue(() => execute(message, signal), signal);
    },

    batch(messages: SourceBufferMessage[], signal: AbortSignal): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        if (destroyed) {
          resolve();
          return;
        }

        let remaining = messages.length;
        if (remaining === 0) {
          resolve();
          return;
        }

        let batchRejected = false;

        for (const message of messages) {
          queue.push({
            fn: () => {
              if (signal.aborted) return Promise.resolve();
              return execute(message, signal);
            },
            resolve: () => {
              remaining--;
              if (remaining === 0 && !batchRejected) resolve();
            },
            reject: (e) => {
              if (!batchRejected) {
                batchRejected = true;
                reject(e);
              }
            },
          });
        }

        drain();
      });
    },

    destroy(): void {
      destroyed = true;
      for (const entry of queue) {
        entry.resolve();
      }
      queue.length = 0;
    },
  };
}
