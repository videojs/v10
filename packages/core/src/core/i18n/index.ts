export type { GetBrowserTranslationsOptions } from './browser-translation';
export {
  getBrowserTranslations,
  resetBrowserTranslationCacheForTesting,
  resolveBrowserTranslationTarget,
  shouldAttemptBrowserTranslation,
} from './browser-translation';
export { loadLocale } from './load-locale';
export type { LocaleAlias } from './locales';
export { LOCALES, localeAliases } from './locales';
export { default as translations } from './locales/en';
export {
  findLocaleKeys,
  getCanonicalLocaleKey,
  getI18nTranslations,
  hasRegisteredLocale,
  onI18nRegistryChange,
  registerI18n,
  resetI18nRegistry,
} from './registry';
export { resolveTranslation } from './resolve-translation';
export { createTranslator } from './translator';
export type * from './types';
