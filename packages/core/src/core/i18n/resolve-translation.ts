import type { TranslationKey, TranslationParams, Translator } from './types';

type ResolveTranslationArgs<Phrase extends string> = Phrase extends TranslationKey
  ? TranslationParams[Phrase] extends never
    ? []
    : [params: TranslationParams[Phrase]]
  : [params?: Record<string, string | number>];

/** Resolves a phrase with optional template params via a translator. */
export function resolveTranslation<Phrase extends string>(
  translator: Translator,
  phrase: Phrase,
  ...args: ResolveTranslationArgs<Phrase>
): string {
  const [params] = args;
  const translate = translator as (key: string, params?: unknown) => string;
  return params !== undefined ? translate(phrase, params) : translate(phrase);
}
