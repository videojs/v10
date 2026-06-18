import type {
  AudioTrack,
  PartiallyResolvedAudioTrack,
  PartiallyResolvedTextTrack,
  PartiallyResolvedTrack,
  PartiallyResolvedVideoTrack,
  Segment,
  TextTrack,
  VideoTrack,
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
 * Parse HLS media playlist and resolve track with segments.
 *
 * Takes an unresolved track (from multivariant playlist) and media playlist text,
 * returns a HAM-compliant resolved track with segments.
 *
 * @param text - Media playlist text content
 * @param unresolved - Unresolved track from parseMultivariantPlaylist
 * @returns Resolved track with segments (type inferred from input)
 */
export function parseMediaPlaylist<T extends PartiallyResolvedTrack>(
  text: string,
  unresolved: T | ResolveTrack<T>
): ResolveTrack<T> {
  const lines = text.split(/\r?\n/);

  // Segments and resources resolve relative to media playlist URL (per HLS spec)
  const baseUrl = unresolved.url;

  // Parse playlist
  const segments: Segment[] = [];
  let initSegmentUrl: string | undefined;
  let initSegmentByteRange: { start: number; end: number } | undefined;

  let currentDuration = 0;
  let currentByteRange: { start: number; end: number } | undefined;
  let currentTime = 0;
  let segmentIndex = 0;
  let previousByteRangeEnd: number | undefined;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || (trimmed.startsWith('#') && !trimmed.startsWith('#EXT'))) {
      continue;
    }

    if (
      trimmed === '#EXTM3U' ||
      trimmed.startsWith('#EXT-X-VERSION:') ||
      trimmed.startsWith('#EXT-X-TARGETDURATION:') ||
      trimmed.startsWith('#EXT-X-PLAYLIST-TYPE:') ||
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
      continue;
    }

    // Segment URI
    if (!trimmed.startsWith('#') && currentDuration > 0) {
      const segment: Segment = {
        id: `segment-${segmentIndex}`,
        url: resolveUrl(trimmed, baseUrl),
        duration: currentDuration,
        startTime: currentTime,
      };

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

  // Build initialization (VTT may not have init segment)
  const initialization =
    unresolved.type === 'text' && !initSegmentUrl
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
  const detectedContainer = initSegmentUrl ? undefined : containerMimeFromSegment(segments[0]?.url);
  const mimeType = unresolved.type !== 'text' && detectedContainer ? detectedContainer : unresolved.mimeType;

  // Generic resolution: All type-specific fields already on unresolved track from P1
  // Just add parsed properties (startTime, duration, segments, initialization)
  return {
    ...unresolved,
    mimeType,
    startTime: 0,
    duration: totalDuration,
    segments,
    initialization,
  } as unknown as ResolveTrack<T>;
}
