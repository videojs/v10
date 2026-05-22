/**
 * **Default audio/text track selection on src load / unselect on src unload.**
 * When a presentation is resolved, sets `selectedAudioTrackId` /
 * `selectedTextTrackId` to a per-type-picker default if no selection already
 * exists. When the presentation is unset/reset (transitions back to
 * unresolved), clears the selection so a stale id from the previous source
 * doesn't persist.
 *
 * **Audio is filter-reactive.** `selectAudioTrack` reads
 * `userAudioTrackSelection` (consumer intent, sibling of
 * `userVideoTrackSelection`) and narrows the audio candidate set before
 * invoking the picker. On filter changes mid-presentation, the audio
 * selection re-evaluates; when the filter narrows to a single track, the
 * picker is short-circuited. This is the multi-language-audio Tier 2
 * programmatic-write path. `selectVideoTrack` / `selectTextTrack` remain
 * lifecycle-driven (entry-only); only the audio variant has filter
 * reactivity today.
 *
 * Picker is config-driven: each per-type export wires a sensible default
 * (`pickAudioTrack` for audio, `pickTextTrack` for text, `pickFirstTrackId`
 * for video) and the caller can supply their own via `config.picker` for
 * custom selection logic (language preferences, default-track handling,
 * etc.). The behavior's `config` is forwarded to the picker as its second
 * argument, so options like `preferredAudioLanguage` /
 * `preferredSubtitleLanguage` reach the picker without an intermediate
 * wrapping layer.
 *
 * Compose `selectVideoTrack` for the simple "pick a default video track"
 * behavior, or `switchVideoQuality` (`./quality-switching.ts`) for the
 * ABR-driven variant — they're alternatives, not stackable (both write
 * `selectedVideoTrackId`). The simple variant tree-shakes out the
 * ABR machinery (bandwidth-estimator, quality-selection algorithms).
 *
 * When `switchAudioQuality` (audio-abr Phase 3) lands, `selectAudioTrack`
 * shrinks back to the non-filter shape — the filter reactivity migrates
 * to `switchAudioQuality`, matching the video precedent
 * (`selectVideoTrack` / `switchVideoQuality` are mutually exclusive).
 */

import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import {
  type AudioSelectionConfig,
  pickAudioTrack,
  pickFirstTrackId,
  pickTextTrack,
  type TextSelectionConfig,
  type TrackPicker,
  type TrackSelectionState,
  type VideoSelectionConfig,
} from '../../media/primitives/select-tracks';
import type { AudioTrack, MaybeResolvedPresentation, PartiallyResolvedAudioTrack } from '../../media/types';
import { isResolvedPresentation, type Presentation } from '../../media/types';
import { getTracksByType } from '../../media/utils/tracks';
import { AUDIO_TYPE_CONFIG, TEXT_TYPE_CONFIG, VIDEO_TYPE_CONFIG } from './track-types';

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

type SelectedTrackKey = 'selectedVideoTrackId' | 'selectedAudioTrackId' | 'selectedTextTrackId';

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
// Audio specialization helper — filter-reactive variant
//
// `setupAudioTrackSelection` is the audio-specific sibling of
// `setupTrackSelection`. Same overall reactor shape (state-exit clear), but
// the body runs as a state-driven `effects:` array so it re-fires on
// `userAudioTrackSelection` changes mid-presentation. Mirrors
// `setupQualitySwitching`'s filter-narrowing pattern minus the
// bandwidth/ABR layer.
//
// When `switchAudioQuality` (audio-abr Phase 3) lands and takes over
// `selectedAudioTrackId` ownership, this filter logic migrates there and
// `selectAudioTrack` shrinks back to the lifecycle-only helper. The two are
// mutually exclusive at composition time (both write the slot), matching
// the `selectVideoTrack` / `switchVideoQuality` precedent.
// ============================================================================

type AudioSelectStateMap = {
  presentation: ReadonlySignal<MaybeResolvedPresentation | undefined>;
  selectedAudioTrackId: Signal<string | undefined>;
  userAudioTrackSelection: ReadonlySignal<Partial<AudioTrack> | undefined>;
};

interface AudioSelectionSetupConfig<PickerConfig> {
  picker: TrackPicker<PickerConfig>;
  pickerConfig?: PickerConfig;
}

function setupAudioTrackSelection<PickerConfig>({
  state,
  config: { picker, pickerConfig },
}: {
  state: AudioSelectStateMap;
  config: AudioSelectionSetupConfig<PickerConfig>;
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
        // State-exit clear covers both src unload and behavior destroy
        // (canonical cleanup-binds-to-setup per reactors.md).
        entry: () => () => state.selectedAudioTrackId.set(undefined),
        effects: [
          () => {
            // The reactor's state transitions handle relevant presentation
            // identity changes; within 'presentation-resolved' we peek so
            // internal updates (resolveAudioTrack patching segments) don't
            // re-fire the effect. Filter changes DO re-fire (tracked via
            // .get()) — that's the Tier 2 programmatic-write trigger.
            const presentation = peek(state.presentation);
            if (!presentation) return;

            const allTracks = getTracksByType(presentation, 'audio') as readonly (
              | PartiallyResolvedAudioTrack
              | AudioTrack
            )[];
            if (!allTracks.length) return;

            const userFilter = state.userAudioTrackSelection.get();
            // Filter logic mirrors setupQualitySwitching's pattern:
            // partial-track-description match across every present key.
            const matching = userFilter
              ? allTracks.filter((track) => {
                  for (const key in userFilter) {
                    const filterValue = userFilter[key as keyof AudioTrack];
                    if (filterValue !== undefined && track[key as keyof AudioTrack] !== filterValue) return false;
                  }
                  return true;
                })
              : allTracks;
            // Fall back to all tracks if filter excludes everything — don't
            // stall playback on a no-match filter (e.g., language filter
            // for a source that doesn't carry that language).
            const candidates = matching.length > 0 ? matching : allTracks;
            const selectedId = state.selectedAudioTrackId.get();

            // Single-candidate short-circuit: filter pinned the choice.
            // Skip the picker; write the only candidate directly.
            if (candidates.length === 1) {
              if (candidates[0]!.id !== selectedId) state.selectedAudioTrackId.set(candidates[0]!.id);
              return;
            }

            // Initial entry (slot empty): invoke picker. The picker reads
            // the full presentation; if its choice happens to land outside
            // the filter-narrowed set, fall back to first narrowed track
            // so consumer filter intent wins over picker default.
            //
            // Subsequent re-fires (slot already set): leave the current
            // selection unless the filter narrowed to a single track
            // (handled above). External writes — including future
            // switchAudioQuality (audio-abr) writes — are respected.
            if (!selectedId) {
              const pickerChoice = picker(presentation, pickerConfig);
              const inCandidates = pickerChoice && candidates.some((t) => t.id === pickerChoice);
              const id = inCandidates ? pickerChoice : candidates[0]?.id;
              if (id) state.selectedAudioTrackId.set(id);
            }
          },
        ],
      },
    },
  });
}

// ============================================================================
// Per-helper-per-type configs — defaults that variants spread engine config over
//
// The engine-facing config carries `picker?` (optional override) plus
// fields the default picker consults (preferred language, etc.). The
// variant resolves the final picker (engine override or default) and
// forwards the whole engine config as `pickerConfig` so rich pickers can
// read their options.
// ============================================================================

/** Default video picker: first track in the video selection set. */
const defaultVideoPicker: TrackPicker = (presentation) => pickFirstTrackId(presentation, 'video');

const VIDEO_TRACK_SELECTION_CONFIG = {
  ...VIDEO_TYPE_CONFIG,
  picker: defaultVideoPicker,
} as const;

/**
 * Default audio picker: three-tier per the multi-language-audio Tier 1
 * default-selection contract — `preferredAudioLanguage` → `DEFAULT=YES` →
 * first track. Honored only when the picker is invoked; the picker is only
 * called from inside `'presentation-resolved'`, which gates on
 * `isResolvedPresentation`, so the cast to `Presentation` is safe.
 */
const defaultAudioPicker: TrackPicker<SelectAudioTrackConfig> = (presentation, config) =>
  pickAudioTrack(presentation as Presentation, { ...config, type: 'audio' });

const AUDIO_TRACK_SELECTION_CONFIG = {
  ...AUDIO_TYPE_CONFIG,
  picker: defaultAudioPicker,
} as const;

const TEXT_TRACK_SELECTION_CONFIG = {
  ...TEXT_TYPE_CONFIG,
  picker: pickTextTrack,
} as const;

// ============================================================================
// Specialized exports — one per track type
// ============================================================================

/**
 * Config for `selectVideoTrack`. Pass `picker` to fully override selection
 * logic; otherwise the default `pickFirstTrackId` is used.
 */
export interface SelectVideoTrackConfig extends Omit<VideoSelectionConfig, 'type'> {
  picker?: TrackPicker<SelectVideoTrackConfig>;
}

/**
 * Select a video track when a presentation loads. Clears the selection on
 * src unload.
 *
 * This is the simple, non-ABR counterpart to `switchVideoQuality` — compose
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
        ...VIDEO_TRACK_SELECTION_CONFIG,
        picker: config?.picker ?? VIDEO_TRACK_SELECTION_CONFIG.picker,
        pickerConfig: config,
      },
    }),
});

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
 * Manage `selectedAudioTrackId`: pick a default on src load, re-pick when
 * `userAudioTrackSelection` narrows the candidate set, clear on src unload.
 * The filter is a partial-track description (`{ language: 'es' }`,
 * `{ id: 'specific-track' }`, etc.); when narrowing produces a single track,
 * the picker is short-circuited and that track is written directly.
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
  stateKeys: ['presentation', 'selectedAudioTrackId', 'userAudioTrackSelection'],
  contextKeys: [],
  setup: ({ state, config }: { state: AudioSelectStateMap; config?: SelectAudioTrackConfig }) =>
    setupAudioTrackSelection({
      state,
      config: {
        picker: config?.picker ?? AUDIO_TRACK_SELECTION_CONFIG.picker,
        pickerConfig: config,
      },
    }),
});

/**
 * Config for `selectTextTrack`. Pass `picker` to fully override selection
 * logic; otherwise the default `pickTextTrack` is used, which honors the
 * other fields.
 */
export interface SelectTextTrackConfig extends TextSelectionConfig {
  picker?: TrackPicker<SelectTextTrackConfig>;
}

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
        ...TEXT_TRACK_SELECTION_CONFIG,
        picker: config?.picker ?? TEXT_TRACK_SELECTION_CONFIG.picker,
        pickerConfig: config,
      },
    }),
});
