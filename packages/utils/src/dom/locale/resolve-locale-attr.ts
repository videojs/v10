import { isUndefined } from '../../predicate';

/**
 * Normalizes a raw `lang` string (e.g. from {@link findNearestLang}): empty or whitespace-only →
 * `undefined`, otherwise the trimmed value.
 */
export function resolveLocaleAttr<LocaleTag extends string = string>(raw: string | undefined): LocaleTag | undefined {
  if (isUndefined(raw) || raw.trim() === '') {
    return undefined;
  }
  return raw.trim() as LocaleTag;
}
