export function splitClassNames(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}
