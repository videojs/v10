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

import type { UnresolvedVideoTrack } from '../types';

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
}

/**
 * Default quality selection configuration.
 * Values match Shaka Player upgrade threshold (0.85 = 15% headroom).
 */
export const DEFAULT_QUALITY_CONFIG: QualityConfig = {
  safetyMargin: 0.85,
};

/**
 * Select the best video track based on current bandwidth estimate.
 *
 * Selects the highest quality track where bandwidth is sufficient with safety margin:
 * - currentBandwidth >= track.bandwidth / safetyMargin
 * - Default safetyMargin 0.85 means track uses ≤85% of bandwidth (15% headroom)
 * - At same bandwidth, prefers higher resolution
 *
 * @param tracks - Available video tracks (can be unsorted)
 * @param currentBandwidth - Current bandwidth estimate in bits per second
 * @param config - Optional quality selection configuration
 * @returns Selected track, or undefined if no tracks available
 *
 * @example
 * const tracks = [
 *   { id: '360p', bandwidth: 500_000, ... },
 *   { id: '720p', bandwidth: 2_000_000, ... },
 *   { id: '1080p', bandwidth: 4_000_000, ... },
 * ];
 *
 * // With 2.5 Mbps, selects 720p (1080p needs 4M/0.85 = 4.7 Mbps)
 * const selected = selectQuality(tracks, 2_500_000);
 */
export function selectQuality(
  tracks: UnresolvedVideoTrack[],
  currentBandwidth: number,
  config: QualityConfig = DEFAULT_QUALITY_CONFIG
): UnresolvedVideoTrack | undefined {
  if (tracks.length === 0) {
    return undefined;
  }

  // Sort tracks by bandwidth (lowest first)
  const sortedTracks = tracks.slice().sort((a, b) => a.bandwidth - b.bandwidth);

  // Start with no selection
  let chosen: UnresolvedVideoTrack | undefined;

  for (const track of sortedTracks) {
    // Check if we have enough bandwidth for this track with safety margin
    // Required bandwidth = track.bandwidth / safetyMargin
    const requiredBandwidth = track.bandwidth / config.safetyMargin;

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
  return chosen ?? sortedTracks[0];
}

/**
 * Check if track A has higher resolution than track B.
 * Compares by total pixel count (width × height).
 *
 * @param trackA - First track to compare
 * @param trackB - Second track to compare
 * @returns True if trackA has more pixels than trackB
 */
function hasHigherResolution(trackA: UnresolvedVideoTrack, trackB: UnresolvedVideoTrack): boolean {
  const pixelsA = (trackA.width ?? 0) * (trackA.height ?? 0);
  const pixelsB = (trackB.width ?? 0) * (trackB.height ?? 0);
  return pixelsA > pixelsB;
}
