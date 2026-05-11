import { defineBehavior } from '../../core/composition/create-composition';
import type { Reactor } from '../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal } from '../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../media/types';
import { findResolvedTextTrack } from '../../media/utils/tracks';
import type { TextTrackSegmentLoaderActor } from '../actors/text-track-segment-loader';

/**
 * Drive the text-track segment loader: as `currentTime` and the selected
 * text track change, dispatch `load` messages so the loader can fetch
 * and parse VTT segments inside its forward-buffer window.
 *
 * Active when a `TextTrackSegmentLoaderActor` is in context and the
 * selected text track resolves (in the current presentation) to a track
 * with at least one segment.
 *
 * Companion to `setupTextTrackActors` (which owns actor lifecycle) and
 * `syncTextTracks` (which mounts `<track>` elements). Composition order
 * ensures mounting happens before this reactor evaluates; the
 * `TextTracksActor` silently no-ops if a `load`'s cues arrive for a
 * not-yet-mounted track, so we don't gate on DOM mount here.
 *
 * Source-reset / in-flight cancellation is the loader's responsibility,
 * not this behavior's: the next `load` aborts in-flight work, and the
 * loader's destroy (driven by `setupTextTrackActors`) tears down the
 * runner.
 *
 * @example
 * const reactor = loadTextTrackCues.setup({ state, context });
 */
export interface TextTrackCueLoadingState {
  selectedTextTrackId?: string;
  presentation?: MaybeResolvedPresentation;
  /** Current playback position — used to gate segment fetching to the forward buffer window. */
  currentTime?: number;
}

export interface TextTrackCueLoadingContext {
  segmentLoaderActor?: TextTrackSegmentLoaderActor | undefined;
}

type LoadTextTrackCuesState = 'preconditions-unmet' | 'selected-track-resolved';

function loadTextTrackCuesSetup({
  state,
  context,
}: {
  state: {
    selectedTextTrackId: ReadonlySignal<TextTrackCueLoadingState['selectedTextTrackId']>;
    presentation: ReadonlySignal<TextTrackCueLoadingState['presentation']>;
    currentTime: ReadonlySignal<TextTrackCueLoadingState['currentTime']>;
  };
  context: {
    segmentLoaderActor: ReadonlySignal<TextTrackCueLoadingContext['segmentLoaderActor']>;
  };
}): Reactor<LoadTextTrackCuesState | 'destroying' | 'destroyed'> {
  const selectedTrackSignal = computed(() => {
    const track = findResolvedTextTrack(state.presentation.get(), state.selectedTextTrackId.get());
    return track && track.segments.length > 0 ? track : undefined;
  });
  const derivedStateSignal = computed<LoadTextTrackCuesState>(() =>
    context.segmentLoaderActor.get() && selectedTrackSignal.get() ? 'selected-track-resolved' : 'preconditions-unmet'
  );

  return createMachineReactor<LoadTextTrackCuesState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},
      'selected-track-resolved': {
        // Re-runs on currentTime/selectedTrack changes, dispatching a load.
        // The loader actor reference is peeked — its presence is a state
        // invariant, and writes to that slot transition us out via the monitor.
        effects: () => {
          const currentTime = state.currentTime.get() ?? 0;
          const track = selectedTrackSignal.get()!;
          peek(context.segmentLoaderActor)!.send({ type: 'load', track, currentTime });
        },
      },
    },
  });
}

export const loadTextTrackCues = defineBehavior({
  stateKeys: ['selectedTextTrackId', 'presentation', 'currentTime'],
  contextKeys: ['segmentLoaderActor'],
  setup: loadTextTrackCuesSetup,
});
