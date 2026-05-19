import { describe, expect, it } from 'vitest';
import { all } from '../all';
import { BUILT_IN_LOCALES } from '../built-in-locales';
import english from '../locales/en';

const englishKeys = Object.keys(english) as (keyof typeof english)[];

describe('all', () => {
  it.each(
    BUILT_IN_LOCALES.map((locale) => [locale, all[locale]] as const)
  )('%s defines every English translation key', (locale, translations) => {
    for (const key of englishKeys) {
      expect(translations[key], `${locale}.${key}`).toBeDefined();
      if (key !== 'mediaErrorCustom') {
        expect(translations[key], `${locale}.${key}`).not.toBe('');
      }
    }
  });
});
