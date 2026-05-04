import { defineBehavior, type StateSignals } from '../../core/composition/create-composition';
import { effect } from '../../core/signals/effect';
import {
  pickTextTrack,
  type TextSelectionConfig,
  type TrackSelectionState,
} from '../../media/primitives/select-tracks';
import { isResolvedPresentation, type MaybeResolvedPresentation, type TrackType } from '../../media/types';

/**
 * Pick the first track of the given type from a presentation.
 *
 * Currently a POC: returns the first track in the first switching set.
 * The full pickers (`pickVideoTrack` / `pickAudioTrack` in
 * `media/primitives/select-tracks.ts`) honor bandwidth + language
 * preferences and will replace this once the selection algorithm matures.
 */
function pickFirstTrackId(presentation: MaybeResolvedPresentation, type: TrackType): string | undefined {
  return presentation.selectionSets?.find((set) => set.type === type)?.switchingSets[0]?.tracks[0]?.id;
}

/**
 * Select the first available video track when a presentation loads.
 *
 * No-op once a video track is already selected.
 *
 * @example
 * const cleanup = selectVideoTrack.setup({ state });
 */
export const selectVideoTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId'],
  contextKeys: [],
  setup: ({ state }: { state: StateSignals<Pick<TrackSelectionState, 'presentation' | 'selectedVideoTrackId'>> }) =>
    effect(() => {
      const presentation = state.presentation.get();
      if (!presentation || state.selectedVideoTrackId.get()) return;
      const id = pickFirstTrackId(presentation, 'video');
      if (id) state.selectedVideoTrackId.set(id);
    }),
});

/**
 * Select the first available audio track when a presentation loads.
 *
 * No-op once an audio track is already selected.
 *
 * @example
 * const cleanup = selectAudioTrack.setup({ state });
 */
export const selectAudioTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedAudioTrackId'],
  contextKeys: [],
  setup: ({ state }: { state: StateSignals<Pick<TrackSelectionState, 'presentation' | 'selectedAudioTrackId'>> }) =>
    effect(() => {
      const presentation = state.presentation.get();
      if (!presentation || state.selectedAudioTrackId.get()) return;
      const id = pickFirstTrackId(presentation, 'audio');
      if (id) state.selectedAudioTrackId.set(id);
    }),
});

/**
 * Select a text track based on user preferences (preferred language,
 * default-track auto-select, forced-track filtering).
 *
 * Unlike video/audio selection, text-track selection is user opt-in —
 * `pickTextTrack` returns undefined when no preference matches, and the
 * effect leaves `selectedTextTrackId` unset.
 *
 * @example
 * const cleanup = selectTextTrack.setup({ state, config: { preferredSubtitleLanguage: 'en' } });
 */
export const selectTextTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedTextTrackId'],
  contextKeys: [],
  setup: ({
    state,
    config,
  }: {
    state: StateSignals<Pick<TrackSelectionState, 'presentation' | 'selectedTextTrackId'>>;
    config: Omit<TextSelectionConfig, 'type'>;
  }) =>
    effect(() => {
      const presentation = state.presentation.get();
      if (!isResolvedPresentation(presentation) || state.selectedTextTrackId.get()) return;
      const id = pickTextTrack(presentation, { ...config, type: 'text' });
      if (id) state.selectedTextTrackId.set(id);
    }),
});
