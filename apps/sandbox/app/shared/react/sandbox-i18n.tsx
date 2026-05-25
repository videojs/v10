import { ensureSandboxLocale } from '@app/shared/i18n/sandbox-locales';
import { I18nProvider } from '@videojs/react/i18n';
import { type ReactNode, useEffect } from 'react';

import { useLocale } from './use-locale';

/** Prefetches locale packs / browser translations, then wraps children in {@link I18nProvider}. */
export function SandboxI18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();

  useEffect(() => {
    void ensureSandboxLocale(locale).catch(() => {
      // I18nProvider still lazy-loads registry packs when prefetch fails.
    });
  }, [locale]);

  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}
