/**
 * The seam `resolve-track` uses to report conditions discovered in a freshly
 * parsed media playlist.
 *
 * Injected rather than baked in so `resolve-track` stays free of format and
 * policy knowledge: it parses and commits, and whatever the composition wants
 * noticed about the result is this function's business. Which conditions matter,
 * and which codes they carry, therefore vary per composition — a provider that
 * never ships MPEG-TS can drop that check, and future playlist-derived notices
 * (LL-HLS or DVR support that's partial rather than absent) attach here without
 * touching the resolver.
 *
 * Reported **per rendition, as it resolves**, which is why these are causes and
 * not verdicts: one rendition being unplayable doesn't make the source
 * unplayable. The verdict is `track-switching`'s, which reports
 * `SVTA_NO_SUPPORTED_{VIDEO,AUDIO}_TRACK` when a type's candidates actually
 * empty. Keeping the two apart is what lets a mixed source — some renditions
 * encrypted or MPEG-TS, others playable — log its causes and still play.
 */
import {
  SVTA_UNSUPPORTED_AUDIO_FORMAT,
  SVTA_UNSUPPORTED_DRM_SYSTEM,
  SVTA_UNSUPPORTED_VIDEO_FORMAT,
  type SvtaError,
} from '../../media/errors';
import { NON_FMP4_CONTAINER_MIMES } from '../../media/hls/parse-media-playlist';
import { getMediaPlaylistMetadata, type ResolvedTrack, type TrackType } from '../../media/types';

/**
 * Conditions worth reporting about a just-resolved track. Return an empty array
 * (or omit the seam) to report nothing.
 */
export type ReportTrackConditions = (track: ResolvedTrack) => readonly SvtaError[];

/** Unsupported-format code per type; text has none — absent captions aren't a failure. */
const UNSUPPORTED_FORMAT_CODE: Partial<Record<TrackType, number>> = {
  video: SVTA_UNSUPPORTED_VIDEO_FORMAT,
  audio: SVTA_UNSUPPORTED_AUDIO_FORMAT,
};

/**
 * The default: report what makes a rendition unplayable *to this engine* — a
 * container MSE can't accept, or encryption with no decryption pipeline. Both
 * mirror what `canPlayTrack` prunes on, so a reported cause always has a
 * corresponding exclusion.
 */
export const reportUnsupportedTrackConditions: ReportTrackConditions = (track) => {
  const conditions: SvtaError[] = [];
  const formatCode = UNSUPPORTED_FORMAT_CODE[track.type];
  if (formatCode !== undefined && NON_FMP4_CONTAINER_MIMES.has(track.mimeType)) {
    conditions.push({ code: formatCode, data: { trackId: track.id, mimeType: track.mimeType } });
  }
  if (getMediaPlaylistMetadata(track)?.encrypted) {
    conditions.push({ code: SVTA_UNSUPPORTED_DRM_SYSTEM, data: { trackId: track.id } });
  }
  return conditions;
};
