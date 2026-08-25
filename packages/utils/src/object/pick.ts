/**
 * Creates a new object with only the specified keys.
 *
 * @example
 * const obj = { a: 1, b: 2, c: 3 };
 * pick(obj, ['a', 'c']); // { a: 1, c: 3 }
 */
export function pick<T extends object, const Keys extends readonly PropertyKey[]>(
  obj: T,
  keys: Keys
): Pick<T, Extract<keyof T, Keys[number]>> {
  type PickedKey = Extract<keyof T, Keys[number]>;
  const result = /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ {} as Pick<
    T,
    PickedKey
  >;

  for (const key of keys) {
    if (Object.hasOwn(obj, key)) {
      const pickedKey = /* SAFETY: Object.hasOwn establishes that this requested key belongs to T. */ key as PickedKey;
      result[pickedKey] = obj[pickedKey];
    }
  }

  return result;
}
