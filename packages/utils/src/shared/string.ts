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
