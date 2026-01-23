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
