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
 * Video selection lives in `switchVideoQuality` (`./quality-switching.ts`),
 * which owns both the default-pick and the ABR-driven adjustment for
 * `selectedVideoTrackId`. When audio-bitrate ABR ships, `selectAudioTrack`
 * is expected to merge into a `switchAudioQuality` peer there.
 */

import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import {
  pickFirstTrackId,
  pickTextTrack,
  type TextSelectionConfig,
  type TrackSelectionState,
} from '../../media/primitives/select-tracks';
import { isResolvedPresentation, type MaybeResolvedPresentation } from '../../media/types';

// ============================================================================
// Specialization helper
//
// `setupTrackSelection` has the same shape as a Behavior `setup` function:
// `({ state, config }) => Reactor`. Each `selectXTrack` export below calls
// it from inside its own `defineBehavior` setup, supplying its per-type
// config inline. Picker is variant-specific: video/audio use
// `pickFirstTrackId` (works on any `MaybeResolvedPresentation`); text uses
// `pickTextTrack` against a fully-resolved `Presentation`. The lifecycle —
// pick on entering 'resolved' if not already selected; clear on entering
// 'unresolved' — is shared.
// ============================================================================

type SelectedTrackKey = 'selectedAudioTrackId' | 'selectedTextTrackId';

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
}) {
  const derivedStateSignal = computed(() =>
    isResolvedPresentation(state.presentation.get()) ? ('resolved' as const) : ('unresolved' as const)
  );

  return createMachineReactor({
    initial: 'unresolved',
    monitor: () => derivedStateSignal.get(),
    states: {
      unresolved: {},
      resolved: {
        // Entry: pick a default on entering resolved if none is set.
        // External writes (user picks, ABR) that already populated the slot
        // are left alone.
        //
        // The returned cleanup runs on state exit — which fires on src
        // unload (resolved → unresolved) AND on behavior destroy (resolved
        // → destroying → destroyed). Putting the clear here rather than as
        // unresolved.entry is more cohesive (operation + cleanup co-
        // located) and correctly covers destroy (destroy doesn't pass
        // through unresolved).
        entry: () => {
          if (!state[selectedKey].get()) {
            const presentation = state.presentation.get();
            if (presentation) {
              const id = picker(presentation);
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

/**
 * Select the first available audio track when a presentation loads. Clears
 * the selection on src unload.
 *
 * @example
 * const reactor = selectAudioTrack.setup({ state });
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
 * default-track auto-select, forced-track filtering). Clears the selection
 * on src unload.
 *
 * Unlike video/audio selection, text-track selection is user opt-in —
 * `pickTextTrack` returns undefined when no preference matches, and the
 * selection is left undefined.
 *
 * @example
 * const reactor = selectTextTrack.setup({ state, config: { preferredSubtitleLanguage: 'en' } });
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
