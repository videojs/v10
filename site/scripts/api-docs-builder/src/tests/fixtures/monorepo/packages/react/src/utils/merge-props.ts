/** @public Merge multiple prop objects into one. */
export function mergeProps<T extends Record<string, unknown>>(...args: T[]): T {
  return Object.assign({}, ...args) as T;
}
