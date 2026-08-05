/**
 * Baseline viewer-facing copy for the conditions this engine reports.
 *
 * All of it in one place, composed at two different points because that's where
 * the facts are. A **cause** is composed by the reporter, which has the
 * rendition in hand and can therefore name the actual container. A **verdict**
 * is composed at the adapter, which knows only that a type's candidates emptied
 * — so it either reuses a cause's copy (where they agree) or says the generic
 * thing, because nothing more specific is available to it.
 *
 * Two rules the previous copy broke:
 *
 * - **Name the player, not the browser.** The browser can play both things this
 *   engine refuses — Safari plays MPEG-TS natively, and EME plays DRM. "This
 *   browser can't play it" was false, and it sent a viewer off to try a
 *   different browser that would behave identically.
 * - **Say what specifically isn't supported.** A verdict only reports that
 *   nothing was selectable. Where the causes agree, they can name the container
 *   or the protection, which is the difference between copy a viewer can act on
 *   and copy that only says "no".
 *
 * Baseline, not final: this is unlocalized English shipped from inside the
 * engine. Replacing it with an extensible code lookup above the engine — which
 * fixes localization and this layering at once — is a tracked follow-up in
 * `internal/design/spf/features/errors.md`.
 */
import {
  SVTA_NO_SUPPORTED_AUDIO_TRACK,
  SVTA_NO_SUPPORTED_VIDEO_TRACK,
  SVTA_UNSUPPORTED_AUDIO_FORMAT,
  SVTA_UNSUPPORTED_DRM_SYSTEM,
  SVTA_UNSUPPORTED_VIDEO_FORMAT,
} from '../../media/errors';
import { MPEG_TS_MIME, RAW_AAC_MIME } from '../../media/hls/parse-media-playlist';
import type { TrackType } from '../../media/types';

/**
 * Subject used when the composition hasn't said what it's called. Phrased to
 * read as the sentence subject it becomes, so an unconfigured engine still
 * produces a grammatical sentence.
 *
 * Whatever a composition passes instead appears verbatim, so it has to read as
 * prose ("Mux Player"), not as an identifier ("mux-video").
 */
export const DEFAULT_PLAYER_SOFTWARE_NAME = 'This player';

/** Viewer-facing noun per track type, as it reads mid-sentence. */
const TRACK_NOUNS: Readonly<Record<TrackType, string>> = {
  video: 'video',
  audio: 'audio',
  text: 'subtitles',
};

/**
 * Viewer-facing names for the containers `canPlayTrack` refuses, keyed by the
 * MIME the parser assigns.
 *
 * Deliberately not derived from the MIME string: `video/mp2t` reads as "MPEG-TS"
 * to a person, and `audio/aac` here means specifically *raw ADTS* AAC — AAC in
 * fMP4 plays fine, so calling it plain "AAC" would tell a viewer their audio
 * codec is unsupported when it isn't.
 */
const CONTAINER_LABELS: Readonly<Record<string, string>> = {
  [MPEG_TS_MIME]: 'MPEG-TS',
  [RAW_AAC_MIME]: 'raw AAC',
};

/**
 * Copy for a per-rendition cause.
 *
 * `mimeType` is what buys the specificity: the format codes cover every non-fMP4
 * container, not just MPEG-TS, so the container is named only when it's
 * recognized and drops to the generic phrasing otherwise. A caller with no MIME
 * in hand — the adapter, reconstructing copy for a cause the reporter left bare
 * — gets that generic form, which is correct rather than merely degraded.
 *
 * Returns `undefined` for codes with no viewer-facing copy, so a caller can tell
 * "nothing to say here" from "say this".
 */
export function causeMessage(
  code: number,
  track: { type: TrackType; mimeType?: string },
  playerSoftwareName: string = DEFAULT_PLAYER_SOFTWARE_NAME
): string | undefined {
  const noun = TRACK_NOUNS[track.type];

  if (code === SVTA_UNSUPPORTED_VIDEO_FORMAT || code === SVTA_UNSUPPORTED_AUDIO_FORMAT) {
    const container = track.mimeType === undefined ? undefined : CONTAINER_LABELS[track.mimeType];
    return container
      ? `${playerSoftwareName} can’t play ${container} ${noun}.`
      : `${playerSoftwareName} can’t play this ${noun}’s format.`;
  }

  if (code === SVTA_UNSUPPORTED_DRM_SYSTEM) {
    return `${playerSoftwareName} can’t play DRM-protected ${noun}.`;
  }

  return undefined;
}

/**
 * Copy for a verdict on its own — no causes, or causes that don't agree. Stays
 * generic because that's the honest ceiling: a type whose renditions were
 * refused for *different* reasons has no single explanation, and naming either
 * would describe the source wrongly.
 */
export const VERDICT_MESSAGES: Readonly<Record<number, (playerSoftwareName: string) => string>> = {
  [SVTA_NO_SUPPORTED_VIDEO_TRACK]: (name) => `${name} can’t play this video’s format.`,
  [SVTA_NO_SUPPORTED_AUDIO_TRACK]: (name) => `${name} can’t play this audio’s format.`,
};
