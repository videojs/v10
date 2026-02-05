import { describe, expect, it } from 'vitest';

import { formatTime, formatTimeAsPhrase, secondsToIsoDuration } from '../format';

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
