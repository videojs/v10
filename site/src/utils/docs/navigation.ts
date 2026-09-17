import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from 'astro:transitions/client';

import { currentFramework } from '@/stores/preferences';

import { setFrameworkPreferenceClient } from './preferences';
import { getFrameworkFromDocsPath } from './routing';

const DOCS_SIDEBAR_ID = 'docs-sidebar';
const SIDEBAR_STORAGE_KEY = 'vjs-sidebar-state';
const FRAMEWORK_NAVIGATION_ATTRIBUTE = 'data-docs-framework-navigation';

export const DOCS_FRAMEWORK_NAVIGATION_INFO = { docsNavigation: 'framework' } as const;

declare global {
  interface Window {
    __videojsDocsNavigationController?: AbortController;
  }

  interface DocumentEventMap {
    'astro:before-preparation': TransitionBeforePreparationEvent;
    'astro:before-swap': TransitionBeforeSwapEvent;
  }
}

type SidebarState = {
  sidebarScroll?: number;
};

function isFrameworkNavigation(info?: { docsNavigation?: string } | null): boolean {
  return info?.docsNavigation === 'framework';
}

function setFrameworkTransitionSuppressed(target: Document, suppressed: boolean): void {
  target.documentElement.toggleAttribute(FRAMEWORK_NAVIGATION_ATTRIBUTE, suppressed);
}

/** Publish the route framework before client islands render, then persist that authoritative value for future visits. */
export function syncFrameworkPreferenceFromUrl(url: URL): void {
  const framework = getFrameworkFromDocsPath(url.pathname);
  if (!framework) return;

  currentFramework.set(framework);
  setFrameworkPreferenceClient(framework);
}

function readSidebarState(): SidebarState {
  try {
    const stored = sessionStorage.getItem(SIDEBAR_STORAGE_KEY);

    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('[Sidebar] Failed to restore state', error);

    return {};
  }
}

function saveSidebarState(): void {
  const aside = document.getElementById(DOCS_SIDEBAR_ID);
  if (!aside) return;

  try {
    sessionStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify({ sidebarScroll: aside.scrollTop }));
  } catch (error) {
    console.error('[Sidebar] Failed to save state', error);
  }
}

function restoreSidebarState(): void {
  const state = readSidebarState();
  const aside = document.getElementById(DOCS_SIDEBAR_ID);
  if (!aside) return;

  const sidebarScroll = state.sidebarScroll;

  if (Number.isFinite(sidebarScroll ?? Number.NaN)) {
    aside.scrollTop = sidebarScroll ?? 0;
  }

  // Keep the active link in view when arriving from a different section. Scroll the sidebar alone because
  // scrollIntoView would also move the document.
  const activeLink = aside.querySelector<HTMLElement>('a[aria-current="page"]');
  if (!activeLink) return;

  const asideRect = aside.getBoundingClientRect();
  const linkRect = activeLink.getBoundingClientRect();

  if (linkRect.top < asideRect.top || linkRect.bottom > asideRect.bottom) {
    const linkCentre = linkRect.top + linkRect.height / 2;
    const asideCentre = asideRect.top + asideRect.height / 2;

    aside.scrollTop += linkCentre - asideCentre;
  }
}

export function initializeDocsNavigation(): void {
  window.__videojsDocsNavigationController?.abort();

  const controller = new AbortController();
  const { signal } = controller;

  window.__videojsDocsNavigationController = controller;

  syncFrameworkPreferenceFromUrl(new URL(window.location.href));

  const prepareNavigation = (navigationEvent: TransitionBeforePreparationEvent) => {
    setFrameworkTransitionSuppressed(document, isFrameworkNavigation(navigationEvent.info));
  };

  const prepareSwap = (navigationEvent: TransitionBeforeSwapEvent) => {
    syncFrameworkPreferenceFromUrl(navigationEvent.to);
    saveSidebarState();
    setFrameworkTransitionSuppressed(navigationEvent.newDocument, isFrameworkNavigation(navigationEvent.info));
  };

  document.addEventListener('astro:before-preparation', prepareNavigation, { signal });
  document.addEventListener('astro:before-swap', prepareSwap, { signal });
  document.addEventListener('astro:after-swap', restoreSidebarState, { signal });
  document.addEventListener(
    'astro:page-load',
    () => requestAnimationFrame(() => setFrameworkTransitionSuppressed(document, false)),
    { signal }
  );
  window.addEventListener('pageshow', restoreSidebarState, { signal });
  window.addEventListener('pagehide', saveSidebarState, { signal });

  restoreSidebarState();
}
