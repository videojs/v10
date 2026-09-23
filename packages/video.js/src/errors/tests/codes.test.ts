import { describe, expect, it } from 'vite-plus/test';

import { getLegacyErrorSlug, getLegacyErrorUrl, isLegacyErrorCode, LEGACY_ERROR_CODES } from '../codes';

describe('LEGACY_ERROR_CODES', () => {
  it('uses codes that cannot collide with anything else', () => {
    for (const code of LEGACY_ERROR_CODES) {
      expect(code).toMatch(/^VJS8_LEGACY_[A-Z_]+$/);
    }
  });

  it('lists every code once', () => {
    expect(new Set(LEGACY_ERROR_CODES).size).toBe(LEGACY_ERROR_CODES.length);
  });
});

describe('isLegacyErrorCode', () => {
  it('accepts registered codes only', () => {
    expect(isLegacyErrorCode('VJS8_LEGACY_INIT')).toBe(true);
    expect(isLegacyErrorCode('VJS8_LEGACY_UNKNOWN')).toBe(false);
    expect(isLegacyErrorCode('toString')).toBe(false);
    expect(isLegacyErrorCode(1)).toBe(false);
    expect(isLegacyErrorCode(null)).toBe(false);
  });
});

describe('getLegacyErrorSlug', () => {
  it('derives the docs slug from the code', () => {
    expect(getLegacyErrorSlug('VJS8_LEGACY_INIT')).toBe('vjs8-legacy-init');
    expect(getLegacyErrorSlug('VJS8_LEGACY_GET_PLAYER')).toBe('vjs8-legacy-get-player');
  });

  it('produces a unique slug for every code', () => {
    const slugs = LEGACY_ERROR_CODES.map(getLegacyErrorSlug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('getLegacyErrorUrl', () => {
  it('points at the legacy error API reference', () => {
    expect(getLegacyErrorUrl('VJS8_LEGACY_INIT')).toBe('https://videojs.org/docs/reference/api/vjs8-legacy-init');
  });
});
