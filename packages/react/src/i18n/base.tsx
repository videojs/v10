'use client';

import {
  createTranslator,
  getI18nTranslations,
  type Locale,
  onI18nRegistryChange,
  type Translations,
  type Translator,
} from '@videojs/core/i18n';
import { type Context, createContext, useContext, useEffect, useMemo, useReducer } from 'react';

export interface I18nContextValue {
  translator: Translator;
  locale: Locale;
  /** True when a provider received an explicit locale prop. */
  localeFromProp: boolean;
  /** Overrides passed to this provider. */
  translations?: Partial<Translations>;
}

export interface I18nBase {
  I18nContext: Context<I18nContextValue | null>;
  useTranslator: () => Translator;
  useLocale: () => Locale;
}

export function createI18nBase(): I18nBase {
  const I18nContext = createContext<I18nContextValue | null>(null);

  function useTranslator(): Translator {
    const ctx = useContext(I18nContext);
    const [registryEpoch, invalidateRegistry] = useReducer((epoch: number) => epoch + 1, 0);

    useEffect(() => {
      return onI18nRegistryChange(() => invalidateRegistry());
    }, []);

    const fallback = useMemo(() => {
      void registryEpoch;
      return createTranslator(getI18nTranslations('en'), 'en');
    }, [registryEpoch]);

    if (!ctx) {
      return fallback;
    }
    return ctx.translator;
  }

  function useLocale(): Locale {
    const ctx = useContext(I18nContext);
    return ctx?.locale ?? 'en';
  }

  return { I18nContext, useTranslator, useLocale };
}
