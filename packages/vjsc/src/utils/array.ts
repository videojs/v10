/** Normalize one value or a readonly array of values to a readonly array. */
export function toArray<T>(value: T | readonly T[]): readonly T[] {
  return isArray(value) ? value : [value];
}

function isArray<T>(value: T | readonly T[]): value is readonly T[] {
  return Array.isArray(value);
}
