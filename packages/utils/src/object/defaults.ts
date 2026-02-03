import { isUndefined } from '../predicate';

/** Makes all properties optional and explicitly allows undefined values. */
type PartialWithUndefined<T> = { [K in keyof T]?: T[K] | undefined };

/**
 * Creates a new object with default values filled in for undefined properties.
 *
 * @example
 * ```ts
 * const props = { label: undefined, disabled: true };
 * const defaultProps = { label: '', disabled: false };
 * defaults(props, defaultProps); // { label: '', disabled: true }
 * ```
 */
export function defaults<T extends object>(object: PartialWithUndefined<T>, defaultValues: T): T {
  const result = { ...defaultValues };

  for (const key in object) {
    if (!isUndefined(object[key])) {
      result[key as keyof T] = object[key] as T[keyof T];
    }
  }

  return result;
}
