import type { CollectionEntry } from 'astro:content';
import type { SupportedFramework } from '@/types/docs';

/**
 * Get the title for a document, using framework-specific title if available,
 * otherwise falling back to the default title.
 *
 * @param doc - The document from the docs collection
 * @param framework - The framework context (react or html)
 * @returns The framework-specific title or default title
 */
export function getDocTitle(doc: CollectionEntry<'docs'>, framework: SupportedFramework): string {
  return doc.data.frameworkTitle?.[framework] ?? doc.data.title;
}

const CAMEL_OR_PASCAL_CASE = /[a-z][A-Z]/;
const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/;

/**
 * Detect whether a title is a code identifier that should preserve its casing
 * instead of being uppercased. Matches PascalCase, camelCase, and kebab-case.
 */
export function isCodeIdentifier(str: string): boolean {
  return CAMEL_OR_PASCAL_CASE.test(str) || KEBAB_CASE.test(str);
}
