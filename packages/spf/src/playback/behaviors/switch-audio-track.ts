/**
 * **Manage the audio track selection slot — slot-owner variant.** Sibling
 * of `selectAudioTrack` (`../select-tracks.ts`) with filter-reactivity:
 *
 * Reads `userAudioTrackSelection` (consumer-driven `Partial<AudioTrack>`
 * constraint, sibling of `userVideoTrackSelection`) and narrows the audio
 * candidate set before invoking the picker. On filter changes
 * mid-presentation, the audio selection re-evaluates; when the filter
 * narrows to a single track, the picker is short-circuited.
 *
 * **Single responsibility — selection ownership only.** Cross-rendition
 * concerns (audio-buffer flush on language switch) are handled at the
 * segment-loader / source-buffer layer in `planTasks`, not in this
 * behavior. Compare the video sibling split: `switchVideoQuality` writes
 * `selectedVideoTrackId`; `segment-loader`'s `planTasks` handles segment
 * batching / init dispatch / flush decisions. The same split applies for
 * audio — slot management here, segment + flush plan in the loader actor.
 *
 * Compose `switchAudioTrack` for engines that need multi-language-audio
 * Tier 2 (programmatic selection). Compose `selectAudioTrack` instead for
 * the simpler default-on-load case. They're mutually exclusive — both
 * write `selectedAudioTrackId`.
 *
 * **Designed to converge with `switchVideoQuality`.** This file mirrors
 * the abstraction shape of `../quality-switching.ts` —
 * `setupAudioTrackSwitching` parallels `setupQualitySwitching`: same
 * generics over selection slot key + user-selection key + track type;
 * same `getTracks` / `selectOptimal` / `picker` config abstractions; same
 * single-candidate short-circuit + filter-narrowing pattern. The two
 * helpers stay parallel today (audio has no bandwidth/ABR; video does)
 * but the shapes converge so `switchAudioQuality` (audio-abr Phase 3)
 * can merge or co-host with `switchVideoQuality` cleanly.
 */

import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import { pickAudioTrack, type TrackPicker } from '../../media/primitives/select-tracks';
import {
  type AudioTrack,
  isResolvedPresentation,
  type MaybeResolvedPresentation,
  type PartiallyResolvedAudioTrack,
  type Presentation,
} from '../../media/types';
import { getTracksByType } from '../../media/utils/tracks';

// ============================================================================
// State / context map types — narrow per behavior, generic over key literals
// per the precedent in `../quality-switching.ts` ("Extending for audio is one
// literal per union" — same shape, audio-specific unions).
// ============================================================================

export interface AudioTrackSwitchingState {
  presentation?: MaybeResolvedPresentation;
  selectedAudioTrackId?: string;
  /**
   * Partial-track description expressing consumer intent. When set,
   * narrows the candidate set to tracks matching every present field.
   * `{ language: 'es' }` for language-pinning, `{ id: 'specific-track' }`
   * for absolute pinning. Sibling of `userVideoTrackSelection`.
   */
  userAudioTrackSelection?: Partial<AudioTrack>;
}

type SelectionKey = 'selectedAudioTrackId';
type UserSelectionKey = 'userAudioTrackSelection';

type AudioTrackSwitchingStateMap<S extends SelectionKey, U extends UserSelectionKey> = {
  presentation: ReadonlySignal<AudioTrackSwitchingState['presentation']>;
} & { [P in S]: Signal<AudioTrackSwitchingState[P]> } & { [P in U]: ReadonlySignal<AudioTrackSwitchingState[P]> };

type AudioCandidate = { id: string };

interface AudioTrackSwitchingSetupConfig<S extends SelectionKey, U extends UserSelectionKey, T extends AudioCandidate> {
  selectionKey: S;
  userSelectionKey: U;
  /**
   * Extract candidate tracks of the relevant type from the presentation.
   * Mirrors `setupQualitySwitching`'s `getTracks` — keeps the helper
   * type-of-track-agnostic; the per-export call site narrows.
   */
  getTracks: (presentation: MaybeResolvedPresentation) => readonly T[];
  /**
   * Decide the optimal track given the candidate set and current selection.
   * Mirrors `setupQualitySwitching`'s `selectOptimal` interface, minus the
   * `bandwidth` / margin args (audio is not bandwidth-driven today). When
   * `audio-abr` ships, this signature converges with the video variant —
   * the audio implementation swaps from pin-to-current to bandwidth-aware
   * selection.
   */
  selectOptimal: (tracks: readonly T[], opts: { currentTrack?: T }) => T | undefined;
  /**
   * Initial picker. Fires once when the slot is empty in
   * `'presentation-resolved'`. Mirrors `setupQualitySwitching`'s `picker`.
   * Returning `undefined` falls through to `selectOptimal`.
   */
  picker?: TrackPicker<SwitchAudioTrackConfig>;
}

// ============================================================================
// Specialization helper — mirrors `setupQualitySwitching` from `../quality-switching.ts`
//
// `setupAudioTrackSwitching` has the same shape as a Behavior `setup`
// function. Each `switchXTrack` export below calls it from inside its
// own `defineBehavior` setup, passing per-type slot keys, track type,
// and selection algorithm via the same generic-parameter pattern the
// video sibling uses.
//
// Convergence note: when `audio-abr` ships, this helper either merges
// with `setupQualitySwitching` (shared generics, optional bandwidth /
// optional selectOptimal sources) or stays parallel. The shapes are
// deliberately aligned so the merge is a refactor, not a rewrite.
// ============================================================================

function setupAudioTrackSwitching<S extends SelectionKey, U extends UserSelectionKey, T extends AudioCandidate>({
  state,
  config,
}: {
  state: AudioTrackSwitchingStateMap<S, U>;
  config: AudioTrackSwitchingSetupConfig<S, U, T> & SwitchAudioTrackConfig;
}) {
  const { selectionKey, userSelectionKey, getTracks, selectOptimal, picker } = config;

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
        // Canonical cleanup-binds-to-setup: the selection slot's valid
        // lifespan is exactly 'presentation-resolved'. Clear fires on
        // 'presentation-resolved' exit, covering both src unload and
        // behavior destroy. Mirrors switchVideoQuality.
        entry: () => () => state[selectionKey].set(undefined),
        effects: [
          // Mirrors `setupQualitySwitching`'s single effect. Filter
          // narrowing + single-candidate short-circuit + initial picker
          // + selectOptimal pass.
          () => {
            const presentation = peek(state.presentation);
            if (!presentation) return;

            const allTracks = getTracks(presentation);
            const [firstAllTrack] = allTracks;
            if (!firstAllTrack) return;

            // State stores the filter as `Partial<AudioTrack>` (consumer-
            // facing shape); the helper works against `Partial<T>` so
            // filter and track access share one index type. Mirrors the
            // video sibling's filter-narrowing pattern verbatim.
            const userFilter = state[userSelectionKey].get() as Partial<T> | undefined;
            const matching = userFilter
              ? allTracks.filter((track) => {
                  for (const key in userFilter) {
                    const filterValue = userFilter[key as keyof T];
                    if (filterValue !== undefined && track[key as keyof T] !== filterValue) return false;
                  }
                  return true;
                })
              : allTracks;
            // Fall back to all tracks when the filter excludes everything
            // (e.g., user-picked id from a previous source doesn't exist
            // here) — don't stall playback.
            const candidates = matching.length > 0 ? matching : allTracks;
            if (!candidates.length) return;

            const selectedId = state[selectionKey].get();

            // Single-candidate short-circuit: filter pinned the choice.
            // Skip the picker; write the only candidate directly.
            if (candidates.length === 1) {
              if (candidates[0]!.id !== selectedId) state[selectionKey].set(candidates[0]!.id);
              return;
            }

            // Picker-driven initial pick — mirrors switchVideoQuality.
            // The picker sees the full presentation (not narrowed by the
            // filter); honoring the filter is the picker's responsibility
            // when overridden. Returning `undefined` falls through to
            // `selectOptimal` (graceful fallback).
            if (!selectedId && picker) {
              const id = picker(presentation, config);
              if (id) {
                state[selectionKey].set(id);
                return;
              }
            }

            // Algorithmic pass — mirrors switchVideoQuality's selectOptimal.
            // For audio today: pin-to-current if valid, else first
            // candidate. Audio-abr Phase 3 will swap this for a
            // bandwidth-driven variant; signature converges with video's.
            const currentTrack = candidates.find((t) => t.id === selectedId);
            const optimal = selectOptimal(candidates, { currentTrack }) ?? candidates[0]!;
            if (optimal.id !== selectedId) state[selectionKey].set(optimal.id);
          },
        ],
      },
    },
  });
}

// ============================================================================
// Behavior config + export — mirrors switchVideoQuality's wiring shape
// ============================================================================

export interface SwitchAudioTrackConfig {
  /**
   * Preferred audio language (ISO 639 code, e.g., `'en'`, `'es'`).
   * Consumed by the default `pickAudioTrack` picker.
   */
  preferredAudioLanguage?: string;

  /**
   * Override the default picker. Receives the full presentation and this
   * config; returns the id of the audio track to select. Default:
   * `pickAudioTrack` (three-tier: `preferredAudioLanguage` → `DEFAULT=YES`
   * → first track). Mirrors switchVideoQuality's `picker` config.
   */
  picker?: TrackPicker<SwitchAudioTrackConfig>;
}

type AudioTrackCandidate = PartiallyResolvedAudioTrack | AudioTrack;

/**
 * Default audio picker. Three-tier per multi-language-audio Tier 1:
 * `preferredAudioLanguage` → `DEFAULT=YES` → first track. Called only
 * inside `'presentation-resolved'`, where `isResolvedPresentation` gated
 * entry — the cast to `Presentation` is safe.
 */
const defaultAudioPicker: TrackPicker<SwitchAudioTrackConfig> = (presentation, config) =>
  pickAudioTrack(presentation as Presentation, { ...config, type: 'audio' });

/**
 * Audio's `selectOptimal` — pin-to-current variant. Returns the current
 * track if it's in the candidate set; otherwise the first candidate. No
 * bandwidth-driven re-evaluation (audio is not ABR-driven today).
 * Signature mirrors switchVideoQuality's `selectQuality` minus
 * bandwidth/margin args; audio-abr Phase 3 replaces this with a
 * bandwidth-aware variant matching the video signature.
 */
const selectAudioCurrent = (
  tracks: readonly AudioTrackCandidate[],
  { currentTrack }: { currentTrack?: AudioTrackCandidate }
): AudioTrackCandidate | undefined => currentTrack ?? tracks[0];

/**
 * Manage `selectedAudioTrackId`: pick a default on src load, narrow by
 * `userAudioTrackSelection` filter, re-pick on filter change, clear on
 * src unload. Sibling of `selectAudioTrack` (lifecycle-only) and ancestor
 * of the eventual `switchAudioQuality` (audio-abr).
 *
 * Mid-stream flush on language switch is handled by the segment-loader's
 * `planTasks` (see `playback/actors/dom/segment-loader.ts`) — not this
 * behavior. Same split as the video pipeline: slot owner writes; loader
 * orchestrates segment + flush plans.
 *
 * @example
 * const reactor = switchAudioTrack.setup({ state });
 */
export const switchAudioTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedAudioTrackId', 'userAudioTrackSelection'],
  contextKeys: [],
  setup: ({
    state,
    config,
  }: {
    state: AudioTrackSwitchingStateMap<'selectedAudioTrackId', 'userAudioTrackSelection'>;
    config?: SwitchAudioTrackConfig;
  }) =>
    setupAudioTrackSwitching<'selectedAudioTrackId', 'userAudioTrackSelection', AudioTrackCandidate>({
      state,
      config: {
        ...config,
        selectionKey: 'selectedAudioTrackId',
        userSelectionKey: 'userAudioTrackSelection',
        getTracks: (presentation) => getTracksByType(presentation, 'audio') as readonly AudioTrackCandidate[],
        selectOptimal: selectAudioCurrent,
        picker: config?.picker ?? defaultAudioPicker,
      },
    }),
});
