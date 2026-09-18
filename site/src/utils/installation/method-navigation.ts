import { navigate } from 'astro:transitions/client';

import { DOCS_FRAMEWORK_NAVIGATION_INFO, savePageScrollForNavigation } from '@/utils/docs/navigation';

export type InstallationMethod = 'packaged' | 'shadcn' | 'cdn';

declare global {
  interface Window {
    __videojsInstallationMethodNavigationController?: AbortController;
  }
}

function isInstallationMethod(value: string | undefined): value is InstallationMethod {
  return value === 'packaged' || value === 'shadcn' || value === 'cdn';
}

/** Carry compatible installation choices to another method's guide. */
export function resolveInstallationMethodUrl(current: URL, href: string, method: InstallationMethod): URL {
  const target = new URL(href, current);

  target.search = current.search;

  if (method === 'packaged') {
    if (current.pathname.endsWith('/shadcn')) {
      const framework = current.searchParams.get('framework') === 'html' ? 'html' : 'react';

      target.pathname = `/docs/guides/installation/${framework}`;
    }

    target.searchParams.delete('framework');
  } else if (method === 'shadcn') {
    const framework = current.pathname.endsWith('/react')
      ? 'react'
      : current.pathname.endsWith('/shadcn') && current.searchParams.get('framework') !== 'html'
        ? 'react'
        : 'html';

    target.searchParams.set('framework', framework);
  } else {
    target.searchParams.delete('framework');
    target.searchParams.delete('install-method');
  }

  return target;
}

function handleClick(event: MouseEvent): void {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    !(event.target instanceof Element)
  ) {
    return;
  }

  const link = event.target.closest<HTMLAnchorElement>('[data-installation-method-nav] a[data-installation-method]');
  const method = link?.dataset.installationMethod;
  if (!link || link.target === '_blank' || !isInstallationMethod(method)) return;

  const current = new URL(window.location.href);
  const target = resolveInstallationMethodUrl(current, link.href, method);

  event.preventDefault();

  if (target.href === current.href) return;

  const targetPath = `${target.pathname}${target.search}${target.hash}`;

  savePageScrollForNavigation(targetPath);
  // Leave the click dispatch before asking Astro to start a transition. Its router also observes document clicks, and
  // starting a transition from our capture listener while that event is still active aborts it as an invalid state.
  queueMicrotask(() => {
    void navigate(targetPath, {
      history: 'push',
      info: DOCS_FRAMEWORK_NAVIGATION_INFO,
    });
  });
}

/** Keep installation-method cards interactive after Astro swaps in another guide. */
export function initializeInstallationMethodNavigation(): void {
  window.__videojsInstallationMethodNavigationController?.abort();

  const controller = new AbortController();

  window.__videojsInstallationMethodNavigationController = controller;
  // Astro's router delegates clicks from the document in the bubble phase. Capture first so it receives our rewritten
  // URL instead of starting a second navigation to the card's static fallback href.
  document.addEventListener('click', handleClick, { capture: true, signal: controller.signal });
}
