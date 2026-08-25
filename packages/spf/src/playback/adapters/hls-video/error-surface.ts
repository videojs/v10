/**
 * The shared half of promoting reported conditions onto a media surface.
 *
 * Every adapter that has one does the same things: pick the first condition it treats as fatal, latch it so a later
 * append doesn't re-fire, and name a better-equipped Media when its own class points at one. Only the _policy_ differs
 * — which codes are fatal, which the video, audio-only, and background adapters each answer differently — so that stays
 * with each adapter and everything else lives here.
 *
 * `firstFatal` is the part all three share. The `ErrorLike` mapping below it is for the two that feed a store and a
 * dialog; the background adapter surfaces the reported condition unmapped, so it takes the picker and nothing else.
 *
 * See `internal/design/spf/features/errors.md` for the causes-vs-verdicts split this rests on.
 */
import type { ErrorLike } from '@videojs/media';

import {
  SVTA_UNSUPPORTED_AUDIO_FORMAT,
  SVTA_UNSUPPORTED_DRM_SYSTEM,
  SVTA_UNSUPPORTED_VIDEO_FORMAT,
  type SvtaError,
} from '../../../media/errors';

/**
 * The error shape a media surface exposes: `@videojs/media`'s {@link ErrorLike} plus the reporter context the engine
 * carries alongside a condition.
 *
 * `code` is the **SVTA code**, not a `MediaError.MEDIA_ERR_*` value. Consumers that map codes to copy currently only
 * know 1–5, so an SVTA code falls through to showing `message`; an extensible code lookup above the engine is the
 * follow-up that fixes it.
 */
export interface HlsVideoMediaError extends ErrorLike {
  /** Reporter context (which selection emptied, which track, …). */
  readonly data?: unknown;
}

/**
 * `message`, plus the alternative-Media sentence when `media`'s class names one.
 *
 * Read off the class rather than passed in so a subclass can point at a better-equipped sibling — the SPF Mux Medias
 * name the hls.js-backed one, which plays the MPEG-TS and DRM sources SPF doesn't — without either adapter knowing that
 * sibling exists.
 */
export function withAlternativeMediaSuggestion(message: string, media: object): string {
  const { alternativeMediaSuggestion } = media.constructor as { alternativeMediaSuggestion?: string };
  const suggestion = alternativeMediaSuggestion?.trim();

  return suggestion ? `${message} ${suggestion}` : message;
}

/** The first condition `fatalCodes` covers — the root cause, not its consequences. */
export function firstFatal(
  errors: readonly SvtaError[] | undefined,
  fatalCodes: ReadonlySet<number>
): SvtaError | undefined {
  return errors?.find((error) => fatalCodes.has(error.code));
}

/**
 * The causes that mean the engine has no pipeline for what the source delivers — a container it can't append, or
 * encryption it can't decrypt.
 *
 * What these have in common is that no retry, no other CDN, and no other rendition of the same source fixes them: the
 * source needs a capability this engine doesn't have. That's the distinction the surfaced code exists to draw, and it's
 * why the set is these three rather than "every cause".
 */
const UNSUPPORTED_FEATURE_CAUSES: ReadonlySet<number> = new Set<number>([
  SVTA_UNSUPPORTED_VIDEO_FORMAT,
  SVTA_UNSUPPORTED_AUDIO_FORMAT,
  SVTA_UNSUPPORTED_DRM_SYSTEM,
]);

/**
 * Whether anything in the sequence is a cause of the "we don't implement this" kind.
 *
 * Deliberately `some` over the whole sequence rather than a per-type match against the verdict. A verdict means one
 * type's candidates emptied, but the _reason_ the source is unplayable can sit on another type — an audio-only source
 * whose sole rendition is encrypted empties the audio candidates, and a video source with encrypted video empties the
 * video ones. Both are the same answer to the viewer, so both get the same code.
 */
export function hasUnsupportedFeatureCause(errors: readonly SvtaError[] | undefined): boolean {
  return errors?.some((error) => UNSUPPORTED_FEATURE_CAUSES.has(error.code)) ?? false;
}
