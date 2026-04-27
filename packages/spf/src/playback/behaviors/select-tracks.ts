import { effect } from '../../core/signals/effect';
import { type Signal, update } from '../../core/signals/primitives';
import {
  type AudioSelectionConfig,
  canSelectTrack,
  pickTextTrack,
  shouldSelectTrack,
  type TextSelectionConfig,
  type TrackSelectionState,
  type VideoSelectionConfig,
} from '../../media/primitives/select-tracks';
import { SelectedTrackIdKeyByType } from '../../media/utils/track-selection';

/**
 * Select video track orchestration.
 *
 * Selects video track when:
 * - Presentation exists
 * - No video track is selected yet
 *
 * Uses bandwidth-based quality selection algorithm.
 *
 * @example
 * const cleanup = selectVideoTrack(
 *   { state, owners, events },
 *   { initialBandwidth: 2_000_000 }
 * );
 */
export function selectVideoTrack<S extends TrackSelectionState>(
  { state }: { state: Signal<S> },
  config: VideoSelectionConfig = { type: 'video' }
): () => void {
  return effect(() => {
    const currentState = state.get();
    if (!canSelectTrack(currentState, config) || !shouldSelectTrack(currentState, config)) return;

    // Just to have basic functionality/POC, simply selecting the first track
    const selectedTrackId = currentState.presentation?.selectionSets.find(({ type }) => type === config.type)
      ?.switchingSets[0]?.tracks[0]?.id;

    if (selectedTrackId) {
      const selectedTrackKey = SelectedTrackIdKeyByType[config.type];
      const patch: Partial<TrackSelectionState> = { [selectedTrackKey]: selectedTrackId };
      update(state, patch);
    }
  });
}

/**
 * Select audio track orchestration.
 *
 * Selects audio track when:
 * - Presentation exists
 * - No audio track is selected yet
 *
 * Uses language and preference-based selection.
 *
 * @example
 * const cleanup = selectAudioTrack(
 *   { state, owners, events },
 *   { preferredAudioLanguage: 'en' }
 * );
 */
export function selectAudioTrack<S extends TrackSelectionState>(
  { state }: { state: Signal<S> },
  config: AudioSelectionConfig = { type: 'audio' }
): () => void {
  return effect(() => {
    const currentState = state.get();
    if (!canSelectTrack(currentState, config) || !shouldSelectTrack(currentState, config)) return;

    // Just to have basic functionality/POC, simply selecting the first track
    const selectedTrackId = currentState.presentation?.selectionSets.find(({ type }) => type === 'audio')
      ?.switchingSets[0]?.tracks[0]?.id;

    if (selectedTrackId) {
      const patch: Partial<TrackSelectionState> = { selectedAudioTrackId: selectedTrackId };
      update(state, patch);
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
 * const cleanup = selectTextTrack({ state, owners, events }, {});
 */
export function selectTextTrack<S extends TrackSelectionState>(
  { state }: { state: Signal<S> },
  config: TextSelectionConfig = { type: 'text' }
): () => void {
  return effect(() => {
    const currentState = state.get();
    if (!canSelectTrack(currentState, config) || !shouldSelectTrack(currentState, config)) return;

    // Text tracks are user opt-in - don't auto-select
    const selectedTextTrackId = pickTextTrack(currentState.presentation!, config);

    if (selectedTextTrackId) {
      const patch: Partial<TrackSelectionState> = { selectedTextTrackId };
      update(state, patch);
    }
  });
}
