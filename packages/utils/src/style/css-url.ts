/**
 * Wraps a URL in a CSS `url()`.
 *
 * Quoting matters: an unquoted `url()` ends at the first unescaped paren, so a
 * URL carrying one — a query parameter, a signature — produces a declaration
 * the browser drops. Dropping is silent, so the image just never paints.
 *
 * @example
 * ```ts
 * element.style.setProperty('background-image', cssUrl(src));
 * // => url("poster.jpg")
 * ```
 */
export function cssUrl(url: string): string {
  return `url("${url.replace(/["\\]/g, '\\$&')}")`;
}
