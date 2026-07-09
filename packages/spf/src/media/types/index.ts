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
  /**
   * Format-/protocol-specific values that aren't part of the generic CMAF-HAM
   * model — kept in an open bag so the model stays format-neutral (mirrors how
   * CMAF-HAM itself stashes protocol extras rather than growing the model).
   * Typed reads go through dedicated accessors (e.g. `getMediaPlaylistMetadata`).
   */
  metadata?: Record<string, unknown>;
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
    /**
     * Wall-clock time (epoch seconds) corresponding to the track's timeline
     * origin (`startTime`) — i.e. `startDate − startTime`, the single
     * rolling anchor that maps this track's media timeline to wall clock.
     * Optional: absent when no segment carries `startDate`.
     *
     * Provisional from the manifest, where the origin is the first fetched
     * segment; later refined from the buffer (`buffered`/`tfdt`) to pin the
     * origin to encoded-media zero. Comparable across tracks: the difference in
     * `startDate` between demuxed audio and video is their relative skew — the
     * offset a cross-track aligner removes — and equal `startDate` across
     * tracks marks the same presentation instant.
     */
    startDate?: number;
    /**
     * Media-timeline (decode/encode) coordinate of the track's timeline origin
     * (`startTime`) — the third base value of the coordinate triple, peer to
     * `startTime` (presentation) and `startDate` (wall-clock). Derived from the
     * container (`tfdt.baseMediaDecodeTime ÷ mdhd.timescale`); the relocation
     * offset is `startTime − startMediaTime`, never stored.
     *
     * Optional: absent until established (0-PTS sources never set it — their
     * origin is already 0). Established once per source by the
     * `establishStartMediaTime` reactor. See
     * `internal/design/spf/presentation-timeline-model.md`.
     */
    startMediaTime?: number;
  };

/**
 * Raw per-track values parsed from the media container, accumulated as they're
 * discovered across appends (`mdhd` timescale from the init, `tfdt`
 * baseMediaDecodeTime from the first media segment) — hence both optional. The
 * transient input the `establishStartMediaTime` reactor reduces into
 * `Track.startMediaTime`. Named for what it holds (container data), not the one
 * thing currently derived from it, so other box values can join later.
 */
export interface MediaContainerData {
  timescale?: number;
  baseMediaDecodeTime?: number;
}

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
    /**
     * Audio groups (`EXT-X-STREAM-INF:AUDIO`) this video rendition can pair
     * with. A list because one rendition is typically listed across multiple
     * `EXT-X-STREAM-INF` entries — one per audio group (the HLS cross-product) —
     * which the parser collapses into a single track carrying every group it
     * advertised.
     */
    audioGroupIds?: string[];
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
 * Predicate that answers "can this environment decode this track?" — the
 * capability-probing surface, read by the track-switching hard-constraint
 * pre-pass (`excludeUnplayableTracks`) to drop undecodable renditions before
 * selection. Kept DOM-free here (a plain function type over a minimal track
 * shape) so DOM-free behaviors can consume it; the DOM implementation
 * (`canPlayTrack` in `media/dom/capabilities.ts`) wraps
 * `MediaSource.isTypeSupported`.
 *
 * Takes the minimal codec-bearing shape both video and audio candidates
 * carry. `mimeType` is optional so unprobeable candidates (no MIME) can be
 * passed straight through as playable rather than dropped.
 */
export type CanPlayTrack = (track: { mimeType?: string; codecs?: string[] }) => boolean;

/**
 * Minimal text-track cue shape — start time, end time, and display text.
 *
 * Host-agnostic representation. `VTTCue` structurally satisfies this
 * interface, so DOM consumers pass `VTTCue` values directly. Non-DOM
 * hosts (workers, test fakes, non-browser engines) can satisfy the same
 * shape without pulling in DOM types.
 */
export interface Cue {
  startTime: number;
  endTime: number;
  text: string;
}

/**
 * Media element with an iterable text-track list, host-agnostic.
 *
 * Extends `MediaElementLike` with the minimum surface needed to observe
 * which text tracks are currently mounted on the media. `HTMLMediaElement`
 * structurally satisfies this (its `textTracks` is a `TextTrackList`,
 * which is iterable with `{ id }` items).
 */
export interface MediaElementWithTextTracks extends MediaElementLike {
  readonly textTracks: Iterable<{ readonly id: string }>;
}

/**
 * Partially resolved text track from multivariant playlist.
 * Has metadata but no segments or initialization yet (media playlist not fetched).
 */
export type PartiallyResolvedTextTrack = PartiallyResolved<TextTrack>;

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
 *
 * `startDate` is the absolute wall-clock time of the segment's first
 * sample, in **epoch seconds** (unit-consistent with `startTime`/`duration`),
 * derived from `#EXT-X-PROGRAM-DATE-TIME` (explicit or interpolated forward via
 * `EXTINF`). Unlike the per-track-relative `startTime`, it is comparable across
 * tracks, so it is the cross-track sync anchor for demuxed audio/video and the
 * exact recovery value on a full live-window turnover. Optional: absent when the
 * source carries no PDT (allowed by RFC 8216, required by Apple's HLS authoring
 * spec — so present on conformant content).
 */
export type Segment = Ham & AddressableObject & TimeSpan & { startDate?: number };

/**
 * Floating-point tolerance for matching segments by `startTime`. Two
 * segments are considered the same position when
 * `Math.abs(a.startTime - b.startTime) < SEGMENT_TIME_EPSILON`. Used by
 * the source-buffer dedup and segment-loader quality-aware filter to
 * tolerate sub-millisecond drift in segment timestamps across multiple
 * playlists / quality levels.
 */
export const SEGMENT_TIME_EPSILON = 0.0001;

// =============================================================================
// Media Playlist Metadata
// =============================================================================

/**
 * Playlist-level metadata surfaced from a parsed media playlist. HLS delivery
 * specifics — not part of the generic CMAF-HAM model — so they live under
 * `Ham.metadata` (read via `getMediaPlaylistMetadata`) rather than as
 * first-class `Track` fields:
 *
 * - `targetDuration` (`#EXT-X-TARGETDURATION`) — reload-cadence basis.
 * - `mediaSequence` (`#EXT-X-MEDIA-SEQUENCE`, default 0) — sequence number of
 *   `segments[0]`; the join key for merging successive reload snapshots.
 * - `playlistType` (`#EXT-X-PLAYLIST-TYPE`) — `VOD` / `EVENT` / undefined.
 * - `endList` (`#EXT-X-ENDLIST`) — playlist is complete; stop reloading.
 *
 * See [live-presentation-modeling.md](../../../../internal/design/spf/live-presentation-modeling.md)
 * for how these map onto the protocol-neutral category model.
 */
export interface MediaPlaylistMetadata {
  targetDuration: number;
  mediaSequence: number;
  playlistType?: 'VOD' | 'EVENT';
  endList: boolean;
}

/** Key under `Ham.metadata` where {@link MediaPlaylistMetadata} is stored. */
export const MEDIA_PLAYLIST_METADATA_KEY = 'mediaPlaylist';

/** Typed read of the media-playlist metadata stashed in `ham.metadata`. */
export function getMediaPlaylistMetadata(ham: Ham): MediaPlaylistMetadata | undefined {
  return ham.metadata?.[MEDIA_PLAYLIST_METADATA_KEY] as MediaPlaylistMetadata | undefined;
}

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
// Stream Type
// =============================================================================

/**
 * The source's semantic nature — live vs on-demand. A model concept
 * (consumer-facing), distinct from completeness / duration: a live stream that
 * has *ended* is still `'live'`. See
 * [live-presentation-modeling.md](../../../../internal/design/spf/live-presentation-modeling.md).
 */
export type StreamType = 'live' | 'on-demand';

/**
 * Derive {@link StreamType} from a media playlist's metadata. Per the model,
 * only `#EXT-X-PLAYLIST-TYPE:VOD` marks on-demand; everything else (EVENT, or
 * the tag absent) is live — completeness (`endList`) never factors in.
 */
export function deriveStreamType(metadata: MediaPlaylistMetadata | undefined): StreamType {
  return metadata?.playlistType === 'VOD' ? 'on-demand' : 'live';
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
    /**
     * Live vs on-demand — the source's semantic nature. Populated once a media
     * playlist is parsed (derived from `#EXT-X-PLAYLIST-TYPE` via
     * `deriveStreamType`); orthogonal to duration / completeness.
     */
    streamType?: StreamType;
  };

/**
 * State-shaped presentation that may or may not be resolved yet.
 *
 * The lifecycle is a single value: a caller writes `{ url }`, and the
 * resolver populates the rest in place. `url` is always present; resolved
 * fields (`id`, `selectionSets`, duration) appear once parsing succeeds.
 *
 * Use `isResolvedPresentation` to narrow to `Presentation`.
 */
export type MaybeResolvedPresentation = AddressableObject & Partial<Omit<Presentation, keyof AddressableObject>>;

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
  presentation: MaybeResolvedPresentation
): presentation is MaybeResolvedPresentation & { duration: number } {
  return presentation.duration !== undefined;
}

/**
 * Narrows a `MaybeResolvedPresentation` to a fully resolved `Presentation`.
 *
 * A presentation is resolved once `resolvePresentation` has parsed the
 * manifest and populated both `id` and `selectionSets`. Both must be
 * present — a partial value with only one of them isn't usable, and
 * letting it through would have downstream behaviors crash when they
 * access `selectionSets`.
 */
export function isResolvedPresentation(
  presentation: MaybeResolvedPresentation | undefined
): presentation is Presentation {
  return presentation !== undefined && presentation.id !== undefined && presentation.selectionSets !== undefined;
}
