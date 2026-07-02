/**
 * **Default audio/video track selection on src load / unselect on src unload.**
 * When a presentation is resolved, sets `selectedVideoTrackId` /
 * `selectedAudioTrackId` to a per-type-picker default if no selection already
 * exists. When the presentation is unset/reset (transitions back to unresolved),
 * clears the selection so a stale id from the previous source doesn't persist.
 *
 * Lifecycle-driven: each transition fires its work once. Does not police the
 * selection between transitions; external writes (user picks, ABR, programmatic
 * filter-driven re-picks) are left alone.
 *
 * Picker is config-driven: each per-type export wires a sensible default
 * (`pickAudioTrack` for audio — three-tier language-aware; `pickFirstTrackId`
 * for video) and the caller can supply their own via `config.picker` for custom
 * selection logic. The behavior's `config` is forwarded to the picker as its
 * second argument, so options like `preferredAudioLanguage` reach the picker
 * without an intermediate wrapping layer.
 *
 * Compose `selectVideoTrack` for the simple "pick a default video track"
 * behavior, or `switchVideoTrack` (`./track-switching.ts`) for the
 * ABR-driven variant. Compose `selectAudioTrack` for the simple default
 * pick, or `switchAudioTrack` (`./track-switching.ts`) for the
 * filter-reactive + mid-stream-flush slot-owner variant — when audio-abr
 * lands, `switchAudioTrack` extends into `switchAudioQuality`. Compose
 * only one per type — they're alternatives, not stackable (each writes
 * the same `selected*TrackId` slot). The simple variants tree-shake out
 * the heavier machinery (bandwidth estimator, quality selection, flush
 * orchestration).
 *
 * Text selection has no simple variant here — it's owned by `switchTextTrack`
 * (`./track-switching.ts`), which resolves standing `userTextTrackSelection`
 * intent against the constrained, CDN-scoped renditions.
 */

import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import {
  type AudioSelectionConfig,
  pickAudioTrack,
  pickFirstTrackId,
  type TrackPicker,
  type TrackSelectionState,
  type VideoSelectionConfig,
} from '../../media/primitives/select-tracks';
import { isResolvedPresentation } from '../../media/types';
import { AUDIO_TYPE_CONFIG, VIDEO_TYPE_CONFIG } from '../primitives/track-types';

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

type SelectedTrackKey = 'selectedVideoTrackId' | 'selectedAudioTrackId';

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
            // `state.presentation.get()` is non-null inside this entry —
            // the reactor's `'presentation-resolved'` gate is exactly
            // `isResolvedPresentation(state.presentation.get())`, which
            // requires a truthy Presentation.
            const id = picker(state.presentation.get()!, pickerConfig);
            if (id) state[selectedKey].set(id);
          }
          return () => state[selectedKey].set(undefined);
        },
      },
    },
  });
}

// ============================================================================
// Default pickers
//
// Each variant resolves its picker as `config?.picker ?? <default>` and
// forwards the whole engine config as `pickerConfig`, so a rich picker
// (`pickAudioTrack`) reads its options directly. Audio uses its primitive
// picker as-is; video adapts `pickFirstTrackId` (positional `type` arg) into
// the `TrackPicker` shape.
// ============================================================================

/** Default video picker: first track in the video selection set. */
const defaultVideoPicker: TrackPicker = (presentation) => pickFirstTrackId(presentation, 'video');

// ============================================================================
// Specialized exports — one per track type
// ============================================================================

/**
 * Config for `selectVideoTrack`. Pass `picker` to fully override selection
 * logic; otherwise the default `pickFirstTrackId` is used.
 */
export interface SelectVideoTrackConfig extends VideoSelectionConfig {
  picker?: TrackPicker<SelectVideoTrackConfig>;
}

/**
 * Select a video track when a presentation loads. Clears the selection on
 * src unload.
 *
 * This is the simple, non-ABR counterpart to `switchVideoTrack` — compose
 * one or the other, not both (both write `selectedVideoTrackId`). Composing
 * `selectVideoTrack` alone tree-shakes out the ABR code path
 * (bandwidth-estimator, quality-selection); use it for sources without
 * meaningful quality variants, test setups, or players that intentionally
 * pin a quality.
 *
 * @example
 * const reactor = selectVideoTrack.setup({ state });
 */
export const selectVideoTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId'],
  contextKeys: [],
  setup: ({ state, config }: { state: SelectStateMap<'selectedVideoTrackId'>; config?: SelectVideoTrackConfig }) =>
    setupTrackSelection({
      state,
      config: {
        selectedKey: VIDEO_TYPE_CONFIG.selectedKey,
        picker: config?.picker ?? defaultVideoPicker,
        pickerConfig: config,
      },
    }),
});

/**
 * Config for `selectAudioTrack`. Pass `picker` to fully override selection
 * logic; otherwise the default `pickAudioTrack` is used (three-tier:
 * `preferredAudioLanguage` → `DEFAULT=YES` → first track).
 */
export interface SelectAudioTrackConfig extends AudioSelectionConfig {
  picker?: TrackPicker<SelectAudioTrackConfig>;
}

/**
 * Select an audio track when a presentation loads. Clears the selection
 * on src unload.
 *
 * This is the simple, lifecycle-only counterpart to `switchAudioTrack`
 * (in `./track-switching.ts`) — compose one or the other, not both
 * (both write `selectedAudioTrackId`). `switchAudioTrack` adds
 * filter-reactivity (`userAudioTrackSelection`) and mid-stream-flush
 * orchestration; `selectAudioTrack` covers the default-on-load case
 * without those. Use this variant for test setups, audio-only flows
 * that don't expose language switching, or composition variants that
 * intentionally pin a track.
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
        selectedKey: AUDIO_TYPE_CONFIG.selectedKey,
        picker: config?.picker ?? pickAudioTrack,
        pickerConfig: config,
      },
    }),
});
