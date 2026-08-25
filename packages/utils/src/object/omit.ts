/**
 * Creates a new object without the specified keys.
 *
 * @example
 * const obj = { a: 1, b: 2, c: 3 };
 * omit(obj, ['b']); // { a: 1, c: 3 }
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const result: Partial<T> = {};
  const omittedKeys = new Set<PropertyKey>(keys);

  for (const key in obj) {
    if (!omittedKeys.has(key)) {
      result[key] = obj[key];
    }
  }

  return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ result as Omit<
    T,
    K
  >;
}
