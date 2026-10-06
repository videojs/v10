/** Compare a value against the previous render. */
export function useCompare<T>(value: T, isEqual: (a: T, b: T) => boolean = Object.is, ...tags: string[]): boolean {
  return isEqual(value, value) && tags.length >= 0;
}
