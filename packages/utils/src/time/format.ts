import { isNumber } from '../predicate/predicate';

export type TimeFormatOptions = {
  /** BCP 47 tag(s) for {@link Intl.DurationFormat}. */
  locale?: string | string[];
  /** Called only when `seconds` is negative; formats the localized remaining-time phrase for the duration body. */
  formatRemaining?: (duration: string) => string;
  /** Passed to `Intl.DurationFormat`; defaults to `"long"`. */
  style?: 'long' | 'short' | 'narrow' | 'digital';
};

type DurationRecord = Partial<{ hours: number; minutes: number; seconds: number }>;

type DurationFormatConstructor = new (
  locales?: string | string[],
  options?: { style?: TimeFormatOptions['style']; hoursDisplay?: 'auto' | 'always' }
) => { format: (duration: DurationRecord) => string };

const DurationFormat = (Intl as typeof Intl & { DurationFormat: DurationFormatConstructor }).DurationFormat;

const durationFormatters = new Map<string, InstanceType<typeof DurationFormat>>();

function localeCacheKey(locale?: string | string[]): string {
  if (locale === undefined) return '';
  return Array.isArray(locale) ? locale.join(':') : locale;
}

function isEnglishLocale(locale?: string | string[]): boolean {
  const tag = Array.isArray(locale) ? locale[0] : locale;
  if (!tag) return true;
  return tag === 'en' || tag.startsWith('en-');
}

function getDurationFormatter(
  locale?: string | string[],
  style: NonNullable<TimeFormatOptions['style']> = 'long',
  hoursDisplay?: 'auto' | 'always'
): InstanceType<typeof DurationFormat> {
  const key = `${localeCacheKey(locale)}:${style}:${hoursDisplay ?? ''}`;
  let formatter = durationFormatters.get(key);
  if (!formatter) {
    const options = hoursDisplay === undefined ? { style } : { style, hoursDisplay };
    formatter = new DurationFormat(locale, options);
    durationFormatters.set(key, formatter);
  }
  return formatter;
}

function isValidTime(value: number): boolean {
  return isNumber(value) && Number.isFinite(value);
}

/**
 * Format seconds to digital display string.
 *
 * @param seconds - Time in seconds (can be negative)
 * @param guide - Guide time (typically duration) to determine display format
 * @returns Formatted string like "1:30" or "1:05:30"
 *
 * @example
 * formatTime(90) // "1:30"
 * formatTime(3661) // "1:01:01"
 * formatTime(35, 3600) // "0:00:35" (guided by 1-hour duration)
 * formatTime(35, 600) // "00:35" (guided by 10-minute duration)
 */
export function formatTime(seconds: number, guide?: number): string {
  if (!isValidTime(seconds)) {
    return '0:00';
  }

  const negative = seconds < 0;
  const positiveSeconds = Math.abs(seconds);
  const totalSeconds = Math.floor(positiveSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secondsPart = totalSeconds % 60;

  const guideSeconds = isValidTime(guide ?? 0) ? Math.abs(guide ?? 0) : 0;
  const guideHours = Math.floor(guideSeconds / 3600);
  const guideMinutes = Math.floor((guideSeconds / 60) % 60);

  const showHours = hours > 0 || guideHours > 0;
  const padMinutes = showHours || guideMinutes >= 10;

  const duration = showHours ? { hours, minutes, seconds: secondsPart } : { minutes, seconds: secondsPart };
  let body = getDurationFormatter('en', 'digital', showHours ? 'always' : 'auto').format(duration);

  if (!padMinutes) {
    body = body.replace(/^0(?=\d:)/, '');
  }

  return `${negative ? '-' : ''}${body}`;
}

/**
 * Convert seconds to ISO 8601 duration for datetime attribute.
 *
 * @param seconds - Time in seconds
 * @returns ISO 8601 duration string like "PT1M30S"
 *
 * @example
 * secondsToIsoDuration(90) // "PT1M30S"
 * secondsToIsoDuration(3661) // "PT1H1M1S"
 */
export function secondsToIsoDuration(seconds: number): string {
  if (!isValidTime(seconds)) {
    return 'PT0S';
  }

  const positiveSeconds = Math.abs(seconds);

  const h = Math.floor(positiveSeconds / 3600);
  const m = Math.floor((positiveSeconds / 60) % 60);
  const s = Math.floor(positiveSeconds % 60);

  let duration = 'PT';
  if (h > 0) duration += `${h}H`;
  if (m > 0) duration += `${m}M`;
  if (s > 0 || duration === 'PT') duration += `${s}S`;

  return duration;
}

/**
 * Human-readable duration using {@link Intl.DurationFormat}.
 *
 * Negative `seconds` denote remaining time: the absolute value is formatted, then wrapped in a
 * localized phrase via {@link TimeFormatOptions.formatRemaining}; otherwise `{duration} remaining`.
 */
export function formatTimeAsPhrase(seconds: number, options?: TimeFormatOptions): string {
  if (!isValidTime(seconds)) {
    return '';
  }

  const negative = seconds < 0;
  const positiveSeconds = Math.abs(seconds);
  const totalSeconds = Math.floor(positiveSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secondsPart = totalSeconds % 60;

  const record: DurationRecord = {};
  if (hours > 0) record.hours = hours;
  if (minutes > 0) record.minutes = minutes;
  if (secondsPart > 0 || (hours === 0 && minutes === 0)) record.seconds = secondsPart;

  const body = getDurationFormatter(options?.locale, options?.style ?? 'long').format(record);

  if (negative) {
    const formatRemaining = options?.formatRemaining;
    if (formatRemaining) return formatRemaining(body);
    if (isEnglishLocale(options?.locale)) return `${body} remaining`;
    return body;
  }

  return body;
}
