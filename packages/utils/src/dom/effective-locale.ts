import { isUndefined } from '../predicate';

/** Resolves locale: explicit non-empty value → ambient `lang` → {@link fallback}. */
export function effectiveLocale(
  explicitLocale: string | undefined,
  ambientLang: string | undefined,
  fallback = 'en'
): string {
  if (!isUndefined(explicitLocale) && String(explicitLocale).trim() !== '') {
    return explicitLocale;
  }
  if (!isUndefined(ambientLang) && ambientLang.trim() !== '') {
    return ambientLang;
  }
  return fallback;
}
