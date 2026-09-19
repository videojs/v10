import { afterEach, describe, expect, it } from 'vite-plus/test';

import { currentFramework } from '@/stores/preferences';

import { initializeDocsLinks } from '../links';
import { FRAMEWORK_COOKIE } from '../preferences';

function renderLink(slug = 'guides/architecture', hash = ''): HTMLAnchorElement {
  document.body.innerHTML = `<a href="/docs/${slug}${hash}" data-docs-slug="${slug}">Guide</a>`;

  return document.querySelector<HTMLAnchorElement>('a')!;
}

describe('initializeDocsLinks', () => {
  afterEach(() => {
    window.__videojsDocsLinksController?.abort();
    delete window.__videojsDocsLinksController;
    currentFramework.set(null);
    document.cookie = `${FRAMEWORK_COOKIE}=; max-age=0; path=/`;
    document.body.replaceChildren();
  });

  it('updates agnostic links when the selected framework changes', () => {
    currentFramework.set('html');
    const link = renderLink('guides/architecture', '#ui-components');

    initializeDocsLinks();

    expect(link.pathname).toBe('/docs/framework/html/guides/architecture');
    expect(link.hash).toBe('#ui-components');

    currentFramework.set('react');

    expect(link.pathname).toBe('/docs/framework/react/guides/architecture');
  });

  it('adds the selected framework to Shadcn links', () => {
    currentFramework.set('html');
    const link = renderLink('guides/installation-shadcn');

    initializeDocsLinks();

    expect(`${link.pathname}${link.search}`).toBe('/docs/guides/installation/shadcn?framework=html');
  });

  it('updates links swapped into the document by Astro', () => {
    currentFramework.set('react');
    initializeDocsLinks();

    const link = renderLink();

    document.dispatchEvent(new Event('astro:page-load'));

    expect(link.pathname).toBe('/docs/framework/react/guides/architecture');
  });
});
