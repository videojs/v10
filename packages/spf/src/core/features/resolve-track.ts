import { fetchResolvable, getResponseText } from '../../dom/network/fetch';
import type { EventStream } from '../events/create-event-stream';
import { parseMediaPlaylist } from '../hls/parse-media-playlist';
import { combineLatest } from '../reactive/combine-latest';
import type { WritableState } from '../state/create-state';
import type { Presentation, ResolvedTrack, TrackType } from '../types';
import { isResolvedTrack } from '../types';
import { generateId } from '../utils/generate-id';
import { getSelectedTrack, type TrackSelectionState } from '../utils/track-selection';

/**
 * State shape for track resolution.
 */
export interface TrackResolutionState extends TrackSelectionState {
  presentation?: Presentation | undefined;
  selectedVideoTrackId?: string | undefined;
  selectedAudioTrackId?: string | undefined;
  selectedTextTrackId?: string | undefined;
}

export function canResolve<T extends TrackType>(
  state: TrackResolutionState,
  config: TrackResolutionConfig<T>
): boolean {
  const track = getSelectedTrack(state, config.type);
  if (!track) return false;

  return !isResolvedTrack(track);
}

/**
 * Determines if track resolution conditions are met.
 *
 * Currently always returns true - conditions are checked by canResolveTrack()
 * and resolving flag. Kept as placeholder for future conditional logic.
 *
 * @param state - Current track resolution state
 * @param event - Current action/event
 * @returns true (conditions checked elsewhere)
 */
export function shouldResolve(_state: TrackResolutionState, _event: TrackResolutionAction): boolean {
  return true;
}

// ============================================================================
// Generic Task
// ============================================================================

/**
 * Configuration for a Task.
 */
interface TaskConfig {
  /**
   * Identifier for this task.
   * - string: used as-is
   * - () => string: called once at construction time
   * - undefined: a unique ID is generated via generateId()
   */
  id?: string | (() => string);

  /**
   * Optional external AbortSignal to compose with the task's internal one.
   * The task's work will be aborted when either the internal controller (via
   * abort()) or this external signal fires — whichever comes first.
   *
   * Composition uses AbortSignal.any(), which produces a new signal that fires
   * when any of its sources are aborted. The internal AbortController is always
   * present so the task can still be aborted independently regardless of whether
   * an external signal is provided.
   */
  signal?: AbortSignal;
}

/**
 * Minimal contract for a schedulable unit of async work.
 */
interface TaskLike {
  readonly id: string;
  run(): Promise<void>;
  abort(): void;
}

/**
 * Generic reusable task that wraps an async run function.
 *
 * Owns its own AbortController so it can always be aborted independently.
 * Optionally composes an external AbortSignal so that a parent's cancellation
 * (e.g. engine cleanup) propagates into the task's work without requiring the
 * caller to track the task separately.
 */
class Task implements TaskLike {
  readonly id: string;
  readonly #abortController = new AbortController();
  readonly #signal: AbortSignal;

  constructor(
    private readonly runFn: (signal: AbortSignal) => Promise<void>,
    config?: TaskConfig
  ) {
    const rawId = config?.id;
    this.id = typeof rawId === 'function' ? rawId() : (rawId ?? generateId());

    // Compose the internal signal with the optional external signal.
    // AbortSignal.any() produces a signal that fires when either source aborts,
    // letting the caller's signal propagate into the task's work (e.g. on engine
    // cleanup) while still allowing the task to be aborted independently via abort().
    this.#signal = config?.signal
      ? AbortSignal.any([this.#abortController.signal, config.signal])
      : this.#abortController.signal;
  }

  async run(): Promise<void> {
    return this.runFn(this.#signal);
  }

  abort(): void {
    this.#abortController.abort();
  }
}

// ============================================================================
// Concurrent runner
// ============================================================================

/**
 * Runs tasks concurrently, deduplicated by the id passed to schedule().
 *
 * If a task for a given id is already in flight, subsequent schedule() calls
 * for that id are silently ignored until the first task completes. Tasks are
 * stored so abortAll() can cancel any in-flight work (e.g. on engine cleanup).
 */
class ConcurrentRunner {
  readonly #pending = new Map<string, TaskLike>();

  schedule(task: TaskLike, id: string): void {
    if (this.#pending.has(id)) return;

    this.#pending.set(id, task);
    task
      .run()
      .catch((error) => {
        if (!(error instanceof Error && error.name === 'AbortError')) throw error;
      })
      .finally(() => {
        this.#pending.delete(id);
      });
  }

  abortAll(): void {
    for (const task of this.#pending.values()) task.abort();
    this.#pending.clear();
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Updates a track within a presentation (immutably).
 * Generic - works for video, audio, or text tracks.
 */
export function updateTrackInPresentation<T extends ResolvedTrack>(
  presentation: Presentation,
  resolvedTrack: T
): Presentation {
  const trackId = resolvedTrack.id;
  return {
    ...presentation,
    selectionSets: presentation.selectionSets.map((selectionSet) => ({
      ...selectionSet,
      switchingSets: selectionSet.switchingSets.map((switchingSet) => ({
        ...switchingSet,
        tracks: switchingSet.tracks.map((track) => (track.id === trackId ? resolvedTrack : track)),
      })),
    })),
  } as Presentation;
}

/**
 * Action types for track resolution.
 * Event names match HTMLMediaElement events (lowercase).
 */
export type TrackResolutionAction = { type: 'play' } | { type: 'pause' };

/**
 * Configuration for track resolution.
 */
export interface TrackResolutionConfig<T extends TrackType = TrackType> {
  type: T;
}

/**
 * Resolves unresolved tracks using reactive composition.
 *
 * The subscribe closure is pure scheduling logic: it checks conditions and
 * creates a Task for the selected track when appropriate. The ConcurrentRunner
 * handles all concurrency concerns — deduplication, parallel execution, and
 * cleanup.
 *
 * Generic version that works for video, audio, or text tracks based on config.
 * Type parameter T is inferred from config.type (use 'as const' for inference).
 */
export function resolveTrack<T extends TrackType>(
  {
    state,
    events,
  }: {
    state: WritableState<TrackResolutionState>;
    events: EventStream<TrackResolutionAction>;
  },
  config: TrackResolutionConfig<T>
): () => void {
  // NOTE: This can/maybe will be pulled into a per-use case factory (e.g. something like createTaskRunner() with args TBD),
  // likely eventually passed down via config or a new "definitions" argument. This will allow us to decide if we want our task runner/scheduler
  // to e.g. run concurrently (like we currently are), serially with a queue, or abort the previous task and replace it with the newly scheduled one. (CJP).
  const runner = new ConcurrentRunner();

  const cleanup = combineLatest([state, events]).subscribe(([currentState, event]) => {
    if (!canResolve(currentState, config) || !shouldResolve(currentState, event)) return;

    const track = getSelectedTrack(currentState, config.type);
    if (!track) return;

    const resolvedTrack = track;

    runner.schedule(
      // NOTE: This can/maybe will be pulled into a per-use case factory (e.g. something like createResolveTrackTask(track, context, config)),
      // likely eventually passed down via config or a new "definitions" argument (CJP).
      new Task(
        async (signal) => {
          const response = await fetchResolvable(resolvedTrack, { signal });
          const text = await getResponseText(response);
          const mediaTrack = parseMediaPlaylist(text, resolvedTrack);

          // IMPORTANT: Read state.current.presentation at patch time, not from the
          // captured currentState snapshot. Multiple Tasks may be running concurrently
          // (one per track being resolved), so the snapshot is likely already stale by
          // the time a task completes — a sibling task may have already patched the
          // presentation with its own resolved track. Using the snapshot would overwrite
          // that update and lose the other track's resolution. Reading live state ensures
          // each task builds on top of whatever has been committed so far.
          //
          // This is a limitation of the current architecture: tasks receive a snapshot
          // at scheduling time but need live state at write time. A future improvement
          // could dispatch resolved tracks through a single serialised writer (e.g. a
          // reducer pattern) to eliminate this hazard entirely.
          const latestPresentation = state.current.presentation!;
          const updatedPresentation = updateTrackInPresentation(latestPresentation, mediaTrack);
          state.patch({ presentation: updatedPresentation });
        },
        { id: track.id }
      ),
      track.id
    );
  });

  return () => {
    runner.abortAll();
    cleanup();
  };
}
