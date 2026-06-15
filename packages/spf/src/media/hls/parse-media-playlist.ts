import { isUndefined } from '@videojs/utils/predicate';
import {
  type AudioTrack,
  getMediaPlaylistMetadata,
  isResolvedTrack,
  MEDIA_PLAYLIST_METADATA_KEY,
  type MediaPlaylistMetadata,
  type PartiallyResolvedAudioTrack,
  type PartiallyResolvedTextTrack,
  type PartiallyResolvedTrack,
  type PartiallyResolvedVideoTrack,
  type ResolvedTrack,
  type Segment,
  type TextTrack,
  type VideoTrack,
} from '../types';
import { matchTag, parseByteRange, parseExtInfDuration } from './parse-attributes';
import { resolveUrl } from './resolve-url';

/** MPEG-2 Transport Stream (IANA `video/MP2T`, lowercased for `isTypeSupported`). Video + audio TS — there is no `audio/mp2t`. */
export const MPEG_TS_MIME = 'video/mp2t';
/** Raw ADTS AAC packed-audio (HLS `.aac` segments; IANA `audio/aac`). */
export const RAW_AAC_MIME = 'audio/aac';

// Non-fMP4 container MIMEs keyed by segment file extension. fMP4 (the MSE
// default) always carries an EXT-X-MAP init segment, so a media playlist with
// no init segment and one of these extensions is a non-fMP4 rendition,
// relabeled from the fMP4 default. Extend with `.mp3` → 'audio/mpeg' etc.
const CONTAINER_MIME_BY_EXTENSION: Record<string, string> = {
  '.ts': MPEG_TS_MIME,
  '.aac': RAW_AAC_MIME,
};

/** The non-fMP4 container MIMEs the parser detects — all currently treated as unplayable. */
export const NON_FMP4_CONTAINER_MIMES = new Set(Object.values(CONTAINER_MIME_BY_EXTENSION));

/**
 * Non-fMP4 container MIME for a (resolved, absolute) segment URL, by file
 * extension, ignoring the query string. `undefined` for fMP4 / unrecognized.
 */
function containerMimeFromSegment(url: string | undefined): string | undefined {
  if (!url) return undefined;
  let path: string;
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    path = url.toLowerCase().split('?')[0] ?? '';
  }
  const dot = path.lastIndexOf('.');
  return dot === -1 ? undefined : CONTAINER_MIME_BY_EXTENSION[path.slice(dot)];
}

/**
 * Resolve unresolved track type to its resolved equivalent.
 */
type ResolveTrack<T> = T extends PartiallyResolvedVideoTrack
  ? VideoTrack
  : T extends PartiallyResolvedAudioTrack
    ? AudioTrack
    : T extends PartiallyResolvedTextTrack
      ? TextTrack
      : never;

/**
 * Position a freshly-parsed window (whose segment `startTime`s are snapshot-
 * local, i.e. from 0) onto the timeline established by the previous resolved
 * snapshot. Carries the timeline forward using the media-sequence overlap and
 * the previous window's *actual* segment durations — see
 * [live-presentation-modeling.md](../../../../internal/design/spf/live-presentation-modeling.md).
 *
 * - **Overlap** (`0 <= offset < previous.segments.length`): the new window's
 *   first segment is the same segment as `previous.segments[offset]`; anchor to
 *   its start (URLs checked — a mismatch warns).
 * - **Sequence went backwards** (non-conformant): reset to the local base.
 * - **Full turnover** (no overlap): estimate forward from the previous window's
 *   end across the unseen gap. This is the *only* place EXT-X-TARGETDURATION is
 *   used for timing — an upper-bound estimate, since the actual rolled-off
 *   durations are gone (exact recovery is the deferred PDT decision).
 *
 * Returns the rebased segments and the track's resulting `startTime`.
 */
function placeOnPreviousTimeline(
  previous: ResolvedTrack,
  segments: Segment[],
  mediaSequence: number,
  targetDuration: number
): { segments: Segment[]; startTime: number } {
  const prevSegments = previous.segments;
  const localBase = segments[0]?.startTime ?? 0;

  if (prevSegments.length === 0 || segments.length === 0) {
    return { segments, startTime: localBase };
  }

  const prevMediaSequence = getMediaPlaylistMetadata(previous)?.mediaSequence ?? 0;
  const offset = mediaSequence - prevMediaSequence;

  let anchor: number;
  if (offset >= 0 && offset < prevSegments.length) {
    const overlap = prevSegments[offset]!;
    if (overlap.url !== segments[0]!.url) {
      console.warn(
        `[parseMediaPlaylist] media-sequence aligns previous[${offset}] with the new window's first segment, ` +
          `but URLs differ (${overlap.url} vs ${segments[0]!.url}); sequence numbers may be unreliable.`
      );
    }
    anchor = overlap.startTime;
  } else if (offset < 0) {
    console.warn(`[parseMediaPlaylist] media-sequence went backwards (offset ${offset}); resetting timeline.`);
    anchor = localBase;
  } else {
    const last = prevSegments[prevSegments.length - 1]!;
    anchor = last.startTime + last.duration + (offset - prevSegments.length) * targetDuration;
    console.warn(
      `[parseMediaPlaylist] full window turnover (offset ${offset} >= ${prevSegments.length}); estimating from previous end.`
    );
  }

  const shift = anchor - localBase;
  const placed =
    shift === 0 ? segments : segments.map((segment) => ({ ...segment, startTime: segment.startTime + shift }));
  return { segments: placed, startTime: anchor };
}

/**
 * Parse an HLS media playlist into a resolved track with segments.
 *
 * `previous` is what was known about this track before this parse: the
 * partially-resolved track from the multivariant playlist on the first resolve,
 * or the previously-resolved snapshot on a live reload. Its metadata is carried
 * onto the result either way; when it's already resolved (has segments), its
 * timeline is carried forward so the new window lands on a stable, advancing
 * timeline (see {@link placeOnPreviousTimeline}).
 *
 * @param text - Media playlist text content
 * @param previous - Prior track state (unresolved shell, or previous resolved snapshot)
 * @returns Resolved track with segments (type inferred from input)
 */
export function parseMediaPlaylist<T extends PartiallyResolvedTrack>(
  text: string,
  previous: T | ResolveTrack<T>
): ResolveTrack<T> {
  const lines = text.split(/\r?\n/);

  // Segments and resources resolve relative to media playlist URL (per HLS spec)
  const baseUrl = previous.url;

  // Parse playlist
  const segments: Segment[] = [];
  let initSegmentUrl: string | undefined;
  let initSegmentByteRange: { start: number; end: number } | undefined;

  let currentDuration = 0;
  let currentByteRange: { start: number; end: number } | undefined;
  let currentTime = 0;
  let segmentIndex = 0;
  let previousByteRangeEnd: number | undefined;
  // Absolute wall-clock of the next segment's first sample, in epoch seconds.
  // Seeded by an explicit `#EXT-X-PROGRAM-DATE-TIME` (which re-anchors, e.g.
  // across a discontinuity) and advanced by each segment's duration so segments
  // without their own tag are interpolated forward (per RFC 8216).
  let currentProgramDateTime: number | undefined;

  // Playlist-level metadata (surfaced for live reload pacing / merge / termination).
  let targetDuration = 0;
  let mediaSequence = 0;
  let playlistType: 'VOD' | 'EVENT' | undefined;
  let endList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || (trimmed.startsWith('#') && !trimmed.startsWith('#EXT'))) {
      continue;
    }

    if (trimmed.startsWith('#EXT-X-TARGETDURATION:')) {
      targetDuration = Number.parseInt(trimmed.slice('#EXT-X-TARGETDURATION:'.length), 10) || 0;
      continue;
    }

    if (trimmed.startsWith('#EXT-X-MEDIA-SEQUENCE:')) {
      mediaSequence = Number.parseInt(trimmed.slice('#EXT-X-MEDIA-SEQUENCE:'.length), 10) || 0;
      continue;
    }

    if (trimmed.startsWith('#EXT-X-PROGRAM-DATE-TIME:')) {
      const parsed = Date.parse(trimmed.slice('#EXT-X-PROGRAM-DATE-TIME:'.length).trim());
      currentProgramDateTime = Number.isNaN(parsed) ? currentProgramDateTime : parsed / 1000;
      continue;
    }

    if (trimmed.startsWith('#EXT-X-PLAYLIST-TYPE:')) {
      const value = trimmed.slice('#EXT-X-PLAYLIST-TYPE:'.length).trim();
      playlistType = value === 'VOD' || value === 'EVENT' ? value : undefined;
      continue;
    }

    if (
      trimmed === '#EXTM3U' ||
      trimmed.startsWith('#EXT-X-VERSION:') ||
      trimmed.startsWith('#EXT-X-INDEPENDENT-SEGMENTS')
    ) {
      continue;
    }

    // #EXT-X-MAP - Init segment
    const mapAttrs = matchTag(trimmed, 'EXT-X-MAP');
    if (mapAttrs) {
      const uri = mapAttrs.get('URI');
      if (uri) {
        initSegmentUrl = resolveUrl(uri, baseUrl);
        const byteRangeStr = mapAttrs.get('BYTERANGE');
        if (byteRangeStr) {
          initSegmentByteRange = parseByteRange(byteRangeStr, 0) ?? undefined;
        }
      }
      continue;
    }

    // #EXTINF - Segment duration
    if (trimmed.startsWith('#EXTINF:')) {
      currentDuration = parseExtInfDuration(trimmed.slice(8));
      continue;
    }

    // #EXT-X-BYTERANGE - Segment byte range
    if (trimmed.startsWith('#EXT-X-BYTERANGE:')) {
      currentByteRange = parseByteRange(trimmed.slice(17), previousByteRangeEnd) ?? undefined;
      continue;
    }

    if (trimmed === '#EXT-X-ENDLIST') {
      endList = true;
      continue;
    }

    // Segment URI
    if (!trimmed.startsWith('#') && currentDuration > 0) {
      const segment: Segment = {
        id: `segment-${mediaSequence + segmentIndex}`,
        url: resolveUrl(trimmed, baseUrl),
        duration: currentDuration,
        startTime: currentTime,
      };

      if (!isUndefined(currentProgramDateTime)) {
        segment.programDateTime = currentProgramDateTime;
        // Interpolate forward: the next segment without an explicit tag inherits
        // this anchor plus this segment's duration.
        currentProgramDateTime += currentDuration;
      }

      if (currentByteRange) {
        segment.byteRange = currentByteRange;
        previousByteRangeEnd = currentByteRange.end + 1;
      } else {
        previousByteRangeEnd = undefined;
      }

      segments.push(segment);
      currentTime += currentDuration;
      segmentIndex++;

      currentDuration = 0;
      currentByteRange = undefined;
    }
  }

  const totalDuration = currentTime;

  // `duration` is the track's duration: Infinity while the playlist can still
  // grow (unended live), finite once complete (VOD / ENDLIST). It uses the
  // actual EXTINF sum, never the target duration.
  const complete = endList || playlistType === 'VOD';
  const trackDuration = complete ? totalDuration : Number.POSITIVE_INFINITY;

  // Position this window on the timeline. First resolve (previous is the
  // unresolved shell, no segments) anchors at 0; a live reload (previous is the
  // prior resolved snapshot) carries the timeline forward from the overlap.
  const placed = isResolvedTrack(previous)
    ? placeOnPreviousTimeline(previous, segments, mediaSequence, targetDuration)
    : { segments, startTime: 0 };

  // Build initialization (VTT may not have init segment)
  const initialization =
    previous.type === 'text' && !initSegmentUrl
      ? undefined
      : initSegmentUrl
        ? { url: initSegmentUrl, ...(initSegmentByteRange ? { byteRange: initSegmentByteRange } : {}) }
        : { url: '' };

  // Container detection: fMP4 always carries an EXT-X-MAP init segment, so its
  // absence plus a recognized non-fMP4 segment extension (`.ts` → MPEG-TS,
  // `.aac` → raw ADTS AAC) marks a non-fMP4 rendition (high-precision — never
  // trips on fMP4, which mandates the map). Relabel from the fMP4 default
  // `video/mp4` / `audio/mp4` to the container MIME so capability probing prunes
  // it (these containers are currently treated as unplayable; see `canPlayTrack`).
  const detectedContainer = initSegmentUrl ? undefined : containerMimeFromSegment(placed.segments[0]?.url);
  const mimeType = previous.type !== 'text' && detectedContainer ? detectedContainer : previous.mimeType;

  // Generic resolution: type-specific fields already on `previous`; add the
  // parsed properties (startTime, duration, segments, initialization, metadata).
  return {
    ...previous,
    mimeType,
    startTime: placed.startTime,
    duration: trackDuration,
    segments: placed.segments,
    initialization,
    metadata: {
      ...previous.metadata,
      [MEDIA_PLAYLIST_METADATA_KEY]: {
        targetDuration,
        mediaSequence,
        playlistType,
        endList,
      } satisfies MediaPlaylistMetadata,
    },
  } as unknown as ResolveTrack<T>;
}
