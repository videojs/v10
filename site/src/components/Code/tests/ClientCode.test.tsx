import { createElement } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import { describe, expect, it } from 'vite-plus/test';

import ClientCode from '../ClientCode';
import { getClientHighlighter } from '../clientHighlighter';

async function renderStream(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);

  await stream.allReady;

  return new Response(stream).text();
}

describe('ClientCode', () => {
  it('streams highlighted code inline without deferred Suspense boundaries', async () => {
    await getClientHighlighter();

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
});
