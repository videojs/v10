/**
 * **Manage the per-type ABR-eligible track selection slot.** While a
 * presentation is resolved, owns the slot's lifecycle: pick a default,
 * dynamically adjust based on media metrics (today: bandwidth via
 * `selectQuality`), and clear on src unload. User intent is expressed as a
 * partial-track description in a sibling slot (e.g.
 * `userVideoTrackSelection`) which constrains the candidate set for
 * selection — when the constraint narrows candidates to exactly one, the
 * choice is fully determined and ABR is short-circuited (no bandwidth read,
 * no effect re-fire on bandwidth changes).
 *
 * Lifecycle: `'preconditions-unmet'` (no resolved presentation) ↔
 * `'evaluating'` (presentation resolved). The `'evaluating'` state owns the
 * selection slot; its entry-returned cleanup clears the slot on exit
 * (canonical cleanup-binds-to-setup per `reactors.md`).
 *
 * Hysteresis: downgrades apply immediately; upgrades require the optimal
 * track's bandwidth to exceed the current track's by `upgradeMargin`. No
 * temporal state — short-term smoothing is the bandwidth estimator's job.
 */

import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import type { BandwidthState } from '../../media/abr/bandwidth-estimator';
import { DEFAULT_BANDWIDTH_CONFIG, getBandwidthEstimate } from '../../media/abr/bandwidth-estimator';
import { selectQuality } from '../../media/abr/quality-selection';
import {
  isResolvedPresentation,
  type MaybeResolvedPresentation,
  type PartiallyResolvedVideoTrack,
  type VideoTrack,
} from '../../media/types';
import { getTracksByType } from '../../media/utils/tracks';

export interface QualitySwitchingState {
  presentation?: MaybeResolvedPresentation;
  bandwidthState?: BandwidthState;
  selectedVideoTrackId?: string;
  /**
   * Partial-track description expressing user intent. When set, narrows
   * the ABR candidate set to tracks matching every present field. The
   * common case is `{ id: 'specific-track-id' }` for a "manual quality"
   * pick, but other partial shapes work — e.g., `{ height: 720 }` would
   * constrain to 720p tracks; ABR continues to pick among them.
   *
   * When the narrowed candidates contain exactly one track, ABR is
   * short-circuited entirely (no bandwidth read, no effect re-fire).
   *
   * When the filter matches no tracks in the current presentation (e.g.,
   * user-picked id from a previous source doesn't exist here), falls back
   * to the unfiltered set rather than stalling playback.
   */
  userVideoTrackSelection?: Partial<VideoTrack>;
}

export interface QualitySwitchingConfig {
  /**
   * Safety margin for quality selection (0–1). Track is selected only when
   * bandwidth >= track.bandwidth / safetyMargin. Default: 0.85 (15% headroom).
   */
  safetyMargin?: number;

  /**
   * Upgrade hysteresis ratio (>= 1). Apply an upgrade only when
   * `optimal.bandwidth >= current.bandwidth * upgradeMargin`. Downgrades are
   * always immediate. Default: 1.15 (15% headroom over the current track's
   * bandwidth on top of `safetyMargin`'s headroom over the candidate's).
   */
  upgradeMargin?: number;

  /**
   * Bandwidth estimate in bps to use before enough samples have been collected.
   * Default: 5_000_000 (5 Mbps).
   */
  initialBandwidth?: number;

  /**
   * Minimum total bytes sampled before the measured bandwidth estimate is
   * trusted. Below this threshold, `initialBandwidth` drives selection —
   * both for the initial pick and re-evaluations during the
   * data-aggregation window. Default: matches
   * `DEFAULT_BANDWIDTH_CONFIG.minTotalBytes` (128 KB).
   */
  minTotalBytes?: number;
}

export const DEFAULT_SWITCHING_CONFIG: Required<QualitySwitchingConfig> = {
  safetyMargin: 0.85,
  upgradeMargin: 1.15,
  initialBandwidth: 5_000_000,
  minTotalBytes: DEFAULT_BANDWIDTH_CONFIG.minTotalBytes,
};

// ============================================================================
// Specialization helper
//
// `setupQualitySwitching` has the same shape as a Behavior `setup` function:
// `({ state, config }) => Reactor`. Each `switchXQuality` export below calls
// it from inside its own `defineBehavior` setup, supplying its per-type
// config inline (slot keys, track extractor, selection algorithm).
// ============================================================================

type AbrTrack = { id: string; bandwidth: number };

interface QualitySwitchingSetupConfig<T extends AbrTrack> extends QualitySwitchingConfig {
  getTracks: (presentation: MaybeResolvedPresentation) => readonly T[];
  selectOptimal: (tracks: readonly T[], bandwidth: number, opts: { safetyMargin: number }) => T | undefined;
}

// Internal state shape uses logical names (`selection`, `userSelection`)
// rather than per-type physical names (`selectedVideoTrackId`,
// `userVideoTrackSelection`). Per-type exports below remap their slot
// references into this shape at the call site — avoids generic-mapped-type
// indexing pitfalls and keeps the helper body slot-agnostic.
function setupQualitySwitching<T extends AbrTrack>({
  state,
  config,
}: {
  state: {
    presentation: ReadonlySignal<QualitySwitchingState['presentation']>;
    bandwidthState: ReadonlySignal<QualitySwitchingState['bandwidthState']>;
    selection: Signal<string | undefined>;
    userSelection: ReadonlySignal<Partial<T> | undefined>;
  };
  config: QualitySwitchingSetupConfig<T>;
}) {
  const safetyMargin = config.safetyMargin ?? DEFAULT_SWITCHING_CONFIG.safetyMargin;
  const upgradeMargin = config.upgradeMargin ?? DEFAULT_SWITCHING_CONFIG.upgradeMargin;
  const initialBandwidth = config.initialBandwidth ?? DEFAULT_SWITCHING_CONFIG.initialBandwidth;
  const minTotalBytes = config.minTotalBytes ?? DEFAULT_SWITCHING_CONFIG.minTotalBytes;
  const { getTracks, selectOptimal } = config;

  const derivedStateSignal = computed(() =>
    isResolvedPresentation(state.presentation.get()) ? ('evaluating' as const) : ('preconditions-unmet' as const)
  );

  return createMachineReactor({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},
      evaluating: {
        // Canonical cleanup-binds-to-setup: the selection slot's valid
        // lifespan is exactly 'evaluating'. Clear fires on 'evaluating'
        // exit, covering both src unload and behavior destroy.
        entry: () => () => state.selection.set(undefined),
        effects: [
          () => {
            const presentation = peek(state.presentation);
            if (!presentation) return;

            const allTracks = getTracks(presentation);
            const [firstAllTrack] = allTracks;
            if (!firstAllTrack) return;

            const userFilter = state.userSelection.get();
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
            // (e.g., user-picked id doesn't exist in the current source).
            const candidates = matching.length > 0 ? matching : allTracks;
            if (!candidates.length) return;

            const selectedId = state.selection.get();

            // Common case: user has fully constrained the choice (e.g.,
            // `{ id: 'specific-720p' }` narrows to a single track). Skip
            // the ABR path — and crucially, don't read `bandwidthState`
            // so the effect doesn't re-fire on bandwidth changes while
            // the user's selection holds.
            if (candidates.length === 1) {
              if (candidates[0]!.id !== selectedId) state.selection.set(candidates[0]!.id);
              return;
            }

            // Single path for pre-trust and post-trust:
            // `getBandwidthEstimate` returns `initialBandwidth` when state is
            // undefined or bytes sampled hasn't crossed `minTotalBytes`, so
            // the initial pick + early-ABR window run the same `selectOptimal`
            // path as a fully-trusted measurement.
            const bandwidth = getBandwidthEstimate(state.bandwidthState.get(), initialBandwidth, {
              ...DEFAULT_BANDWIDTH_CONFIG,
              minTotalBytes,
            });
            const optimal = selectOptimal(candidates, bandwidth, { safetyMargin });
            if (!optimal || optimal.id === selectedId) return;

            const currentTrack = candidates.find((t) => t.id === selectedId);
            if (!currentTrack) {
              // No current track in the active candidate set —
              // initialization, post-cleared, or filter narrowed to
              // exclude the previous selection. Apply optimal directly.
              state.selection.set(optimal.id);
              return;
            }

            if (optimal.bandwidth < currentTrack.bandwidth) {
              // Downgrade — apply immediately.
              state.selection.set(optimal.id);
              return;
            }

            // Upgrade — gate by magnitude hysteresis.
            if (optimal.bandwidth >= currentTrack.bandwidth * upgradeMargin) {
              state.selection.set(optimal.id);
            }
          },
        ],
      },
    },
  });
}

// ============================================================================
// Specialized exports — one per ABR-enabled track type
// ============================================================================

/**
 * Manage `selectedVideoTrackId`: pick a default on src load, dynamically
 * adjust based on bandwidth, clear on src unload. Honors
 * `userVideoTrackSelection` as a partial-track constraint on candidates;
 * short-circuits ABR when the constraint narrows to a single track.
 *
 * @example
 * const reactor = switchVideoQuality.setup({ state });
 */
export const switchVideoQuality = defineBehavior({
  stateKeys: ['presentation', 'bandwidthState', 'selectedVideoTrackId', 'userVideoTrackSelection'],
  contextKeys: [],
  setup: ({
    state,
    config,
  }: {
    state: {
      presentation: ReadonlySignal<QualitySwitchingState['presentation']>;
      bandwidthState: ReadonlySignal<QualitySwitchingState['bandwidthState']>;
      selectedVideoTrackId: Signal<string | undefined>;
      userVideoTrackSelection: ReadonlySignal<Partial<VideoTrack> | undefined>;
    };
    config?: QualitySwitchingConfig;
  }) =>
    setupQualitySwitching<PartiallyResolvedVideoTrack | VideoTrack>({
      state: {
        presentation: state.presentation,
        bandwidthState: state.bandwidthState,
        selection: state.selectedVideoTrackId,
        userSelection: state.userVideoTrackSelection,
      },
      config: {
        ...config,
        getTracks: (presentation) =>
          getTracksByType(presentation, 'video') as readonly (PartiallyResolvedVideoTrack | VideoTrack)[],
        selectOptimal: selectQuality,
      },
    }),
});
