import type { TranslationKeyOrString, Translator } from './types';

/** Resolves a {@link TranslationKeyOrString} with optional template params via a translator. */
export function resolveTranslationPhrase(
  translator: Translator,
  phrase: TranslationKeyOrString,
  params?: Record<string, string | number>
): string {
  const translate = translator as (key: string, params?: unknown) => string;
  return params !== undefined ? translate(phrase, params) : translate(phrase);
}
