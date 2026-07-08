import { describe, expect, it } from 'vitest';

import { resolveLangAttr } from '../locale/resolve-lang-attr';

describe('resolveLangAttr', () => {
  it('returns undefined for missing or blank', () => {
    expect(resolveLangAttr(undefined)).toBeUndefined();
    expect(resolveLangAttr('')).toBeUndefined();
    expect(resolveLangAttr('   ')).toBeUndefined();
  });

  it('returns trimmed language tag', () => {
    expect(resolveLangAttr('  fr  ')).toBe('fr');
    expect(resolveLangAttr('de-DE')).toBe('de-DE');
  });

  it('can return a caller locale type', () => {
    type Locale = 'en' | 'fr';
    const locale: Locale | undefined = resolveLangAttr<Locale>('fr');

    expect(locale).toBe('fr');
  });
});
