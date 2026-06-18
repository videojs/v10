import { describe, expect, it } from 'vitest';

import { formatDuration, formatTime, formatTimeAsPhrase, formatVolumePercent, secondsToIsoDuration } from '../format';

describe('formatTime', () => {
  it('formats seconds only', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(30)).toBe('0:30');
    expect(formatTime(59)).toBe('0:59');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(125)).toBe('2:05');
    expect(formatTime(599)).toBe('9:59');
    expect(formatTime(600)).toBe('10:00');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatTime(3600)).toBe('1:00:00');
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(7325)).toBe('2:02:05');
    expect(formatTime(36000)).toBe('10:00:00');
  });

  it('pads minutes when hours are shown', () => {
    expect(formatTime(3605)).toBe('1:00:05');
    expect(formatTime(3660)).toBe('1:01:00');
  });

  it('handles negative values', () => {
    expect(formatTime(-90)).toBe('-1:30');
    expect(formatTime(-3661)).toBe('-1:01:01');
  });

  it('uses guide to determine hour display', () => {
    expect(formatTime(35, 3600)).toBe('0:00:35');
    expect(formatTime(90, 7200)).toBe('0:01:30');
  });

  it('pads minutes when guide minutes >= 10', () => {
    // 10 minute guide (600s) should pad minutes for consistent width
    expect(formatTime(35, 600)).toBe('00:35');
    expect(formatTime(5, 600)).toBe('00:05');
    expect(formatTime(65, 600)).toBe('01:05');
    // 9 minute guide should not pad
    expect(formatTime(35, 540)).toBe('0:35');
  });

  it('handles invalid values', () => {
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
    expect(formatTime(-Infinity)).toBe('0:00');
  });
});

describe('formatTimeAsPhrase', () => {
  it('formats zero seconds', () => {
    expect(formatTimeAsPhrase(0)).toBe('0 seconds');
  });

  it('formats seconds only', () => {
    expect(formatTimeAsPhrase(1)).toBe('1 second');
    expect(formatTimeAsPhrase(30)).toBe('30 seconds');
  });

  it('formats minutes and seconds', () => {
    expect(formatTimeAsPhrase(60)).toBe('1 minute');
    expect(formatTimeAsPhrase(90)).toBe('1 minute, 30 seconds');
    expect(formatTimeAsPhrase(125)).toBe('2 minutes, 5 seconds');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatTimeAsPhrase(3600)).toBe('1 hour');
    expect(formatTimeAsPhrase(3661)).toBe('1 hour, 1 minute, 1 second');
    expect(formatTimeAsPhrase(7325)).toBe('2 hours, 2 minutes, 5 seconds');
  });

  it('handles singular vs plural', () => {
    expect(formatTimeAsPhrase(1)).toBe('1 second');
    expect(formatTimeAsPhrase(2)).toBe('2 seconds');
    expect(formatTimeAsPhrase(60)).toBe('1 minute');
    expect(formatTimeAsPhrase(120)).toBe('2 minutes');
    expect(formatTimeAsPhrase(3600)).toBe('1 hour');
    expect(formatTimeAsPhrase(7200)).toBe('2 hours');
  });

  it('adds remaining suffix for negative values', () => {
    expect(formatTimeAsPhrase(-30)).toBe('30 seconds remaining');
    expect(formatTimeAsPhrase(-90)).toBe('1 minute, 30 seconds remaining');
    expect(formatTimeAsPhrase(-3661)).toBe('1 hour, 1 minute, 1 second remaining');
  });

  it('handles invalid values', () => {
    expect(formatTimeAsPhrase(NaN)).toBe('');
    expect(formatTimeAsPhrase(Infinity)).toBe('');
  });
});

describe('formatDuration', () => {
  it('formats positive duration', () => {
    expect(formatDuration(90)).toContain('1');
    expect(formatDuration(90)).toMatch(/minute/i);
    expect(formatDuration(90)).toMatch(/30/);
    expect(formatDuration(300)).toMatch(/5/);
    expect(formatDuration(300)).toMatch(/minute/i);
  });

  it('adds remaining suffix for negative seconds', () => {
    expect(formatDuration(-30)).toMatch(/30/);
    expect(formatDuration(-30)).toMatch(/remaining$/i);
  });

  it('uses formatRemaining only for negative durations', () => {
    expect(formatDuration(-30, { formatRemaining: (duration) => `quedan ${duration}` })).toMatch(/^quedan /);
    expect(formatDuration(-30, { formatRemaining: (duration) => `quedan ${duration}` })).toMatch(/30/);
    expect(formatDuration(90, { formatRemaining: () => 'should-not-appear' })).toBe(formatDuration(90));
  });

  it('omits English remaining suffix for non-English locales without formatRemaining', () => {
    const formatted = formatDuration(-30, { locale: 'es' });
    expect(formatted).toMatch(/30/);
    expect(formatted).not.toMatch(/remaining$/i);
  });

  it('uses Intl.DurationFormat when supported; otherwise matches formatTimeAsPhrase', () => {
    const DurationFormatConstructor = (Intl as typeof Intl & { DurationFormat?: unknown }).DurationFormat;
    const hasDurationFormat = typeof DurationFormatConstructor === 'function';
    const phrase = formatTimeAsPhrase(125);
    if (hasDurationFormat) {
      const en = formatDuration(125, { locale: 'en' });
      const de = formatDuration(125, { locale: 'de' });
      expect(en.length).toBeGreaterThan(0);
      expect(de.length).toBeGreaterThan(0);
      expect(en).not.toBe(de);
    } else {
      expect(formatDuration(125, { locale: 'en' })).toBe(phrase);
      expect(formatDuration(125, { locale: 'ja' })).toBe(phrase);
    }
  });

  it('handles invalid values', () => {
    expect(formatDuration(NaN)).toBe('');
    expect(formatDuration(Infinity)).toBe('');
  });

  it('falls back to formatTimeAsPhrase when locale is invalid', () => {
    const phrase = formatTimeAsPhrase(90);
    expect(formatDuration(90, { locale: 'not-a-valid-bcp47-tag!!!' })).toBe(phrase);
  });
});

describe('formatVolumePercent', () => {
  it('uses Intl percent style', () => {
    expect(formatVolumePercent(0.75)).toMatch(/75/);
    expect(formatVolumePercent(0.75)).toMatch(/%/);
  });

  it('clamps to 0–100%', () => {
    expect(formatVolumePercent(-1)).toBe(formatVolumePercent(0));
    expect(formatVolumePercent(2)).toBe(formatVolumePercent(1));
  });

  it('handles invalid fraction', () => {
    expect(formatVolumePercent(Number.NaN)).toMatch(/0/);
    expect(formatVolumePercent(Number.NaN)).toMatch(/%/);
  });

  it('falls back when locale is invalid', () => {
    expect(formatVolumePercent(0.75, 'not-a-invalid-bcp47-tag!!!')).toBe('75%');
  });
});

describe('secondsToIsoDuration', () => {
  it('formats seconds only', () => {
    expect(secondsToIsoDuration(0)).toBe('PT0S');
    expect(secondsToIsoDuration(30)).toBe('PT30S');
  });

  it('formats minutes and seconds', () => {
    expect(secondsToIsoDuration(60)).toBe('PT1M');
    expect(secondsToIsoDuration(90)).toBe('PT1M30S');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(secondsToIsoDuration(3600)).toBe('PT1H');
    expect(secondsToIsoDuration(3661)).toBe('PT1H1M1S');
    expect(secondsToIsoDuration(7325)).toBe('PT2H2M5S');
  });

  it('handles negative values (uses absolute)', () => {
    expect(secondsToIsoDuration(-90)).toBe('PT1M30S');
  });

  it('handles invalid values', () => {
    expect(secondsToIsoDuration(NaN)).toBe('PT0S');
    expect(secondsToIsoDuration(Infinity)).toBe('PT0S');
  });
});
