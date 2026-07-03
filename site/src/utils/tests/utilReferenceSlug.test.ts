import { describe, expect, it } from 'vitest';
import { utilReferenceSlug } from '../utilReferenceSlug';

describe('utilReferenceSlug', () => {
  it('uses normal kebab slugs by default', () => {
    expect(utilReferenceSlug('usePlayerContext')).toBe('use-player-context');
  });

  it('keeps i18n abbreviations together', () => {
    expect(utilReferenceSlug('registerI18n')).toBe('register-i18n');
    expect(utilReferenceSlug('I18nProvider')).toBe('i18n-provider');
  });
});
