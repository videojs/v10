import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { currentFramework } from '@/stores/preferences';

import {
  DOCS_FRAMEWORK_NAVIGATION_INFO,
  findVisibleActiveSidebarLink,
  initializeDocsNavigation,
  savePageScrollForNavigation,
  syncFrameworkPreferenceFromUrl,
} from '../navigation';
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

    void syncFrameworkPreferenceFromUrl(new URL('https://videojs.org/docs/framework/html/guides/installation'));

    expect(currentFramework.get()).toBe('html');
    expect(getFrameworkPreferenceClient()).toBe('html');
  });

  it('synchronizes canonical installation routes', () => {
    currentFramework.set('react');
    document.cookie = `${FRAMEWORK_COOKIE}=react; path=/`;

    void syncFrameworkPreferenceFromUrl(new URL('https://videojs.org/docs/guides/installation/cdn'));

    expect(currentFramework.get()).toBe('html');
    expect(getFrameworkPreferenceClient()).toBe('html');
  });

  it('synchronizes the query-controlled Shadcn framework', async () => {
    currentFramework.set('react');
    document.cookie = `${FRAMEWORK_COOKIE}=react; path=/`;

    await syncFrameworkPreferenceFromUrl(new URL('https://videojs.org/docs/guides/installation/shadcn?framework=html'));

    expect(currentFramework.get()).toBe('html');
    expect(getFrameworkPreferenceClient()).toBe('html');
  });

  it('falls back from a Vue Shadcn query to HTML', async () => {
    await syncFrameworkPreferenceFromUrl(new URL('https://videojs.org/docs/guides/installation/shadcn?framework=vue'));

    expect(currentFramework.get()).toBe('html');
    expect(getFrameworkPreferenceClient()).toBe('html');
  });

  it('uses the saved preference when the Shadcn query is missing', async () => {
    currentFramework.set('react');
    document.cookie = `${FRAMEWORK_COOKIE}=html; path=/`;

    await syncFrameworkPreferenceFromUrl(new URL('https://videojs.org/docs/guides/installation/shadcn'));

    expect(currentFramework.get()).toBe('html');
    expect(getFrameworkPreferenceClient()).toBe('html');
  });

  it('leaves the Shadcn address bar to the installation stores', () => {
    window.history.replaceState({ index: 2 }, '', '/docs/guides/installation/shadcn?framework=vue&template=next');

    initializeDocsNavigation();

    expect(window.location.search).toBe('?framework=vue&template=next');
    expect(window.history.state).toEqual({ index: 2 });
  });

  it('does not change the preference for a framework-agnostic route', () => {
    currentFramework.set('html');
    document.cookie = `${FRAMEWORK_COOKIE}=html; path=/`;

    void syncFrameworkPreferenceFromUrl(new URL('https://videojs.org/docs'));

    expect(currentFramework.get()).toBe('html');
    expect(getFrameworkPreferenceClient()).toBe('html');
  });
});

describe('framework navigation scroll', () => {
  afterEach(() => {
    window.__videojsDocsNavigationController?.abort();
    delete window.__videojsDocsNavigationController;
    currentFramework.set(null);
    document.cookie = `${FRAMEWORK_COOKIE}=; max-age=0; path=/`;
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/');
    document.documentElement.removeAttribute('data-base-ui-scroll-locked');
    document.body.scrollTop = 0;
    document.body.replaceChildren();
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

  it('restores against the visible active link when another framework sidebar is hidden', () => {
    document.body.innerHTML = `
      <aside id="docs-sidebar">
        <div hidden><a aria-current="page">React installation</a></div>
        <div><a aria-current="page">HTML installation</a></div>
      </aside>
    `;
    const aside = document.getElementById('docs-sidebar')!;
    const [hiddenLink, visibleLink] = aside.querySelectorAll<HTMLElement>('a');
    const visibleRect = visibleLink!.getBoundingClientRect();
    const hiddenRects = Object.assign([] as DOMRect[], { item: () => null }) satisfies DOMRectList;
    const visibleRects = Object.assign([visibleRect], {
      item: (index: number) => (index === 0 ? visibleRect : null),
    }) satisfies DOMRectList;

    vi.spyOn(hiddenLink!, 'getClientRects').mockReturnValue(hiddenRects);
    vi.spyOn(visibleLink!, 'getClientRects').mockReturnValue(visibleRects);

    expect(findVisibleActiveSidebarLink(aside)).toBe(visibleLink);
  });

  it('saves the locked body position while a Base UI popup is open', () => {
    document.documentElement.setAttribute('data-base-ui-scroll-locked', '');
    document.body.scrollTop = 315;

    savePageScrollForNavigation('/docs/framework/react/guides/installation');

    expect(JSON.parse(window.sessionStorage.getItem('vjs-page-scroll')!)).toEqual({
      url: '/docs/framework/react/guides/installation',
      scrollY: 315,
    });

    document.documentElement.removeAttribute('data-base-ui-scroll-locked');
    document.body.scrollTop = 0;
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

  it('preserves an installation method nav position when content above it changes height', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const scrollY = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(900);
    const nav = document.createElement('nav');

    nav.dataset.installationMethodNav = '';
    document.body.append(nav);
    vi.spyOn(nav, 'getBoundingClientRect').mockReturnValue({ top: 240 } as DOMRect);

    savePageScrollForNavigation('/docs/framework/html/guides/installation-shadcn', '[data-installation-method-nav]');

    vi.spyOn(nav, 'getBoundingClientRect').mockReturnValue({ top: 320 } as DOMRect);
    window.history.replaceState(null, '', '/docs/framework/html/guides/installation-shadcn');
    initializeDocsNavigation();

    expect(scrollY).toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: 980 });
  });

  it('restores only the latest handoff when a framework navigation is superseded', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const scrollY = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(275);

    savePageScrollForNavigation('/docs/framework/html/guides/installation-vue');
    scrollY.mockReturnValue(420);
    savePageScrollForNavigation('/docs/framework/html/guides/installation-svelte');
    window.history.replaceState(null, '', '/docs/framework/html/guides/installation-svelte');

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

  it('restores an indexed Astro history position on a document reload', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ type: 'reload' } as PerformanceNavigationTiming]);
    window.history.replaceState({ index: 3, scrollX: 12, scrollY: 640 }, '');

    initializeDocsNavigation();

    expect(scrollTo).toHaveBeenCalledWith({ left: 12, top: 640 });
  });

  it('does not retry a reload position after a client navigation starts', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);

      return 1;
    });
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ type: 'reload' } as PerformanceNavigationTiming]);
    window.history.replaceState({ index: 3, scrollX: 12, scrollY: 640 }, '');

    initializeDocsNavigation();

    const event = new Event('astro:before-preparation');

    Object.assign(event, { info: null });
    document.dispatchEvent(event);
    document.dispatchEvent(new Event('astro:page-load'));

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ left: 12, top: 640 });
  });

  it('leaves indexed history positions to Astro outside document reloads', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ type: 'navigate' } as PerformanceNavigationTiming]);
    window.history.replaceState({ index: 3, scrollX: 12, scrollY: 640 }, '');

    initializeDocsNavigation();

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does not turn a stateless browser entry into partial Astro history state', () => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(640);
    window.history.replaceState(null, '');

    initializeDocsNavigation();
    window.dispatchEvent(new Event('pagehide'));

    expect(window.history.state).toBeNull();
  });

  it('leaves ordinary scroll history updates to Astro', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');

    initializeDocsNavigation();
    window.dispatchEvent(new Event('scroll'));

    expect(replaceState).not.toHaveBeenCalled();
  });

  it('clears a saved position that belongs to a different destination', () => {
    window.history.replaceState(null, '', '/docs/framework/html/guides/installation');
    window.sessionStorage.setItem(
      'vjs-page-scroll',
      JSON.stringify({ url: '/docs/framework/react/guides/installation', scrollY: 420 })
    );

    initializeDocsNavigation();

    expect(window.sessionStorage.getItem('vjs-page-scroll')).toBeNull();
  });

  it('repairs the departing history entry before a push swap while Base UI has moved scroll onto the body', () => {
    document.documentElement.setAttribute('data-base-ui-scroll-locked', '');
    document.body.scrollTop = 315;
    window.history.replaceState({ index: 2, scrollX: 0, scrollY: 0 }, '');

    initializeDocsNavigation();

    const event = new Event('astro:before-swap');

    Object.assign(event, {
      navigationType: 'push',
      info: DOCS_FRAMEWORK_NAVIGATION_INFO,
      to: new URL('https://videojs.org/docs/framework/react/guides/installation'),
      newDocument: document.implementation.createHTMLDocument(),
    });
    document.dispatchEvent(event);

    expect(window.history.state).toEqual({ index: 2, scrollX: 0, scrollY: 315 });
  });

  it('does not overwrite the destination history entry during traversal', () => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(640);
    window.history.replaceState({ index: 2, scrollX: 0, scrollY: 275 }, '');

    initializeDocsNavigation();

    const event = new Event('astro:before-swap');

    Object.assign(event, {
      navigationType: 'traverse',
      info: null,
      to: new URL('https://videojs.org/docs/framework/html/guides/installation'),
      newDocument: document.implementation.createHTMLDocument(),
    });
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

describe('initializeDocsNavigation', () => {
  afterEach(() => {
    window.__videojsDocsNavigationController?.abort();
    delete window.__videojsDocsNavigationController;
    currentFramework.set(null);
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  function appendMedia(tag: 'audio' | 'video', networkState: number, source?: { src?: string; child?: string }) {
    const media = document.createElement(tag);

    if (source?.src) media.setAttribute('src', source.src);

    if (source?.child) media.append(Object.assign(document.createElement('source'), { src: source.child }));

    Object.defineProperty(media, 'networkState', { value: networkState });
    document.body.append(media);

    return media;
  }

  it('reloads swapped media whose load was rejected in the parsed destination document', () => {
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    const video = appendMedia('video', HTMLMediaElement.NETWORK_NO_SOURCE, { src: 'https://example.com/video.mp4' });
    const audio = appendMedia('audio', HTMLMediaElement.NETWORK_NO_SOURCE, { child: 'https://example.com/audio.mp3' });

    initializeDocsNavigation();
    document.dispatchEvent(new Event('astro:after-swap'));

    expect(load.mock.contexts).toEqual([video, audio]);
  });

  it('leaves loading and sourceless media alone after a swap', () => {
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});

    appendMedia('video', HTMLMediaElement.NETWORK_IDLE, { src: 'https://example.com/video.mp4' });
    appendMedia('video', HTMLMediaElement.NETWORK_NO_SOURCE);

    initializeDocsNavigation();
    document.dispatchEvent(new Event('astro:after-swap'));

    expect(load).not.toHaveBeenCalled();
  });
});
