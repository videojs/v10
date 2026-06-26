/**
 * WebVTT-in-HLS `X-TIMESTAMP-MAP`: correlates a cue's LOCAL (in-file) time with
 * an MPEG-2 presentation timestamp, so LOCAL-authored cues can be placed on the
 * media presentation timeline. Stored raw — the LOCAL→native correction is
 * `mpegts / 90000 - local` — so it stays independent of how (or whether) the
 * presentation is later re-origined. See the HLS spec, RFC 8216bis §3.5.
 */
export interface TimestampMap {
  /** The MPEG-2 presentation timestamp, in 90 kHz ticks, as authored. */
  mpegts: number;
  /** The LOCAL cue time the `mpegts` value maps to, in seconds. */
  local: number;
}

const TIMESTAMP_MAP_PREFIX = 'X-TIMESTAMP-MAP=';

/**
 * Scrape a WebVTT segment's `X-TIMESTAMP-MAP` header into a {@link TimestampMap}
 * — the only header line we need to correlate LOCAL cue times with the media
 * presentation timeline. Deliberately *not* a WebVTT parser: cue parsing stays
 * with the browser's native `<track>` parser (which drops this line); this reads
 * just the one header field the native path discards.
 *
 * Returns `undefined` when the segment carries no map (e.g. cues already in
 * absolute presentation time) — per the HLS spec that means LOCAL 0 maps to
 * MPEGTS 0. Tolerant of attribute order and `[HH:]MM:SS.mmm` LOCAL forms.
 */
export function parseVttTimestampMap(text: string): TimestampMap | undefined {
  const timestampMapLine = text.split(/\r\n|\r|\n/).find((line) => line.startsWith(TIMESTAMP_MAP_PREFIX));
  return timestampMapLine ? parseTimestampMapBody(timestampMapLine.slice(TIMESTAMP_MAP_PREFIX.length)) : undefined;
}

const TimeStampMapParserMap = {
  LOCAL: parseWebVttTimestamp,
  MPEGTS: (v: string) => +v,
} as const;

type TimeStampMapParserMap = typeof TimeStampMapParserMap;

function parseTimestampMapBody(body: string): TimestampMap | undefined {
  return Object.fromEntries(
    body.split(',').map((kvStr) => {
      const [k, v] = kvStr.split(/:(.*)/).map((kOrV) => kOrV.trim());
      return [k?.toLowerCase(), TimeStampMapParserMap[k as keyof TimeStampMapParserMap](v as string)];
    })
  ) as TimestampMap;
}

function parseWebVttTimestamp(value: string): number | undefined {
  const match = value.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})\.(\d{1,3})$/);
  if (!match) return undefined;
  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const millis = Number((match[4] ?? '').padEnd(3, '0'));
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}
