import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal, update } from '../../core/signals/primitives';
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
}) {
  // NOTE: This can/maybe will be pulled into a per-use case factory (e.g. something like createTaskRunner() with args TBD),
  // likely eventually passed down via config or a new "definitions" argument. This will allow us to decide if we want our task runner/scheduler
  // to e.g. run concurrently (like we currently are), serially with a queue, or abort the previous task and replace it with the newly scheduled one. (CJP).
  const runner = new ConcurrentRunner();

  // Reactor states model the FSM the previous effect-based body was
  // hand-rolling. 'resolving' is entered when the presentation is fully
  // parsed (has a Ham id + selectionSets); leaving it (presentation
  // cleared or reset to an unresolved value) aborts all in-flight tasks
  // via the entry-cleanup. Most URL changes go through 'unresolved'
  // naturally (set undefined → set new partial → re-parse), so the
  // common case is covered by state-exit alone; the task body's
  // commit-time id check covers the pathological resolved→resolved-
  // without-unresolved transition.
  const derivedStateSignal = computed(() =>
    isResolvedPresentation(state.presentation.get()) ? ('resolving' as const) : ('unresolved' as const)
  );

  return createMachineReactor({
    initial: 'unresolved',
    monitor: () => derivedStateSignal.get(),
    states: {
      unresolved: {},
      resolving: {
        entry: () => () => runner.abortAll(),
        effects: [
          () => {
            // The reactor's state transitions handle relevant presentation
            // changes (resolved↔unresolved); within 'resolving' we peek
            // (untracked read) so internal updates (segments added by
            // sibling tasks) don't re-fire the effect.
            const presentation = peek(state.presentation);
            const trackId = state[selectedKey].get();
            if (!presentation || !trackId) return;

            const track = findTrackToResolve(presentation, trackId);
            if (!track || isResolvedTrack(track)) return;

            runner.schedule(
              // NOTE: This can/maybe will be pulled into a per-use case factory (e.g. something like createResolveTrackTask(track, context, config)),
              // likely eventually passed down via config or a new "definitions" argument (CJP).
              new Task(
                async (signal) => {
                  const taskPresentationId = presentation.id;
                  const response = await fetchResolvable(track, { signal });
                  const text = await getResponseText(response);
                  const mediaTrack = parseMediaPlaylist(text, track);

                  // Edge guard: state-exit-on-unresolved covers the common
                  // URL change. This catches the pathological case where
                  // presentation transitions resolved → resolved directly
                  // (no unresolved intermediate), and serves as defense in
                  // depth against signal-abort-through-body-read races.
                  if (state.presentation.get()?.id !== taskPresentationId) return;

                  // Updater handles undefined inputs by returning current
                  // unchanged; isResolvedPresentation narrows for the patch.
                  update(state.presentation, (current) =>
                    isResolvedPresentation(current) ? updateTrackInPresentation(current, mediaTrack) : current
                  );
                },
                { id: track.id }
              )
            );
          },
        ],
      },
    },
  });
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
