/**
 * Slightly modified version of React's shallowEqual, with optimizations for Arrays
 * so we may treat them specifically as unequal if they are not a) both arrays
 * or b) don't contain the same (shallowly compared) elements.
 */
export function shallowEqual(objA: object, objB: object): boolean {
  // Using Object.is as a first pass, as it covers a lot of the "simple" cases that are
  // more complex than strict equality and is a built-in. For discussion, see, e.g.:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is#description
  if (Object.is(objA, objB)) {
    return true;
  }

  // Since we've done an Object.is() check immediately above, we can safely assume non-objects (or null-valued objects)
  // are not equal, so can early bail for those as well.
  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false;
  }

  if (Array.isArray(objA)) {
    // Early "cheap" array compares
    if (!Array.isArray(objB) || objA.length !== objB.length) return false;
    // Shallow compare for arrays
    return objA.every((vVal, i) => objB[i] === vVal);
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  for (let i = 0; i < keysA.length; i++) {
    // NOTE: Since we've already guaranteed the keys list lengths are the same, we can safely cast to string here (CJP)
    if (
      !globalThis.hasOwnProperty.call(objB, keysA[i] as string)
      || !Object.is(objA[keysA[i] as string], objB[keysA[i] as string])
    ) {
      return false;
    }
  }

  return true;
}
