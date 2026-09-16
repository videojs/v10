export const PAGE_SCROLL_STORAGE_KEY = 'vjs-page-scroll';
export const PAGE_SCROLL_HISTORY_STATE_KEY = 'vjsPageScrollY';

export function getPageScrollContainer(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-page-scroll]');
}

export function getPageScrollTop(): number {
  return getPageScrollContainer()?.scrollTop ?? window.scrollY;
}

export function savePageScrollToHistory(): void {
  const state = window.history.state;
  if (!state) return;

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

/** Save the current page position for a same-context docs navigation. */
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
