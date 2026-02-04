import type {
  AudioTrack,
  Segment,
  TextTrack,
  UnresolvedAudioTrack,
  UnresolvedTextTrack,
  UnresolvedTrack,
  UnresolvedVideoTrack,
  VideoTrack,
} from '../types';
import { matchTag, parseByteRange, parseExtInfDuration } from './parse-attributes';
import { resolveUrl } from './resolve-url';

/**
 * Resolve unresolved track type to its resolved equivalent.
 */
type ResolveTrack<T> = T extends UnresolvedVideoTrack
  ? VideoTrack
  : T extends UnresolvedAudioTrack
    ? AudioTrack
    : T extends UnresolvedTextTrack
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
export function parseMediaPlaylist<T extends UnresolvedTrack>(text: string, unresolved: T): ResolveTrack<T> {
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

  // Generic resolution: All type-specific fields already on unresolved track from P1
  // Just add parsed properties (duration, segments, initialization, baseUrl)
  return {
    ...unresolved,
    baseUrl: unresolved.url,
    duration: totalDuration,
    segments,
    initialization,
    // Fill in optional fields with defaults only where needed
    ...(unresolved.type === 'video' && {
      width: unresolved.width ?? 0,
      height: unresolved.height ?? 0,
      frameRate: unresolved.frameRate ?? { frameRateNumerator: 30 },
    }),
  } as unknown as ResolveTrack<T>;
}
