import { ensureSandboxLocale } from '@app/shared/i18n/sandbox-locales';
import { type ReactNode, useEffect } from 'react';

import { useLocale } from './use-locale';

/** Prefetches locale packs and syncs `<html lang>` for ambient i18n via preset `Container`. */
export function SandboxI18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
    void ensureSandboxLocale(locale).catch(() => {
      // Container's I18nProvider still lazy-loads registry packs when prefetch fails.
    });
  }, [locale]);

  return children;
}
