const hasOwn = Object.prototype.hasOwnProperty;

/** Shallowly compares values, including own string and symbol keys. */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }

  const keysA = Reflect.ownKeys(a);
  const keysB = Reflect.ownKeys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (
      !hasOwn.call(b, key) ||
      !Object.is((a as Record<PropertyKey, unknown>)[key], (b as Record<PropertyKey, unknown>)[key])
    ) {
      return false;
    }
  }

  return true;
}
