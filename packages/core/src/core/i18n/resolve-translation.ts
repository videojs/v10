import type { TranslationKey, TranslationParams } from './params';
import type { TranslationOptions, Translator } from './translator';

type ResolveTranslationArgs<Key extends string> = Key extends TranslationKey
  ? TranslationParams[Key] extends never
    ? [params?: TranslationOptions]
    : [params: TranslationParams[Key] & TranslationOptions]
  : [params?: Record<string, string | number> & TranslationOptions];

/** Resolves a semantic key with optional template params via a translator. */
export function resolveTranslation<Key extends string>(
  translator: Translator,
  key: Key,
  ...args: ResolveTranslationArgs<Key>
): string {
  const [params] = args;
  const translate = translator as (key: string, params?: unknown) => string;
  return params !== undefined ? translate(key, params) : translate(key);
}
