import { describe, expect, it } from 'vite-plus/test';

import { getTextDirection } from '../direction';

describe('getTextDirection', () => {
  it.each(['ar', 'fa-IR', 'he', 'ur', 'ar-Arab'])('returns RTL for %s', (locale) => {
    expect(getTextDirection(locale)).toBe('rtl');
  });

  it.each(['en', 'es-MX', 'ja', 'ar-Latn'])('returns LTR for %s', (locale) => {
    expect(getTextDirection(locale)).toBe('ltr');
  });

  it('defaults invalid locales to LTR', () => {
    expect(getTextDirection('not_a_locale')).toBe('ltr');
  });
});
