export type { GetBrowserTranslationsOptions } from './browser-translation';
export {
  getBrowserTranslations,
  resetBrowserTranslationCacheForTesting,
  resolveBrowserTranslationTarget,
  shouldAttemptBrowserTranslation,
} from './browser-translation';
export { default as translations } from './locales/en';
export {
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
