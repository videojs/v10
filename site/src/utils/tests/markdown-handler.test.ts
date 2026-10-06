import { describe, expect, it } from 'vite-plus/test';

import { handleMarkdown, staticMarkdownHeaderRules } from '../markdown-handler';

/** Read `_headers` rules the way Netlify does: a path line, then indented `name: value` lines. */
function parseHeaderRules(rules: string): Map<string, Record<string, string>> {
  const parsed = new Map<string, Record<string, string>>();
  let current: Record<string, string> | undefined;

  for (const line of rules.split('\n')) {
    if (!line.trim()) continue;

    if (!line.startsWith(' ')) {
      current = {};
      parsed.set(line, current);
      continue;
    }

    const separator = line.indexOf(':');

    current![line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }

  return parsed;
}

describe('staticMarkdownHeaderRules', () => {
  it('gives each static twin the headers the edge handler sets on negotiated Markdown', async () => {
    const rules = parseHeaderRules(
      staticMarkdownHeaderRules(['/docs/framework/react/guides/build-with-ai.md', '/docs/guides/installation.md'])
    );
    const negotiated = await handleMarkdown(
      new Request('https://videojs.org/docs/framework/react/guides/build-with-ai', {
        headers: { accept: 'text/markdown' },
      }),
      { next: async () => new Response('# Build with AI') }
    );

    expect([...rules.keys()]).toEqual([
      '/docs/framework/react/guides/build-with-ai.md',
      '/docs/guides/installation.md',
    ]);

    for (const headers of rules.values()) {
      expect(headers).toEqual({
        'content-type': negotiated!.headers.get('content-type'),
        'cache-control': negotiated!.headers.get('cache-control'),
        'netlify-cdn-cache-control': negotiated!.headers.get('netlify-cdn-cache-control'),
      });
    }
  });

  it('leaves installation twins to the edge function', () => {
    expect(
      staticMarkdownHeaderRules(['/docs/guides/installation/react.md', '/docs/guides/installation/shadcn.md'])
    ).toBe('');
  });
});
