import { isUndefined } from '../../predicate';

/**
 * Normalizes a raw `lang` string (e.g. from {@link findNearestLang}): empty or whitespace-only →
 * `undefined`, otherwise the trimmed value.
 */
export function resolveLocaleAttr(raw: string | undefined): string | undefined {
  if (isUndefined(raw) || raw.trim() === '') {
    return undefined;
  }
  return raw.trim();
}
