import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';

export const PAGE_SCROLL_STORAGE_KEY = 'vjs-page-scroll';
export const PAGE_SCROLL_HISTORY_STATE_KEY = 'vjsPageScrollY';

declare global {
  interface Window {
    __videojsPageScrollController?: AbortController;
  }

  interface DocumentEventMap {
    'astro:before-preparation': TransitionBeforePreparationEvent;
  }
}

type SavedPageScroll = {
  url?: string;
  scrollY?: number;
};

export function getPageScrollContainer(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-page-scroll]');
}

export function getPageScrollTop(): number {
  return getPageScrollContainer()?.scrollTop ?? window.scrollY;
}

export function savePageScrollToHistory(): void {
  const state = window.history.state ?? {};
  const scrollY = getPageScrollTop();
  if (state[PAGE_SCROLL_HISTORY_STATE_KEY] === scrollY) return;

  try {
    window.history.replaceState({ ...state, [PAGE_SCROLL_HISTORY_STATE_KEY]: scrollY }, '');
  } catch {
    // Scroll tracking should not interrupt navigation when history state is unavailable.
  }
}

export function getPageScrollFromHistory(): number | null {
  const scrollY = window.history.state?.[PAGE_SCROLL_HISTORY_STATE_KEY];

  return Number.isFinite(scrollY) ? Math.max(0, scrollY) : null;
}

export function restorePageScroll(scrollY: number): void {
  const scrollContainer = getPageScrollContainer();

  if (scrollContainer) {
    scrollContainer.scrollTo({ left: 0, top: scrollY });
  } else {
    window.scrollTo({ left: 0, top: scrollY });
  }
}

/** Save the current page position for a navigation whose destination should keep the same content position. */
export function savePageScrollForNavigation(url: string): void {
  const scrollY = getPageScrollTop();

  savePageScrollToHistory();

  try {
    window.sessionStorage.setItem(
      PAGE_SCROLL_STORAGE_KEY,
      JSON.stringify({ url: new URL(url, window.location.origin).pathname, scrollY })
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

    restorePageScroll(scrollY ?? 0);

    if (removeAfterRestore) {
      window.sessionStorage.removeItem(PAGE_SCROLL_STORAGE_KEY);
    }

    return true;
  } catch {
    return false;
  }
}

/** Persist the shared page scroll container across reloads, history traversal, and Astro document swaps. */
export function initializePageScrollRestoration(): void {
  window.__videojsPageScrollController?.abort();

  const controller = new AbortController();
  const { signal } = controller;

  window.__videojsPageScrollController = controller;

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
    if (historyScrollToRestore !== null) {
      restorePageScroll(historyScrollToRestore);
    } else {
      // Keep a same-content destination available until swapped scripts and islands have initialized.
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
    });
  };

  const restoreDocumentState = () => {
    if (!restoreSavedPageScroll()) {
      const historyScroll = getPageScrollFromHistory();

      if (historyScroll !== null) restorePageScroll(historyScroll);
    }

    rememberPageScroll();
  };

  const saveDocumentState = () => {
    rememberPageScroll();
    savePageScrollToHistory();
  };

  const prepareNavigation = (navigationEvent: TransitionBeforePreparationEvent) => {
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

  signal.addEventListener('abort', () => cancelAnimationFrame(saveScrollFrame), { once: true });
  document.addEventListener('scroll', schedulePageScrollSave, { capture: true, passive: true, signal });
  document.addEventListener('astro:before-preparation', prepareNavigation, { signal });
  document.addEventListener('astro:after-swap', restoreAfterSwap, { signal });
  document.addEventListener('astro:page-load', finishRestore, { signal });
  window.addEventListener('pageshow', restoreDocumentState, { signal });
  window.addEventListener('pagehide', saveDocumentState, { signal });

  // Module scripts are deferred, so the page scroller exists here. Restore immediately as well as on pageshow so a
  // cached script that initializes after the page event cannot miss reload restoration.
  restoreDocumentState();
}
