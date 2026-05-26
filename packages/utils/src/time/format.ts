import { isNumber } from '../predicate/predicate';

export type TimeFormatOptions = {
  /** BCP 47 tag(s) for {@link Intl.DurationFormat} (and percent formatting where applicable). */
  locale?: string | string[];
  /** Called only when `seconds` is negative; formats the localized remaining-time phrase for the duration body. */
  formatRemaining?: (duration: string) => string;
  /** Passed to `Intl.DurationFormat`; defaults to `"long"`. */
  style?: 'long' | 'short' | 'narrow' | 'digital';
};

const UNIT_LABELS = [
  { singular: 'hour', plural: 'hours' },
  { singular: 'minute', plural: 'minutes' },
  { singular: 'second', plural: 'seconds' },
] as const;

type DurationFormatConstructor = new (
  locales?: string | string[],
  options?: { style?: TimeFormatOptions['style'] }
) => { format: (duration: object) => string };

const DurationFormat = (Intl as typeof Intl & { DurationFormat?: DurationFormatConstructor }).DurationFormat;

const percentFormatters = new Map<string, Intl.NumberFormat>();
const durationFormatters = new Map<string, InstanceType<NonNullable<typeof DurationFormat>>>();

function localeCacheKey(locale?: string | string[]): string {
  if (locale === undefined) return '';
  return Array.isArray(locale) ? locale.join('\0') : locale;
}

function isEnglishLocale(locale?: string | string[]): boolean {
  const tag = Array.isArray(locale) ? locale[0] : locale;
  if (!tag) return true;
  return tag === 'en' || tag.startsWith('en-');
}

function getPercentFormatter(locale?: string | string[]): Intl.NumberFormat | undefined {
  const key = localeCacheKey(locale);
  let formatter = percentFormatters.get(key);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
      percentFormatters.set(key, formatter);
    } catch {
      return undefined;
    }
  }
  return formatter;
}

function formatVolumePercentFallback(fraction: number): string {
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return `${percent}%`;
}

function getDurationFormatter(
  locale?: string | string[],
  style: NonNullable<TimeFormatOptions['style']> = 'long'
): InstanceType<NonNullable<typeof DurationFormat>> | undefined {
  if (!DurationFormat) return undefined;

  const key = `${localeCacheKey(locale)}\0${style}`;
  let formatter = durationFormatters.get(key);
  if (!formatter) {
    try {
      formatter = new DurationFormat(locale, { style });
      durationFormatters.set(key, formatter);
    } catch {
      return undefined;
    }
  }
  return formatter;
}

function isValidTime(value: number): boolean {
  return isNumber(value) && Number.isFinite(value);
}

function toTimeUnitPhrase(value: number, unitIndex: number): string {
  const label = value === 1 ? UNIT_LABELS[unitIndex]?.singular : UNIT_LABELS[unitIndex]?.plural;
  return `${value} ${label}`;
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

  const h = Math.floor(positiveSeconds / 3600);
  const m = Math.floor((positiveSeconds / 60) % 60);
  const s = Math.floor(positiveSeconds % 60);

  const guideAbs = guide ? Math.abs(guide) : 0;
  const gh = Math.floor(guideAbs / 3600);
  const gm = Math.floor((guideAbs / 60) % 60);

  const showHours = h > 0 || gh > 0;
  // Add leading zero to minutes if hours showing OR guide minutes >= 10
  const padMinutes = showHours || gm >= 10;

  const hoursStr = showHours ? `${h}:` : '';
  const minutesStr = `${padMinutes && m < 10 ? '0' : ''}${m}:`;
  const secondsStr = s < 10 ? `0${s}` : `${s}`;

  return `${negative ? '-' : ''}${hoursStr}${minutesStr}${secondsStr}`;
}

/**
 * Format seconds to human-readable phrase for screen readers.
 *
 * @param seconds - Time in seconds (negative indicates remaining)
 * @returns Human-readable phrase like "1 minute, 30 seconds"
 *
 * @example
 * formatTimeAsPhrase(90) // "1 minute, 30 seconds"
 * formatTimeAsPhrase(3661) // "1 hour, 1 minute, 1 second"
 * formatTimeAsPhrase(-270) // "4 minutes, 30 seconds remaining"
 */
export function formatTimeAsPhrase(seconds: number): string {
  if (!isValidTime(seconds)) {
    return '';
  }

  const negative = seconds < 0;
  const positiveSeconds = Math.abs(seconds);

  const h = Math.floor(positiveSeconds / 3600);
  const m = Math.floor((positiveSeconds / 60) % 60);
  const s = Math.floor(positiveSeconds % 60);

  if (positiveSeconds === 0) {
    return `${toTimeUnitPhrase(0, 2)}${negative ? ' remaining' : ''}`;
  }

  const parts = [h, m, s].map((value, index) => (value > 0 ? toTimeUnitPhrase(value, index) : null)).filter(Boolean);

  const phrase = parts.join(', ');
  const suffix = negative ? ' remaining' : '';

  return `${phrase}${suffix}`;
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
 * Human-readable duration using {@link Intl.DurationFormat} when available.
 *
 * Negative `seconds` denote remaining time: the absolute value is formatted, then wrapped in a
 * localized phrase via {@link TimeFormatOptions.formatRemaining}; otherwise `{duration} remaining`.
 */
export function formatDuration(seconds: number, options?: TimeFormatOptions): string {
  if (!isValidTime(seconds)) {
    return '';
  }

  const negative = seconds < 0;
  const positiveSeconds = Math.abs(seconds);
  const totalSeconds = Math.floor(positiveSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secondsPart = totalSeconds % 60;

  const record: Partial<{ hours: number; minutes: number; seconds: number }> = {};
  if (hours > 0) record.hours = hours;
  if (minutes > 0) record.minutes = minutes;
  if (secondsPart > 0 || (hours === 0 && minutes === 0)) record.seconds = secondsPart;

  let body: string;
  try {
    const durationFormatter = getDurationFormatter(options?.locale, options?.style ?? 'long');
    if (durationFormatter) {
      body = durationFormatter.format(record);
    } else {
      body = formatTimeAsPhrase(positiveSeconds);
    }
  } catch {
    body = formatTimeAsPhrase(positiveSeconds);
  }

  // Some ICU builds return an empty string for a zero-length duration; fall back to the phrase formatter.
  if (!body.trim()) {
    body = formatTimeAsPhrase(positiveSeconds);
  }

  if (negative) {
    const formatRemaining = options?.formatRemaining;
    if (formatRemaining) return formatRemaining(body);
    if (isEnglishLocale(options?.locale)) return `${body} remaining`;
    return body;
  }

  return body;
}

/** Format a volume fraction (0–1) with {@link Intl.NumberFormat} `style: "percent"`. */
export function formatVolumePercent(fraction: number, locale?: string | string[]): string {
  const value = !isNumber(fraction) || !Number.isFinite(fraction) ? 0 : Math.min(1, Math.max(0, fraction));

  try {
    const formatter = getPercentFormatter(locale) ?? getPercentFormatter(undefined);
    if (formatter) {
      return formatter.format(value);
    }
  } catch {
    // fall through to simple percent string
  }

  return formatVolumePercentFallback(value);
}
