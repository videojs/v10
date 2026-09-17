import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from 'astro:transitions/client';

import { currentFramework } from '@/stores/preferences';

import { setFrameworkPreferenceClient } from './preferences';
import { getFrameworkFromDocsPath } from './routing';

const DOCS_SIDEBAR_ID = 'docs-sidebar';
const SIDEBAR_STORAGE_KEY = 'vjs-sidebar-state';
const PAGE_SCROLL_STORAGE_KEY = 'vjs-page-scroll';
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

type SavedPageScroll = {
  url?: string;
  scrollY?: number;
};

function isFrameworkNavigation(info?: { docsNavigation?: string } | null): boolean {
  return info?.docsNavigation === 'framework';
}

function setFrameworkTransitionSuppressed(target: Document, suppressed: boolean): void {
  target.documentElement.toggleAttribute(FRAMEWORK_NAVIGATION_ATTRIBUTE, suppressed);
}

function savePageScrollToHistory(): void {
  const state = window.history.state ?? {};
  const { scrollX, scrollY } = window;
  if (state.scrollX === scrollX && state.scrollY === scrollY) return;

  try {
    window.history.replaceState({ ...state, scrollX, scrollY }, '');
  } catch {
    // Scroll tracking should not interrupt navigation when history state is unavailable.
  }
}

/** Publish the route framework before client islands render, then persist that authoritative value for future visits. */
export function syncFrameworkPreferenceFromUrl(url: URL): void {
  const framework = getFrameworkFromDocsPath(url.pathname);
  if (!framework) return;

  currentFramework.set(framework);
  setFrameworkPreferenceClient(framework);
}

/** Preserve the reading position for a framework switch that replaces the current guide with its equivalent. */
export function savePageScrollForNavigation(url: string): void {
  try {
    window.sessionStorage.setItem(
      PAGE_SCROLL_STORAGE_KEY,
      JSON.stringify({ url: new URL(url, window.location.origin).pathname, scrollY: window.scrollY })
    );
  } catch {
    // Navigation should still work when storage is unavailable.
  }
}

function restoreSavedPageScroll(removeAfterRestore = true): boolean {
  try {
    const stored = window.sessionStorage.getItem(PAGE_SCROLL_STORAGE_KEY);
    if (!stored) return false;

    const { url, scrollY }: SavedPageScroll = JSON.parse(stored);
    const matchesCurrentPath = url?.replace(/\/$/, '') === window.location.pathname.replace(/\/$/, '');
    if (!matchesCurrentPath || !Number.isFinite(scrollY ?? Number.NaN)) return false;

    window.scrollTo({ left: 0, top: scrollY });
    savePageScrollToHistory();

    if (removeAfterRestore) {
      window.sessionStorage.removeItem(PAGE_SCROLL_STORAGE_KEY);
    }

    return true;
  } catch {
    return false;
  }
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
  let saveScrollFrame = 0;

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

  const schedulePageScrollSave = () => {
    if (saveScrollFrame) return;

    saveScrollFrame = requestAnimationFrame(() => {
      saveScrollFrame = 0;
      savePageScrollToHistory();
    });
  };

  const saveDocumentState = () => {
    cancelAnimationFrame(saveScrollFrame);
    saveScrollFrame = 0;
    savePageScrollToHistory();
    saveSidebarState();
  };

  signal.addEventListener('abort', () => cancelAnimationFrame(saveScrollFrame), { once: true });
  document.addEventListener('astro:before-preparation', prepareNavigation, { signal });
  document.addEventListener('astro:before-swap', prepareSwap, { signal });
  document.addEventListener(
    'astro:after-swap',
    () => {
      restoreSidebarState();
      restoreSavedPageScroll(false);
    },
    { signal }
  );
  document.addEventListener(
    'astro:page-load',
    () =>
      requestAnimationFrame(() => {
        restoreSavedPageScroll();
        setFrameworkTransitionSuppressed(document, false);
      }),
    { signal }
  );
  window.addEventListener('pageshow', restoreSidebarState, { signal });
  window.addEventListener('scroll', schedulePageScrollSave, { passive: true, signal });
  window.addEventListener('pagehide', saveDocumentState, { signal });

  restoreSidebarState();
  restoreSavedPageScroll();
}
