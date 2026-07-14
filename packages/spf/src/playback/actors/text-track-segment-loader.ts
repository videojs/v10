import { createMachineActor, type HandlerContext, type MessageActor } from '../../core/actors/create-machine-actor';
import type { AnySlotMap } from '../../core/composition/create-composition';
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
 * so this actor stays DOM-free. A pure `url → cues` primitive (the text
 * analog of the v/a loader's `fetchBytes`); composition-awareness lives in
 * the injected {@link TextLoadStep}s, not here.
 */
export type TextTrackSegmentResolver<C extends Cue = Cue> = (url: string) => Promise<C[]>;

/**
 * A text load in mid-pipeline — the text analog of the v/a loader's `Frame`.
 * `resolveCuesStep` fills `cues`; `dispatchCuesStep` sends them. `metadata` is
 * opaque header metadata a resolve step may attach for a later step to read
 * (e.g. relocation stashes the `X-TIMESTAMP-MAP` correlation here for its rebase
 * step). Typed `unknown` so the generic loader stays host-agnostic — the step
 * that reads it knows its concrete shape (mirrors `StepDeps.state`).
 */
export interface TextFrame<C extends Cue = Cue> {
  readonly op: TextLoadTask;
  cues?: C[];
  metadata?: unknown;
}

/**
 * One stage of a text message pipeline — the text analog of the v/a loader's
 * `LoadStep`. Mutates the {@link TextFrame} in place and may be async; the runner
 * checks `signal.aborted` before each step and passes the actor's
 * {@link TextStepDeps} on every call, so a stateless step (`resolveCuesStep`) is a
 * plain value and a step that needs composition signals (relocation's cue rebase)
 * reads them from `deps` at call time.
 */
export type TextLoadStep<C extends Cue = Cue> = (
  frame: TextFrame<C>,
  signal: AbortSignal,
  deps: TextStepDeps
) => void | Promise<void>;

/**
 * The uniform passthrough handed to each {@link TextLoadStep} — the composition triple,
 * the text analog of `StepDeps`. `state`/`context` are the composition signal maps;
 * `config` is the threaded config with the loader's wiring folded in (see
 * {@link textStepWiring} + `createTextTrackSegmentLoaderActor`). Typed loose: composition
 * steps read `state`; base steps read the folded wiring off `config`.
 */
export interface TextStepDeps {
  state: AnySlotMap;
  context: AnySlotMap;
  config: object;
}

/**
 * Base-step view of the loader's wiring, folded into `config` by
 * `createTextTrackSegmentLoaderActor` so base steps read it from the uniform passthrough
 * — present in both composition and standalone use. `config` is loose (`object`), so
 * assert the shape here (mirrors the v/a loader's `stepWiring`).
 */
export function textStepWiring<C extends Cue>(
  deps: TextStepDeps
): { textTracksActor: TextTracksActor<C>; resolveSegment: TextTrackSegmentResolver<C> } {
  return deps.config as { textTracksActor: TextTracksActor<C>; resolveSegment: TextTrackSegmentResolver<C> };
}

/**
 * Builds the ordered step list, called **once per actor** (mirrors the v/a loader's
 * `MessagePipelines`, but text has a single op type so it's a flat array, not a
 * `Record`). The default ({@link DEFAULT_TEXT_MESSAGE_PIPELINES}) is
 * `resolveCues → dispatchCues`; a non-zero-PTS composition returns a list that
 * inserts a cue-rebase step (see `relocatingTextPipelines`), so the loader stays
 * oblivious to relocation.
 */
export type TextMessagePipelines<C extends Cue = Cue> = () => TextLoadStep<C>[];

/**
 * Configuration for `createTextTrackSegmentLoaderActor`. Spread over
 * `DEFAULT_FORWARD_BUFFER_CONFIG` to override individual forward-window
 * fields (e.g. `bufferDuration`). Text tracks don't have a back-buffer
 * concern — cues evict by their playhead-relative window at runtime —
 * so no `backBuffer` config field.
 */
export interface TextTrackSegmentLoaderActorConfig<C extends Cue = Cue> {
  forwardBuffer?: Partial<ForwardBufferConfig>;
  /** Ordered step pipeline. Defaults to {@link DEFAULT_TEXT_MESSAGE_PIPELINES} (`resolveCues → dispatchCues`). */
  messagePipelines?: TextMessagePipelines<C>;
}

// =============================================================================
// Implementation
// =============================================================================

/** Internal load-task descriptor — one segment fetch + dispatch unit. */
interface TextLoadTask {
  segment: Segment;
  trackId: string;
}

// =============================================================================
// Steps
// =============================================================================

// Base steps are generic over the cue type `C` (generic arrow consts, not
// `TextLoadStep<Cue>` values): each touches `C` — `frame.cues: C[]` and the
// `C`-typed `textStepWiring<C>` — so a `Cue`-typed const wouldn't slot into a
// `VTTCue` pipeline. A generic function assigns to any `TextLoadStep<C>`.

/** Resolve the op's cues (via the injected host primitive) into the frame. The text analog of `fetchStep`. */
export const resolveCuesStep = async <C extends Cue>(
  frame: TextFrame<C>,
  signal: AbortSignal,
  deps: TextStepDeps
): Promise<void> => {
  const cues = await textStepWiring<C>(deps).resolveSegment(frame.op.segment.url);
  if (signal.aborted) return;
  frame.cues = cues;
};

/** Dispatch the frame's cues to the TextTracksActor as `add-cues`. The text analog of `dispatchStep`. */
export const dispatchCuesStep = <C extends Cue>(
  frame: TextFrame<C>,
  _signal: AbortSignal,
  deps: TextStepDeps
): void => {
  const { op } = frame;
  textStepWiring<C>(deps).textTracksActor.send({
    type: 'add-cues',
    meta: {
      trackId: op.trackId,
      id: op.segment.id,
      startTime: op.segment.startTime,
      duration: op.segment.duration,
    },
    cues: frame.cues ?? [],
  });
};

/** Tier 0 default: resolve then dispatch. No relocation vocabulary. */
const DEFAULT_TEXT_MESSAGE_PIPELINES = <C extends Cue>(): TextLoadStep<C>[] => [resolveCuesStep, dispatchCuesStep];

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
  config: TextTrackSegmentLoaderActorConfig<C> = {},
  // Composition deps threaded opaquely into each step's `TextStepDeps` (relocation
  // reads composition state). The loader never reads them. Defaults empty for
  // standalone / base-pipeline use.
  compositionDeps: TextStepDeps = { state: {}, context: {}, config: {} }
): TextTrackSegmentLoaderActor {
  type UserState = Exclude<TextTrackSegmentLoaderActorState, 'destroyed'>;
  type Ctx = HandlerContext<UserState, TextTrackSegmentLoaderActorContext, () => SerialRunner>;

  const forwardBufferConfig: ForwardBufferConfig = { ...DEFAULT_FORWARD_BUFFER_CONFIG, ...config.forwardBuffer };
  // Fold the loader's wiring into the passthrough `config` (see `textStepWiring`) so
  // base steps read it from the uniform `{state,context,config}` — present in both
  // composition and standalone use.
  const deps: TextStepDeps = {
    state: compositionDeps.state,
    context: compositionDeps.context,
    config: { ...compositionDeps.config, textTracksActor, resolveSegment },
  };
  // Built once per actor; default is `resolveCues → dispatchCues`.
  const pipeline = (config.messagePipelines ?? DEFAULT_TEXT_MESSAGE_PIPELINES)();

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
   * Wraps a TextLoadTask into a Task that runs the op's step pipeline
   * (resolve/relocate/dispatch, per the composition's `messagePipelines`).
   * Updates `inFlightSegmentId` around the async region so the load handler can
   * make accurate continue/preempt decisions, and checks the abort signal before
   * each step.
   *
   * Text degrades gracefully: a step throwing (e.g. a failed segment fetch) is
   * logged and swallowed so the runner continues to the next segment — unlike the
   * v/a loader, where a failed init must abort the remaining tasks.
   */
  const makeLoadTask = (op: TextLoadTask, { getContext, setContext }: Ctx): Task<void> => {
    return new Task(async (signal) => {
      if (signal.aborted) return;
      const frame: TextFrame<C> = { op };
      setContext({ ...getContext(), inFlightTrackId: op.trackId, inFlightSegmentId: op.segment.id });
      try {
        for (const step of pipeline) {
          if (signal.aborted) return;
          await step(frame, signal, deps);
        }
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
