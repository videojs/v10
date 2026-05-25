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

export { createI18n } from './create-i18n';

import { createI18n as createDefaultI18n } from './create-i18n';

export const { I18nContext, I18nProvider, useLocale, useTranslator } = createDefaultI18n();
