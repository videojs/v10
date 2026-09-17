import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import {
  getPageScrollFromHistory,
  initializePageScrollRestoration,
  PAGE_SCROLL_HISTORY_STATE_KEY,
  PAGE_SCROLL_STORAGE_KEY,
  restorePageScroll,
  savePageScrollForNavigation,
  savePageScrollToHistory,
} from '../page-scroll';

function appendPageScroller(scrollTop = 0): HTMLElement {
  const scrollContainer = document.createElement('div');

  scrollContainer.dataset.pageScroll = '';
  scrollContainer.scrollTop = scrollTop;
  document.body.append(scrollContainer);

  return scrollContainer;
}

describe('savePageScrollForNavigation', () => {
  afterEach(() => {
    document.querySelector('[data-page-scroll]')?.remove();
    window.sessionStorage.clear();
    window.history.replaceState(null, '');
    vi.restoreAllMocks();
  });

  it('saves the page container position for the destination path', () => {
    appendPageScroller(420);

    savePageScrollForNavigation('/docs/framework/html/guides/installation-vue?source=picker');

    expect(JSON.parse(window.sessionStorage.getItem(PAGE_SCROLL_STORAGE_KEY)!)).toEqual({
      url: '/docs/framework/html/guides/installation-vue',
      scrollY: 420,
    });
  });

  it('falls back to the window position without a page container', () => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(275);

    savePageScrollForNavigation('/docs/framework/react/guides/installation');

    expect(JSON.parse(window.sessionStorage.getItem(PAGE_SCROLL_STORAGE_KEY)!)).toEqual({
      url: '/docs/framework/react/guides/installation',
      scrollY: 275,
    });
  });

  it('does not interrupt navigation when session storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    expect(() => savePageScrollForNavigation('/docs/framework/html/guides/installation')).not.toThrow();
  });
});

describe('page scroll history', () => {
  afterEach(() => {
    document.querySelector('[data-page-scroll]')?.remove();
    window.history.replaceState(null, '');
    vi.restoreAllMocks();
  });

  it('stores the page container position on the current history entry', () => {
    appendPageScroller(640);
    window.history.replaceState({ index: 3, scrollX: 0, scrollY: 0 }, '');

    savePageScrollToHistory();

    expect(window.history.state).toEqual({
      index: 3,
      scrollX: 0,
      scrollY: 0,
      [PAGE_SCROLL_HISTORY_STATE_KEY]: 640,
    });
    expect(getPageScrollFromHistory()).toBe(640);
  });

  it('creates history state for pages without the client router', () => {
    appendPageScroller(320);

    savePageScrollToHistory();

    expect(window.history.state).toEqual({ [PAGE_SCROLL_HISTORY_STATE_KEY]: 320 });
  });

  it('ignores invalid saved positions', () => {
    window.history.replaceState({ [PAGE_SCROLL_HISTORY_STATE_KEY]: '640' }, '');

    expect(getPageScrollFromHistory()).toBeNull();
  });

  it('restores the page container without moving the window', () => {
    const scrollContainer = appendPageScroller();
    const scrollTo = vi.fn();
    const windowScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    scrollContainer.scrollTo = scrollTo;

    restorePageScroll(520);

    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 520 });
    expect(windowScrollTo).not.toHaveBeenCalled();
  });
});

describe('initializePageScrollRestoration', () => {
  afterEach(() => {
    window.__videojsPageScrollController?.abort();
    delete window.__videojsPageScrollController;
    document.querySelector('[data-page-scroll]')?.remove();
    window.sessionStorage.clear();
    window.history.replaceState(null, '');
    vi.restoreAllMocks();
  });

  it('restores a non-router page position from its history entry after reload', () => {
    const scrollContainer = appendPageScroller(730);
    const scrollTo = vi.fn();

    scrollContainer.scrollTo = scrollTo;
    initializePageScrollRestoration();

    window.dispatchEvent(new Event('pagehide'));
    expect(window.history.state).toEqual({ [PAGE_SCROLL_HISTORY_STATE_KEY]: 730 });

    scrollContainer.scrollTop = 0;
    window.dispatchEvent(new Event('pageshow'));

    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 730 });
  });
});
