import { currentFramework } from '@/stores/preferences';

import { getFrameworkPreferenceClient } from './preferences';
import { resolveDocsHref } from './routing';

declare global {
  interface Window {
    __videojsDocsLinksController?: AbortController;
  }
}

/** Point framework-agnostic links at the reader's current framework without requiring a redirect. */
export function resolveAgnosticDocsLinks(): void {
  const framework = currentFramework.get() ?? getFrameworkPreferenceClient();

  for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[data-docs-slug]')) {
    const slug = anchor.dataset.docsSlug || null;
    const hash = anchor.hash;

    anchor.href = resolveDocsHref({ slug, framework }) + hash;
  }
}

/** Keep newly swapped links and in-page framework selections synchronized. */
export function initializeDocsLinks(): void {
  window.__videojsDocsLinksController?.abort();

  const controller = new AbortController();
  const { signal } = controller;
  const unsubscribe = currentFramework.subscribe(resolveAgnosticDocsLinks);

  window.__videojsDocsLinksController = controller;
  signal.addEventListener('abort', unsubscribe, { once: true });
  document.addEventListener('astro:page-load', resolveAgnosticDocsLinks, { signal });

  resolveAgnosticDocsLinks();
}
