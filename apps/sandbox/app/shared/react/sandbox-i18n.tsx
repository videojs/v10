import { ensureSandboxLocale } from '@app/shared/i18n/sandbox-locales';
import { I18nProvider } from '@videojs/react/i18n';
import { type ReactNode, useEffect } from 'react';

import { useLocale } from './use-locale';

function syncHtmlLang(locale: string): void {
  if (typeof document === 'undefined' || document.documentElement.lang === locale) return;
  document.documentElement.lang = locale;
}

/** Composes React i18n and syncs `<html lang>` for sandbox locale demos. */
export function SandboxI18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();

  syncHtmlLang(locale);

  useEffect(() => {
    syncHtmlLang(locale);
    void ensureSandboxLocale(locale).catch(() => {
      // I18nProvider still lazy-loads registry packs when prefetch fails.
    });
  }, [locale]);

  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}
