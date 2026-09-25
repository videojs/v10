import { currentFramework } from '@/stores/preferences';

import { getInstallationRouteSegment } from '../installation/routes';
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

/** Carry installation picks into method links; the installation stores load only on installation guides. */
async function resolveInstallationLinks(signal: AbortSignal): Promise<void> {
  if (!getInstallationRouteSegment(location.pathname)) return;

  const { watchInstallationMethodLinks } = await import('../installation/method-links');

  if (!signal.aborted) watchInstallationMethodLinks(signal);
}

/** Keep newly swapped links and in-page framework selections synchronized. */
export function initializeDocsLinks(): void {
  window.__videojsDocsLinksController?.abort();

  const controller = new AbortController();
  const { signal } = controller;
  const unsubscribe = currentFramework.subscribe(resolveAgnosticDocsLinks);
  const resolvePageLinks = () => {
    resolveAgnosticDocsLinks();
    void resolveInstallationLinks(signal);
  };

  window.__videojsDocsLinksController = controller;
  signal.addEventListener('abort', unsubscribe, { once: true });
  document.addEventListener('astro:page-load', resolvePageLinks, { signal });

  void resolveInstallationLinks(signal);
}
