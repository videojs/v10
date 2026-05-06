import { defineBehavior } from '../../core/composition/create-composition';
import { effect } from '../../core/signals/effect';
import type { ReadonlySignal, Signal } from '../../core/signals/primitives';
import { ConcurrentRunner, Task } from '../../core/tasks/task';
import { parseMediaPlaylist } from '../../media/hls/parse-media-playlist';
import type { MaybeResolvedPresentation, Presentation, ResolvedTrack, TrackType } from '../../media/types';
import { isResolvedPresentation, isResolvedTrack } from '../../media/types';
import { fetchResolvable, getResponseText } from '../../network/fetch';

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

// ============================================================================
// Specialization helper
//
// Each `resolveXTrack` export below binds (type, selectedKey) at module
// load. The runtime `state[selectedKey]` access is dynamic, but the
// generic K narrows to a single literal at the call site, so TypeScript
// sees concrete signal access — no `config.type` discriminant carried at
// runtime, no engine-side wrapping.
// ============================================================================

/**
 * State shape for track resolution. Uses `MaybeResolvedPresentation` so it
 * matches the engine's slot type; resolution narrows internally.
 */
export interface ResolveTrackState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  selectedTextTrackId?: string;
}

type SelectedTrackKey = 'selectedVideoTrackId' | 'selectedAudioTrackId' | 'selectedTextTrackId';

type ResolveTrackStateMap<K extends SelectedTrackKey> = {
  presentation: Signal<ResolveTrackState['presentation']>;
} & { [P in K]: ReadonlySignal<ResolveTrackState[P]> };

function setupTrackResolution<T extends TrackType, K extends SelectedTrackKey>(
  state: ResolveTrackStateMap<K>,
  type: T,
  selectedKey: K
): () => void {
  // NOTE: This can/maybe will be pulled into a per-use case factory (e.g. something like createTaskRunner() with args TBD),
  // likely eventually passed down via config or a new "definitions" argument. This will allow us to decide if we want our task runner/scheduler
  // to e.g. run concurrently (like we currently are), serially with a queue, or abort the previous task and replace it with the newly scheduled one. (CJP).
  const runner = new ConcurrentRunner();

  const cleanup = effect(() => {
    const presentation = state.presentation.get();
    const trackId = state[selectedKey].get();
    if (!presentation || !trackId) return;

    const track = presentation.selectionSets
      ?.find(({ type: t }) => t === type)
      ?.switchingSets[0]?.tracks.find(({ id }) => id === trackId);
    if (!track || isResolvedTrack(track)) return;

    runner.schedule(
      // NOTE: This can/maybe will be pulled into a per-use case factory (e.g. something like createResolveTrackTask(track, context, config)),
      // likely eventually passed down via config or a new "definitions" argument (CJP).
      new Task(
        async (signal) => {
          const response = await fetchResolvable(track, { signal });
          const text = await getResponseText(response);
          const mediaTrack = parseMediaPlaylist(text, track);

          // captured snapshot above. Multiple Tasks may be running concurrently
          // (one per track being resolved), so the snapshot is likely already stale
          // by the time a task completes — a sibling task may have already written
          // the presentation with its own resolved track. Reading live state ensures
          // each task builds on top of whatever has been committed so far.
          const latestPresentation = state.presentation.get();
          if (!isResolvedPresentation(latestPresentation)) return;
          state.presentation.set(updateTrackInPresentation(latestPresentation, mediaTrack));
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

// ============================================================================
// Specialized exports — one per track type
// ============================================================================

/**
 * Resolve unresolved video tracks. Schedules a fetch task whenever the
 * selected video track is partially resolved, parses the manifest, and
 * writes the resolved track back into `state.presentation`.
 */
export const resolveVideoTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId'],
  contextKeys: [],
  setup: ({ state }: { state: ResolveTrackStateMap<'selectedVideoTrackId'> }) =>
    setupTrackResolution(state, 'video', 'selectedVideoTrackId'),
});

/**
 * Resolve unresolved audio tracks. Same shape as `resolveVideoTrack`,
 * narrowed to audio.
 */
export const resolveAudioTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedAudioTrackId'],
  contextKeys: [],
  setup: ({ state }: { state: ResolveTrackStateMap<'selectedAudioTrackId'> }) =>
    setupTrackResolution(state, 'audio', 'selectedAudioTrackId'),
});

/**
 * Resolve unresolved text tracks. Same shape as `resolveVideoTrack`,
 * narrowed to text.
 */
export const resolveTextTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedTextTrackId'],
  contextKeys: [],
  setup: ({ state }: { state: ResolveTrackStateMap<'selectedTextTrackId'> }) =>
    setupTrackResolution(state, 'text', 'selectedTextTrackId'),
});
