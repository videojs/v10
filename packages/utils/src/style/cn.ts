import { isPlainObject, isString } from '../predicate';

type ClassValue = string | Record<string, unknown> | undefined;

/**
 * A (very basic) utility to merge class names and make them a little easier to read.
 * Aims to replicate the API of popular libraries like `clsx` and `classnames` but with a much simpler implementation.
 * This is not intended to be a full replacement for those libraries, but it should be sufficient for our use case.
 * It also allows us to avoid adding an additional dependency to our packages.
 *
 * @example
 * ```ts
 * cn('foo', { bar: true, baz: false }, 'qux');
 * // => 'foo bar qux'
 * ```
 */
export function cn(...classes: ClassValue[]): string {
  const result: string[] = [];

  for (const value of classes) {
    if (isString(value) && value) {
      result.push(value);
    } else if (isPlainObject(value)) {
      for (const key in value) {
        if (value[key]) {
          result.push(key);
        }
      }
    }
  }

  return result.join(' ');
}
