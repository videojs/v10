/**
 * Convert a camelCase CSS property name to kebab-case.
 * Custom properties (`--*`) are returned as-is.
 */
function toKebabCase(prop: string): string {
  if (prop.startsWith('--')) return prop;
  return prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Apply a style object to an element.
 *
 * Accepts both camelCase (`positionAnchor`) and custom property (`--media-*`)
 * keys. Standard properties are converted to kebab-case for `setProperty`.
 */
export function applyStyles(element: HTMLElement, styles: Record<string, string>): void {
  for (const [prop, value] of Object.entries(styles)) {
    element.style.setProperty(toKebabCase(prop), value);
  }
}
