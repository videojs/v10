/**
 * Checks if a value is a valid number (not NaN, null, undefined, or Infinity)
 */
function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

const UnitLabels = [
  {
    singular: 'hour',
    plural: 'hours',
  },
  {
    singular: 'minute',
    plural: 'minutes',
  },
  {
    singular: 'second',
    plural: 'seconds',
  },
] as const;

function toTimeUnitPhrase(timeUnitValue: number, unitIndex: number): string {
  const unitLabel = timeUnitValue === 1 ? UnitLabels[unitIndex]?.singular : UnitLabels[unitIndex]?.plural;

  return `${timeUnitValue} ${unitLabel}`;
}

/**
 * Converts numeric seconds into a human-readable phrase for accessibility.
 *
 * @param seconds - A (positive or negative) time, represented as seconds
 * @returns The time, represented as a phrase of hours, minutes, and seconds
 *
 * @example
 * formatAsTimePhrase(3661) // "1 hour, 1 minute, 1 second"
 * formatAsTimePhrase(90) // "1 minute, 30 seconds"
 * formatAsTimePhrase(-30) // "30 seconds remaining"
 */
export function formatAsTimePhrase(seconds: number): string {
  if (!isValidNumber(seconds)) return '';

  const positiveSeconds = Math.abs(seconds);
  const negative = positiveSeconds !== seconds;
  const secondsDateTime = new Date(0, 0, 0, 0, 0, positiveSeconds, 0);
  const timeParts = [secondsDateTime.getHours(), secondsDateTime.getMinutes(), secondsDateTime.getSeconds()];

  const timeString = timeParts
    // Convert non-0 values to a string of the value plus its unit
    .map((timeUnitValue, index) => timeUnitValue && toTimeUnitPhrase(timeUnitValue, index))
    // Ignore/exclude any 0 values
    .filter(x => x)
    // join into a single comma-separated string phrase
    .join(', ');

  // If the time was negative, assume it represents some remaining amount of time/"count down".
  const negativeSuffix = negative ? ' remaining' : '';

  return `${timeString}${negativeSuffix}`;
}

/**
 * Converts a time, in numeric seconds, to a formatted string representation
 * of the form [HH:[MM:]]SS, where hours and minutes are optional, either
 * based on the value of `seconds` or (optionally) based on the value of `guide`.
 *
 * @param seconds - The total time you'd like formatted, in seconds
 * @param guide - A number in seconds that represents how many units you'd want
 *   to show. This ensures consistent formatting between e.g. 35s and 4834s.
 * @returns A string representation of the time, with expected units
 *
 * @example
 * formatTime(90) // "1:30"
 * formatTime(3661) // "1:01:01"
 * formatTime(35, 3600) // "0:35" (guided by 1-hour duration)
 * formatTime(NaN) // "0:00"
 * formatTime(Infinity) // "0:00"
 */
export function formatTime(seconds: number, guide?: number): string {
  // Handle negative values
  let negative = false;

  if (seconds < 0) {
    negative = true;
    seconds = 0 - seconds;
  }

  seconds = seconds < 0 ? 0 : seconds;

  let s: number | string = Math.floor(seconds % 60);
  let m: number | string = Math.floor((seconds / 60) % 60);
  let h: number | string = Math.floor(seconds / 3600);

  const gm = guide ? Math.floor((guide / 60) % 60) : 0;
  const gh = guide ? Math.floor(guide / 3600) : 0;

  // Handle invalid times
  if (Number.isNaN(seconds) || seconds === Infinity) {
    // '-' is false for all relational operators (e.g. <, >=) so this setting
    // will add the minimum number of fields specified by the guide
    h = m = s = '0';
  }

  // Check if we need to show hours
  const showHours = (h as number) > 0 || gh > 0;
  const hoursString = showHours ? `${h}:` : '';

  // If hours are showing, we may need to add a leading zero.
  // Always show at least one digit of minutes.
  const minutesString = `${(showHours || gm >= 10) && (m as number) < 10 ? `0${m}` : m}:`;

  // Check if leading zero is needed for seconds
  const secondsString = (s as number) < 10 ? `0${s}` : s;

  return (negative ? '-' : '') + hoursString + minutesString + secondsString;
}

/**
 * Formats a time value with fallback handling for invalid values.
 *
 * @param time - The time value to format in seconds (duration, currentTime, etc.)
 * @param guide - Optional guide time for consistent formatting
 * @param fallback - Fallback text when time is invalid (default: "--:--")
 * @returns Formatted time string or fallback
 */
export function formatDisplayTime(time: unknown, guide?: number, fallback: string = '--:--'): string {
  if (!isValidNumber(time)) {
    return fallback;
  }
  return formatTime(time, guide);
}
