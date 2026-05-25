export type { GetBrowserTranslationsOptions } from './browser-translation';
export {
  getBrowserTranslations,
  resetBrowserTranslationCacheForTesting,
  resolveBrowserTranslationTarget,
  shouldAttemptBrowserTranslation,
} from './browser-translation';
export { BUILT_IN_LOCALES, LOCALE_ALIAS_TAGS, SHIPPED_LOCALE_TAGS } from './built-in-locales';
export { loadLocale } from './load-locale';
export { default as translations } from './locales/en';
export {
  canonicalLocaleRegistryKey,
  getI18nTranslations,
  hasRegisteredI18n,
  localeLookupChain,
  onI18nRegistryChange,
  registerI18n,
  resetI18nRegistryForTesting,
} from './registry';
export { resolveTranslationPhrase } from './resolve-translation-phrase';
export { createTranslator } from './translator';
export type * from './types';
