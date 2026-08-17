/**
 * **The whole buffering pipeline for a looping background video, in one actor.**
 *
 * The general v/a path splits mechanism (`SourceBufferActor`) from policy
 * (`SegmentLoaderActor`) — see `internal/design/spf/conventions/actors.md`. That
 * split earns its keep when policy can be reasoned about against the mechanism's
 * *contract* rather than its *state*. Here it can't, and the conventions doc
 * names this exact exception: every decision this actor makes is read straight
 * off the buffer.
 *
 * The reason is the buffer's MSE `mode`. In `"sequence"` mode an append lands
 * where the previous one ended rather than at its declared time, so for a
 * single-track, forward-only, never-switching composition the buffer is always
 * **one contiguous range** and `buffered.end` **is** the position the next
 * append will occupy. That makes `buffered` complete information: there is
 * nothing for a segment inventory to add, and the general path's
 * `ctx.segments` / coverage-merge / quality-filter machinery has no question
 * left to answer. What replaces it is a cursor and three comparisons.
 *
 * What sequence mode gives:
 *
 * - **A 0-based timeline for free.** A source whose media encodes at a non-zero
 *   PTS lands at 0 because the group starts at 0, with none of the init-parsing,
 *   `tfdt` reading, or `startMediaTime` coordination the relocation stack does.
 * - **Free trailing eviction.** Removing from the back never moves the append
 *   position, which lives at the front.
 *
 * What it takes back, and why the FSM matters:
 *
 * - **A duplicate append concatenates rather than overwrites.** Re-appending a
 *   segment does not land on top of itself; it extends the buffer past the
 *   source. So work must never be planned twice, which is what `'working'`
 *   guarantees: a `sync` arriving mid-flight is dropped, and the actor
 *   re-evaluates from the buffer once the step settles.
 * - **Discontiguous appends must be anchored.** `remove()` does not reset MSE's
 *   group end timestamp, so after a wrap into evicted territory the next append
 *   would otherwise land at the *old* end. {@link BufferSurface.anchor} is the
 *   re-anchor, and it is written on exactly two occasions: the first append onto
 *   an empty buffer, and the first append after a wrap.
 *
 * Policy — how far ahead to fill, how much to keep behind — is config with
 * defaults, deliberately not a contract. An engine that retained a whole short
 * clip and never evicted would drive this actor correctly without changing it.
 */
import { createMachineActor, type HandlerContext, type MessageActor } from '../../../core/actors/create-machine-actor';
import { SerialRunner, Task } from '../../../core/tasks/task';
import { type AppendData, appendSegment } from '../../../media/dom/mse/append-segment';
import { flushBuffer } from '../../../media/dom/mse/buffer-flusher';
import type { AddressableObject, Segment } from '../../../media/types';
import type { FetchBytes } from '../../primitives/segment-load-pipeline';

// =============================================================================
// Buffer surface
// =============================================================================

/** A buffered extent, or `null` while nothing is buffered. */
export interface BufferedExtent {
  start: number;
  end: number;
}

/**
 * The four things this actor does to a buffer. Narrow on purpose: it keeps MSE
 * out of the planning code, so the decision logic is testable against an
 * in-memory stub. It does **not** try to model sequence-mode placement — that
 * semantic belongs to the browser, and is pinned end to end rather than faked.
 */
export interface BufferSurface {
  /** The single contiguous extent, or `null` when the buffer is empty. */
  extent(): BufferedExtent | null;
  /**
   * Re-anchor so the next appended group starts at `time`. In sequence mode
   * writing `timestampOffset` sets the group start timestamp rather than
   * shifting anything already buffered.
   */
  anchor(time: number): void;
  append(data: AppendData, signal: AbortSignal): Promise<void>;
  remove(start: number, end: number): Promise<void>;
}

/**
 * The MSE-backed surface. The `abort()` before an anchor write is not optional:
 * an append leaves the buffer in `PARSING_MEDIA_SEGMENT`, where assigning
 * `timestampOffset` throws `InvalidStateError`.
 */
export function createMseBufferSurface(sourceBuffer: SourceBuffer): BufferSurface {
  return {
    extent() {
      const { buffered } = sourceBuffer;
      if (buffered.length === 0) return null;
      return { start: buffered.start(0), end: buffered.end(buffered.length - 1) };
    },
    anchor(time) {
      if (sourceBuffer.updating) sourceBuffer.abort();
      sourceBuffer.timestampOffset = time;
    },
    append: (data, signal) => appendSegment(sourceBuffer, data, signal),
    remove: (start, end) => flushBuffer(sourceBuffer, start, end),
  };
}

// =============================================================================
// Types
// =============================================================================

/** The resolved track this actor buffers — the only shape it needs. */
export interface BackgroundVideoTrack {
  id: string;
  initialization: AddressableObject;
  segments: readonly Segment[];
}

export interface BackgroundVideoBufferConfig {
  /** Stop fetching once this many seconds are buffered ahead of the playhead. */
  forwardTargetSeconds?: number;
  /** Evict once more than this many seconds sit behind the playhead. */
  keepBehindSeconds?: number;
}

export const DEFAULT_BACKGROUND_VIDEO_BUFFER_CONFIG = {
  forwardTargetSeconds: 30,
  keepBehindSeconds: 10,
} as const satisfies Required<BackgroundVideoBufferConfig>;

/** Sync the buffer against the playhead. The actor decides what, if anything, to do. */
export interface SyncMessage {
  type: 'sync';
  track: BackgroundVideoTrack;
  currentTime: number;
}

export interface CancelMessage {
  type: 'cancel';
}

export type BackgroundVideoBufferMessage = SyncMessage | CancelMessage;

export type BackgroundVideoBufferActorState = 'idle' | 'working' | 'destroyed';

export interface BackgroundVideoBufferActorContext {
  /** Index into `track.segments` of the next segment to append. */
  cursor: number;
  /** Track whose init segment is currently in the buffer, if any. */
  initTrackId?: string | undefined;
  /** Last observed extent — the actor's whole model of what is buffered. */
  extent: BufferedExtent | null;
  /**
   * Every segment of the track has been appended for this pass. The signal a
   * reader needs to call `MediaSource.endOfStream()`, which is what lets the
   * element fire `ended` and therefore loop at all. Goes false again on a
   * restart, since the next pass re-appends from the top.
   */
  complete: boolean;
}

export type BackgroundVideoBufferActor = MessageActor<
  BackgroundVideoBufferActorState,
  BackgroundVideoBufferActorContext,
  BackgroundVideoBufferMessage
>;

// =============================================================================
// Planning
// =============================================================================

/** Slack for comparing the playhead against buffered edges, in seconds. */
const EDGE_EPSILON = 0.1;

type Step =
  | { kind: 'init' }
  /** The playhead left the buffer — wrapped, or seeked past it. Start over. */
  | { kind: 'restart' }
  | { kind: 'evict'; end: number }
  | { kind: 'append'; index: number; anchorAt?: number };

/**
 * One step, chosen from the buffer and the playhead. Exported for unit tests,
 * which drive it against a stub surface — the decisions are checkable without a
 * browser even though the placement semantics they rest on are not.
 */
export function planStep(
  message: SyncMessage,
  context: BackgroundVideoBufferActorContext,
  config: Required<BackgroundVideoBufferConfig>
): Step | null {
  const { track, currentTime } = message;
  const { cursor, extent } = context;

  if (context.initTrackId !== track.id) return { kind: 'init' };

  // A playhead outside the buffer means the element wrapped (nothing here
  // seeks) into territory that was evicted. Anything still buffered belongs to
  // the pass that just ended, so it goes, and the cursor rewinds. When the
  // whole clip was retained the playhead is still inside it, this never fires,
  // and the wrap costs nothing — which is why eviction stays a policy choice.
  if (extent && (currentTime < extent.start - EDGE_EPSILON || currentTime > extent.end + EDGE_EPSILON)) {
    return { kind: 'restart' };
  }

  if (extent && currentTime - extent.start > config.keepBehindSeconds) {
    return { kind: 'evict', end: currentTime - config.keepBehindSeconds };
  }

  const bufferedAhead = (extent?.end ?? currentTime) - currentTime;
  const next = track.segments[cursor];
  if (bufferedAhead < config.forwardTargetSeconds && next) {
    // Anchor only when the append cannot simply continue: an empty buffer (a
    // fresh source, or the sweep a restart just did) has no group end to
    // continue from that means anything.
    return extent ? { kind: 'append', index: cursor } : { kind: 'append', index: cursor, anchorAt: next.startTime };
  }

  return null;
}

// =============================================================================
// Implementation
// =============================================================================

export function createBackgroundVideoBufferActor(
  surface: BufferSurface,
  fetchBytes: FetchBytes,
  config: BackgroundVideoBufferConfig = {}
): BackgroundVideoBufferActor {
  const resolved = { ...DEFAULT_BACKGROUND_VIDEO_BUFFER_CONFIG, ...config };

  type UserState = Exclude<BackgroundVideoBufferActorState, 'destroyed'>;
  type Ctx = HandlerContext<UserState, BackgroundVideoBufferActorContext, () => SerialRunner>;

  const onError = (error: unknown): void => {
    if (error instanceof Error && error.name === 'AbortError') return;
    console.error('Background video buffer step failed:', error);
  };

  const runStep = (step: Step, message: SyncMessage, getContext: () => BackgroundVideoBufferActorContext) =>
    new Task<BackgroundVideoBufferActorContext>(async (signal) => {
      const context = getContext();
      if (signal.aborted) return context;
      const { track } = message;

      switch (step.kind) {
        case 'init': {
          const { url, byteRange } = track.initialization;
          const data = await fetchBytes(
            { url, ...(byteRange !== undefined && { byteRange }) },
            { signal, minChunkSize: Number.POSITIVE_INFINITY }
          );
          await surface.append(data, signal);
          return { ...context, initTrackId: track.id, extent: surface.extent() };
        }

        case 'restart': {
          const extent = context.extent;
          if (extent) await surface.remove(extent.start, extent.end);
          // Deliberately not anchored here. The next `append` sees an empty
          // buffer and anchors itself, which keeps the anchor adjacent to the
          // append it governs rather than separated by a settle.
          return { ...context, cursor: 0, complete: false, extent: surface.extent() };
        }

        case 'evict': {
          const extent = context.extent;
          if (extent) await surface.remove(extent.start, step.end);
          return { ...context, extent: surface.extent() };
        }

        case 'append': {
          const segment = track.segments[step.index];
          // Only reachable if the track changed under an in-flight step; the
          // next `sync` re-plans against the new one.
          if (!segment) return context;
          if (step.anchorAt !== undefined) surface.anchor(step.anchorAt);
          const data = await fetchBytes(
            { url: segment.url, ...(segment.byteRange !== undefined && { byteRange: segment.byteRange }) },
            { signal }
          );
          await surface.append(data, signal);
          // Advance past the appended segment, not `cursor + 1` off a context
          // re-read: the append is the only thing that may have moved it.
          return {
            ...context,
            cursor: step.index + 1,
            complete: step.index + 1 >= track.segments.length,
            extent: surface.extent(),
          };
        }
      }
    });

  /**
   * Run one step, then look again. Self-continuing rather than waiting to be
   * told: an initial fill is many appends against a playhead that has barely
   * moved, so re-deriving from `message` is correct and costs no dispatcher
   * ticks. A `sync` that lands mid-flight is dropped by `'working'`, which is
   * what keeps a segment from being appended twice.
   */
  const advance = (message: SyncMessage, ctx: Ctx): void => {
    const { getContext, setContext, transition, runner } = ctx;
    const step = planStep(message, getContext(), resolved);
    if (!step) {
      transition('idle');
      return;
    }
    transition('working');
    runner.schedule(runStep(step, message, getContext)).then((context) => {
      setContext(context);
      advance(message, ctx);
    }, onError);
  };

  return createMachineActor<
    UserState,
    BackgroundVideoBufferActorContext,
    BackgroundVideoBufferMessage,
    () => SerialRunner
  >({
    runner: () => new SerialRunner(),
    initial: 'idle',
    context: { cursor: 0, initTrackId: undefined, extent: null, complete: false },
    states: {
      idle: {
        on: {
          sync: (message, ctx) => advance(message, ctx),
          cancel: () => {},
        },
      },
      working: {
        on: {
          // Dropped on purpose — see `advance`. The in-flight step finishes and
          // re-derives from the buffer, which is fresher than this message.
          sync: () => {},
          cancel: (_, { runner }) => runner.abortAll(),
        },
      },
    },
  });
}
