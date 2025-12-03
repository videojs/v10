/**
 * Converts a string to camel case.
 *
 * @param str - The string to convert.
 * @returns The camel case string.
 */
export function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_]([a-z])/g, (_$0, $1) => $1.toUpperCase());
}

/**
 * Converts a string to kebab case.
 *
 * @param str - The string to convert.
 * @returns The kebab case string.
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase();
}
