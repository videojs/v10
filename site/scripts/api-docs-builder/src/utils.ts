import type * as ts from 'typescript';
import type { PropDef } from './types.js';

const PREFIX = '\x1b[35m[api-docs-builder]\x1b[0m';

export const log = {
  info: (...args: unknown[]) => console.log(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, '\x1b[33mwarn:\x1b[0m', ...args),
  error: (...args: unknown[]) => console.error(PREFIX, '\x1b[31merror:\x1b[0m', ...args),
};

export function hasJSDocTag(node: ts.Node, tagName: string): boolean {
  const jsDocNodes = (node as any).jsDoc as ts.JSDoc[] | undefined;
  if (!jsDocNodes?.length) return false;

  for (const doc of jsDocNodes) {
    if (!doc.tags) continue;
    for (const tag of doc.tags) {
      if (tag.tagName.text === tagName) return true;
    }
  }
  return false;
}

export function getJSDocTagValue(node: ts.Node, tagName: string): string | undefined {
  const jsDocNodes = (node as any).jsDoc as ts.JSDoc[] | undefined;
  if (!jsDocNodes?.length) return undefined;

  // TS attaches every leading JSDoc block to the node (file headers included)
  // and parses @tags even mid-sentence — the block closest to the declaration
  // is the binding one, so scan in reverse.
  for (const doc of [...jsDocNodes].reverse()) {
    if (!doc.tags) continue;
    for (const tag of doc.tags) {
      if (tag.tagName.text === tagName) {
        if (!tag.comment) return undefined;
        if (typeof tag.comment === 'string') return tag.comment.trim();
        return tag.comment
          .map((c: ts.JSDocComment) => ('text' in c ? c.text : ''))
          .join('')
          .trim();
      }
    }
  }

  return undefined;
}

export function kebabToPascal(str: string): string {
  return str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Derive the kebab-case part segment from an `index.parts.ts` source path.
 *
 * Strips the leading `'./{componentKebab}-'` prefix to get the part segment.
 * Example: `partKebabFromSource('./time-value', 'time')` -> `'value'`
 */
export function partKebabFromSource(source: string, componentKebab: string): string {
  const prefix = `./${componentKebab}-`;
  if (source.startsWith(prefix)) {
    return source.slice(prefix.length);
  }
  // Fallback: strip leading './' and the component prefix
  return source.replace(/^\.\//, '').replace(new RegExp(`^${componentKebab}-`), '');
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
