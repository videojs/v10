import { type ContextSignals, defineBehavior, type StateSignals } from '../../core/composition/create-composition';
import type { Reactor } from '../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, snapshot, untrack } from '../../core/signals/primitives';
import type { Cue, MaybeResolvedPresentation, MediaElementWithTextTracks, TextTrack } from '../../media/types';
import { isResolvedTrack } from '../../media/types';
import type { TextTrackSegmentLoaderActor } from '../actors/text-track-segment-loader';
import type { TextTracksActor } from '../actors/text-tracks';

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
 * `textTracksActor` and `segmentLoaderActor` from context. A host-side
 * setup behavior (e.g. `setupTextTrackActors` in dom/) is
 * responsible for creating and destroying them when the media element
 * appears/disappears.
 */
export type LoadTextTrackCuesState = 'preconditions-unmet' | 'pending' | 'monitoring-for-loads';

/**
 * State shape for text-track cue loading.
 */
export interface TextTrackCueLoadingState {
  selectedTextTrackId?: string;
  presentation?: MaybeResolvedPresentation;
  /** Current playback position — used to gate segment fetching to the forward buffer window. */
  currentTime?: number;
}

/**
 * Context shape for text-track cue loading.
 *
 * The `mediaElement` is typed against the host-agnostic
 * `MediaElementWithTextTracks` shape; `HTMLMediaElement` satisfies it
 * structurally. Actors are expected to be supplied by a companion
 * provider behavior.
 */
export interface TextTrackCueLoadingContext {
  mediaElement?: MediaElementWithTextTracks | undefined;
  textTracksActor?: TextTracksActor<Cue> | undefined;
  segmentLoaderActor?: TextTrackSegmentLoaderActor | undefined;
}

// ============================================================================
// Helpers
// ============================================================================

function getTextTracks(presentation: MaybeResolvedPresentation | undefined) {
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

function deriveState(state: TextTrackCueLoadingState, context: TextTrackCueLoadingContext): LoadTextTrackCuesState {
  if (
    !context.mediaElement ||
    !getTextTracks(state.presentation)?.length ||
    !context.textTracksActor ||
    !context.segmentLoaderActor
  ) {
    return 'preconditions-unmet';
  }
  const track = findSelectedTrack(state);
  if (!track || track.segments.length === 0) return 'pending';
  if (!hasMountedTrack(context.mediaElement, state.selectedTextTrackId ?? '')) {
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
 * actors in context, selected track mounted), then sends `load` messages
 * to the `segmentLoaderActor` whenever `currentTime` or the selected
 * track changes.
 *
 * Actors are provided by a host-side companion behavior — this behavior
 * does not create or destroy them.
 *
 * @example
 * const reactor = loadTextTrackCues.setup({ state, context });
 */
function loadTextTrackCuesSetup({
  state,
  context,
}: {
  state: StateSignals<TextTrackCueLoadingState>;
  context: ContextSignals<TextTrackCueLoadingContext>;
}): Reactor<LoadTextTrackCuesState | 'destroying' | 'destroyed'> {
  const derivedStateSignal = computed(() => deriveState(snapshot(state), snapshot(context)));
  const currentTimeSignal = computed(() => state.currentTime.get() ?? 0);
  const selectedTrackSignal = computed(() => findSelectedTrack(snapshot(state)));

  return createMachineReactor<LoadTextTrackCuesState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},
      pending: {},
      'monitoring-for-loads': {
        // Re-runs whenever currentTime or selectedTrack changes, dispatching
        // a load message. context is read with untrack() since actor presence
        // is guaranteed by deriveState when in this state. The always monitor
        // (registered before this effect) transitions us out before this
        // re-runs if either invariant stops holding.
        effects: () => {
          const currentTime = currentTimeSignal.get();
          const track = selectedTrackSignal.get()!;
          const segmentLoaderActor = untrack(() => context.segmentLoaderActor.get());
          segmentLoaderActor!.send({ type: 'load', track, currentTime });
        },
      },
    },
  });
}

export const loadTextTrackCues = defineBehavior({
  stateKeys: ['selectedTextTrackId', 'presentation', 'currentTime'],
  contextKeys: ['mediaElement', 'textTracksActor', 'segmentLoaderActor'],
  setup: loadTextTrackCuesSetup,
});
