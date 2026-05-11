/**
 * **Default audio/text track selection on src load / unselect on src unload.**
 * When a presentation is resolved, sets `selectedAudioTrackId` /
 * `selectedTextTrackId` to a per-type-picker default if no selection already
 * exists. When the presentation is unset/reset (transitions back to
 * unresolved), clears the selection so a stale id from the previous source
 * doesn't persist.
 *
 * Lifecycle-driven: each transition fires its work once. Does not police
 * the selection between transitions; external writes (user picks) are left
 * alone.
 *
 * Picker is config-driven: each per-type export wires a sensible default
 * (`pickFirstTrackId` for audio, `pickTextTrack` for text) and the caller
 * can supply their own via `config.picker` for custom selection logic
 * (language preferences, default-track handling, etc.). The behavior's
 * `config` is forwarded to the picker as its second argument, so options
 * like `preferredAudioLanguage` / `preferredSubtitleLanguage` reach the
 * picker without an intermediate wrapping layer.
 *
 * Video selection lives in `switchVideoQuality` (`./quality-switching.ts`),
 * which owns both the default-pick and the ABR-driven adjustment for
 * `selectedVideoTrackId`. When audio-bitrate ABR ships, `selectAudioTrack`
 * is expected to merge into a `switchAudioQuality` peer there.
 */

import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import {
  type AudioSelectionConfig,
  pickFirstTrackId,
  pickTextTrack,
  type TextSelectionConfig,
  type TrackPicker,
  type TrackSelectionState,
} from '../../media/primitives/select-tracks';
import { isResolvedPresentation } from '../../media/types';

// ============================================================================
// Specialization helper
//
// `setupTrackSelection` has the same shape as a Behavior `setup` function:
// `({ state, config }) => Reactor`. Each `selectXTrack` export below calls
// it from inside its own `defineBehavior` setup, supplying its per-type
// `selectedKey`, default picker, and forwarded picker config. The lifecycle
// — pick on entering 'presentation-resolved' if not already selected; clear
// on entering 'presentation-unresolved' — is shared.
// ============================================================================

type SelectedTrackKey = 'selectedAudioTrackId' | 'selectedTextTrackId';

type SelectStateMap<K extends SelectedTrackKey> = {
  presentation: ReadonlySignal<TrackSelectionState['presentation']>;
} & { [P in K]: Signal<TrackSelectionState[P]> };

interface TrackSelectionSetupConfig<K extends SelectedTrackKey, PickerConfig> {
  selectedKey: K;
  picker: TrackPicker<PickerConfig>;
  pickerConfig?: PickerConfig;
}

function setupTrackSelection<K extends SelectedTrackKey, PickerConfig>({
  state,
  config: { selectedKey, picker, pickerConfig },
}: {
  state: SelectStateMap<K>;
  config: TrackSelectionSetupConfig<K, PickerConfig>;
}) {
  const derivedStateSignal = computed(() =>
    isResolvedPresentation(state.presentation.get())
      ? ('presentation-resolved' as const)
      : ('presentation-unresolved' as const)
  );

  return createMachineReactor({
    initial: 'presentation-unresolved',
    monitor: () => derivedStateSignal.get(),
    states: {
      'presentation-unresolved': {},
      'presentation-resolved': {
        // Entry: pick a default on entering presentation-resolved if none
        // is set. External writes (user picks, ABR) that already populated
        // the slot are left alone.
        //
        // The returned cleanup runs on state exit — which fires on src
        // unload (presentation-resolved → presentation-unresolved) AND on
        // behavior destroy (presentation-resolved → destroying →
        // destroyed). Putting the clear here rather than as
        // presentation-unresolved.entry is more cohesive (operation +
        // cleanup co-located) and correctly covers destroy (destroy
        // doesn't pass through presentation-unresolved).
        entry: () => {
          if (!state[selectedKey].get()) {
            const presentation = state.presentation.get();
            if (presentation) {
              const id = picker(presentation, pickerConfig);
              if (id) state[selectedKey].set(id);
            }
          }
          return () => state[selectedKey].set(undefined);
        },
      },
    },
  });
}

// ============================================================================
// Specialized exports — one per track type
// ============================================================================

/** Default audio picker: first track in the audio selection set. */
const defaultAudioPicker: TrackPicker = (presentation) => pickFirstTrackId(presentation, 'audio');

/**
 * Config for `selectAudioTrack`. Pass `picker` to fully override selection
 * logic; otherwise the default `pickFirstTrackId` is used (which ignores
 * the other fields — they reach the picker as its second arg for callers
 * who supply a richer picker, like a language-aware one).
 */
export interface SelectAudioTrackConfig extends Omit<AudioSelectionConfig, 'type'> {
  picker?: TrackPicker<SelectAudioTrackConfig>;
}

/**
 * Select an audio track when a presentation loads. Clears the selection
 * on src unload.
 *
 * @example
 * const reactor = selectAudioTrack.setup({ state });
 *
 * @example
 * // Custom picker with language preference
 * const reactor = selectAudioTrack.setup({
 *   state,
 *   config: { preferredAudioLanguage: 'en', picker: myLanguageAwarePicker },
 * });
 */
export const selectAudioTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedAudioTrackId'],
  contextKeys: [],
  setup: ({ state, config }: { state: SelectStateMap<'selectedAudioTrackId'>; config?: SelectAudioTrackConfig }) =>
    setupTrackSelection({
      state,
      config: {
        selectedKey: 'selectedAudioTrackId',
        picker: config?.picker ?? defaultAudioPicker,
        pickerConfig: config,
      },
    }),
});

/**
 * Config for `selectTextTrack`. Pass `picker` to fully override selection
 * logic; otherwise the default `pickTextTrack` is used, which honors the
 * other fields.
 */
export interface SelectTextTrackConfig extends Omit<TextSelectionConfig, 'type'> {
  picker?: TrackPicker<SelectTextTrackConfig>;
}

/**
 * Default text picker: `pickTextTrack` with `isResolvedPresentation`
 * narrowing. Honors `preferredSubtitleLanguage`, `enableDefaultTrack`, and
 * `includeForcedTracks` from config; returns `undefined` when no
 * preference matches (text-track selection is user opt-in).
 */
const defaultTextPicker: TrackPicker<SelectTextTrackConfig> = (presentation, config) => {
  if (!isResolvedPresentation(presentation)) return undefined;
  return pickTextTrack(presentation, { ...config, type: 'text' });
};

/**
 * Select a text track based on user preferences (preferred language,
 * default-track auto-select, forced-track filtering). Clears the selection
 * on src unload.
 *
 * Unlike audio selection, the default text picker returns `undefined` when
 * no preference matches, leaving the selection unset — text-track
 * selection is user opt-in.
 *
 * @example
 * const reactor = selectTextTrack.setup({ state, config: { preferredSubtitleLanguage: 'en' } });
 */
export const selectTextTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedTextTrackId'],
  contextKeys: [],
  setup: ({ state, config }: { state: SelectStateMap<'selectedTextTrackId'>; config?: SelectTextTrackConfig }) =>
    setupTrackSelection({
      state,
      config: {
        selectedKey: 'selectedTextTrackId',
        picker: config?.picker ?? defaultTextPicker,
        pickerConfig: config,
      },
    }),
});
