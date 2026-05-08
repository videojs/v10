/**
 * **Manage the per-type ABR-eligible track selection slot.** While a
 * presentation is resolved, owns the slot's lifecycle: pick a default on src
 * load, dynamically adjust based on media metrics (today: bandwidth via
 * `selectQuality`), clear on src unload. Yields control to external writers
 * when ABR is disabled.
 *
 * Lifecycle (3 states):
 * - `'preconditions-unmet'` — no resolved presentation. Slot is cleared on
 *   entry as a state invariant.
 * - `'disabled'` — presentation resolved, `abrDisabled` is true. Default-pick
 *   fires on entry if no selection; ABR effect doesn't run. Slot is
 *   relinquished to external writers (e.g., user-driven manual quality).
 * - `'evaluating'` — presentation resolved, ABR enabled. Default-pick fires
 *   on entry if no selection; ABR effect re-fires on bandwidth changes.
 *
 * Hysteresis: downgrades apply immediately; upgrades require the optimal
 * track's bandwidth to exceed the current track's by `upgradeMargin`. No
 * temporal state — short-term smoothing is the bandwidth estimator's job.
 *
 * @see internal/design/spf/conventions/reactors.md "Cleanup as state-
 *      machine invariant" — explains why the clear is encoded as
 *      `'preconditions-unmet'.entry` rather than as the cleanup-binds-to-
 *      setup return from `'evaluating'.entry`. Driven by the slot's valid
 *      lifespan spanning two FSM states (`'disabled'` and `'evaluating'`).
 */

import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import type { BandwidthState } from '../../media/abr/bandwidth-estimator';
import { getBandwidthEstimate } from '../../media/abr/bandwidth-estimator';
import { selectQuality } from '../../media/abr/quality-selection';
import { pickFirstTrackId } from '../../media/primitives/select-tracks';
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
  // TODO: abrDisabled is a blunt instrument — it requires callers to know they're
  // competing with ABR and explicitly opt out. A better long-term design would
  // separate ABR selection (abrVideoTrackId) from manual selection (manualVideoTrackId)
  // and derive the effective selectedVideoTrackId as manualVideoTrackId ?? abrVideoTrackId.
  // That refactor would also collapse this behavior's FSM to 2 states ('preconditions-
  // unmet' / 'evaluating') and restore the canonical cleanup-binds-to-setup pattern,
  // making the carve-out in reactors.md ("Cleanup as state-machine invariant")
  // unnecessary for this behavior.
  /** When true, ABR quality switching is suppressed. Use for manual quality selection. */
  abrDisabled?: boolean;
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
}

export const DEFAULT_SWITCHING_CONFIG: Required<QualitySwitchingConfig> = {
  safetyMargin: 0.85,
  upgradeMargin: 1.15,
  initialBandwidth: 5_000_000,
};

// ============================================================================
// Specialization helper
//
// `setupQualitySwitching` has the same shape as a Behavior `setup` function:
// `({ state, config }) => Reactor`. Each `switchXQuality` export below calls
// it from inside its own `defineBehavior` setup, supplying its per-type
// config inline (slot key, default-picker, track extractor, selection
// algorithm). The 3-state machine — 'preconditions-unmet' / 'disabled' /
// 'evaluating' — is shared across types.
// ============================================================================

type SelectedAbrKey = 'selectedVideoTrackId' | 'selectedAudioTrackId';

type AbrTrack = { id: string; bandwidth: number };

type QualityStateMap<K extends SelectedAbrKey> = {
  presentation: ReadonlySignal<QualitySwitchingState['presentation']>;
  bandwidthState: ReadonlySignal<QualitySwitchingState['bandwidthState']>;
  abrDisabled: ReadonlySignal<QualitySwitchingState['abrDisabled']>;
} & { [P in K]: Signal<string | undefined> };

interface QualitySwitchingSetupConfig<K extends SelectedAbrKey, T extends AbrTrack> extends QualitySwitchingConfig {
  selectedKey: K;
  pickDefault: (presentation: MaybeResolvedPresentation) => string | undefined;
  getTracks: (presentation: MaybeResolvedPresentation) => readonly T[];
  selectOptimal: (tracks: readonly T[], bandwidth: number, opts: { safetyMargin: number }) => T | undefined;
}

function setupQualitySwitching<K extends SelectedAbrKey, T extends AbrTrack>({
  state,
  config,
}: {
  state: QualityStateMap<K>;
  config: QualitySwitchingSetupConfig<K, T>;
}) {
  const safetyMargin = config.safetyMargin ?? DEFAULT_SWITCHING_CONFIG.safetyMargin;
  const upgradeMargin = config.upgradeMargin ?? DEFAULT_SWITCHING_CONFIG.upgradeMargin;
  const initialBandwidth = config.initialBandwidth ?? DEFAULT_SWITCHING_CONFIG.initialBandwidth;
  const { selectedKey, pickDefault, getTracks, selectOptimal } = config;

  // Idempotent default-pick: shared between 'disabled'.entry and
  // 'evaluating'.entry so a default is set on src load regardless of
  // abrDisabled. The if-guard makes re-entry (e.g., toggling abrDisabled)
  // a no-op when a selection already exists.
  const pickDefaultIfUnset = () => {
    if (state[selectedKey].get()) return;
    const presentation = state.presentation.get();
    if (!presentation) return;
    const id = pickDefault(presentation);
    if (id) state[selectedKey].set(id);
  };

  const derivedStateSignal = computed(() => {
    if (!isResolvedPresentation(state.presentation.get())) return 'preconditions-unmet' as const;
    if (state.abrDisabled.get() === true) return 'disabled' as const;
    return 'evaluating' as const;
  });

  return createMachineReactor({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      // Slot invariant: in 'preconditions-unmet', the slot is empty. The
      // clear is encoded as the state's entry invariant rather than as the
      // cleanup-binds-to-setup return from 'disabled'/'evaluating', because
      // the slot's valid lifespan spans both 'disabled' and 'evaluating' —
      // binding cleanup to either would fire incorrectly on the
      // 'disabled' ↔ 'evaluating' transition. See reactors.md "Cleanup as
      // state-machine invariant" for the full rationale and trade-offs.
      'preconditions-unmet': {
        entry: () => {
          state[selectedKey].set(undefined);
        },
      },
      disabled: {
        entry: () => {
          pickDefaultIfUnset();
        },
      },
      evaluating: {
        entry: () => {
          pickDefaultIfUnset();
        },
        // While in 'evaluating': re-fire on bandwidthState and selected-id
        // changes (tracked). Presentation is tracked at the state-machine
        // level via the derivedStateSignal monitor — peek inside the effect
        // so internal updates don't double-fire.
        effects: [
          () => {
            const bandwidthState = state.bandwidthState.get();
            const selectedId = state[selectedKey].get();
            const presentation = peek(state.presentation);
            if (!bandwidthState || !presentation) return;

            const tracks = getTracks(presentation);
            if (tracks.length === 0) return;

            const bandwidth = getBandwidthEstimate(bandwidthState, initialBandwidth);
            const optimal = selectOptimal(tracks, bandwidth, { safetyMargin });
            if (!optimal || optimal.id === selectedId) return;

            const currentTrack = tracks.find((t) => t.id === selectedId);
            if (!currentTrack) {
              // No current track in the active list — initialization or
              // post-selection-cleared. Apply optimal directly.
              state[selectedKey].set(optimal.id);
              return;
            }

            if (optimal.bandwidth < currentTrack.bandwidth) {
              // Downgrade — apply immediately.
              state[selectedKey].set(optimal.id);
              return;
            }

            // Upgrade — gate by magnitude hysteresis.
            if (optimal.bandwidth >= currentTrack.bandwidth * upgradeMargin) {
              state[selectedKey].set(optimal.id);
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
 * adjust based on bandwidth while ABR is enabled, clear on src unload.
 *
 * @example
 * const reactor = switchVideoQuality.setup({ state });
 */
export const switchVideoQuality = defineBehavior({
  stateKeys: ['presentation', 'bandwidthState', 'selectedVideoTrackId', 'abrDisabled'],
  contextKeys: [],
  setup: ({ state, config }: { state: QualityStateMap<'selectedVideoTrackId'>; config?: QualitySwitchingConfig }) =>
    setupQualitySwitching({
      state,
      config: {
        ...config,
        selectedKey: 'selectedVideoTrackId',
        pickDefault: (presentation) => pickFirstTrackId(presentation, 'video'),
        getTracks: (presentation) =>
          getTracksByType(presentation, 'video') as readonly (PartiallyResolvedVideoTrack | VideoTrack)[],
        selectOptimal: selectQuality,
      },
    }),
});
