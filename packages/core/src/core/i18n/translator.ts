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

/**
 * Builds a typed translator from a resolved translation map (typically from `getI18nTranslations`).
 *
 * @param translations - Merged translation map for the active locale.
 * @param locale - BCP 47 tag associated with the map (reserved for future locale-aware behavior).
 * @public
 */
export function createTranslator(translations: Translations, locale: Locale): Translator {
  void locale;

  const translate = (phrase: keyof TranslationParams, params?: unknown): string => {
    const raw = translations[phrase] ?? String(phrase);
    return interpolate(raw, params as Record<string, string | number> | undefined);
  };

  return translate as Translator;
}
