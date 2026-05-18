import { createI18n } from './create-i18n';

const built = createI18n();

export const context = built.context;
export const I18nController = built.I18nController;
export const I18nProviderMixin = built.ProviderMixin;
export const I18nTextMixin = built.TextMixin;
