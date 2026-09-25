import { act } from '@testing-library/react';
import { createElement } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToReadableStream, renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import ClientCode from '../ClientCode';
import { getClientHighlighter } from '../clientHighlighter';
import Shared from '../Shared';

async function renderStream(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);

  await stream.allReady;

  return new Response(stream).text();
}

describe('ClientCode', () => {
  let root: Root | null = null;

  afterEach(async () => {
    if (root) await act(() => root?.unmount());

    root = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('streams highlighted code inline without deferred Suspense boundaries', async () => {
    vi.stubGlobal('window', undefined);

    const code = Array.from({ length: 400 }, (_, index) => `npx shadcn@latest add @videojs/video-${index}`).join('\n');
    const markup = await renderStream(
      createElement(
        'div',
        null,
        createElement(ClientCode, { code, lang: 'bash' }),
        createElement(ClientCode, { code, lang: 'bash' })
      )
    );

    expect(markup).toContain('video-399');
    expect(markup).not.toMatch(/<!--\$[?!]?-->|\$RC\(/);
  });

  it('hydrates the server-highlighted markup and replaces it when the code changes', async () => {
    const highlighter = await getClientHighlighter();
    const container = document.createElement('div');
    const errors = vi.spyOn(console, 'error');

    container.innerHTML = renderToString(createElement(Shared, { code: 'pnpm dev', lang: 'bash', highlighter }));

    const serverMarkup = container.innerHTML;

    await act(async () => {
      root = hydrateRoot(container, createElement(ClientCode, { code: 'pnpm dev', lang: 'bash' }));
    });

    expect(container.innerHTML).toBe(serverMarkup);
    expect(errors).not.toHaveBeenCalled();

    await act(async () => {
      root?.render(createElement(ClientCode, { code: 'pnpm build', lang: 'bash' }));
    });

    await vi.waitFor(() => expect(container.querySelector('code span')).not.toBeNull());
    expect(container.textContent).toBe('pnpm build');
    expect(errors).not.toHaveBeenCalled();
  });
});
