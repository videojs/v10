export function pascalCase(str: string): string {
  return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase()).replace(/^(.)/, (_, c) => c.toUpperCase());
}

export function camelCase(str: string): string {
  return pascalCase(str).replace(/^(.)/, (_, c) => c.toLowerCase());
}
