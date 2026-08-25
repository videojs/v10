import { isUndefined } from '../../predicate';

/**
 * Normalizes a raw `lang` string (e.g. from {@link findNearestLang}): empty or whitespace-only →
 * `undefined`, otherwise the trimmed value.
 */
export function resolveLangAttr<Locale extends string = string>(raw: string | undefined): Locale | undefined {
  if (isUndefined(raw) || raw.trim() === '') {
    return undefined;
  }
  return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ raw.trim() as Locale;
}
