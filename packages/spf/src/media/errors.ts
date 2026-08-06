/**
 * SVTA 2070 (Standardized Error Codes) — the vocabulary for identifying a
 * playback failure or notice, independent of how it's transported or who
 * decides what to do about it.
 *
 * A code is a single integer: the leading digit(s) are the **category** (the
 * error's domain) and the trailing three are the **index** (the specific error
 * within it). Four digits for natively-defined errors, five when an external
 * standard is embedded — `"03404"` is an HTTP 404 under the network category.
 * Categories are `0` unknown, `1` media content, `2` playback, `3` network,
 * `4` content protection, `5` accessibility, `6` remote play, `7` advertising,
 * `99` custom.
 *
 * Two properties of the spec shape the types here:
 *
 * - **Severity is deliberately not part of a code.** Per §Approach, "impact
 *   varies with player implementation, breaking the consistency of a specific
 *   error mapping to single code." So an error carries no fatal flag — whether a
 *   condition is fatal depends on the composition observing it, and is decided
 *   downstream.
 * - **Reporting is partial and stacked** (Principles 5–6). Errors are reported
 *   as encountered, most of them non-fatal, and the *sequence* carries causation
 *   a single value can't.
 *
 * See `internal/design/spf/features/errors.md`.
 */

/**
 * A reported condition, identified by its SVTA code.
 *
 * Named for the spec rather than the engine because the vocabulary is
 * format- and player-neutral. Not `MediaError` — that name belongs to the
 * `@videojs/media` DOM-facing class this eventually maps *onto*, and the mapping
 * is the point at which severity and user-facing text get decided.
 */
export interface SvtaError {
  /** The SVTA code — see {@link svtaCategory} / {@link svtaIndex}. */
  code: number;
  /** Engineer-facing detail. Optional; the code is the identity. */
  message?: string;
  /** Reporter-specific context (track type, url, the constraint that fired). */
  data?: unknown;
}

/** SVTA 1 [Media Content] 004 — the video is in a format we can't play (e.g. an MPEG-TS container). */
export const SVTA_UNSUPPORTED_VIDEO_FORMAT = 1004;

/** SVTA 1 [Media Content] 005 — the audio counterpart of {@link SVTA_UNSUPPORTED_VIDEO_FORMAT}. */
export const SVTA_UNSUPPORTED_AUDIO_FORMAT = 1005;

/**
 * SVTA 4 [Content Protection] 008 — unsupported or unavailable DRM system. Used
 * for "this source is encrypted and we have no decryption pipeline," which is
 * detection, not a license failure.
 */
export const SVTA_UNSUPPORTED_DRM_SYSTEM = 4008;

/**
 * SVTA 2 [Playback] 011 — no video track the environment can play. For a source
 * that *has* video renditions where every one was excluded as unplayable.
 */
export const SVTA_NO_SUPPORTED_VIDEO_TRACK = 2011;

/** SVTA 2 [Playback] 012 — the audio counterpart of {@link SVTA_NO_SUPPORTED_VIDEO_TRACK}. */
export const SVTA_NO_SUPPORTED_AUDIO_TRACK = 2012;

/**
 * SVTA 99 [Custom] 001 — this engine has no pipeline for something the source
 * requires, so the source is unplayable *here* rather than broken.
 *
 * Custom rather than standard because the standard codes available describe
 * either narrower or wider things. The causes (1004/1005 unsupported format,
 * 4008 unsupported DRM) say what one rendition hit; the verdicts (2011/2012 no
 * supported track) say a type emptied without saying why it's unfixable. And
 * 2039 "Manifest feature unsupported" covers features that are unsupported but
 * still *playable* — LL-HLS degrading to standard live is a 2039 — so
 * overloading it for a fatal condition would make it useless for the notices it
 * belongs on.
 *
 * Index `001`: the spec defines only `99000` (Unknown) for the custom category
 * and leaves the rest to the publisher, so this is the first code we define.
 *
 * Five digits, and deliberately not special-cased anywhere: {@link svtaCategory}
 * and {@link svtaIndex} decompose it correctly by arithmetic alone, because
 * every standard category is below `8000` and custom starts at `99000`.
 */
export const SVTA_UNSUPPORTED_PLAYBACK_FEATURE = 99001;

/**
 * The error's domain — `code / 1000`, per the spec's "divide by one thousand to
 * obtain the error category". Works uniformly across the four-digit native form
 * and the five-digit form embedding an external standard: `"03404"` is
 * numerically 3404, which decomposes identically. That also makes a numeric code
 * immune to the spec's inconsistent zero-padding (§Approach writes a
 * category-unknown network error as `"0300"` where the error index implies
 * category 3 / index 000).
 */
export function svtaCategory(code: number): number {
  return Math.floor(code / 1000);
}

/**
 * The specific error within its category — `code % 1000`. For a five-digit code
 * this is the embedded external value (an HTTP status, a VAST code).
 */
export function svtaIndex(code: number): number {
  return code % 1000;
}
