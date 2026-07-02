import { createContext } from '@videojs/element/context';
import type { I18nContext, I18nContextValue } from './context';
import { I18nController } from './controller';
import { createI18nProviderMixin, type I18nProviderMixin } from './provider-mixin';
import { createTextMixin, type I18nTextMixin } from './text-mixin';
import type { LocaleLoader } from './types';

export interface CreateI18nOptions {
  /** Override lazy loading of shipped locale packs (tests or custom loaders). */
  loadLocale?: LocaleLoader;
}

export interface CreateI18nResult {
  context: I18nContext;
  I18nController: I18nController.Constructor;
  ProviderMixin: I18nProviderMixin;
  TextMixin: I18nTextMixin;
}

export function createI18n(options?: CreateI18nOptions): CreateI18nResult {
  const context = createContext<I18nContextValue, symbol>(Symbol('@videojs/i18n'));
  const ProviderMixin = createI18nProviderMixin({
    i18nContext: context,
    loadLocale: options?.loadLocale,
  });
  const TextMixin = createTextMixin({ i18nContext: context });

  return {
    context,
    I18nController,
    ProviderMixin,
    TextMixin,
  };
}
