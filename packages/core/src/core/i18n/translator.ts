import type { FlatTranslations, Locale, TranslationKey, TranslationParams } from './params';
import type { Text, TextParams } from './text';

export interface TranslationOptions {
  default?: string;
}

export type Translator = {
  <Key extends string>(
    key: Key,
    ...args: Key extends TranslationKey
      ? TranslationParams[Key] extends never
        ? [params?: TranslationOptions]
        : [params: TranslationParams[Key] & TranslationOptions]
      : [params?: TextParams & TranslationOptions]
  ): string;
  (text: Text, params?: TextParams): string;
};

import { interpolate } from './utils';

declare const __DEV__: boolean;

/**
 * Builds a typed translator from a resolved translation map (typically from `getI18nTranslations`).
 *
 * @param translations - Merged translation map for the active locale.
 * @param locale - BCP 47 tag associated with the map (reserved for future locale-aware behavior).
 * @public
 */
export function createTranslator(translations: FlatTranslations, locale: Locale): Translator {
  void locale;

  const translate = (input: Text | string, params?: unknown): string => {
    const options = params as (TextParams & { default?: string }) | undefined;
    const isDescriptor = typeof input !== 'string';
    const key = isDescriptor ? input.key : input;
    const translation = translations[key];

    if (__DEV__ && translation === undefined && !isDescriptor && options?.default === undefined) {
      console.warn(`[videojs] Missing translation for "${key}".`);
    }

    const fallback = options?.default;
    const values = options ? { ...options } : undefined;
    if (values) delete values.default;

    const raw = translation ?? (isDescriptor ? input.text : fallback) ?? String(key);
    return interpolate(raw, values);
  };

  return translate as Translator;
}
