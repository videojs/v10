/**
 * **Populate presentation duration from the first resolved selected track.**
 * Once a selected video or audio track's media playlist has been parsed
 * (so its `duration` is known), writes that value to `presentation.duration`
 * — video preferred, audio fallback. Fires at most once per presentation:
 * an already-set `duration` is never overwritten, and the next reset arrives
 * structurally when a new (unresolved) presentation replaces the current one.
 *
 * Downstream of `resolveVideoTrack` / `resolveAudioTrack`; upstream of
 * `updateDuration` (which writes the value through to `mediaSource.duration`).
 */
import { defineBehavior } from '../../core/composition/create-composition';
import { effect } from '../../core/signals/effect';
import { type ReadonlySignal, type Signal, snapshot } from '../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../media/types';
import { getResolvedSelectedTrackDuration } from '../../media/utils/track-selection';

export interface PresentationDurationState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
}

function calculatePresentationDurationSetup({
  state,
}: {
  state: {
    presentation: Signal<PresentationDurationState['presentation']>;
    selectedVideoTrackId: ReadonlySignal<PresentationDurationState['selectedVideoTrackId']>;
    selectedAudioTrackId: ReadonlySignal<PresentationDurationState['selectedAudioTrackId']>;
  };
}): () => void {
  return effect(() => {
    const presentation = state.presentation.get();
    if (!presentation || presentation.duration !== undefined) return;

    const duration = getResolvedSelectedTrackDuration(snapshot(state));
    if (duration === undefined || !Number.isFinite(duration)) return;

    state.presentation.set({ ...presentation, duration });
  });
}

export const calculatePresentationDuration = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId', 'selectedAudioTrackId'],
  contextKeys: [],
  setup: calculatePresentationDurationSetup,
});
