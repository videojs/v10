import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import CopyMarkdownButton, { markdownUrl, publicMarkdownUrl } from '../CopyMarkdownButton';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('markdownUrl', () => {
  it('preserves installation query parameters on the Markdown twin', () => {
    expect(
      markdownUrl({
        origin: 'https://videojs.org',
        pathname: '/docs/guides/installation/shadcn/',
        search: '?framework=html&preset=audio',
      })
    ).toBe('https://videojs.org/docs/guides/installation/shadcn.md?framework=html&preset=audio');
  });

  it('uses the visible saved Shadcn source framework when the URL is not normalized yet', () => {
    expect(
      markdownUrl(
        {
          origin: 'https://videojs.org',
          pathname: '/docs/guides/installation/shadcn',
          search: '?preset=audio',
        },
        'html'
      )
    ).toBe('https://videojs.org/docs/guides/installation/shadcn.md?preset=audio&framework=html');
  });

  it('copies the normalized choices shown by an installation page', () => {
    expect(
      markdownUrl(
        {
          origin: 'https://videojs.org',
          pathname: '/docs/guides/installation/shadcn',
          search:
            '?framework=html&preset=audio&skin=fancy&media=youtube&package-manager=deno&template=next&styling=tailwind',
        },
        'html'
      )
    ).toBe('https://videojs.org/docs/guides/installation/shadcn.md?framework=html&preset=audio');
  });

  it('keeps compatible Shadcn template and styling choices', () => {
    expect(
      markdownUrl({
        origin: 'https://videojs.org',
        pathname: '/docs/guides/installation/shadcn',
        search: '?framework=react&template=vite&styling=css',
      })
    ).toBe('https://videojs.org/docs/guides/installation/shadcn.md?framework=react&template=vite&styling=css');
  });

  it('refreshes menu links from the current URL whenever the menu opens', async () => {
    const user = userEvent.setup();

    window.history.replaceState(null, '', '/docs/guides/installation/shadcn?framework=react');
    render(createElement(CopyMarkdownButton));

    const trigger = await screen.findByRole('button', { name: 'More ways to use this page' });

    await user.click(trigger);
    expect(await screen.findByRole('menuitem', { name: 'View as Markdown' })).toHaveAttribute(
      'href',
      'http://localhost:3000/docs/guides/installation/shadcn.md?framework=react'
    );

    await user.keyboard('{Escape}');
    window.history.replaceState(null, '', '/docs/guides/installation/shadcn?framework=html');
    await user.click(trigger);

    expect(await screen.findByRole('menuitem', { name: 'View as Markdown' })).toHaveAttribute(
      'href',
      'http://localhost:3000/docs/guides/installation/shadcn.md?framework=html'
    );
  });

  it('drops Markdown-only aliases and normalizes unsupported Shadcn combinations', () => {
    expect(
      markdownUrl({
        origin: 'https://videojs.org',
        pathname: '/docs/guides/installation/shadcn',
        search: '?framework=react&preset=background-video&skin=none&media=background-video&package-manager=pnpm',
      })
    ).toBe('https://videojs.org/docs/guides/installation/shadcn.md?framework=react&package-manager=pnpm');
  });

  it('keeps a private source URL for copying but removes it from assistant links', () => {
    const url = markdownUrl({
      origin: 'https://videojs.org',
      pathname: '/docs/guides/installation/react',
      search: '?source-url=https%3A%2F%2Fexample.com%2Fsigned.m3u8&preset=audio&template=next&styling=tailwind',
    });

    expect(url).toContain('source-url=');
    expect(publicMarkdownUrl(url)).toBe('https://videojs.org/docs/guides/installation/react.md?preset=audio');
  });

  it('never sends a private source URL to an assistant', async () => {
    const user = userEvent.setup();

    window.history.replaceState(
      null,
      '',
      '/docs/guides/installation/react?preset=audio&source-url=https%3A%2F%2Fexample.com%2Fsigned.m3u8'
    );
    render(createElement(CopyMarkdownButton));

    await user.click(await screen.findByRole('button', { name: 'More ways to use this page' }));

    expect(await screen.findByRole('menuitem', { name: 'View as Markdown' })).toHaveAttribute(
      'href',
      expect.stringContaining('source-url=')
    );

    for (const name of ['Open in ChatGPT', 'Open in Claude']) {
      const href = (await screen.findByRole('menuitem', { name })).getAttribute('href') ?? '';

      expect(decodeURIComponent(href)).not.toContain('source-url');
      expect(decodeURIComponent(href)).not.toContain('signed.m3u8');
    }
  });
});
