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

<!-- installation:framework react -->
React follow-up.
<!-- /installation:framework react -->

<!-- installation:framework html -->
HTML follow-up.
<!-- /installation:framework html -->
`;

function createContext(markdown = staticMarkdown) {
  const next = vi.fn(async (_request: Request) => new Response(markdown));

  return { context: { next }, next };
}

describe('markdown negotiation', () => {
  it('renders a query-selected HTML Shadcn plan into the authored page', async () => {
    const { context, next } = createContext();
    const request = new Request(
      'https://videojs.org/docs/guides/installation/shadcn.md?framework=html&preset=audio&media=spotify'
    );
    const response = await directMarkdown(request, context);
    const body = await response!.text();

    expect(response?.status).toBe(200);
    expect(response?.headers.get('netlify-vary')).toContain('package-manager');
    expect(response?.headers.get('netlify-vary')).not.toContain('install-method');
    expect(body).toContain('# Shadcn Installation Guide');
    expect(body).toContain('- `framework`: `html`');
    expect(body).toContain('- `media`: `spotify`');
    expect(body).toContain('components/videojs/audio/skin.html');
    expect(body).toContain('HTML follow-up.');
    expect(body).not.toContain('React follow-up.');
    expect(next).toHaveBeenCalledOnce();
    expect(new URL(next.mock.calls[0]![0].url).pathname).toBe('/docs/guides/installation/shadcn.md');
  });

  it('renders and filters the default installation even without query parameters', async () => {
    const { context } = createContext();
    const response = await directMarkdown(
      new Request('https://videojs.org/docs/guides/installation/shadcn.md'),
      context
    );
    const body = await response!.text();

    expect(body).toContain('- `framework`: `react`');
    expect(body).toContain('React follow-up.');
    expect(body).not.toContain('HTML follow-up.');
  });

  it('rejects invalid option combinations as Markdown', async () => {
    const { context } = createContext();
    const request = new Request(
      'https://videojs.org/docs/guides/installation/shadcn.md?framework=html&preset=background-video'
    );
    const response = await directMarkdown(request, context);

    expect(response?.status).toBe(400);
    expect(await response!.text()).toContain('Background Video is not available');
  });

  it('rejects a Vue or Svelte Shadcn plan with the packaged alternative', async () => {
    for (const framework of ['vue', 'svelte']) {
      const { context } = createContext();
      const request = new Request(`https://videojs.org/docs/guides/installation/shadcn.md?framework=${framework}`);
      const response = await directMarkdown(request, context);

      expect(response?.status).toBe(400);
      expect(await response!.text()).toContain('Use packaged installation for Vue or Svelte.');
    }
  });

  it('rejects an unknown Shadcn framework instead of silently rendering React', async () => {
    const { context } = createContext();
    const request = new Request('https://videojs.org/docs/guides/installation/shadcn.md?framework=angular');
    const response = await directMarkdown(request, context);

    expect(response?.status).toBe(400);
    expect(await response!.text()).toContain('framework: Expected one of: react, html, vue, svelte');
  });

  it('does not reflect invalid query content into Markdown errors', async () => {
    const { context } = createContext();
    const request = new Request(
      `https://videojs.org/docs/guides/installation/shadcn.md?media=${encodeURIComponent('\n\n# Injected')}`
    );
    const response = await directMarkdown(request, context);
    const body = await response!.text();

    expect(response?.status).toBe(400);
    expect(body).not.toContain('Injected');
  });

  it('does not publicly cache a source URL', async () => {
    const { context } = createContext();
    const request = new Request(
      'https://videojs.org/docs/guides/installation/shadcn.md?framework=react&source-url=https%3A%2F%2Fexample.com%2Fsigned.m3u8'
    );
    const response = await directMarkdown(request, context);

    expect(response?.headers.get('cache-control')).toBe('private, no-store');
  });

  it('streams non-installation Markdown without installation cache variance', async () => {
    const { context } = createContext('# Build with AI');
    const response = await directMarkdown(new Request('https://videojs.org/docs/guides/build-with-ai.md'), context);

    expect(response?.headers.get('netlify-vary')).toBeNull();
    expect(response?.headers.get('cache-control')).toBe('public, s-maxage=31536000');
    expect(await response?.text()).toBe('# Build with AI');
  });

  it('rewrites Accept negotiation through the current request chain', async () => {
    const { context, next } = createContext(`# React Installation Guide

<!-- installation-plan:start -->
Default steps.
<!-- installation-plan:end -->`);
    const request = new Request('https://videojs.org/docs/guides/installation/react?ignored=value', {
      headers: { accept: 'text/markdown' },
    });
    const response = await negotiateMarkdown(request, context);
    const assetRequest = next.mock.calls[0]![0];

    expect(response?.status).toBe(200);
    expect(assetRequest.url).toBe('https://videojs.org/docs/guides/installation/react.md');
  });

  it('passes normal HTML requests through with an Accept variance', async () => {
    const { context, next } = createContext();
    const response = await negotiateMarkdown(
      new Request('https://videojs.org/docs/guides/installation/react', { headers: { accept: 'text/html' } }),
      context
    );

    expect(response?.headers.get('vary')).toBe('Accept');
    expect(next).toHaveBeenCalledWith();
  });

  it('declares separate direct Markdown and Accept-negotiation routes', () => {
    expect(negotiationConfig.header).toEqual({ accept: '[Tt][Ee][Xx][Tt]/[Mm][Aa][Rr][Kk][Dd][Oo][Ww][Nn]' });
    expect(negotiationConfig.excludedPath).toContain('/docs/*.md');
    expect(negotiationConfig.method).toBe('GET');
    expect(directConfig.path).toContain('/docs/*.md');
    expect(directConfig.method).toBe('GET');
    expect(negotiationConfig.excludedPath).toEqual(directConfig.path);

    const directPaths = Array.isArray(directConfig.path) ? directConfig.path : [directConfig.path];
    const nestedGuide = new URL('https://videojs.org/docs/guides/installation/shadcn.md');

    expect(directPaths.some((path) => new URLPattern({ pathname: path }).test(nestedGuide))).toBe(true);
  });
});
