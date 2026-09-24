import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vite-plus/test';

import { getClientHighlighter } from '../clientHighlighter';
import serverHighlighter from '../serverHighlighter';
import Shared from '../Shared';

describe('code highlighters', () => {
  it('load every generated installation language', async () => {
    const client = await getClientHighlighter();

    expect(client.getLoadedLanguages()).toEqual(expect.arrayContaining(['astro', 'json']));
    expect(serverHighlighter.getLoadedLanguages()).toContain('astro');
  });

  it('focuses selected generated lines without changing their copyable text', () => {
    const code = '{\n  "components": "@/components"\n}';
    const markup = renderToString(
      createElement(Shared, { code, focusLines: [2], lang: 'json', highlighter: serverHighlighter })
    );

    expect(markup).toContain('class="line focused"');
    expect(markup).toContain('components');
    expect(markup).toContain('@/components');
    expect(markup).not.toContain('!code');
  });
});
