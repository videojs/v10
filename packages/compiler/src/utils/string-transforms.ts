/**
 * String Transformation Utilities
 *
 * Utilities for transforming strings between different naming conventions
 * Used primarily for JSX → HTML attribute name transformations
 */

/**
 * Convert camelCase/PascalCase to kebab-case
 *
 * Examples:
 *   dataTestId → data-test-id
 *   ariaLabel → aria-label
 *   PlayButton → play-button
 *
 * @param str - String in camelCase or PascalCase
 * @returns String in kebab-case
 */
export function toKebabCase(str: string): string {
  return str.replace(/[A-Z]/g, (match, offset) =>
    offset > 0 ? `-${match.toLowerCase()}` : match.toLowerCase());
}
