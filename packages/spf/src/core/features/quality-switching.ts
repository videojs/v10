import type { BandwidthState } from '../abr/bandwidth-estimator';
import { getBandwidthEstimate } from '../abr/bandwidth-estimator';
import { selectQuality } from '../abr/quality-selection';
import type { WritableState } from '../state/create-state';
import type { Presentation, VideoSelectionSet } from '../types';

/**
 * State shape for quality switching.
 */
export interface QualitySwitchingState {
  presentation?: Presentation;
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

/**
 * Configuration for quality switching behavior.
 */
export interface QualitySwitchingConfig {
  /**
   * Safety margin for quality selection (0–1).
   * Track is selected only when bandwidth >= track.bandwidth / safetyMargin.
   * Default: 0.85 (15% headroom).
   */
  safetyMargin?: number;

  /**
   * Minimum milliseconds between upgrades.
   * Prevents oscillation when bandwidth fluctuates around a quality threshold.
   * Downgrades are always immediate regardless of this setting.
   * Default: 8000 (8 seconds).
   */
  minUpgradeInterval?: number;

  /**
   * Bandwidth estimate in bps to use before enough samples have been collected.
   * Default: 5_000_000 (5 Mbps).
   */
  defaultBandwidth?: number;
}

/**
 * Default quality switching configuration.
 */
export const DEFAULT_SWITCHING_CONFIG: Required<QualitySwitchingConfig> = {
  safetyMargin: 0.85,
  minUpgradeInterval: 8000,
  defaultBandwidth: 5_000_000,
};

/**
 * Get all video tracks from a presentation's first switching set.
 * Returns [] when the presentation is still unresolved (no selectionSets yet).
 */
function getVideoTracks(presentation: Presentation) {
  const videoSet = presentation.selectionSets?.find((s) => s.type === 'video') as VideoSelectionSet | undefined;
  return videoSet?.switchingSets[0]?.tracks ?? [];
}

/**
 * Quality switching orchestration (F9).
 *
 * Reacts to bandwidth estimate changes and updates `selectedVideoTrackId`
 * when a different quality is optimal:
 *
 * - **Downgrades** happen immediately to avoid buffering stalls.
 * - **Upgrades** are gated by `minUpgradeInterval` to prevent oscillation.
 * - The first switch (from any track, or no track) is always immediate.
 *
 * Smooth switching is handled downstream: when `selectedVideoTrackId` changes,
 * `resolveTrack` fetches the new playlist and `loadSegments` reloads the init
 * segment, then appends media segments from the current position in the new
 * quality. The browser's SourceBuffer replaces the overlapping buffered range.
 *
 * @example
 * const cleanup = switchQuality({ state });
 * // Later, when done:
 * cleanup();
 */
export function switchQuality(
  { state }: { state: WritableState<QualitySwitchingState> },
  config: QualitySwitchingConfig = {}
): () => void {
  const safetyMargin = config.safetyMargin ?? DEFAULT_SWITCHING_CONFIG.safetyMargin;
  const minUpgradeInterval = config.minUpgradeInterval ?? DEFAULT_SWITCHING_CONFIG.minUpgradeInterval;
  const defaultBandwidth = config.defaultBandwidth ?? DEFAULT_SWITCHING_CONFIG.defaultBandwidth;

  // Initialize to creation time so the interval starts counting immediately.
  // The first time we have enough data to make a meaningful quality decision
  // (presentation resolved + bandwidth available), the upgrade gate is skipped
  // so the initial ABR correction does not wait for minUpgradeInterval.
  let lastUpgradeTime = Date.now();
  let firstMeaningfulFire = true;

  return state.subscribe((currentState: QualitySwitchingState) => {
    const { presentation, bandwidthState, selectedVideoTrackId, abrDisabled } = currentState;

    if (abrDisabled === true) return;
    if (!presentation || !bandwidthState) return;

    const videoTracks = getVideoTracks(presentation);
    if (videoTracks.length === 0) return;

    // Consume the first-meaningful-fire flag now that we have all required data.
    const isFirst = firstMeaningfulFire;
    firstMeaningfulFire = false;

    const bandwidth = getBandwidthEstimate(bandwidthState, defaultBandwidth);
    const optimal = selectQuality(videoTracks as any, bandwidth, { safetyMargin });
    if (!optimal || optimal.id === selectedVideoTrackId) return;

    // Determine whether this is an upgrade or downgrade.
    const currentTrack = videoTracks.find((t) => t.id === selectedVideoTrackId);
    const isUpgrade = !currentTrack || optimal.bandwidth > currentTrack.bandwidth;

    if (isUpgrade) {
      const now = Date.now();
      // Gate upgrades with minUpgradeInterval to prevent oscillation.
      // Downgrades are always immediate; the first meaningful evaluation is always allowed.
      if (!isFirst && now - lastUpgradeTime < minUpgradeInterval) return;
      lastUpgradeTime = now;
    }

    state.patch({ selectedVideoTrackId: optimal.id });
  });
}
