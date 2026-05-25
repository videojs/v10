import { describe, expect, it } from 'vitest';

import { localeFromDomLang } from '../locale-from-dom-lang';

describe('localeFromDomLang', () => {
  it('returns undefined for missing or blank', () => {
    expect(localeFromDomLang(undefined)).toBeUndefined();
    expect(localeFromDomLang('')).toBeUndefined();
    expect(localeFromDomLang('   ')).toBeUndefined();
  });

  it('returns trimmed language tag', () => {
    expect(localeFromDomLang('  fr  ')).toBe('fr');
    expect(localeFromDomLang('de-DE')).toBe('de-DE');
  });
});
