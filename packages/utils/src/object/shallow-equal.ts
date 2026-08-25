import { isObject } from '../predicate';
const hasOwn = Object.prototype.hasOwnProperty;

/** Shallowly compares values, including own string and symbol keys. */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;

  if (!isObject(a) || a === null || !isObject(b) || b === null) {
    return false;
  }

  const keysA = Reflect.ownKeys(a);
  const keysB = Reflect.ownKeys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (
      !hasOwn.call(b, key) ||
      !Object.is(
        a[/* SAFETY: Reflect.ownKeys returns only keys owned by this object. */ key as keyof T],
        b[/* SAFETY: Matching own-key counts and hasOwn establish this key on the second object. */ key as keyof T]
      )
    ) {
      return false;
    }
  }

  return true;
}
