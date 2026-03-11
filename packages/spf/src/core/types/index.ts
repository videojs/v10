/**
 * Core SPF Types
 *
 * Based on CMAF-HAM (Common Media Application Format - Hypothetical Application Model)
 * Protocol-agnostic representation of streaming media content.
 *
 * @see https://github.com/AcademySoftwareFoundation/common-media-library
 */

// =============================================================================
// Base Types
// =============================================================================

/**
 * Base identifier type for all HAM objects.
 */
export interface Ham {
  id: string;
}

/**
 * Addressable resource with optional byte range.
 */
export interface AddressableObject {
  url: string;
  byteRange?: {
    start: number;
    end: number;
  };
}

// =============================================================================
// Platform-agnostic Media Element
// =============================================================================

/**
 * Platform-agnostic media element interface.
 * Captures minimal shape needed for orchestration without DOM dependencies.
 * HTMLMediaElement satisfies this interface.
 */
export interface MediaElementLike {
  preload: string;
}

// =============================================================================
// Time and Duration
// =============================================================================

/**
 * Time span with start time and duration.
 * Used for segments and other timed ranges.
 */
export interface TimeSpan {
  startTime: number;
  duration: number;
}

// =============================================================================
// Enums
// =============================================================================

/**
 * Track content type.
 */
export type TrackType = 'video' | 'audio' | 'text';

// =============================================================================
// Frame Rate
// =============================================================================

/**
 * Video frame rate expressed as numerator/denominator.
 *
 * Examples:
 * - 30 fps: { frameRateNumerator: 30 }
 * - 29.97 fps: { frameRateNumerator: 30000, frameRateDenominator: 1001 }
 */
export interface FrameRate {
  frameRateNumerator: number;
  frameRateDenominator?: number;
}

// =============================================================================
// Partially Resolved Tracks (before media playlist is fetched)
// =============================================================================

/**
 * Generic type for partially resolved tracks.
 * Removes fields that come from media playlist parsing.
 *
 * @param T - Track type to make partially resolved (must extend Track)
 */
export type PartiallyResolved<T extends Track = Track> = Omit<T, 'segments' | 'initialization' | keyof TimeSpan> & {
  segments?: never;
  duration?: never;
  startTime?: never;
  initialization?: never;
};

/**
 * Partially resolved video track from multivariant playlist.
 * Has metadata but no segments or initialization yet (media playlist not fetched).
 */
export type PartiallyResolvedVideoTrack = PartiallyResolved<VideoTrack>;

/**
 * Partially resolved audio track from multivariant playlist.
 * Has metadata but no segments or initialization yet (media playlist not fetched).
 */
export type PartiallyResolvedAudioTrack = PartiallyResolved<AudioTrack>;

// =============================================================================
// Resolved Track Types (with segments from media playlist)
// =============================================================================

/**
 * Base track type containing common properties for all resolved tracks.
 * A resolved track has segments, duration, and initialization data.
 * All URLs are fully qualified (parsers resolve relative URLs).
 */
/**
 * Track startTime is always 0 (for future multi-period support).
 */
export type Track = Ham &
  AddressableObject &
  TimeSpan & {
    type: TrackType;
    codecs?: string[]; // Optional per HLS spec
    mimeType: string;
    language?: string | undefined;
    bandwidth: number;
    initialization?: AddressableObject;
    segments: Segment[];
  };

/**
 * Resolved video track with segments.
 */
export type VideoTrack = Track &
  Required<Pick<Track, 'initialization' | 'codecs'>> & {
    type: 'video';

    // Optional metadata from multivariant (per HLS spec)
    width?: number;
    height?: number;
    frameRate?: FrameRate;
    audioGroupId?: string;
  };

/**
 * Resolved audio track with segments.
 */
export type AudioTrack = Track &
  Required<Pick<Track, 'initialization' | 'codecs'>> & {
    type: 'audio';
    groupId: string;
    name: string;
    sampleRate: number;
    channels: number;
    default?: boolean;
    autoselect?: boolean;
  };

/**
 * Resolved text track with segments.
 */
export type TextTrack = Track & {
  type: 'text';
  groupId: string;
  label: string;
  kind: 'subtitles' | 'captions';
  default?: boolean;
  autoselect?: boolean;
  forced?: boolean;
};

/**
 * Partially resolved text track from multivariant playlist.
 * Has metadata but no segments or initialization yet (media playlist not fetched).
 */
export type PartiallyResolvedTextTrack = PartiallyResolved<TextTrack>;

/**
 * Unresolved text track (alias for backwards compatibility).

/**
 * Union of all resolved track types.
 */
export type ResolvedTrack = VideoTrack | AudioTrack | TextTrack;

/**
 * Union of all partially resolved track types.
 */
export type PartiallyResolvedTrack =
  | PartiallyResolvedVideoTrack
  | PartiallyResolvedAudioTrack
  | PartiallyResolvedTextTrack;

/**
 * Union of all unresolved track types (alias for backwards compatibility).

// =============================================================================
// Switching and Selection Sets
// =============================================================================

/**
 * Generic switching set type.
 * A group of tracks that can be switched between seamlessly.
 *
 * @param T - Track type (VideoTrack, AudioTrack, or TextTrack)
 */
export type SwitchingSetOf<T extends Track = Track> = Ham & {
  type: T['type'];
  tracks: (PartiallyResolved<T> | T)[];
};

/**
 * Video switching set - contains only video tracks (partially resolved or fully resolved).
 */
export type VideoSwitchingSet = SwitchingSetOf<VideoTrack>;

/**
 * Audio switching set - contains only audio tracks (partially resolved or fully resolved).
 */
export type AudioSwitchingSet = SwitchingSetOf<AudioTrack>;

/**
 * Text switching set - contains only text tracks (partially resolved or fully resolved).
 */
export type TextSwitchingSet = SwitchingSetOf<TextTrack>;

/**
 * Switching set - a group of tracks that can be switched between seamlessly.
 * Discriminated by track type.
 */
export type SwitchingSet = VideoSwitchingSet | AudioSwitchingSet | TextSwitchingSet;

/**
 * Generic selection set type.
 * Groups switching sets by track type.
 *
 * @param T - Track type (VideoTrack, AudioTrack, or TextTrack)
 */
export type SelectionSetOf<T extends Track = Track> = Ham & {
  type: T['type'];
  switchingSets: SwitchingSetOf<T>[];
};

/**
 * Video selection set - contains only video switching sets.
 */
export type VideoSelectionSet = SelectionSetOf<VideoTrack>;

/**
 * Audio selection set - contains only audio switching sets.
 */
export type AudioSelectionSet = SelectionSetOf<AudioTrack>;

/**
 * Text selection set - contains only text switching sets.
 */
export type TextSelectionSet = SelectionSetOf<TextTrack>;

/**
 * Selection set - groups switching sets by track type.
 * Discriminated union ensures type-safe track access.
 */
export type SelectionSet = VideoSelectionSet | AudioSelectionSet | TextSelectionSet;

// =============================================================================
// Segment
// =============================================================================

/**
 * Media segment with timing information.
 * Follows CMAF-HAM composition pattern.
 */
export type Segment = Ham & AddressableObject & TimeSpan;

// =============================================================================
// Media Playlist Info
// =============================================================================

/**
 * Intermediate representation of a parsed media playlist.
 * Used internally before assembling into full Track structure.
 */
export interface MediaPlaylistInfo {
  version: number;
  targetDuration: number;
  playlistType: 'VOD' | 'EVENT' | undefined;
  initSegment: AddressableObject | null;
  segments: Segment[];
  duration: number;
  endList: boolean;
}

// =============================================================================
// Presentation
// =============================================================================

/**
 * Presentation - a single playable period of content.
 * Uses TimeSpan fields (startTime always 0, duration optional until track resolved).
 *
 * Extends AddressableObject so `url` contains the original manifest URL.
 * All URLs are fully qualified (parsers resolve relative URLs).
 */
export type Presentation = Ham &
  AddressableObject &
  Partial<TimeSpan> & {
    selectionSets: SelectionSet[];
  };

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a track is resolved (has segments).
 * Works for all track types with overloaded signatures for type narrowing.
 */
export function isResolvedTrack(track: PartiallyResolvedVideoTrack | VideoTrack): track is VideoTrack;
export function isResolvedTrack(track: PartiallyResolvedAudioTrack | AudioTrack): track is AudioTrack;
export function isResolvedTrack(track: PartiallyResolvedTextTrack | TextTrack): track is TextTrack;
export function isResolvedTrack(track: PartiallyResolvedTrack | ResolvedTrack): track is ResolvedTrack;
export function isResolvedTrack(track: PartiallyResolvedTrack | ResolvedTrack): track is ResolvedTrack {
  return 'segments' in track;
}

/**
 * Check if a presentation has duration (at least one track resolved).
 * Narrows type to include required duration.
 */
export function hasPresentationDuration(
  presentation: Presentation
): presentation is Presentation & { duration: number } {
  return presentation.duration !== undefined;
}
