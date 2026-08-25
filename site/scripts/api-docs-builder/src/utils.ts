import type { PropDef } from './types.js';

const PREFIX = '\x1b[35m[api-docs-builder]\x1b[0m';

export const log = {
  info: (...args: unknown[]) => console.log(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, '\x1b[33mwarn:\x1b[0m', ...args),
  error: (...args: unknown[]) => console.error(PREFIX, '\x1b[31merror:\x1b[0m', ...args),
  success: (...args: unknown[]) => console.log(PREFIX, ...args),
};

export function kebabToPascal(str: string): string {
  return str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Derive the kebab-case part segment from an `index.parts.ts` source path.
 *
 * Strips the leading `'./{componentKebab}-'` prefix to get the part segment. Example:
 * `partKebabFromSource('./time-value', 'time')` -> `'value'`
 */
export function partKebabFromSource(source: string, componentKebab: string): string {
  const basename = source.split('/').at(-1) ?? source;
  const prefix = `./${componentKebab}-`;
  const basenamePrefix = `${componentKebab}-`;

  if (source.startsWith(prefix) || basename.startsWith(basenamePrefix)) {
    return basename.replace(new RegExp(`^${componentKebab}-`), '');
  }

  // Fallback: strip leading './' and the component prefix
  return basename.replace(/^\.\//, '').replace(new RegExp(`^${componentKebab}-`), '');
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
