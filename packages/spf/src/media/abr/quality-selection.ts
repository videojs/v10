/**
 * Quality Selection Algorithm
 *
 * Selects optimal video track based on bandwidth estimate with safety margin.
 * Stateless selection - picks highest quality that fits bandwidth.
 *
 * Key concepts:
 * - **Safety margin** (0.85): Pick track where bandwidth >= track.bandwidth / 0.85
 * - This ensures 15% headroom to avoid buffering
 * - At same bandwidth, prefer higher resolution
 */

import type { PartiallyResolvedVideoTrack, VideoTrack } from '../types';

/**
 * Quality selection configuration.
 */
export interface QualityConfig {
  /**
   * Safety margin (0-1).
   * To select a track, need: currentBandwidth >= track.bandwidth / safetyMargin.
   * Default 0.85 means track must use ≤85% of available bandwidth (15% headroom).
   */
  safetyMargin: number;
  /**
   * Upgrade hysteresis ratio (>= 1). When `currentTrack` is supplied, an
   * upgrade is applied only if `optimal.bandwidth >= currentTrack.bandwidth * upgradeMargin`.
   * Downgrades are always applied. Default 1.15 means optimal must clear
   * the current bandwidth by at least 15% to trigger an upgrade.
   */
  upgradeMargin: number;
}

/**
 * Default quality selection configuration.
 * Values match Shaka Player upgrade threshold (0.85 = 15% headroom).
 */
export const DEFAULT_QUALITY_CONFIG: QualityConfig = {
  safetyMargin: 0.85,
  upgradeMargin: 1.15,
};

/**
 * Options for `selectQuality`. Spread of `Partial<QualityConfig>` plus a
 * runtime-supplied `currentTrack` for upgrade-vs-downgrade decisions.
 */
export interface SelectQualityOpts extends Partial<QualityConfig> {
  /**
   * Track currently selected. When supplied, `selectQuality` returns
   * `currentTrack` (no change) for upgrades that don't clear the
   * `upgradeMargin`. When omitted, no hysteresis is applied — the
   * computed optimal is returned regardless.
   */
  currentTrack?: PartiallyResolvedVideoTrack | VideoTrack;
}

/**
 * Select the track to apply now, given current bandwidth, a current
 * selection (optional), and tuning. Returns:
 *
 * - The bandwidth-fitting optimal when no `currentTrack` is supplied.
 * - The optimal when it's a downgrade vs. `currentTrack` (downgrades
 *   apply immediately — no hysteresis).
 * - The optimal when it clears `currentTrack.bandwidth * upgradeMargin`
 *   (upgrade clears hysteresis).
 * - `currentTrack` itself when an upgrade doesn't clear the margin
 *   (stay put — caller checks identity to no-op).
 *
 * "Optimal" is the highest-bandwidth track where the available bandwidth
 * meets the safety requirement (`currentBandwidth >= track.bandwidth / safetyMargin`).
 * Falls back to the lowest-bandwidth track when nothing fits the safety
 * margin (preserves a definitive pick under under-bandwidth conditions).
 *
 * @example
 * const tracks = [low, mid, high];
 * selectQuality(tracks, 5_000_000, { currentTrack: low });
 * // Returns `high` if 5 Mbps clears safety AND high.bandwidth >= low.bandwidth * upgradeMargin.
 * // Returns `low` (no-op signal) otherwise.
 */
export function selectQuality(
  tracks: readonly (PartiallyResolvedVideoTrack | VideoTrack)[],
  currentBandwidth: number,
  opts: SelectQualityOpts = {}
): PartiallyResolvedVideoTrack | VideoTrack | undefined {
  if (tracks.length === 0) {
    return undefined;
  }

  const safetyMargin = opts.safetyMargin ?? DEFAULT_QUALITY_CONFIG.safetyMargin;
  const upgradeMargin = opts.upgradeMargin ?? DEFAULT_QUALITY_CONFIG.upgradeMargin;
  const { currentTrack } = opts;

  // Sort tracks by bandwidth (lowest first)
  const sortedTracks = tracks.slice().sort((a, b) => a.bandwidth - b.bandwidth);

  // Start with no selection
  let chosen: PartiallyResolvedVideoTrack | VideoTrack | undefined;

  for (const track of sortedTracks) {
    // Check if we have enough bandwidth for this track with safety margin
    // Required bandwidth = track.bandwidth / safetyMargin
    const requiredBandwidth = track.bandwidth / safetyMargin;

    if (currentBandwidth >= requiredBandwidth) {
      // We can support this track - prefer it if better than current choice
      if (
        !chosen ||
        track.bandwidth > chosen.bandwidth ||
        (track.bandwidth === chosen.bandwidth && hasHigherResolution(track, chosen))
      ) {
        chosen = track;
      }
    }
  }

  // If no track fits with safety margin, fall back to lowest quality
  const optimal = chosen ?? sortedTracks[0];
  if (!optimal) return undefined;

  // Apply upgrade hysteresis. No currentTrack → no hysteresis, return
  // optimal. Downgrade (optimal.bandwidth < current) → always apply.
  // Upgrade → only when `optimal.bandwidth >= current * upgradeMargin`,
  // else stay put (return currentTrack so caller's id-compare no-ops).
  if (!currentTrack) return optimal;
  if (optimal.bandwidth < currentTrack.bandwidth) return optimal;
  if (optimal.bandwidth >= currentTrack.bandwidth * upgradeMargin) return optimal;
  return currentTrack;
}

/**
 * Select the lowest-bandwidth track from the candidate set.
 *
 * Used as a safety-net fallback by callers that need a definitive pick when
 * a primary selection algorithm declines to choose. Pairs naturally with
 * `selectQuality` — when ABR has no good answer (e.g., all candidates
 * exceed available bandwidth and the algorithm doesn't fall back
 * internally), the lowest bitrate is the safest default.
 *
 * @param tracks - Candidate tracks (can be unsorted)
 * @returns The lowest-bandwidth track, or `undefined` if `tracks` is empty
 *
 * @example
 * const fallback = selectLowestQuality(tracks);
 */
export function selectLowestQuality<T extends { bandwidth: number }>(tracks: readonly T[]): T | undefined {
  if (tracks.length === 0) return undefined;
  return tracks.reduce((min, t) => (t.bandwidth < min.bandwidth ? t : min));
}

/**
 * Check if track A has higher resolution than track B.
 * Compares by total pixel count (width × height).
 *
 * @param trackA - First track to compare
 * @param trackB - Second track to compare
 * @returns True if trackA has more pixels than trackB
 */
function hasHigherResolution(
  trackA: PartiallyResolvedVideoTrack | VideoTrack,
  trackB: PartiallyResolvedVideoTrack | VideoTrack
): boolean {
  const pixelsA = (trackA.width ?? 0) * (trackA.height ?? 0);
  const pixelsB = (trackB.width ?? 0) * (trackB.height ?? 0);
  return pixelsA > pixelsB;
}
