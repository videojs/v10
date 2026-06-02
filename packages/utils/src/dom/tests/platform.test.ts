import { describe, expect, it } from 'vitest';
import { getChromeVersion, isAndroid } from '../platform';

describe('isAndroid', () => {
  it('returns true for Android user agents', () => {
    expect(
      isAndroid('Mozilla/5.0 (Linux; Android 7.0) AppleWebKit/537.36 Chrome/56.0.2924.87 Mobile Safari/537.36')
    ).toBe(true);
  });

  it('returns false for non-Android user agents', () => {
    expect(
      isAndroid('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36')
    ).toBe(false);
  });
});

describe('getChromeVersion', () => {
  it('returns the Chrome major version', () => {
    expect(
      getChromeVersion('Mozilla/5.0 (Linux; Android 7.0) AppleWebKit/537.36 Chrome/56.0.2924.87 Mobile Safari/537.36')
    ).toBe(56);
  });

  it('returns null when no Chrome version is present', () => {
    expect(
      getChromeVersion('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15')
    ).toBeNull();
  });
});
