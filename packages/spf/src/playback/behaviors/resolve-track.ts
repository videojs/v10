import { defineBehavior } from '../../core/composition/create-composition';
import { effect } from '../../core/signals/effect';
import { computed, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import { ConcurrentRunner, Task } from '../../core/tasks/task';
import { parseMediaPlaylist } from '../../media/hls/parse-media-playlist';
import type {
  MaybeResolvedPresentation,
  PartiallyResolvedTrack,
  Presentation,
  ResolvedTrack,
  TrackType,
} from '../../media/types';
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

/**
 * Find a track of the given type and id within a presentation.
 *
 * Returns the matching track from the first switching set of the matching
 * selection set, or `undefined` if either is missing. The returned track may
 * be partially resolved (URL only) or fully resolved (with segments) — callers
 * narrow as needed.
 */
function findTrack(
  presentation: MaybeResolvedPresentation,
  type: TrackType,
  trackId: string
): PartiallyResolvedTrack | ResolvedTrack | undefined {
  return presentation.selectionSets
    ?.find(({ type: t }) => t === type)
    ?.switchingSets[0]?.tracks.find(({ id }) => id === trackId);
}

// ============================================================================
// Specialization helper
//
// `setupTrackResolution` has the same shape as a Behavior `setup` function:
// `({ state, config }) => cleanup`. Each `resolveXTrack` export below calls it
// from inside its own `defineBehavior` setup, supplying its per-type config
// inline. The orchestration — gate on a selection, short-circuit when the
// track is already resolved or missing, schedule the fetch+parse, and patch
// the resolved track back into `state.presentation` — is shared.
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

interface TrackResolutionConfig<K extends SelectedTrackKey> {
  selectedKey: K;
  findTrackToResolve: (
    presentation: MaybeResolvedPresentation,
    trackId: string
  ) => PartiallyResolvedTrack | ResolvedTrack | undefined;
}

function setupTrackResolution<K extends SelectedTrackKey>({
  state,
  config: { selectedKey, findTrackToResolve },
}: {
  state: ResolveTrackStateMap<K>;
  config: TrackResolutionConfig<K>;
}): () => void {
  // NOTE: This can/maybe will be pulled into a per-use case factory (e.g. something like createTaskRunner() with args TBD),
  // likely eventually passed down via config or a new "definitions" argument. This will allow us to decide if we want our task runner/scheduler
  // to e.g. run concurrently (like we currently are), serially with a queue, or abort the previous task and replace it with the newly scheduled one. (CJP).
  const runner = new ConcurrentRunner();

  // Presentation tracked by source URL identity. Internal presentation
  // updates (segments added by sibling resolution tasks) reuse the same URL
  // and are filtered out by the equality check; only fresh streams or
  // unset/reset transitions propagate. The effect re-fires on these
  // relevant presentation changes and on selected-id changes.
  const presentationByUrl = computed(() => state.presentation.get(), {
    equals: (a, b) => a?.url === b?.url,
  });

  const cleanup = effect(() => {
    const presentation = presentationByUrl.get();
    const trackId = state[selectedKey].get();
    if (!presentation || !trackId) return;

    const track = findTrackToResolve(presentation, trackId);
    if (!track || isResolvedTrack(track)) return;

    runner.schedule(
      // NOTE: This can/maybe will be pulled into a per-use case factory (e.g. something like createResolveTrackTask(track, context, config)),
      // likely eventually passed down via config or a new "definitions" argument (CJP).
      new Task(
        async (signal) => {
          const response = await fetchResolvable(track, { signal });
          const text = await getResponseText(response);
          const mediaTrack = parseMediaPlaylist(text, track);

          // Multiple Tasks may be running concurrently (one per track being
          // resolved); a sibling may have already committed a resolved
          // track by the time this task completes. Reading live state
          // ensures each task builds on top of whatever has been committed
          // so far.
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
    setupTrackResolution({
      state,
      config: {
        selectedKey: 'selectedVideoTrackId',
        findTrackToResolve: (presentation, trackId) => findTrack(presentation, 'video', trackId),
      },
    }),
});

/**
 * Resolve unresolved audio tracks. Same shape as `resolveVideoTrack`,
 * narrowed to audio.
 */
export const resolveAudioTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedAudioTrackId'],
  contextKeys: [],
  setup: ({ state }: { state: ResolveTrackStateMap<'selectedAudioTrackId'> }) =>
    setupTrackResolution({
      state,
      config: {
        selectedKey: 'selectedAudioTrackId',
        findTrackToResolve: (presentation, trackId) => findTrack(presentation, 'audio', trackId),
      },
    }),
});

/**
 * Resolve unresolved text tracks. Same shape as `resolveVideoTrack`,
 * narrowed to text.
 */
export const resolveTextTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedTextTrackId'],
  contextKeys: [],
  setup: ({ state }: { state: ResolveTrackStateMap<'selectedTextTrackId'> }) =>
    setupTrackResolution({
      state,
      config: {
        selectedKey: 'selectedTextTrackId',
        findTrackToResolve: (presentation, trackId) => findTrack(presentation, 'text', trackId),
      },
    }),
});
