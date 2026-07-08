import { describe, expect, it } from 'vitest';

import { effectiveLocale } from '../locale/effective-locale';

describe('effectiveLocale', () => {
  it('prefers explicit locale over ambient', () => {
    expect(effectiveLocale('fr', 'de')).toBe('fr');
  });

  it('uses ambient when explicit is undefined', () => {
    expect(effectiveLocale(undefined, 'es-MX')).toBe('es-MX');
  });

  it('falls back to en when both missing or blank', () => {
    expect(effectiveLocale(undefined, undefined)).toBe('en');
    expect(effectiveLocale('  ', undefined)).toBe('en');
    expect(effectiveLocale(undefined, '  ')).toBe('en');
  });

  it('respects custom fallback', () => {
    expect(effectiveLocale(undefined, undefined, 'xx')).toBe('xx');
  });

  it('can resolve a caller locale type', () => {
    type Locale = 'en' | 'fr';
    const locale: Locale = effectiveLocale<Locale>(undefined, undefined);

    expect(locale).toBe('en');
  });
});
