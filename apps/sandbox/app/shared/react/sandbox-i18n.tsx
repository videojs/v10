import { syncDocumentLocale } from '@app/shared/i18n/document-locale';
import { ensureSandboxLocale } from '@app/shared/i18n/sandbox-locales';
import { I18nProvider } from '@videojs/react/i18n';
import { type ReactNode, useEffect } from 'react';

import { useLocale } from './use-locale';

/** Composes React i18n and syncs the document locale for sandbox demos. */
export function SandboxI18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();

  syncDocumentLocale(locale);

  useEffect(() => {
    syncDocumentLocale(locale);
    void ensureSandboxLocale(locale).catch(() => {
      // I18nProvider still lazy-loads registry packs when prefetch fails.
    });
  }, [locale]);

  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}
