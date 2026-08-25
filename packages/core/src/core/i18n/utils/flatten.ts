import { flatten } from '@videojs/utils/object';

import type { FlatTranslations, Translations } from '../params';

export interface FlattenTranslationsOptions {
  prefix?: string;
}

export function flattenTranslations(locale: Translations, options: FlattenTranslationsOptions = {}): FlatTranslations {
  return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ flatten(
    locale,
    options
  ) as FlatTranslations;
}
