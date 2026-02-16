/**
 * A (very basic) utility to merge class names and make them a little easier to read.
 * Aims to replicate the API of popular libraries like `clsx` and `classnames` but with a much simpler implementation.
 * This is not intended to be a full replacement for those libraries, but it should be sufficient for our use case.
 * It also allows us to avoid adding an additional dependency to our packages.
 * @param classes - An array of class names, which can be strings or undefined. Undefined values will be filtered out.
 * @returns A single string of class names, separated by spaces.
 */
export function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
