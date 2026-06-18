import { isUndefined } from '../predicate';

/**
 * Normalizes a raw `lang` string (e.g. from {@link nearestLang}): empty or whitespace-only →
 * `undefined`, otherwise the trimmed value.
 */
export function localeFromDomLang(raw: string | undefined): string | undefined {
  if (isUndefined(raw) || raw.trim() === '') {
    return undefined;
  }
  return raw.trim();
}
