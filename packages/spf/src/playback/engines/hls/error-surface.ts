/**
 * The shared half of promoting reported conditions onto a media surface.
 *
 * Both HLS adapters do the same three things: pick the first condition they
 * treat as fatal, compose copy for it, and latch it so a later append doesn't
 * re-fire. Only the *policy* differs — which codes are fatal, which the video
 * adapter and the audio-only adapter answer differently — so that stays with
 * each adapter and everything else lives here.
 *
 * See `internal/design/spf/features/errors.md` for the causes-vs-verdicts split
 * this rests on.
 */
import { SVTA_NO_SUPPORTED_AUDIO_TRACK, SVTA_NO_SUPPORTED_VIDEO_TRACK, type SvtaError } from '../../../media/errors';
import { causeMessage, VERDICT_MESSAGES } from '../../primitives/error-messages';

/**
 * The error shape a media surface exposes — structurally compatible with
 * `@videojs/media`'s `ErrorLike` (`{ code, message }`) without importing it.
 * The dependency can't go that way: `@videojs/media` already depends on this
 * package. (That inversion is itself a known follow-up; structural
 * compatibility is the same approach `SimpleHlsMediaStreamType` takes.)
 *
 * `code` is the **SVTA code**, not a `MediaError.MEDIA_ERR_*` value. Consumers
 * that map codes to copy currently only know 1–5, so an SVTA code falls through
 * to showing `message`; an extensible code lookup above the engine is the
 * follow-up that fixes it.
 */
export interface SimpleHlsMediaError {
  readonly code: number;
  readonly message: string;
  /** Reporter context (which selection emptied, which track, …). */
  readonly data?: unknown;
}

/**
 * Codes `track-switching` reports when a type's candidate set empties — the
 * *verdicts*. Everything else in the sequence is a per-rendition cause.
 *
 * Deliberately separate from any adapter's fatal allow-list. The audio-only
 * adapter treats only the audio verdict as fatal, but a video verdict is still a
 * verdict rather than a cause, and reusing the fatal set to answer "is this a
 * cause?" would mistake one for the other.
 */
const VERDICT_CODES: ReadonlySet<number> = new Set<number>([
  SVTA_NO_SUPPORTED_VIDEO_TRACK,
  SVTA_NO_SUPPORTED_AUDIO_TRACK,
]);

/** The first condition `fatalCodes` covers — the root cause, not its consequences. */
export function firstFatal(
  errors: readonly SvtaError[] | undefined,
  fatalCodes: ReadonlySet<number>
): SvtaError | undefined {
  return errors?.find((error) => fatalCodes.has(error.code));
}

/** The `trackType` a reporter tagged a condition with, when it did. */
function causeTrackType(error: SvtaError): string | undefined {
  const data = error.data as { trackType?: unknown } | null | undefined;
  return typeof data?.trackType === 'string' ? data.trackType : undefined;
}

/**
 * Copy for `verdict`, preferring what its causes agree on.
 *
 * A cause carries its own `message`, composed by the reporter where the
 * rendition was in hand — that's the only place `mimeType` exists, so it's the
 * only place "MPEG-TS" can be named rather than "some format". Reuse it when
 * every cause said the *same* thing.
 *
 * Agreement has to be unanimous among the causes for the verdict's own track
 * type. A source with one encrypted rendition and one MPEG-TS rendition has no
 * single explanation, and picking either would tell a viewer something that
 * isn't true of the source as a whole — so a split falls back to the verdict's
 * own copy. Comparing the messages rather than the codes also covers causes that
 * share a code but named different containers (MPEG-TS audio alongside raw AAC
 * audio), which a code comparison would wrongly call unanimous.
 *
 * A cause with no message means a composition supplied its own reporter and left
 * copy out; the code and track type are still enough for the generic form, so
 * fall back to composing from those before falling back to the verdict's.
 */
export function resolveFatalMessage(
  verdict: SvtaError,
  errors: readonly SvtaError[] | undefined,
  playerSoftwareName: string
): string {
  const trackType = verdict.code === SVTA_NO_SUPPORTED_AUDIO_TRACK ? 'audio' : 'video';
  const causes = errors?.filter((error) => !VERDICT_CODES.has(error.code) && causeTrackType(error) === trackType);

  const first = causes?.[0];
  if (first && causes?.every((cause) => cause.code === first.code)) {
    if (first.message && causes.every((cause) => cause.message === first.message)) return first.message;

    const composed = causeMessage(first.code, { type: trackType }, playerSoftwareName);
    if (composed) return composed;
  }

  return VERDICT_MESSAGES[verdict.code]?.(playerSoftwareName) ?? '';
}
