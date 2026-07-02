export type {
  Contains,
  Locale,
  TranslationParams,
  Translations,
  Translator,
} from '@videojs/core/i18n';
export {
  createTranslator,
  DEFAULT_LOCALE,
  getBrowserTranslations,
  getI18nTranslations,
  hasRegisteredI18n,
  loadLocale,
  localeLookupChain,
  onI18nRegistryChange,
  registerI18n,
  resolveBrowserTranslationTarget,
  resolveTranslationPhrase,
  shouldAttemptBrowserTranslation,
} from '@videojs/core/i18n';
