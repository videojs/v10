export function pascalCase(str: string): string {
  return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase()).replace(/^(.)/, (_, c) => c.toUpperCase());
}

export function camelCase(str: string): string {
  return pascalCase(str).replace(/^(.)/, (_, c) => c.toLowerCase());
}

/** CSS custom properties (`--*`) are returned as-is. */
export function kebabCase(str: string): string {
  if (str.startsWith('--')) return str;
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}
