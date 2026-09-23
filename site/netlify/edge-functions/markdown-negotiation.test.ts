import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import negotiateMarkdown from './markdown-negotiation';

const staticMarkdown = `# Shadcn Installation Guide

Intro.

<!-- installation-plan:start -->

Default steps.

<!-- installation-plan:end -->
`;

describe('markdown negotiation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders a query-selected Vue Shadcn plan into the authored page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(staticMarkdown))
    );
    const request = new Request(
      'https://videojs.org/docs/guides/installation/shadcn.md?framework=vue&preset=audio&media=spotify'
    );
    const response = await negotiateMarkdown(request);
    const body = await response!.text();

    expect(response?.status).toBe(200);
    expect(response?.headers.get('netlify-vary')).toContain('query=preset|skin|media');
    expect(body).toContain('# Shadcn Installation Guide');
    expect(body).toContain('- `framework`: `vue`');
    expect(body).toContain('- `media`: `spotify`');
    expect(body).toContain('components/videojs/audio/skin.html');
  });

  it('rejects invalid option combinations as Markdown', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(staticMarkdown))
    );
    const request = new Request(
      'https://videojs.org/docs/guides/installation/shadcn.md?framework=vue&preset=background-video'
    );
    const response = await negotiateMarkdown(request);

    expect(response?.status).toBe(400);
    expect(await response!.text()).toContain('Background Video is not available');
  });

  it('does not publicly cache a source URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(staticMarkdown))
    );
    const request = new Request(
      'https://videojs.org/docs/guides/installation/shadcn.md?framework=react&source-url=https%3A%2F%2Fexample.com%2Fsigned.m3u8'
    );
    const response = await negotiateMarkdown(request);

    expect(response?.headers.get('cache-control')).toBe('private, no-store');
  });

  it('leaves normal HTML requests alone', async () => {
    const fetch = vi.fn();

    vi.stubGlobal('fetch', fetch);

    expect(
      await negotiateMarkdown(
        new Request('https://videojs.org/docs/guides/installation/react', { headers: { accept: 'text/html' } })
      )
    ).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});
