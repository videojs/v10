import { defineBehavior } from '../../core/composition/create-composition';
import { effect } from '../../core/signals/effect';
import type { ReadonlySignal, Signal } from '../../core/signals/primitives';
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

// ============================================================================
// Specialization helper
//
// `setupTrackSelection` has the same shape as a Behavior `setup` function:
// `({ state, config }) => cleanup`. Each `selectXTrack` export below calls it
// from inside its own `defineBehavior` setup, supplying its per-type config
// inline. Picker is variant-specific: video/audio use `pickFirstTrackId`
// (works on any `MaybeResolvedPresentation`); text uses `pickTextTrack`
// against a fully-resolved `Presentation`. The orchestration — read
// presentation, no-op when already selected, pick, set — is shared.
// ============================================================================

type SelectedTrackKey = 'selectedVideoTrackId' | 'selectedAudioTrackId' | 'selectedTextTrackId';

type SelectStateMap<K extends SelectedTrackKey> = {
  presentation: ReadonlySignal<TrackSelectionState['presentation']>;
} & { [P in K]: Signal<TrackSelectionState[P]> };

interface TrackSelectionSetupConfig<K extends SelectedTrackKey> {
  selectedKey: K;
  picker: (presentation: MaybeResolvedPresentation) => string | undefined;
}

function setupTrackSelection<K extends SelectedTrackKey>({
  state,
  config: { selectedKey, picker },
}: {
  state: SelectStateMap<K>;
  config: TrackSelectionSetupConfig<K>;
}): () => void {
  return effect(() => {
    const presentation = state.presentation.get();
    if (!presentation || state[selectedKey].get()) return;
    const id = picker(presentation);
    if (id) state[selectedKey].set(id);
  });
}

// ============================================================================
// Specialized exports — one per track type
// ============================================================================

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
  setup: ({ state }: { state: SelectStateMap<'selectedVideoTrackId'> }) =>
    setupTrackSelection({
      state,
      config: {
        selectedKey: 'selectedVideoTrackId',
        picker: (presentation) => pickFirstTrackId(presentation, 'video'),
      },
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
  setup: ({ state }: { state: SelectStateMap<'selectedAudioTrackId'> }) =>
    setupTrackSelection({
      state,
      config: {
        selectedKey: 'selectedAudioTrackId',
        picker: (presentation) => pickFirstTrackId(presentation, 'audio'),
      },
    }),
});

/**
 * Select a text track based on user preferences (preferred language,
 * default-track auto-select, forced-track filtering).
 *
 * Unlike video/audio selection, text-track selection is user opt-in —
 * `pickTextTrack` returns undefined when no preference matches, and the
 * effect leaves `selectedTextTrackId` unset. Also requires a fully-resolved
 * presentation; partial resolutions are skipped until a media playlist is parsed.
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
    state: SelectStateMap<'selectedTextTrackId'>;
    config: Omit<TextSelectionConfig, 'type'>;
  }) =>
    setupTrackSelection({
      state,
      config: {
        selectedKey: 'selectedTextTrackId',
        picker: (presentation) => {
          if (!isResolvedPresentation(presentation)) return undefined;
          return pickTextTrack(presentation, { ...config, type: 'text' });
        },
      },
    }),
});
