import { ensureSandboxLocale } from '@app/shared/i18n/sandbox-locales';
import { type ReactNode, useEffect } from 'react';

import { useLocale } from './use-locale';

function syncHtmlLang(locale: string): void {
  if (typeof document === 'undefined' || document.documentElement.lang === locale) return;
  document.documentElement.lang = locale;
}

/** Prefetches locale packs and syncs `<html lang>` for ambient i18n via preset `Container`. */
export function SandboxI18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();

  syncHtmlLang(locale);

  useEffect(() => {
    syncHtmlLang(locale);
    void ensureSandboxLocale(locale).catch(() => {
      // Container's I18nProvider still lazy-loads registry packs when prefetch fails.
    });
  }, [locale]);

  return children;
}
