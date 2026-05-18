import { createMachineActor, type HandlerContext, type MessageActor } from '../../core/actors/create-machine-actor';
import { peek } from '../../core/signals/primitives';
import { SerialRunner, Task } from '../../core/tasks/task';
import {
  DEFAULT_FORWARD_BUFFER_CONFIG,
  type ForwardBufferConfig,
  getSegmentsToLoad,
} from '../../media/buffer/forward-buffer';
import type { Cue, Segment, TextTrack } from '../../media/types';
import type { TextTracksActor } from './text-tracks';

// =============================================================================
// Message / actor types
// =============================================================================

/**
 * Mirrors the v/a `SegmentLoaderMessage` shape. `range` carries the
 * forward-window anchor (`range.start` is treated as the load anchor;
 * the actor computes its own forward window internally via
 * `getSegmentsToLoad`). When `range` is omitted (metadata mode), this
 * actor is a no-op — text tracks have no init-segment concept.
 */
export type TextTrackSegmentLoaderMessage = {
  type: 'load';
  track: TextTrack;
  range?: { start: number; end: number };
};

/** Finite states of the actor. */
export type TextTrackSegmentLoaderActorState = 'idle' | 'loading' | 'destroyed';

/** Non-finite (extended) data managed by the actor. */
export interface TextTrackSegmentLoaderActorContext {
  /**
   * Track ID of the segment currently being fetched, or null. Paired
   * with `inFlightSegmentId` so the continue-vs-preempt check survives
   * cross-track segment-id collisions (e.g. each track starts at
   * `seg-0`).
   */
  inFlightTrackId: string | null;
  /**
   * Segment ID currently being fetched, or null. Used together with
   * `inFlightTrackId` by the `loading` state's `load` handler.
   */
  inFlightSegmentId: string | null;
}

export type TextTrackSegmentLoaderActor = MessageActor<
  TextTrackSegmentLoaderActorState,
  TextTrackSegmentLoaderActorContext,
  TextTrackSegmentLoaderMessage
>;

/**
 * Resolves a text-track segment URL into the array of cues it contains.
 *
 * "Resolve" because the fn covers both network fetch and parse into the
 * domain model. Host-agnostic — the concrete resolver (e.g. the
 * browser's native VTT resolver) is supplied at engine-assembly time,
 * so this actor stays DOM-free.
 */
export type TextTrackSegmentResolver<C extends Cue = Cue> = (url: string) => Promise<C[]>;

/**
 * Configuration for `createTextTrackSegmentLoaderActor`. Spread over
 * `DEFAULT_FORWARD_BUFFER_CONFIG` to override individual forward-window
 * fields (e.g. `bufferDuration`). Text tracks don't have a back-buffer
 * concern — cues evict by their playhead-relative window at runtime —
 * so no `backBuffer` config field.
 */
export interface TextTrackSegmentLoaderActorConfig {
  forwardBuffer?: Partial<ForwardBufferConfig>;
}

// =============================================================================
// Implementation
// =============================================================================

/** Internal load-task descriptor — one segment fetch + dispatch unit. */
interface TextLoadTask {
  segment: Segment;
  trackId: string;
}

/**
 * Loads text-track segments for a track and delegates cue management
 * to a TextTracksActor. Mirrors the v/a `SegmentLoaderActor` shape (FSM
 * with `idle` / `loading` and `inFlight*` context for continue-vs-preempt),
 * adapted to text:
 *
 * - No init segment, no flush ops (text cues don't need eviction — they're
 *   small and the playhead-relative window is enforced by the runtime).
 * - Single in-flight identity (`inFlightSegmentId`) — text has only the
 *   media-segment path, no init-segment path.
 *
 * Planning is done in the load handler on every incoming message:
 * `getSegmentsToLoad` filters to the forward window, then the segments
 * not already in `TextTracksActor`'s context are scheduled. When a new
 * `load` arrives mid-run, the handler replans and either:
 *
 * - **Continues**: the in-flight segment is still in the new plan →
 *   `abortPending` only, schedule the rest of the plan (minus the
 *   in-flight item, which covers its slot).
 * - **Preempts**: in-flight segment is no longer wanted (track switch,
 *   large seek out of window) → `abortAll`, schedule the new plan
 *   from scratch.
 *
 * The cue parser is injected so this factory is host-agnostic. A DOM
 * host supplies a VTT parser backed by `<track>`/`TextTrack` APIs; a
 * non-DOM host (worker, test fake, alternate runtime) supplies its own.
 */
export function createTextTrackSegmentLoaderActor<C extends Cue>(
  textTracksActor: TextTracksActor<C>,
  resolveSegment: TextTrackSegmentResolver<C>,
  config: TextTrackSegmentLoaderActorConfig = {}
): TextTrackSegmentLoaderActor {
  type UserState = Exclude<TextTrackSegmentLoaderActorState, 'destroyed'>;
  type Ctx = HandlerContext<UserState, TextTrackSegmentLoaderActorContext, () => SerialRunner>;

  const forwardBufferConfig: ForwardBufferConfig = { ...DEFAULT_FORWARD_BUFFER_CONFIG, ...config.forwardBuffer };

  /**
   * Translate a load message into an ordered TextLoadTask list based on
   * committed actor state. In-flight awareness is handled separately in
   * the `loading` state's load handler.
   *
   * Metadata mode (no `range`) is a no-op for text — text tracks have
   * no init-segment concept, so there's nothing to load until a range
   * arrives via `'full-range'` dispatch.
   */
  const planTasks = (message: TextTrackSegmentLoaderMessage): TextLoadTask[] => {
    const { track, range } = message;
    if (!range) return [];
    const trackId = track.id;
    // Peek (don't track) the snapshot: the loader's `send` is typically
    // invoked from inside the dispatcher's effect body, so a tracked
    // `.get()` here would leak the textTracksActor snapshot into the
    // dispatcher's dep set — every `add-cues` would re-fire the dispatcher
    // and schedule duplicate loads.
    const bufferedSegments = peek(textTracksActor.snapshot).context.segments[trackId] ?? [];
    // `getSegmentsToLoad` uses the actor's threaded `forwardBufferConfig`
    // to compute its forward-window; only `range.start` is consulted
    // here as the playhead anchor. `range.end` is informational — it
    // carries the dispatcher's intended window upper bound but doesn't
    // override the actor's planning.
    const segmentsToLoad = getSegmentsToLoad(track.segments, bufferedSegments, range.start, forwardBufferConfig);
    return segmentsToLoad.map((segment) => ({ segment, trackId }));
  };

  /**
   * Wraps a TextLoadTask into a Task that fetches + dispatches `add-cues`.
   * Updates `inFlightSegmentId` around the fetch so the load handler can
   * make accurate continue/preempt decisions.
   */
  const makeLoadTask = (op: TextLoadTask, { getContext, setContext }: Ctx): Task<void> => {
    return new Task(async (signal) => {
      if (signal.aborted) return;
      setContext({ ...getContext(), inFlightTrackId: op.trackId, inFlightSegmentId: op.segment.id });
      try {
        const cues = await resolveSegment(op.segment.url);
        if (signal.aborted) return;
        textTracksActor.send({
          type: 'add-cues',
          meta: {
            trackId: op.trackId,
            id: op.segment.id,
            startTime: op.segment.startTime,
            duration: op.segment.duration,
          },
          cues,
        });
      } catch (error) {
        // Graceful degradation: log and continue to the next segment.
        console.error('Failed to load text-track segment:', error);
      } finally {
        setContext({ ...getContext(), inFlightTrackId: null, inFlightSegmentId: null });
      }
    });
  };

  const scheduleAll = (tasks: TextLoadTask[], ctx: Ctx): void => {
    for (const op of tasks) {
      ctx.runner.schedule(makeLoadTask(op, ctx)).then(undefined, (e: unknown) => {
        if (e instanceof Error && e.name === 'AbortError') return;
        console.error('Unexpected error in text-track segment loader:', e);
        ctx.runner.abortPending();
      });
    }
  };

  return createMachineActor<
    UserState,
    TextTrackSegmentLoaderActorContext,
    TextTrackSegmentLoaderMessage,
    () => SerialRunner
  >({
    runner: () => new SerialRunner(),
    initial: 'idle',
    context: { inFlightTrackId: null, inFlightSegmentId: null },
    states: {
      idle: {
        on: {
          load: (msg, ctx) => {
            const tasks = planTasks(msg);
            if (tasks.length === 0) return;
            ctx.transition('loading');
            scheduleAll(tasks, ctx);
          },
        },
      },
      loading: {
        onSettled: 'idle',
        on: {
          load: (msg, ctx) => {
            const { context, runner } = ctx;
            const tasks = planTasks(msg);

            const inFlightStillNeeded =
              context.inFlightTrackId !== null &&
              context.inFlightSegmentId !== null &&
              tasks.some((t) => t.trackId === context.inFlightTrackId && t.segment.id === context.inFlightSegmentId);

            if (inFlightStillNeeded) {
              // Continue: keep the in-flight fetch, schedule the rest.
              runner.abortPending();
              scheduleAll(
                tasks.filter(
                  (t) => !(t.trackId === context.inFlightTrackId && t.segment.id === context.inFlightSegmentId)
                ),
                ctx
              );
            } else {
              // Preempt: abort everything (including in-flight) and replan.
              runner.abortAll();
              scheduleAll(tasks, ctx);
            }
          },
        },
      },
    },
  });
}
