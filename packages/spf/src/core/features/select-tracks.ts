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
export interface TextSelectionConfig<T extends TrackType = 'text'> extends TrackSelectionConfig<T> {
  /**
   * Preferred subtitle language (ISO 639 code, e.g., "en", "es").
   * If specified, selects matching track if available.
   */
  preferredSubtitleLanguage?: string;

  /**
   * Include FORCED subtitle tracks in selection.
   * Default: false (follows hls.js/http-streaming pattern)
   *
   * Note: Per Apple's HLS spec, if content has forced and regular subtitles
   * in the same language, the regular track MUST contain both forced and
   * regular content. Therefore, forced-only tracks are redundant and excluded
   * by default.
   */
  includeForcedTracks?: boolean;

  /**
   * Auto-select DEFAULT track (requires DEFAULT=YES + AUTOSELECT=YES in HLS).
   * Default: false (user opt-in, matches hls.js/http-streaming)
   *
   * When enabled, tracks marked with both DEFAULT=YES and AUTOSELECT=YES
   * will be automatically selected if no user preference matches.
   */
  enableDefaultTrack?: boolean;
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
 * Pick text track to activate.
 *
 * Selection priority (if enabled):
 * 1. User preference (preferredSubtitleLanguage)
 * 2. DEFAULT track (if enableDefaultTrack is true and track has DEFAULT=YES + AUTOSELECT=YES)
 * 3. No auto-selection (user opt-in)
 *
 * By default, FORCED tracks are excluded per Apple's HLS spec.
 *
 * @param presentation - Presentation with text tracks
 * @param config - Selection configuration
 * @returns Track ID or undefined (no auto-selection)
 */
export function pickTextTrack(presentation: Presentation, config: TextSelectionConfig): string | undefined {
  const textSet = presentation.selectionSets.find((set) => set.type === 'text');
  if (!textSet?.switchingSets?.[0]?.tracks.length) return undefined;

  const tracks = textSet.switchingSets[0].tracks;

  // Filter out FORCED tracks by default (following hls.js/http-streaming pattern)
  // Per Apple spec: regular tracks MUST contain forced content when both exist
  const availableTracks = config.includeForcedTracks ? tracks : tracks.filter((track) => !track.forced);

  if (availableTracks.length === 0) return undefined;

  const { preferredSubtitleLanguage, enableDefaultTrack = false } = config;

  // 1. Preferred language match (if specified)
  if (preferredSubtitleLanguage) {
    const languageMatch = availableTracks.find((track) => track.language === preferredSubtitleLanguage);
    if (languageMatch) return languageMatch.id;
  }

  // 2. DEFAULT track (if enabled AND track has both DEFAULT=YES + AUTOSELECT=YES)
  //    Note: Parser only sets default=true when BOTH attributes present
  if (enableDefaultTrack) {
    const defaultTrack = availableTracks.find((track) => track.default === true);
    if (defaultTrack) return defaultTrack.id;
  }

  // 3. User opt-in (no auto-selection)
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
