import { getI18nTranslations, type Locale, type Translations } from '@videojs/core/i18n';
import { useMemo } from 'react';

import { useRegistryEpoch } from './use-registry-epoch';

export function useMergedTranslations(
  resolvedLocale: Locale,
  lazyLayer: Partial<Translations>,
  translationsProp?: Partial<Translations>
): Translations {
  const registryEpoch = useRegistryEpoch();

  return useMemo(() => {
    void registryEpoch;
    const registryLayer = getI18nTranslations(resolvedLocale);
    return {
      ...registryLayer,
      ...lazyLayer,
      ...translationsProp,
    } as Translations;
  }, [resolvedLocale, lazyLayer, translationsProp, registryEpoch]);
}
