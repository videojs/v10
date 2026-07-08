export type {
  Locale,
  TranslationParams,
  Translations,
  Translator,
} from '@videojs/core/i18n';
export {
  createTranslator,
  findLocaleKeys,
  getBrowserTranslations,
  getI18nTranslations,
  hasRegisteredLocale,
  loadLocale,
  onI18nRegistryChange,
  registerI18n,
  resolveBrowserTranslationTarget,
  resolveTranslation,
  shouldAttemptBrowserTranslation,
} from '@videojs/core/i18n';
