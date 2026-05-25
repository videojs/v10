import { ensureSandboxLocale } from '@app/shared/i18n/sandbox-locales';
import { I18nProvider } from '@videojs/react/i18n';
import { type ReactNode, useEffect, useState } from 'react';

import { useLocale } from './use-locale';

/** Waits for locale packs / browser prefetch, then wraps children in {@link I18nProvider}. */
export function SandboxI18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const [readyLocale, setReadyLocale] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void ensureSandboxLocale(locale).then(() => {
      if (!cancelled) setReadyLocale(locale);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (readyLocale !== locale) {
    return null;
  }

  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}
