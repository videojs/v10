import { isUndefined } from '@videojs/utils/predicate';
import { DEFAULT_QUALITY_CONFIG, selectQuality } from '../abr/quality-selection';
import { combineLatest } from '../reactive/combine-latest';
import type { WritableState } from '../state/create-state';
import type { AudioSelectionSet, Presentation, VideoSelectionSet } from '../types';

/**
 * Default initial bandwidth estimate for cold start (bits per second).
 * Conservative 1 Mbps to avoid over-selecting on slow connections.
 */
export const DEFAULT_INITIAL_BANDWIDTH = 1_000_000;

/**
 * State shape for initial quality selection.
 */
export interface InitialQualityState {
  presentation?: Presentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  selectedTextTrackId?: string;
}

/**
 * Configuration for initial quality selection.
 */
export interface InitialQualityConfig {
  /**
   * Initial bandwidth estimate for cold start (bits per second).
   * Used to select video quality before we have real measurements.
   * Default: 1 Mbps (conservative).
   */
  initialBandwidth?: number;

  /**
   * Preferred audio language (ISO 639 code, e.g., "en", "es").
   * If not specified, selects first audio track.
   */
  preferredAudioLanguage?: string;

  /**
   * Safety margin for quality selection (0-1).
   * Default: 0.85 (15% headroom).
   */
  safetyMargin?: number;
}

/**
 * Check if we can select initial quality.
 *
 * Requires:
 * - Presentation exists
 * - No tracks selected yet (initial selection only)
 */
export function canSelectInitialQuality(state: InitialQualityState): boolean {
  if (!state.presentation) {
    return false;
  }

  // Only select if no tracks are selected yet (initial selection only)
  const hasSelection =
    !isUndefined(state.selectedVideoTrackId) ||
    !isUndefined(state.selectedAudioTrackId) ||
    !isUndefined(state.selectedTextTrackId);

  return !hasSelection;
}

/**
 * Check if we should proceed with initial quality selection.
 * Currently always returns true when conditions are met.
 */
export function shouldSelectInitialQuality(_state: InitialQualityState): boolean {
  return true;
}

/**
 * Select video track using quality selection algorithm.
 *
 * Uses bandwidth-based selection with safety margin to pick
 * the highest quality track that fits available bandwidth.
 *
 * @param presentation - Presentation with video tracks
 * @param config - Selection configuration (bandwidth, safety margin)
 * @returns Selected video track ID, or undefined if no video tracks
 */
export function selectVideoTrack(presentation: Presentation, config: InitialQualityConfig): string | undefined {
  const videoSet = presentation.selectionSets.find((set) => set.type === 'video') as VideoSelectionSet | undefined;

  if (!videoSet || videoSet.switchingSets.length === 0) {
    return undefined;
  }

  // Get first switching set's tracks (HLS typically has one switching set per type)
  const switchingSet = videoSet.switchingSets[0];
  if (!switchingSet || switchingSet.tracks.length === 0) {
    return undefined;
  }

  const initialBandwidth = config.initialBandwidth ?? DEFAULT_INITIAL_BANDWIDTH;
  const safetyMargin = config.safetyMargin ?? DEFAULT_QUALITY_CONFIG.safetyMargin;

  // selectQuality works with both partially resolved and resolved tracks
  const selected = selectQuality(switchingSet.tracks as any, initialBandwidth, { safetyMargin });

  return selected?.id;
}

/**
 * Select audio track.
 *
 * Selection priority:
 * 1. First track matching preferred language (if specified)
 * 2. First default track
 * 3. First audio track
 *
 * @param presentation - Presentation with audio tracks
 * @param config - Selection configuration (preferred language)
 * @returns Selected audio track ID, or undefined if no audio tracks
 */
export function selectAudioTrack(presentation: Presentation, config: InitialQualityConfig): string | undefined {
  const audioSet = presentation.selectionSets.find((set) => set.type === 'audio') as AudioSelectionSet | undefined;

  if (!audioSet || audioSet.switchingSets.length === 0) {
    return undefined;
  }

  // Get first switching set's tracks
  const switchingSet = audioSet.switchingSets[0];
  if (!switchingSet || switchingSet.tracks.length === 0) {
    return undefined;
  }

  const tracks = switchingSet.tracks;

  // Try preferred language first
  if (config.preferredAudioLanguage) {
    const languageMatch = tracks.find((track) => track.language === config.preferredAudioLanguage);
    if (languageMatch) {
      return languageMatch.id;
    }
  }

  // Try default track
  const defaultTrack = tracks.find((track) => track.default === true);
  if (defaultTrack) {
    return defaultTrack.id;
  }

  // Fall back to first track
  return tracks[0]?.id;
}

/**
 * Select text track.
 *
 * Note: Text tracks (captions/subtitles) are typically user opt-in,
 * so this returns undefined by default. Future enhancement could support
 * auto-selecting based on user preferences or accessibility requirements.
 *
 * @param presentation - Presentation with text tracks
 * @param config - Selection configuration (unused for now)
 * @returns undefined (no auto-selection)
 */
export function selectTextTrack(_presentation: Presentation, _config: InitialQualityConfig): string | undefined {
  // Text tracks are user opt-in - don't auto-select
  return undefined;
}

/**
 * Initial quality selection orchestration.
 *
 * Selects initial tracks when presentation is first loaded:
 * - Video: Uses bandwidth-based quality selection
 * - Audio: Prefers user language or default track
 * - Text: No auto-selection (user opt-in)
 *
 * Only runs once on initial presentation load. Track changes after
 * initial selection are handled by other orchestrations (ABR, user selection).
 *
 * @example
 * const state = createState({ presentation });
 * const cleanup = selectInitialQuality(
 *   { state },
 *   { initialBandwidth: 2_000_000, preferredAudioLanguage: 'en' }
 * );
 */
export function selectInitialQuality(
  { state }: { state: WritableState<InitialQualityState> },
  config: InitialQualityConfig = {}
): () => void {
  let selecting = false;

  return combineLatest([state]).subscribe(async ([s]: [InitialQualityState]) => {
    // Check conditions
    if (selecting) return;
    if (!canSelectInitialQuality(s) || !shouldSelectInitialQuality(s)) return;

    try {
      selecting = true;

      const { presentation } = s;

      // Select tracks using generic selection functions
      const selectedVideoTrackId = selectVideoTrack(presentation!, config);
      const selectedAudioTrackId = selectAudioTrack(presentation!, config);
      const selectedTextTrackId = selectTextTrack(presentation!, config);

      // Patch state with selections (only patch defined values)
      const updates: Partial<InitialQualityState> = {};
      if (selectedVideoTrackId) updates.selectedVideoTrackId = selectedVideoTrackId;
      if (selectedAudioTrackId) updates.selectedAudioTrackId = selectedAudioTrackId;
      if (selectedTextTrackId) updates.selectedTextTrackId = selectedTextTrackId;

      if (Object.keys(updates).length > 0) {
        state.patch(updates);
      }
    } finally {
      selecting = false;
    }
  });
}
