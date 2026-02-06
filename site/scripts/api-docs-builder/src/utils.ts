import type { PropDef } from './types.js';

export function kebabToPascal(str: string): string {
  return str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function sortProps(props: Record<string, PropDef>): Record<string, PropDef> {
  const entries = Object.entries(props);

  entries.sort((a, b) => {
    // Required first
    const aRequired = a[1].required ?? false;
    const bRequired = b[1].required ?? false;

    if (aRequired && !bRequired) return -1;
    if (!aRequired && bRequired) return 1;

    // Then alphabetical
    return a[0].localeCompare(b[0]);
  });

  return Object.fromEntries(entries);
}
