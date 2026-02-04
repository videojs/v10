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
}

/**
 * Unresolved audio track - metadata from manifest, no segments.
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
}

/**
 * Unresolved text track - metadata from manifest, no segments.
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
}

/**
 * Union of all unresolved track types.
 */
export type UnresolvedTrack = UnresolvedVideoTrack | UnresolvedAudioTrack | UnresolvedTextTrack;

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
    startTime: number;
    duration?: number | undefined;
    endTime?: number | undefined;
  };
