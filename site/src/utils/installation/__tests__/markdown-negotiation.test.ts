import { describe, expect, it, vi } from 'vite-plus/test';

import directMarkdown, { config as directConfig } from '../../../../netlify/edge-functions/markdown-direct';
import negotiateMarkdown, {
  config as negotiationConfig,
} from '../../../../netlify/edge-functions/markdown-negotiation';

const staticMarkdown = `# Shadcn Installation Guide

Intro.

<!-- installation-plan:start -->

Default steps.

<!-- installation-plan:end -->
`;

function createContext(markdown = staticMarkdown) {
  const next = vi.fn(async (_request: Request) => new Response(markdown));

  return { context: { next }, next };
}

describe('markdown negotiation', () => {
  it('renders a query-selected Vue Shadcn plan into the authored page', async () => {
    const { context, next } = createContext();
    const request = new Request(
      'https://videojs.org/docs/guides/installation/shadcn.md?framework=vue&preset=audio&media=spotify'
    );
    const response = await directMarkdown(request, context);
    const body = await response!.text();

    expect(response?.status).toBe(200);
    expect(response?.headers.get('netlify-vary')).toContain('query=preset|skin|media');
    expect(body).toContain('# Shadcn Installation Guide');
    expect(body).toContain('- `framework`: `vue`');
    expect(body).toContain('- `media`: `spotify`');
    expect(body).toContain('components/videojs/audio/skin.html');
    expect(next).toHaveBeenCalledOnce();
    expect(new URL(next.mock.calls[0]![0].url).pathname).toBe('/docs/guides/installation/shadcn.md');
  });

  it('rejects invalid option combinations as Markdown', async () => {
    const { context } = createContext();
    const request = new Request(
      'https://videojs.org/docs/guides/installation/shadcn.md?framework=vue&preset=background-video'
    );
    const response = await directMarkdown(request, context);

    expect(response?.status).toBe(400);
    expect(await response!.text()).toContain('Background Video is not available');
  });

  it('rejects an unknown Shadcn framework instead of silently rendering React', async () => {
    const { context } = createContext();
    const request = new Request('https://videojs.org/docs/guides/installation/shadcn.md?framework=angular');
    const response = await directMarkdown(request, context);

    expect(response?.status).toBe(400);
    expect(await response!.text()).toContain('framework: Expected one of: react, html, vue, svelte');
  });

  it('does not publicly cache a source URL', async () => {
    const { context } = createContext();
    const request = new Request(
      'https://videojs.org/docs/guides/installation/shadcn.md?framework=react&source-url=https%3A%2F%2Fexample.com%2Fsigned.m3u8'
    );
    const response = await directMarkdown(request, context);

    expect(response?.headers.get('cache-control')).toBe('private, no-store');
  });

  it('rewrites Accept negotiation through the current request chain', async () => {
    const { context, next } = createContext('# React Installation Guide');
    const request = new Request('https://videojs.org/docs/guides/installation/react?ignored=value', {
      headers: { accept: 'text/markdown' },
    });
    const response = await negotiateMarkdown(request, context);
    const assetRequest = next.mock.calls[0]![0];

    expect(response?.status).toBe(200);
    expect(assetRequest.url).toBe('https://videojs.org/docs/guides/installation/react.md');
  });

  it('leaves normal HTML requests alone', async () => {
    const { context, next } = createContext();

    expect(
      await negotiateMarkdown(
        new Request('https://videojs.org/docs/guides/installation/react', { headers: { accept: 'text/html' } }),
        context
      )
    ).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it('declares separate direct Markdown and Accept-negotiation routes', () => {
    expect(negotiationConfig.header).toEqual({ accept: 'text/markdown' });
    expect(negotiationConfig.excludedPath).toContain('/docs/*.md');
    expect(negotiationConfig.method).toBe('GET');
    expect(directConfig.path).toContain('/docs/*.md');
    expect(directConfig.method).toBe('GET');
  });
});
