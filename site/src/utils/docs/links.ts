import { currentInstallationSelection, selectionAtoms } from '@/stores/installation';
import { currentFramework } from '@/stores/preferences';

import { resolveInstallationMethodHref } from '../installation/method-navigation';
import { getInstallationRoutePath, getInstallationRouteSegment } from '../installation/routes';
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

  if (!getInstallationRouteSegment(location.pathname)) return;

  for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[data-installation-method-link="shadcn"]')) {
    const selection = currentInstallationSelection();

    anchor.href = resolveInstallationMethodHref(
      new URL(location.href),
      getInstallationRoutePath('shadcn'),
      'shadcn',
      selection,
      selection.framework
    );
  }
}

/** Keep newly swapped links and in-page framework selections synchronized. */
export function initializeDocsLinks(): void {
  window.__videojsDocsLinksController?.abort();

  const controller = new AbortController();
  const { signal } = controller;
  const unsubscribes = [
    currentFramework.subscribe(resolveAgnosticDocsLinks),
    ...Object.values(selectionAtoms).map((store) => store.subscribe(resolveAgnosticDocsLinks)),
  ];

  window.__videojsDocsLinksController = controller;
  signal.addEventListener('abort', () => unsubscribes.forEach((unsubscribe) => unsubscribe()), { once: true });
  document.addEventListener('astro:page-load', resolveAgnosticDocsLinks, { signal });

  resolveAgnosticDocsLinks();
}
