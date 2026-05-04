import type { StateSignals } from '../../core/composition/create-composition';
import { effect } from '../../core/signals/effect';
import { snapshot } from '../../core/signals/primitives';
import {
  type AudioSelectionConfig,
  canSelectTrack,
  pickTextTrack,
  shouldSelectTrack,
  type TextSelectionConfig,
  type TrackSelectionState,
  type VideoSelectionConfig,
} from '../../media/primitives/select-tracks';
import { isResolvedPresentation } from '../../media/types';
import { SelectedTrackIdKeyByType } from '../../media/utils/track-selection';

/**
 * Select a media track (video or audio) orchestration.
 *
 * Selects when:
 * - Presentation exists
 * - No track of the given type is selected yet
 *
 * Currently a POC: simply selects the first track of the requested type.
 * Type-specific config fields (`initialBandwidth`, `preferredAudioLanguage`)
 * are accepted for forward compatibility but not yet honored — quality and
 * language preferences will be added when the selection algorithm matures.
 *
 * @example
 * const cleanup = selectMediaTrack(
 *   { state },
 *   { type: 'video', initialBandwidth: 2_000_000 }
 * );
 */
export function selectMediaTrack(
  { state }: { state: StateSignals<TrackSelectionState> },
  config: VideoSelectionConfig | AudioSelectionConfig
): () => void {
  return effect(() => {
    const currentState = snapshot(state);
    if (!canSelectTrack(currentState, config) || !shouldSelectTrack(currentState, config)) return;

    // Just to have basic functionality/POC, simply selecting the first track
    const selectedTrackId = currentState.presentation?.selectionSets?.find(({ type }) => type === config.type)
      ?.switchingSets[0]?.tracks[0]?.id;

    if (selectedTrackId) {
      const selectedTrackKey = SelectedTrackIdKeyByType[config.type];
      state[selectedTrackKey].set(selectedTrackId);
    }
  });
}

/**
 * Select text track orchestration.
 *
 * Selects text track when:
 * - Presentation exists
 * - No text track is selected yet
 *
 * Note: Currently does not auto-select (user opt-in).
 *
 * @example
 * const cleanup = selectTextTrack({ state, context, events }, {});
 */
export function selectTextTrack(
  { state }: { state: StateSignals<TrackSelectionState> },
  config: TextSelectionConfig = { type: 'text' }
): () => void {
  return effect(() => {
    const currentState = snapshot(state);
    if (!canSelectTrack(currentState, config) || !shouldSelectTrack(currentState, config)) return;

    if (!isResolvedPresentation(currentState.presentation)) return;

    // Text tracks are user opt-in - don't auto-select
    const selectedTextTrackId = pickTextTrack(currentState.presentation, config);

    if (selectedTextTrackId) {
      state.selectedTextTrackId.set(selectedTextTrackId);
    }
  });
}
