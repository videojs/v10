import '../define/i18n';

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
export { I18nTextMixin, MediaTextElement } from '../ui/text/text-element';
export type {
  I18nContext,
  I18nContext as I18nLitContext,
  I18nContextValue,
} from './context';
export { i18nContext, i18nContext as context } from './context';
export { I18nController } from './controller';
export type {
  CreateI18nOptions,
  CreateI18nResult,
} from './create-i18n';
export { createI18n } from './create-i18n';
export { localeFromDomLang, resolvePlayerLocale, resolveProviderLocale } from './locale';
export {
  I18nProviderElement,
  I18nProviderMixin,
  MediaI18nProviderElement,
} from './provider-element';
