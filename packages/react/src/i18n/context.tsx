'use client';

import {
  createTranslator,
  getI18nTranslations,
  type Locale,
  onI18nRegistryChange,
  type Translations,
  type Translator,
} from '@videojs/core/i18n/runtime';
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

export interface I18nContextValue {
  translator: Translator;
  locale: Locale;
  /** True when a provider received an explicit locale prop. */
  localeFromProp: boolean;
  /** Overrides passed to this provider. */
  translations?: Partial<Translations>;
  /** Callback inherited by nested locale roots. */
  onActiveLocaleChange?: (locale: Locale) => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useTranslator(): Translator {
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

export function useLocale(): Locale {
  const ctx = useContext(I18nContext);
  return ctx?.locale ?? 'en';
}
