import { type I18nContext, i18nContext } from './context';
import { I18nController } from './controller';
import { createI18nProviderMixin, type I18nProviderMixin } from './provider-mixin';
import { createTextMixin, type I18nTextMixin } from './text-mixin';
import type { LocaleLoader } from './types';

export interface CreateI18nOptions {
  /** Override lazy loading of shipped locale packs (tests or custom loaders). */
  loader?: LocaleLoader;
}

export interface CreateI18nResult {
  context: I18nContext;
  I18nController: I18nController.Constructor;
  ProviderMixin: I18nProviderMixin;
  TextMixin: I18nTextMixin;
}

export function createI18n(options?: CreateI18nOptions): CreateI18nResult {
  const ProviderMixin = createI18nProviderMixin({
    context: i18nContext,
    loader: options?.loader,
  });
  const TextMixin = createTextMixin({ context: i18nContext });

  return {
    context: i18nContext,
    I18nController,
    ProviderMixin,
    TextMixin,
  };
}
