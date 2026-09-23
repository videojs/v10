import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import CopyMarkdownButton, { markdownUrl } from './CopyMarkdownButton';

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
            '?framework=html&preset=audio&skin=fancy&media=youtube&install-method=deno&template=next&styling=tailwind',
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
        search:
          '?framework=react&preset=background-video&skin=none&media=background-video&install-method=yarn&package-manager=pnpm',
      })
    ).toBe('https://videojs.org/docs/guides/installation/shadcn.md?framework=react&install-method=yarn');
  });
});
