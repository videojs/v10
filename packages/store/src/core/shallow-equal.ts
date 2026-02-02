export type Selector<State, Result> = (state: State) => Result;

export type Comparator<T> = (a: T, b: T) => boolean;

const hasOwn = Object.prototype.hasOwnProperty;

export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!hasOwn.call(b, key) || !Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }

  return true;
}
