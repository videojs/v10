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

/**
 * Base URL for resolving relative URLs.
 */
export interface Base {
  baseUrl: string;
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
// Duration
// =============================================================================

/**
 * Duration in seconds.
 */
export interface Duration {
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
// Unresolved Track Types (before media playlist is fetched)
// =============================================================================

/**
 * Unresolved video track - metadata from manifest, no segments.
 * Contains enough info for ABR selection (bandwidth, resolution, codecs).
 * Includes type-specific defaults set during multivariant parsing.
 * Distinguishing feature: no `segments` property.
 */
export interface UnresolvedVideoTrack {
  type: 'video';
  id: string;
  url: string;
  bandwidth: number;
  width?: number | undefined;
  height?: number | undefined;
  codecs?: string[] | undefined;
  frameRate?: FrameRate | undefined;
  audioGroupId?: string | undefined;
  // Type-specific defaults (set in P1)
  mimeType: 'video/mp4';
  par: '1:1';
  sar: '1:1';
  scanType: 'progressive';
}

/**
 * Unresolved audio track - metadata from manifest, no segments.
 * Includes type-specific defaults set during multivariant parsing.
 * Distinguishing feature: no `segments` property.
 */
export interface UnresolvedAudioTrack {
  type: 'audio';
  id: string;
  url: string;
  groupId: string;
  name: string;
  language?: string | undefined;
  codecs?: string[] | undefined;
  default?: boolean | undefined;
  autoselect?: boolean | undefined;
  // Type-specific defaults (set in P1)
  mimeType: 'audio/mp4';
  bandwidth: 0; // Not available in multivariant for demuxed audio
  sampleRate: 48000; // Default for CMAF
  channels: 2; // Default stereo
}

/**
 * Unresolved text track - metadata from manifest, no segments.
 * Includes type-specific defaults set during multivariant parsing.
 * Distinguishing feature: no `segments` property.
 */
export interface UnresolvedTextTrack {
  type: 'text';
  id: string;
  url: string;
  groupId: string;
  label: string;
  kind: 'subtitles' | 'captions';
  language?: string | undefined;
  default?: boolean | undefined;
  forced?: boolean | undefined;
  // Type-specific defaults (set in P1)
  mimeType: 'text/vtt';
  bandwidth: 0; // Text tracks don't consume bandwidth
  codecs: []; // VTT has no codecs
}

/**
 * Union of all unresolved track types.
 */
export type UnresolvedTrack = UnresolvedVideoTrack | UnresolvedAudioTrack | UnresolvedTextTrack;

// =============================================================================
// Resolved Track Types (with segments from media playlist)
// =============================================================================

/**
 * Base track type containing common properties for all resolved tracks.
 * A resolved track has segments and initialization data.
 */
export type Track = Ham &
  Base &
  Duration &
  AddressableObject & {
    type: TrackType;
    codecs: string[];
    mimeType: string;
    language?: string | undefined;
    bandwidth: number;
    initialization: AddressableObject;
    segments: Segment[];
  };

/**
 * Resolved video track with segments.
 */
export type VideoTrack = Track & {
  type: 'video';
  width: number;
  height: number;
  frameRate: FrameRate;
  /** @TODO Revisit for interop (default, forced, initialization) */
  par: string; // drop
  sar: string; // drop
  scanType: string; // drop
};

/**
 * Resolved audio track with segments.
 */
export type AudioTrack = Track & {
  type: 'audio';
  sampleRate: number;
  channels: number;
};

/**
 * Resolved text track with segments.
 */
export type TextTrack = Omit<Track, 'initialization'> & {
  type: 'text';
  label: string;
  kind: 'subtitles' | 'captions';
  /** @TODO Revisit for interop (default, forced, initialization) */
  default?: boolean | undefined;
  forced?: boolean | undefined;
  initialization?: AddressableObject | undefined;
};

/**
 * Union of all resolved track types.
 */
export type ResolvedTrack = VideoTrack | AudioTrack | TextTrack;

// =============================================================================
// Switching and Selection Sets
// =============================================================================

/**
 * Switching set - a group of tracks that can be switched between seamlessly.
 * Tracks may be unresolved (no segments) or resolved (with segments).
 */
export type SwitchingSet = Ham &
  Base & {
    tracks: UnresolvedTrack[];
  };

/**
 * Selection set - groups switching sets by track type.
 */
export type SelectionSet = Ham & {
  switchingSets: SwitchingSet[];
  type: TrackType;
};

// =============================================================================
// Segment
// =============================================================================

/**
 * Media segment with timing information.
 * Follows CMAF-HAM composition pattern.
 */
export type Segment = Ham &
  AddressableObject &
  Duration & {
    startTime: number;
  };

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
 * Duration and endTime are optional until at least one track is resolved.
 *
 * Extends AddressableObject so `url` contains the original manifest URL.
 */
export type Presentation = Ham &
  Base &
  AddressableObject & {
    selectionSets: SelectionSet[];
    /** @TODO Revisit for interop */
    startTime: number; // always 0
    duration?: number | undefined;
    /** @TODO Revisit for interop */
    endTime?: number | undefined; // can drop - normallize to a Duration + startTime type for all things with this kind of info
  };

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a track is resolved (has segments).
 * Works for all track types with overloaded signatures for type narrowing.
 */
export function isResolvedTrack(track: UnresolvedVideoTrack | VideoTrack): track is VideoTrack;
export function isResolvedTrack(track: UnresolvedAudioTrack | AudioTrack): track is AudioTrack;
export function isResolvedTrack(track: UnresolvedTextTrack | TextTrack): track is TextTrack;
export function isResolvedTrack(track: UnresolvedTrack | ResolvedTrack): track is ResolvedTrack;
export function isResolvedTrack(track: UnresolvedTrack | ResolvedTrack): track is ResolvedTrack {
  return 'segments' in track;
}

/**
 * Check if a presentation has duration (at least one track resolved).
 * Narrows type to include required duration and endTime.
 */
export function hasPresentationDuration(
  presentation: Presentation
): presentation is Presentation & { duration: number; endTime: number } {
  return presentation.duration !== undefined;
}
