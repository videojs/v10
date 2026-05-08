/**
 * **Dynamic quality selection from media metrics.** While a presentation has
 * been (partially) resolved and ABR is enabled, observe the relevant media
 * metric and write the optimal track id to the type's selection slot — today
 * driven by throughput estimates via `selectQuality`. The metric inputs and
 * per-type selection algorithms are expected to evolve (audio-bitrate ABR is
 * the immediate next axis).
 *
 * Lifecycle: `'idle'` (no presentation, no tracks of this type, or `abrDisabled`)
 * ↔ `'evaluating'` (all inputs available + ABR enabled). Source-reset is
 * structural — re-entering `'evaluating'` starts fresh.
 *
 * Hysteresis: downgrades apply immediately; upgrades require the optimal
 * track's bandwidth to exceed the current track's by `upgradeMargin`. No
 * temporal state — short-term smoothing is the bandwidth estimator's job.
 */

import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import type { BandwidthState } from '../../media/abr/bandwidth-estimator';
import { getBandwidthEstimate } from '../../media/abr/bandwidth-estimator';
import { selectQuality } from '../../media/abr/quality-selection';
import type { MaybeResolvedPresentation, PartiallyResolvedVideoTrack, VideoTrack } from '../../media/types';
import { getTracksByType } from '../../media/utils/tracks';

export interface QualitySwitchingState {
  presentation?: MaybeResolvedPresentation;
  bandwidthState?: BandwidthState;
  selectedVideoTrackId?: string;
  // TODO: abrDisabled is a blunt instrument — it requires callers to know they're
  // competing with ABR and explicitly opt out. A better long-term design would
  // separate ABR selection (abrVideoTrackId) from manual selection (manualVideoTrackId)
  // and derive the effective selectedVideoTrackId as manualVideoTrackId ?? abrVideoTrackId.
  // That way the two concerns never write to the same field and consumers are unchanged.
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
// config inline (slot key, track extractor, selection algorithm). The state-
// machine shape — 'idle' ↔ 'evaluating' driven by a derived state — is shared.
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
  const { selectedKey, getTracks, selectOptimal } = config;

  const derivedStateSignal = computed(() => {
    if (state.abrDisabled.get() === true) return 'idle' as const;
    const presentation = state.presentation.get();
    if (!presentation) return 'idle' as const;
    if (getTracks(presentation).length === 0) return 'idle' as const;
    return 'evaluating' as const;
  });

  return createMachineReactor({
    initial: 'idle',
    monitor: () => derivedStateSignal.get(),
    states: {
      idle: {},
      evaluating: {
        // While in 'evaluating': re-fire on bandwidthState and selected-id
        // changes (tracked). Presentation and tracks are tracked at the state-
        // machine level via the derivedStateSignal monitor — peek them inside
        // the effect so internal updates don't double-fire.
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
 * Adjust `selectedVideoTrackId` to the optimal video rendition based on the
 * current bandwidth estimate, while a presentation is resolved and ABR is
 * enabled.
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
        getTracks: (presentation) =>
          getTracksByType(presentation, 'video') as readonly (PartiallyResolvedVideoTrack | VideoTrack)[],
        selectOptimal: selectQuality,
      },
    }),
});
