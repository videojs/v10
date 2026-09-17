import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { currentFramework } from '@/stores/preferences';

import { initializeDocsNavigation, savePageScrollForNavigation, syncFrameworkPreferenceFromUrl } from '../navigation';
import { FRAMEWORK_COOKIE, getFrameworkPreferenceClient } from '../preferences';

describe('syncFrameworkPreferenceFromUrl', () => {
  afterEach(() => {
    window.__videojsDocsNavigationController?.abort();
    delete window.__videojsDocsNavigationController;
    currentFramework.set(null);
    document.cookie = `${FRAMEWORK_COOKIE}=; max-age=0; path=/`;
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  it('replaces stale framework state with the destination route before a swap', () => {
    currentFramework.set('react');
    document.cookie = `${FRAMEWORK_COOKIE}=react; path=/`;

    syncFrameworkPreferenceFromUrl(new URL('https://videojs.org/docs/framework/html/guides/installation'));

    expect(currentFramework.get()).toBe('html');
    expect(getFrameworkPreferenceClient()).toBe('html');
  });

  it('does not change the preference for a framework-agnostic route', () => {
    currentFramework.set('html');
    document.cookie = `${FRAMEWORK_COOKIE}=html; path=/`;

    syncFrameworkPreferenceFromUrl(new URL('https://videojs.org/docs'));

    expect(currentFramework.get()).toBe('html');
    expect(getFrameworkPreferenceClient()).toBe('html');
  });
});

describe('framework navigation scroll', () => {
  afterEach(() => {
    window.__videojsDocsNavigationController?.abort();
    delete window.__videojsDocsNavigationController;
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  it('saves the document position for the destination path', () => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(275);

    savePageScrollForNavigation('/docs/framework/react/guides/installation?source=picker');

    expect(JSON.parse(window.sessionStorage.getItem('vjs-page-scroll')!)).toEqual({
      url: '/docs/framework/react/guides/installation',
      scrollY: 275,
    });
  });

  it('restores a saved document position when the destination initializes', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    window.history.replaceState(null, '', '/docs/framework/html/guides/installation');
    window.sessionStorage.setItem(
      'vjs-page-scroll',
      JSON.stringify({ url: '/docs/framework/html/guides/installation', scrollY: 420 })
    );

    initializeDocsNavigation();

    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 420 });
    expect(window.sessionStorage.getItem('vjs-page-scroll')).toBeNull();
  });

  it('keeps Astro history in sync for reload restoration', () => {
    vi.spyOn(window, 'scrollX', 'get').mockReturnValue(12);
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(640);
    window.history.replaceState({ index: 3, scrollX: 0, scrollY: 0 }, '');

    initializeDocsNavigation();
    window.dispatchEvent(new Event('pagehide'));

    expect(window.history.state).toEqual({ index: 3, scrollX: 12, scrollY: 640 });
  });

  it('does not overwrite the destination history entry during traversal', () => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(640);
    window.history.replaceState({ index: 2, scrollX: 0, scrollY: 275 }, '');

    initializeDocsNavigation();

    const event = new Event('astro:before-preparation');

    Object.assign(event, { navigationType: 'traverse', info: null });
    document.dispatchEvent(event);

    expect(window.history.state).toEqual({ index: 2, scrollX: 0, scrollY: 275 });
  });

  it('does not interrupt navigation when session storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    expect(() => savePageScrollForNavigation('/docs/framework/html/guides/installation')).not.toThrow();
  });
});
