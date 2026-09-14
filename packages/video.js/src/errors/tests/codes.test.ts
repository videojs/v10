import { describe, expect, it } from 'vite-plus/test';

import { getLegacyErrorSlug, getLegacyErrorUrl, isLegacyErrorCode, LEGACY_ERROR_CODES } from '../codes';

describe('LEGACY_ERROR_CODES', () => {
  it('uses codes that cannot collide with anything else', () => {
    for (const code of LEGACY_ERROR_CODES) {
      expect(code).toMatch(/^VJS10_LEGACY_[A-Z_]+$/);
    }
  });

  it('lists every code once', () => {
    expect(new Set(LEGACY_ERROR_CODES).size).toBe(LEGACY_ERROR_CODES.length);
  });
});

describe('isLegacyErrorCode', () => {
  it('accepts registered codes only', () => {
    expect(isLegacyErrorCode('VJS10_LEGACY_INIT')).toBe(true);
    expect(isLegacyErrorCode('VJS10_LEGACY_UNKNOWN')).toBe(false);
    expect(isLegacyErrorCode('toString')).toBe(false);
    expect(isLegacyErrorCode(1)).toBe(false);
    expect(isLegacyErrorCode(null)).toBe(false);
  });
});

describe('getLegacyErrorSlug', () => {
  it('derives the docs slug from the code', () => {
    expect(getLegacyErrorSlug('VJS10_LEGACY_INIT')).toBe('legacy-init');
    expect(getLegacyErrorSlug('VJS10_LEGACY_GET_PLAYER')).toBe('legacy-get-player');
  });

  it('produces a unique slug for every code', () => {
    const slugs = LEGACY_ERROR_CODES.map(getLegacyErrorSlug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('getLegacyErrorUrl', () => {
  it('points at the errors section of the docs site', () => {
    expect(getLegacyErrorUrl('VJS10_LEGACY_INIT')).toBe('https://videojs.org/errors/legacy-init');
  });
});
