import { DEFAULT_QUALITY_CONFIG, selectQuality } from '../abr/quality-selection';
import type { EventStream } from '../events/create-event-stream';
import type { WritableState } from '../state/create-state';
import type { AudioSelectionSet, Presentation, TrackType, VideoSelectionSet } from '../types';
import { SelectedTrackIdKeyByType } from '../utils/track-selection';

/**
 * Default initial bandwidth estimate for cold start (bits per second).
 * Conservative 1 Mbps to avoid over-selecting on slow connections.
 */
export const DEFAULT_INITIAL_BANDWIDTH = 1_000_000;

/**
 * State shape for track selection.
 */
export interface TrackSelectionState {
  presentation?: Presentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  selectedTextTrackId?: string;
}

/**
 * Owners shape for track selection.
 * Currently empty - reserved for future use (e.g., bandwidth estimator).
 */
export type TrackSelectionOwners = Record<string, never>;

/**
 * Action types for track selection.
 * Reserved for future event-driven selection triggers.
 */
export type TrackSelectionAction = { type: 'presentation-loaded' };

/**
 * Base configuration for track selection.
 * Generic over track type with discriminant `type` field.
 */
export interface TrackSelectionConfig<T extends TrackType = TrackType> {
  type: T;
}

/**
 * Configuration for video track selection.
 * Generic with default to 'video' for convenience.
 */
export interface VideoSelectionConfig<T extends TrackType = 'video'> extends TrackSelectionConfig<T> {
  /**
   * Initial bandwidth estimate for cold start (bits per second).
   * Used to select video quality before we have real measurements.
   * Default: 1 Mbps (conservative).
   */
  initialBandwidth?: number;

  /**
   * Safety margin for quality selection (0-1).
   * Default: 0.85 (15% headroom).
   */
  safetyMargin?: number;
}

/**
 * Configuration for audio track selection.
 * Generic with default to 'audio' for convenience.
 */
export interface AudioSelectionConfig<T extends TrackType = 'audio'> extends TrackSelectionConfig<T> {
  /**
   * Preferred audio language (ISO 639 code, e.g., "en", "es").
   * If not specified, selects first audio track.
   */
  preferredAudioLanguage?: string;
}

/**
 * Configuration for text track selection.
 * Generic with default to 'text' for convenience.
 */
export interface TextSelectionConfig<T extends TrackType = 'text'> extends TrackSelectionConfig<T> {
  // No additional options yet - reserved for future use
}

// =============================================================================
// Helper Functions (Pure Selection Logic)
// =============================================================================

/**
 * Pick video track using quality selection algorithm.
 *
 * Uses bandwidth-based selection with safety margin to pick
 * the highest quality track that fits available bandwidth.
 *
 * @param presentation - Presentation with video tracks
 * @param config - Selection configuration (bandwidth, safety margin)
 * @returns Selected video track ID, or undefined if no video tracks
 */
export function pickVideoTrack(presentation: Presentation, config: VideoSelectionConfig): string | undefined {
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
 * Pick audio track.
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
export function pickAudioTrack(presentation: Presentation, config: AudioSelectionConfig): string | undefined {
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
 * Pick text track.
 *
 * Note: Text tracks (captions/subtitles) are typically user opt-in,
 * so this returns undefined by default. Future enhancement could support
 * auto-selecting based on user preferences or accessibility requirements.
 *
 * @param presentation - Presentation with text tracks
 * @param config - Selection configuration (unused for now)
 * @returns undefined (no auto-selection)
 */
export function pickTextTrack(_presentation: Presentation, _config: TextSelectionConfig): string | undefined {
  // Text tracks are user opt-in - don't auto-select
  return undefined;
}

/**
 * Check if we can select a track of the given type.
 *
 * Returns true when:
 * - Presentation exists
 * - Has tracks of the specified type
 *
 * Generic over track type - works for video, audio, or text.
 */
export function canSelectTrack<T extends TrackType>(
  state: TrackSelectionState,
  config: TrackSelectionConfig<T>
): boolean {
  return !!state?.presentation?.selectionSets?.find(({ type }) => type === config.type)?.switchingSets?.[0]?.tracks
    .length;
}

/**
 * Check if we should select a track of the given type.
 *
 * Returns true when:
 * - Track of this type is not already selected
 *
 * Generic over track type - works for video, audio, or text.
 *
 * @TODO figure out reactive model for ABR cases - right now we're only selecting
 * if we have nothing selected (CJP)
 */
export function shouldSelectTrack<T extends TrackType>(
  state: TrackSelectionState,
  config: TrackSelectionConfig<T>
): boolean {
  return !state[SelectedTrackIdKeyByType[config.type]];
}

// =============================================================================
// Orchestrations
// =============================================================================

/**
 * Select video track orchestration.
 *
 * Selects video track when:
 * - Presentation exists
 * - No video track is selected yet
 *
 * Uses bandwidth-based quality selection algorithm.
 *
 * @example
 * const cleanup = selectVideoTrack(
 *   { state, owners, events },
 *   { initialBandwidth: 2_000_000 }
 * );
 */
export function selectVideoTrack(
  {
    state,
  }: {
    state: WritableState<TrackSelectionState>;
    owners: WritableState<TrackSelectionOwners>;
    events: EventStream<TrackSelectionAction>;
  },
  config: VideoSelectionConfig = { type: 'video' }
): () => void {
  let selecting = false;

  return state.subscribe(async (currentState: TrackSelectionState) => {
    /** @TODO figure out reactive model for ABR cases (CJP) */
    if (!canSelectTrack(currentState, config) || !shouldSelectTrack(currentState, config) || selecting) return;

    try {
      selecting = true;

      // Just to have basic functionality/POC, simply selecting the first track
      const selectedTrackId = currentState.presentation?.selectionSets.find(({ type }) => type === config.type)
        ?.switchingSets[0]?.tracks[0]?.id;

      if (selectedTrackId) {
        const selectedTrackKey = SelectedTrackIdKeyByType[config.type];
        state.patch({ [selectedTrackKey]: selectedTrackId });
      }
    } finally {
      selecting = false;
    }
  });
}

/**
 * Select audio track orchestration.
 *
 * Selects audio track when:
 * - Presentation exists
 * - No audio track is selected yet
 *
 * Uses language and preference-based selection.
 *
 * @example
 * const cleanup = selectAudioTrack(
 *   { state, owners, events },
 *   { preferredAudioLanguage: 'en' }
 * );
 */
export function selectAudioTrack(
  {
    state,
  }: {
    state: WritableState<TrackSelectionState>;
    owners: WritableState<TrackSelectionOwners>;
    events: EventStream<TrackSelectionAction>;
  },
  config: AudioSelectionConfig = { type: 'audio' }
): () => void {
  let selecting = false;

  return state.subscribe(async (currentState: TrackSelectionState) => {
    if (!canSelectTrack(currentState, config) || !shouldSelectTrack(currentState, config) || selecting) return;

    try {
      selecting = true;

      // Just to have basic functionality/POC, simply selecting the first track
      const selectedTrackId = currentState.presentation?.selectionSets.find(({ type }) => type === 'audio')
        ?.switchingSets[0]?.tracks[0]?.id;

      if (selectedTrackId) {
        state.patch({ selectedAudioTrackId: selectedTrackId });
      }
    } finally {
      selecting = false;
    }
  });
}

/**
 * Select text track orchestration.
 *
 * Selects text track when:
 * - Presentation exists
 * - No text track is selected yet
 *
 * Note: Currently does not auto-select (user opt-in).
 *
 * @example
 * const cleanup = selectTextTrack({ state, owners, events }, {});
 */
export function selectTextTrack(
  {
    state,
  }: {
    state: WritableState<TrackSelectionState>;
    owners: WritableState<TrackSelectionOwners>;
    events: EventStream<TrackSelectionAction>;
  },
  config: TextSelectionConfig = { type: 'text' }
): () => void {
  let selecting = false;

  return state.subscribe(async (currentState: TrackSelectionState) => {
    if (!canSelectTrack(currentState, config) || !shouldSelectTrack(currentState, config) || selecting) return;

    try {
      selecting = true;

      // Text tracks are user opt-in - don't auto-select
      const selectedTextTrackId = pickTextTrack(currentState.presentation!, config);

      if (selectedTextTrackId) {
        state.patch({ selectedTextTrackId });
      }
    } finally {
      selecting = false;
    }
  });
}
