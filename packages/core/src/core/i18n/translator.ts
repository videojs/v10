import type { Locale, TranslationParams, Translations, Translator } from './types';

const PLACEHOLDER = /\{([^{}]+)\}/g;

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER, (match, name: string) => {
    if (Object.hasOwn(params, name)) {
      return String(params[name as keyof typeof params]);
    }
    return match;
  });
}

/** Builds a typed translator from a resolved translation map (typically from {@link getI18nTranslations}). */
export function createTranslator(translations: Translations, locale: Locale): Translator {
  void locale;

  const translate = (key: keyof TranslationParams, params?: unknown): string => {
    const raw = translations[key];
    if (raw === undefined) {
      return String(key);
    }
    return interpolate(raw, params as Record<string, string | number> | undefined);
  };

  return translate as Translator;
}
