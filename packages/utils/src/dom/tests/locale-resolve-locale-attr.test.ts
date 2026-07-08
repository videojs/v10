import { describe, expect, it } from 'vitest';

import { resolveLocaleAttr } from '../locale/resolve-locale-attr';

describe('resolveLocaleAttr', () => {
  it('returns undefined for missing or blank', () => {
    expect(resolveLocaleAttr(undefined)).toBeUndefined();
    expect(resolveLocaleAttr('')).toBeUndefined();
    expect(resolveLocaleAttr('   ')).toBeUndefined();
  });

  it('returns trimmed language tag', () => {
    expect(resolveLocaleAttr('  fr  ')).toBe('fr');
    expect(resolveLocaleAttr('de-DE')).toBe('de-DE');
  });

  it('can return a caller locale type', () => {
    type Locale = 'en' | 'fr';
    const locale: Locale | undefined = resolveLocaleAttr<Locale>('fr');

    expect(locale).toBe('fr');
  });
});
