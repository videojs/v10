import { isUndefined } from '../../predicate';

/** Resolves locale: explicit non-empty value → ambient `lang` → {@link fallback}. */
export function effectiveLocale<LocaleTag extends string = string>(
  explicitLocale: LocaleTag | undefined,
  ambientLang: LocaleTag | undefined,
  fallback = 'en' as LocaleTag
): LocaleTag {
  if (!isUndefined(explicitLocale) && explicitLocale.trim() !== '') {
    return explicitLocale;
  }
  if (!isUndefined(ambientLang) && ambientLang.trim() !== '') {
    return ambientLang;
  }
  return fallback;
}
