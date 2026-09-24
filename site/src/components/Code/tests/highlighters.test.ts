import { describe, expect, it } from 'vite-plus/test';

import { getClientHighlighter } from '../clientHighlighter';
import serverHighlighter from '../serverHighlighter';

describe('code highlighters', () => {
  it('load every generated installation language', async () => {
    const client = await getClientHighlighter();

    expect(client.getLoadedLanguages()).toEqual(expect.arrayContaining(['astro', 'json']));
    expect(serverHighlighter.getLoadedLanguages()).toContain('astro');
  });
});
