// A (very crude) utility to merge class names
// Usually I'd use something like `clsx` or `classnames` but this is ok for our simple use case.
// It just makes the billions of Tailwind classes a little easier to read.
export function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
