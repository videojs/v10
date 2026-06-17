import { DEFAULT_QUALITY_CONFIG, selectQuality } from '../abr/quality-selection';
import type { AudioSelectionSet, MaybeResolvedPresentation, TrackType, VideoSelectionSet } from '../types';
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
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  selectedTextTrackId?: string;
}

/**
 * Context shape for track selection.
 * Currently empty - reserved for future use (e.g., bandwidth estimator).
 */
export type TrackSelectionContext = Record<string, never>;

/**
 * Action types for track selection.
 * Reserved for future event-driven selection triggers.
 */
export type TrackSelectionAction = { type: 'presentation-loaded' };

/**
 * Configuration for video track selection.
 */
export interface VideoSelectionConfig {
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
 */
export interface AudioSelectionConfig {
  /**
   * Preferred audio language (ISO 639 code, e.g., "en", "es").
   * If not specified, selects first audio track.
   */
  preferredAudioLanguage?: string;
}

/**
 * Configuration for text track selection.
 */
export interface TextSelectionConfig {
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

// =============================================================================
// Helper Functions (Pure Selection Logic)
// =============================================================================

/**
 * Contract for a track picker — a pure function that consults a
 * presentation (and optional config) and returns the id of the track to
 * select, or `undefined` to leave the slot unset.
 *
 * Behaviors that own a track-selection slot (`selectAudioTrack`,
 * `selectTextTrack`, `selectVideoTrack`, `switchVideoTrack`) accept a
 * `TrackPicker` via config. The behavior passes its own config straight
 * through as the picker's second argument — pickers that need richer
 * options (language preferences, default-track filtering, bandwidth-aware
 * selection) read from `config`; pickers that don't (e.g., first-track)
 * ignore it.
 */
export type TrackPicker<Config = unknown> = (
  presentation: MaybeResolvedPresentation,
  config?: Config
) => string | undefined;

/**
 * Test whether a track matches a partial-track description: every present,
 * defined field of `filter` equals the track's. Absent or `undefined` filter
 * fields don't constrain. Used to narrow candidates by a user selection
 * (`{ id }`, `{ language }`, `{ height }`, …).
 *
 * @param track - The track to test
 * @param filter - Partial-track description; only present, defined fields constrain
 * @returns `true` when the track matches every constraining field
 */
export function matchesPartialTrack<T>(track: T, filter: Partial<T>): boolean {
  for (const key in filter) {
    const filterValue = filter[key as keyof T];
    if (filterValue !== undefined && track[key as keyof T] !== filterValue) return false;
  }
  return true;
}

/**
 * Pick the first track of the given type from a presentation.
 *
 * Returns the first track in the first switching set of the matching
 * selection set, or `undefined` if either is missing. POC-shaped
 * default-pick — `pickVideoTrack` / `pickAudioTrack` honor bandwidth +
 * language preferences and will replace this once selection callers are
 * ready.
 */
export function pickFirstTrackId(presentation: MaybeResolvedPresentation, type: TrackType): string | undefined {
  return presentation.selectionSets?.find((set) => set.type === type)?.switchingSets[0]?.tracks[0]?.id;
}

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
export function pickVideoTrack(
  presentation: MaybeResolvedPresentation,
  config?: VideoSelectionConfig
): string | undefined {
  const videoSet = presentation.selectionSets?.find((set) => set.type === 'video') as VideoSelectionSet | undefined;

  if (!videoSet || videoSet.switchingSets.length === 0) {
    return undefined;
  }

  // Get first switching set's tracks (HLS typically has one switching set per type)
  const switchingSet = videoSet.switchingSets[0];
  if (!switchingSet || switchingSet.tracks.length === 0) {
    return undefined;
  }

  const initialBandwidth = config?.initialBandwidth ?? DEFAULT_INITIAL_BANDWIDTH;
  const safetyMargin = config?.safetyMargin ?? DEFAULT_QUALITY_CONFIG.safetyMargin;

  // selectQuality works with both partially resolved and resolved tracks
  const selected = selectQuality(switchingSet.tracks as any, { bandwidth: initialBandwidth, safetyMargin });

  return selected?.id;
}

/**
 * Translates a "max resolution" into a total total pixel area
 * for comparisons with video track resolutions with an assumed
 * 16:9 ratio.
 *
 * Example: "720p" translates to a 921600 pixel area.
 *
 * Because 720 * 1280 = 720 * (720 * (16/9) ) = 921_600
 *
 * Accepts:
 * - string with the format '{height}p'. ('720p')
 * - bare number, interpreted as pixel area. (921_600)
 * - anything else will translate to `+Infinity`, meaning no cap specified
 */
export function maxResolutionToPixelArea(value: string | number | undefined): number {
  if (value === undefined || value === null) return Number.POSITIVE_INFINITY;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : Number.POSITIVE_INFINITY;
  const match = value.trim().match(/^(\d+)p?$/i);
  if (!match) return Number.POSITIVE_INFINITY;
  const height = Number(match[1]);
  if (!(Number.isFinite(height) && height > 0)) return Number.POSITIVE_INFINITY;
  return (height * height * 16) / 9;
}

type RankableTrack = { id: string; width?: number; height?: number; bandwidth?: number };

/**
 * Pick the track with the highest pixel area at or below `maxPixelArea`.
 * Falls back to the lowest track when nothing satisfies the cap (the
 * lowest of the above-cap set is the closest to the cap from above).
 * Tiebreak on bandwidth. Missing dimensions are treated as area `0`.
 */
export function pickTrackUnderPixelArea<T extends RankableTrack>(
  tracks: readonly T[],
  maxPixelArea: number = Number.POSITIVE_INFINITY
): T | undefined {
  if (tracks.length === 0) return undefined;

  // Sort descending by pixel area, bandwidth as tiebreaker. List sizes
  // are small (HLS variant counts) — no need to optimize past a sort.
  const sorted = [...tracks].sort(
    (a, b) =>
      (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0) || (b.bandwidth ?? 0) - (a.bandwidth ?? 0)
  );

  return sorted.find((t) => (t.width ?? 0) * (t.height ?? 0) <= maxPixelArea) ?? sorted[sorted.length - 1];
}

/**
 * Pick the video track with the highest pixel area.
 *
 * Pair with `selectVideoTrack`; compose `switchVideoQuality` instead
 * for runtime-adapted quality.
 */
export function pickHighestResolutionVideoTrack(presentation: MaybeResolvedPresentation): string | undefined {
  const videoSet = presentation.selectionSets?.find((set) => set.type === 'video') as VideoSelectionSet | undefined;
  const tracks = videoSet?.switchingSets[0]?.tracks;
  if (!tracks?.length) return undefined;
  return pickTrackUnderPixelArea(tracks)?.id;
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
export function pickAudioTrack(
  presentation: MaybeResolvedPresentation,
  config?: AudioSelectionConfig
): string | undefined {
  const audioSet = presentation.selectionSets?.find((set) => set.type === 'audio') as AudioSelectionSet | undefined;

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
  if (config?.preferredAudioLanguage) {
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
 * Pick text track to activate. Conforms to the `TrackPicker` contract so it
 * can be used directly as a default picker for `selectTextTrack` without an
 * adapter wrapper.
 *
 * Selection priority (if enabled):
 * 1. User preference (preferredSubtitleLanguage)
 * 2. DEFAULT track (if enableDefaultTrack is true and track has DEFAULT=YES + AUTOSELECT=YES)
 * 3. No auto-selection (user opt-in)
 *
 * By default, FORCED tracks are excluded per Apple's HLS spec.
 */
export function pickTextTrack(
  presentation: MaybeResolvedPresentation,
  config?: TextSelectionConfig
): string | undefined {
  const textSet = presentation.selectionSets?.find((set) => set.type === 'text');
  if (!textSet?.switchingSets?.[0]?.tracks.length) return undefined;

  const tracks = textSet.switchingSets[0].tracks;

  // Filter out FORCED tracks by default (following hls.js/http-streaming pattern)
  // Per Apple spec: regular tracks MUST contain forced content when both exist
  const availableTracks = config?.includeForcedTracks ? tracks : tracks.filter((track) => !track.forced);

  if (availableTracks.length === 0) return undefined;

  const { preferredSubtitleLanguage, enableDefaultTrack = false } = config ?? {};

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
 * Check if we can select a track of the given type.
 *
 * Returns true when:
 * - Presentation exists
 * - Has tracks of the specified type
 *
 * Generic over track type - works for video, audio, or text.
 */
export function canSelectTrack(state: TrackSelectionState, type: TrackType): boolean {
  return !!state?.presentation?.selectionSets?.find((set) => set.type === type)?.switchingSets?.[0]?.tracks.length;
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
export function shouldSelectTrack(state: TrackSelectionState, type: TrackType): boolean {
  return !state[SelectedTrackIdKeyByType[type]];
}
