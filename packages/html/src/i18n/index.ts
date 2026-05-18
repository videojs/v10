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
  I18nLitContext,
} from './create-i18n';
export { createI18n } from './create-i18n';
export { MediaI18nProviderElement, MediaTextElement } from './define-elements';
export { context, I18nController, I18nProviderMixin, I18nTextMixin } from './instance';
export { localeFromDomLang, resolvePlayerLocale, resolveProviderLocale } from './locale';
export { selectCaptionsByLocale } from './select-captions-by-locale';
