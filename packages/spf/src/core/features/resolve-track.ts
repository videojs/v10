import { fetchResolvable, getResponseText } from '../../dom/network/fetch';
import type { EventStream } from '../events/create-event-stream';
import { parseMediaPlaylist } from '../hls/parse-media-playlist';
import { combineLatest } from '../reactive/combine-latest';
import type { WritableState } from '../state/create-state';
import { ConcurrentRunner, Task } from '../task';
import type { Presentation, ResolvedTrack, TrackType } from '../types';
import { isResolvedTrack } from '../types';
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
      )
    );
  });

  return () => {
    runner.abortAll();
    cleanup();
  };
}
