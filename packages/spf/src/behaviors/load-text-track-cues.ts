import type { Reactor } from '../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../core/reactors/create-machine-reactor';
import { computed, type Signal, untrack } from '../core/signals/primitives';
import type { Cue, MediaElementWithTextTracks, Presentation, TextTrack } from '../media/types';
import { isResolvedTrack } from '../media/types';
import type { TextTrackSegmentLoaderActor } from './actors/text-track-segment-loader';
import type { TextTracksActor } from './actors/text-tracks';

/**
 * FSM states for text-track cue loading.
 *
 * ```
 * 'preconditions-unmet' ── mediaElement + presentation + text tracks + actors ──→ 'pending'
 *        ↑                                                                              |
 *        │                                                            selectedTrack resolved + in element
 *        │                                                                              ↓
 *        └──── preconditions lost ───── 'monitoring-for-loads'
 *
 * any state ──── destroy() ────→ 'destroying' ────→ 'destroyed'
 * ```
 *
 * Actor lifecycle is NOT managed by this behavior — it reads
 * `textTracksActor` and `segmentLoaderActor` from owners. A host-side
 * provider behavior (e.g. `provideTextTrackActors` in dom/) is
 * responsible for creating and destroying them when the media element
 * appears/disappears.
 */
export type LoadTextTrackCuesState = 'preconditions-unmet' | 'pending' | 'monitoring-for-loads';

/**
 * State shape for text-track cue loading.
 */
export interface TextTrackCueLoadingState {
  selectedTextTrackId?: string;
  presentation?: Presentation;
  /** Current playback position — used to gate segment fetching to the forward buffer window. */
  currentTime?: number;
}

/**
 * Owners shape for text-track cue loading.
 *
 * The `mediaElement` is typed against the host-agnostic
 * `MediaElementWithTextTracks` shape; `HTMLMediaElement` satisfies it
 * structurally. Actors are expected to be supplied by a companion
 * provider behavior.
 */
export interface TextTrackCueLoadingOwners {
  mediaElement?: MediaElementWithTextTracks | undefined;
  textTracksActor?: TextTracksActor<Cue> | undefined;
  segmentLoaderActor?: TextTrackSegmentLoaderActor | undefined;
}

// ============================================================================
// Helpers
// ============================================================================

function getTextTracks(presentation: Presentation | undefined) {
  return presentation?.selectionSets?.find((s) => s.type === 'text')?.switchingSets[0]?.tracks;
}

function findSelectedTrack(state: TextTrackCueLoadingState): TextTrack | undefined {
  const track = getTextTracks(state.presentation)?.find((t) => t.id === state.selectedTextTrackId);
  return track && isResolvedTrack(track) ? track : undefined;
}

function hasMountedTrack(mediaElement: MediaElementWithTextTracks, id: string): boolean {
  for (const t of mediaElement.textTracks) {
    if (t.id === id) return true;
  }
  return false;
}

function deriveState(state: TextTrackCueLoadingState, owners: TextTrackCueLoadingOwners): LoadTextTrackCuesState {
  if (
    !owners.mediaElement ||
    !getTextTracks(state.presentation)?.length ||
    !owners.textTracksActor ||
    !owners.segmentLoaderActor
  ) {
    return 'preconditions-unmet';
  }
  const track = findSelectedTrack(state);
  if (!track || track.segments.length === 0) return 'pending';
  if (!hasMountedTrack(owners.mediaElement, state.selectedTextTrackId ?? '')) {
    return 'pending';
  }
  return 'monitoring-for-loads';
}

// ============================================================================
// Main export
// ============================================================================

/**
 * Text-track cue loading orchestration (host-agnostic).
 *
 * Waits for preconditions (mediaElement, presentation with text tracks,
 * actors in owners, selected track mounted), then sends `load` messages
 * to the `segmentLoaderActor` whenever `currentTime` or the selected
 * track changes.
 *
 * Actors are provided by a host-side companion behavior — this behavior
 * does not create or destroy them.
 *
 * @example
 * const reactor = loadTextTrackCues({ state, owners });
 */
export function loadTextTrackCues<S extends TextTrackCueLoadingState, O extends TextTrackCueLoadingOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): Reactor<LoadTextTrackCuesState | 'destroying' | 'destroyed'> {
  const derivedStateSignal = computed(() => deriveState(state.get(), owners.get()));
  const currentTimeSignal = computed(() => state.get().currentTime ?? 0);
  const selectedTrackSignal = computed(() => findSelectedTrack(state.get()));

  return createMachineReactor<LoadTextTrackCuesState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},
      pending: {},
      'monitoring-for-loads': {
        // Re-runs whenever currentTime or selectedTrack changes, dispatching
        // a load message. owners is read with untrack() since actor presence
        // is guaranteed by deriveState when in this state. The always monitor
        // (registered before this effect) transitions us out before this
        // re-runs if either invariant stops holding.
        effects: () => {
          const currentTime = currentTimeSignal.get();
          const track = selectedTrackSignal.get()!;
          const { segmentLoaderActor } = untrack(() => owners.get());
          segmentLoaderActor!.send({ type: 'load', track, currentTime });
        },
      },
    },
  });
}
