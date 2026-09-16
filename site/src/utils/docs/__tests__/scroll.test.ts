import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import {
  getPageScrollFromHistory,
  PAGE_SCROLL_HISTORY_STATE_KEY,
  PAGE_SCROLL_STORAGE_KEY,
  restorePageScroll,
  savePageScrollForNavigation,
  savePageScrollToHistory,
} from '../scroll';

describe('savePageScrollForNavigation', () => {
  afterEach(() => {
    document.querySelector('[data-page-scroll]')?.remove();
    window.sessionStorage.clear();
    window.history.replaceState(null, '');
    vi.restoreAllMocks();
  });

  it('saves the page container position for the destination path', () => {
    const scrollContainer = document.createElement('div');

    scrollContainer.dataset.pageScroll = '';
    scrollContainer.scrollTop = 420;
    document.body.append(scrollContainer);

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
    const scrollContainer = document.createElement('div');

    scrollContainer.dataset.pageScroll = '';
    scrollContainer.scrollTop = 640;
    document.body.append(scrollContainer);
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

  it('does not create history state before the client router initializes it', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');

    savePageScrollToHistory();

    expect(replaceState).not.toHaveBeenCalled();
  });

  it('ignores invalid saved positions', () => {
    window.history.replaceState({ [PAGE_SCROLL_HISTORY_STATE_KEY]: '640' }, '');

    expect(getPageScrollFromHistory()).toBeNull();
  });

  it('restores the page container without moving the window', () => {
    const scrollContainer = document.createElement('div');
    const scrollTo = vi.fn();
    const windowScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    scrollContainer.dataset.pageScroll = '';
    scrollContainer.scrollTo = scrollTo;
    document.body.append(scrollContainer);

    restorePageScroll(520);

    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 520 });
    expect(windowScrollTo).not.toHaveBeenCalled();
  });
});
