import type { SandboxLocaleTag } from '@app/shared/i18n/locale-meta';
import { getInitialLocale, onLocaleChange } from '@app/shared/sandbox-listener';
import { useEffect, useState } from 'react';

export function useLocale(): SandboxLocaleTag {
  const [locale, setLocale] = useState(getInitialLocale);

  useEffect(() => onLocaleChange(setLocale), []);

  return locale;
}
