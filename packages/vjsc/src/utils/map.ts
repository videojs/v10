/** Set a key once. A second, different value for the same key is a caller-described conflict. */
export function setUnique<Key, Value>(
  map: Map<Key, Value>,
  key: Key,
  value: Value,
  conflict: (previous: Value) => string,
  equals: (previous: Value, next: Value) => boolean = Object.is
): void {
  const previous = map.get(key);
  if (previous !== undefined && !equals(previous, value)) throw new Error(conflict(previous));

  map.set(key, value);
}
