import { describe, expect, it, vi } from 'vitest';

import { formatTime, formatTimeAsPhrase, secondsToIsoDuration } from '../format';

const hasDurationFormat = typeof (Intl as { DurationFormat?: unknown }).DurationFormat === 'function';

type FormatModule = typeof import('../format');

/**
 * Re-import the module with `Intl.DurationFormat` removed so the module-level capture
 * resolves to `undefined` and `getDurationFormatter` uses `createFallbackFormatter`.
 * Runs the fallback path deterministically regardless of the Node version.
 */
async function loadWithFallback(): Promise<FormatModule> {
  const intl = Intl as { DurationFormat?: unknown };
  const original = intl.DurationFormat;
  intl.DurationFormat = undefined;
  vi.resetModules();
  try {
    return await import('../format');
  } finally {
    if (original === undefined) delete intl.DurationFormat;
    else intl.DurationFormat = original;
  }
}

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
  it('formats positive duration', () => {
    expect(formatTimeAsPhrase(90)).toContain('1');
    expect(formatTimeAsPhrase(90)).toMatch(/minute/i);
    expect(formatTimeAsPhrase(90)).toMatch(/30/);
    expect(formatTimeAsPhrase(300)).toMatch(/5/);
    expect(formatTimeAsPhrase(300)).toMatch(/minute/i);
  });

  it('adds remaining suffix for negative seconds', () => {
    expect(formatTimeAsPhrase(-30)).toMatch(/30/);
    expect(formatTimeAsPhrase(-30)).toMatch(/remaining$/i);
  });

  it('uses formatRemaining only for negative durations', () => {
    expect(formatTimeAsPhrase(-30, { formatRemaining: (duration) => `quedan ${duration}` })).toMatch(/^quedan /);
    expect(formatTimeAsPhrase(-30, { formatRemaining: (duration) => `quedan ${duration}` })).toMatch(/30/);
    expect(formatTimeAsPhrase(90, { formatRemaining: () => 'should-not-appear' })).toBe(formatTimeAsPhrase(90));
  });

  it('omits English remaining suffix for non-English locales without formatRemaining', () => {
    const formatted = formatTimeAsPhrase(-30, { locale: 'es' });
    expect(formatted).toMatch(/30/);
    expect(formatted).not.toMatch(/remaining$/i);
  });

  it.runIf(hasDurationFormat)('uses Intl.DurationFormat', () => {
    const en = formatTimeAsPhrase(125, { locale: 'en' });
    const de = formatTimeAsPhrase(125, { locale: 'de' });
    expect(en.length).toBeGreaterThan(0);
    expect(de.length).toBeGreaterThan(0);
    expect(en).not.toBe(de);
  });

  it('handles invalid values', () => {
    expect(formatTimeAsPhrase(NaN)).toBe('');
    expect(formatTimeAsPhrase(Infinity)).toBe('');
  });

  it.runIf(hasDurationFormat)('throws when Intl.DurationFormat rejects the locale', () => {
    expect(() => formatTimeAsPhrase(90, { locale: 'not-a-valid-bcp47-tag!!!' })).toThrow(RangeError);
  });

  it.skipIf(hasDurationFormat)('falls back to an English phrase without Intl.DurationFormat', () => {
    expect(formatTimeAsPhrase(125)).toBe('2 minutes, 5 seconds');
    expect(formatTimeAsPhrase(3661)).toBe('1 hour, 1 minute, 1 second');
    expect(formatTimeAsPhrase(-30)).toMatch(/remaining$/i);
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

describe('createFallbackFormatter', () => {
  describe('digital style (via formatTime)', () => {
    it('pads minutes and seconds', async () => {
      const { formatTime: format } = await loadWithFallback();
      expect(format(5)).toBe('0:05');
      expect(format(65)).toBe('1:05');
      expect(format(600)).toBe('10:00');
    });

    it('shows hours when present', async () => {
      const { formatTime: format } = await loadWithFallback();
      expect(format(3661)).toBe('1:01:01');
      expect(format(36000)).toBe('10:00:00');
    });

    it('forces hours display when guided by an hours-long duration', async () => {
      const { formatTime: format } = await loadWithFallback();
      expect(format(35, 3600)).toBe('0:00:35');
    });
  });

  describe('text style (via formatTimeAsPhrase)', () => {
    it('joins present units with a comma', async () => {
      const { formatTimeAsPhrase: format } = await loadWithFallback();
      expect(format(3661)).toBe('1 hour, 1 minute, 1 second');
      expect(format(125)).toBe('2 minutes, 5 seconds');
    });

    it('pluralizes based on the unit value', async () => {
      const { formatTimeAsPhrase: format } = await loadWithFallback();
      expect(format(1)).toBe('1 second');
      expect(format(2)).toBe('2 seconds');
      expect(format(3600)).toBe('1 hour');
      expect(format(7200)).toBe('2 hours');
    });

    it('omits units that are absent from the record', async () => {
      const { formatTimeAsPhrase: format } = await loadWithFallback();
      expect(format(30)).toBe('30 seconds');
      expect(format(120)).toBe('2 minutes');
      expect(format(0)).toBe('0 seconds');
    });

    it('ignores non-digital style variants (all render as long-form text)', async () => {
      const { formatTimeAsPhrase: format } = await loadWithFallback();
      expect(format(125, { style: 'short' })).toBe('2 minutes, 5 seconds');
      expect(format(125, { style: 'narrow' })).toBe('2 minutes, 5 seconds');
    });

    it('wraps negative durations in the English remaining phrase', async () => {
      const { formatTimeAsPhrase: format } = await loadWithFallback();
      expect(format(-30)).toBe('30 seconds remaining');
    });

    it('applies formatRemaining for negative durations', async () => {
      const { formatTimeAsPhrase: format } = await loadWithFallback();
      expect(format(-30, { formatRemaining: (duration) => `${duration} left` })).toBe('30 seconds left');
    });
  });
});
