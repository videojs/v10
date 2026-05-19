import type { SandboxLocaleTag } from '@app/shared/i18n/sandbox-locales';
import { getInitialLocale, onLocaleChange } from '@app/shared/sandbox-listener';
import { useEffect, useState } from 'react';

export function useLocale(): SandboxLocaleTag {
  const [locale, setLocale] = useState(getInitialLocale);

  useEffect(() => onLocaleChange(setLocale), []);

  return locale;
}
