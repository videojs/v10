import { isNumber } from '../predicate/predicate';

const UNIT_LABELS = [
  { singular: 'hour', plural: 'hours' },
  { singular: 'minute', plural: 'minutes' },
  { singular: 'second', plural: 'seconds' },
] as const;

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
