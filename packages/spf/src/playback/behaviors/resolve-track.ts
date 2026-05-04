import { defineBehavior, type StateSignals } from '../../core/composition/create-composition';
import { effect } from '../../core/signals/effect';
import { snapshot } from '../../core/signals/primitives';
import { ConcurrentRunner, Task } from '../../core/tasks/task';
import { parseMediaPlaylist } from '../../media/hls/parse-media-playlist';
import type { MaybeResolvedPresentation, Presentation, ResolvedTrack, TrackType } from '../../media/types';
import { isResolvedPresentation, isResolvedTrack } from '../../media/types';
import { getSelectedTrack, type TrackSelectionState } from '../../media/utils/track-selection';
import { fetchResolvable, getResponseText } from '../../network/fetch';

/**
 * State shape for track resolution.
 */
export interface TrackResolutionState extends TrackSelectionState {
  presentation?: MaybeResolvedPresentation;
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
 * Configuration for track resolution.
 */
export interface TrackResolutionConfig<T extends TrackType = TrackType> {
  type: T;
}

/**
 * Resolves unresolved tracks using reactive composition.
 *
 * Reacts to state changes and schedules fetch tasks via ConcurrentRunner when
 * a selected track is unresolved. The ConcurrentRunner handles deduplication,
 * parallel execution, and cleanup.
 *
 * Generic version that works for video, audio, or text tracks based on config.
 * Type parameter T is inferred from config.type (use 'as const' for inference).
 */
function resolveTrackSetup({
  state,
  config,
}: {
  state: StateSignals<TrackResolutionState>;
  config: TrackResolutionConfig;
}): () => void {
  // NOTE: This can/maybe will be pulled into a per-use case factory (e.g. something like createTaskRunner() with args TBD),
  // likely eventually passed down via config or a new "definitions" argument. This will allow us to decide if we want our task runner/scheduler
  // to e.g. run concurrently (like we currently are), serially with a queue, or abort the previous task and replace it with the newly scheduled one. (CJP).
  const runner = new ConcurrentRunner();

  const cleanup = effect(() => {
    const currentState = snapshot(state);
    if (!canResolve(currentState, config)) return;

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

          // IMPORTANT: Read state.presentation.get() at write time, not from the
          // captured currentState snapshot. Multiple Tasks may be running concurrently
          // (one per track being resolved), so the snapshot is likely already stale by
          // the time a task completes — a sibling task may have already written the
          // presentation with its own resolved track. Reading live state ensures each
          // task builds on top of whatever has been committed so far.
          const latestPresentation = state.presentation.get();
          if (!isResolvedPresentation(latestPresentation)) return;
          const updatedPresentation = updateTrackInPresentation(latestPresentation, mediaTrack);
          state.presentation.set(updatedPresentation);
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

export const resolveTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId', 'selectedAudioTrackId', 'selectedTextTrackId'],
  contextKeys: [],
  setup: resolveTrackSetup,
});
