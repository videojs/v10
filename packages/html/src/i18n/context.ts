import type { Locale, Translator } from '@videojs/core/i18n';
import { type Context, createContext } from '@videojs/element/context';

// ----------------------------------------
// i18n Context
// ----------------------------------------

export const I18N_CONTEXT_KEY = Symbol.for('@videojs/i18n');

export type I18nContextValue = {
  translator: Translator;
  locale: Locale;
};

/** Per-factory context identity (see {@link createI18n}). */
export type I18nContext = Context<symbol, I18nContextValue>;

/**
 * The default i18n context instance for consuming the player store in controllers.
 *
 * @public
 */
export const i18nContext = createContext<I18nContextValue, typeof I18N_CONTEXT_KEY>(I18N_CONTEXT_KEY);
