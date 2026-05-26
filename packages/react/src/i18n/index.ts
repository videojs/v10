'use client';

export type {
  Contains,
  Locale,
  TranslationParams,
  Translations,
  Translator,
} from '@videojs/core/i18n';

export {
  createTranslator,
  getI18nTranslations,
  hasRegisteredI18n,
  localeLookupChain,
  onI18nRegistryChange,
  registerI18n,
} from '@videojs/core/i18n';

export type {
  CreateI18nOptions,
  CreateI18nResult,
  I18nContextValue,
  I18nProviderProps,
} from './create-i18n';

export { I18nContext, useLocale, useTranslator } from './instance';
export { I18nProvider } from './provider';
