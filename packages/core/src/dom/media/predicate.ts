import { isFunction, isObject } from '@videojs/utils/predicate';

export function isQuerySelectorAllCapable<T extends string>(
  value: unknown
): value is {
  querySelectorAll: (selectors: T) => NodeListOf<HTMLElementTagNameMap[Extract<T, keyof HTMLElementTagNameMap>]>;
} {
  return (
    isObject(value) && 'querySelectorAll' in value && isFunction((value as Record<string, unknown>).querySelectorAll)
  );
}
