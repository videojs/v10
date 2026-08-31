import type { CollectionEntry } from 'astro:content';

import type { SupportedFramework } from '@/types/docs';
import { resolveContentFramework } from '@/types/docs';

/**
 * Get the title for a document, using the framework-specific title if available. Frameworks that read another
 * framework's content fall back to that framework's title — a Vue reader sees the HTML title `media-play-button`, not
 * the default `PlayButton` — before falling back to the default title.
 *
 * @param doc - The document from the docs collection
 * @param framework - The framework context
 * @returns The framework-specific title or default title
 */
export function getDocTitle(doc: CollectionEntry<'docs'>, framework: SupportedFramework): string {
  const frameworkTitle = doc.data.frameworkTitle;

  return frameworkTitle?.[framework] ?? frameworkTitle?.[resolveContentFramework(framework)] ?? doc.data.title;
}

const CAMEL_OR_PASCAL_CASE = /[a-z][A-Z]/;
const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/;

/**
 * Detect whether a title is a code identifier that should preserve its casing instead of being uppercased. Matches
 * PascalCase, camelCase, and kebab-case.
 */
export function isCodeIdentifier(str: string): boolean {
  return CAMEL_OR_PASCAL_CASE.test(str) || KEBAB_CASE.test(str);
}
