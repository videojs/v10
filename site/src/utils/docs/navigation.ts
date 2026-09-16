import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from 'astro:transitions/client';

import {
  getPageScrollFromHistory,
  getPageScrollTop,
  PAGE_SCROLL_STORAGE_KEY,
  restorePageScroll,
  savePageScrollToHistory,
} from './scroll';

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

function restoreSavedPageScroll(removeAfterRestore = true): boolean {
  try {
    const stored = sessionStorage.getItem(PAGE_SCROLL_STORAGE_KEY);
    if (!stored) return false;

    const { url, scrollY }: SavedPageScroll = JSON.parse(stored);
    const matchesCurrentPath = url?.replace(/\/$/, '') === window.location.pathname.replace(/\/$/, '');
    if (!matchesCurrentPath || !Number.isFinite(scrollY ?? Number.NaN)) return false;

    restorePageScroll(scrollY ?? 0);

    if (removeAfterRestore) {
      sessionStorage.removeItem(PAGE_SCROLL_STORAGE_KEY);
    }

    return true;
  } catch {
    return false;
  }
}

export function initializeDocsNavigation(): void {
  window.__videojsDocsNavigationController?.abort();

  const controller = new AbortController();
  const { signal } = controller;

  window.__videojsDocsNavigationController = controller;

  let historyScrollToRestore: number | null = null;
  let saveScrollFrame = 0;
  const historyScrollPositions = new Map<number, number>();

  const getHistoryIndex = () => {
    const index = window.history.state?.index;

    return Number.isFinite(index) ? index : null;
  };

  const rememberPageScroll = (scrollY = getPageScrollTop()) => {
    const historyIndex = getHistoryIndex();

    if (historyIndex !== null) historyScrollPositions.set(historyIndex, scrollY);
  };

  const initialHistoryIndex = getHistoryIndex();
  const initialHistoryScroll = getPageScrollFromHistory();

  if (initialHistoryIndex !== null && initialHistoryScroll !== null) {
    historyScrollPositions.set(initialHistoryIndex, initialHistoryScroll);
  }

  const saveCurrentPageScroll = () => {
    saveScrollFrame = 0;
    savePageScrollToHistory();
  };

  const schedulePageScrollSave = (event: Event) => {
    if (!(event.target instanceof HTMLElement) || !event.target.matches('[data-page-scroll]')) return;

    // Remember every observed position synchronously so a Back/Forward traversal cannot outrun the throttled history
    // write and overwrite the destination entry with the page being left.
    rememberPageScroll(event.target.scrollTop);

    if (saveScrollFrame) return;

    saveScrollFrame = requestAnimationFrame(saveCurrentPageScroll);
  };

  const restoreAfterSwap = () => {
    restoreSidebarState();

    if (historyScrollToRestore !== null) {
      restorePageScroll(historyScrollToRestore);
    } else {
      // Keep a framework destination available until swapped scripts and islands have initialized.
      restoreSavedPageScroll(false);
    }
  };

  const finishRestore = () => {
    requestAnimationFrame(() => {
      if (historyScrollToRestore !== null) {
        restorePageScroll(historyScrollToRestore);
      } else {
        restoreSavedPageScroll();
      }

      historyScrollToRestore = null;
      savePageScrollToHistory();
      rememberPageScroll();
      setFrameworkTransitionSuppressed(document, false);
    });
  };

  const restoreDocumentState = () => {
    restoreSidebarState();

    if (!restoreSavedPageScroll()) {
      const historyScroll = getPageScrollFromHistory();

      if (historyScroll !== null) restorePageScroll(historyScroll);
    }

    rememberPageScroll();
  };

  const saveDocumentState = () => {
    saveSidebarState();
    rememberPageScroll();
    savePageScrollToHistory();
  };

  const prepareNavigation = (navigationEvent: TransitionBeforePreparationEvent) => {
    const frameworkNavigation = isFrameworkNavigation(navigationEvent.info);

    setFrameworkTransitionSuppressed(document, frameworkNavigation);

    if (navigationEvent.navigationType === 'traverse') {
      cancelAnimationFrame(saveScrollFrame);
      saveScrollFrame = 0;

      const historyIndex = getHistoryIndex();

      historyScrollToRestore =
        (historyIndex === null ? undefined : historyScrollPositions.get(historyIndex)) ?? getPageScrollFromHistory();
    } else {
      historyScrollToRestore = null;
      rememberPageScroll();
      savePageScrollToHistory();
    }
  };

  const prepareSwap = (navigationEvent: TransitionBeforeSwapEvent) => {
    saveSidebarState();
    setFrameworkTransitionSuppressed(navigationEvent.newDocument, isFrameworkNavigation(navigationEvent.info));
  };

  signal.addEventListener('abort', () => cancelAnimationFrame(saveScrollFrame), { once: true });
  document.addEventListener('scroll', schedulePageScrollSave, { capture: true, passive: true, signal });
  document.addEventListener('astro:before-preparation', prepareNavigation, { signal });
  document.addEventListener('astro:before-swap', prepareSwap, { signal });
  document.addEventListener('astro:after-swap', restoreAfterSwap, { signal });
  document.addEventListener('astro:page-load', finishRestore, { signal });
  window.addEventListener('pageshow', restoreDocumentState, { signal });
  window.addEventListener('pagehide', saveDocumentState, { signal });

  // Module scripts are deferred, so the page scroller exists here. Restore immediately as well as on pageshow so a
  // cached script that initializes after the page event cannot miss reload restoration.
  restoreDocumentState();
}
