import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { renderComponentGraphHtml } from '../render-html';
import type { ComponentGraph } from '../types';

describe('renderComponentGraphHtml', () => {
  it('renders a component and its captured dependencies from the finalized graph', async () => {
    const root = resolve(import.meta.dirname, 'fixture');
    const entryId = `${root}/entry.tsx?target=html`;
    const buttonId = `${root}/button.tsx?target=html`;
    const entrySource = `/** @jsxImportSource vjsc/html-runtime */
import { Button } from './button';
export function Example() { return <section><Button /></section>; }`;
    const buttonSource = `/** @jsxImportSource vjsc/html-runtime */
export function Button() { return <button>Play</button>; }`;
    const graph: ComponentGraph = {
      root,
      modules: new Map([
        [
          entryId,
          {
            id: entryId,
            filename: `${root}/entry.tsx`,
            transform: { target: 'html' },
            source: entrySource,
            imports: [{ ...importReference(entrySource, './button'), resolvedId: buttonId }],
          },
        ],
        [
          buttonId,
          {
            id: buttonId,
            filename: `${root}/button.tsx`,
            transform: { target: 'html' },
            source: buttonSource,
            imports: [],
          },
        ],
      ]),
      assets: new Map(),
      styles: new Map(),
    };

    const output = await renderComponentGraphHtml(graph, [
      { name: 'example', moduleId: entryId, exportName: 'Example' },
    ]);

    expect(output.get('example')).toBe('<section>\n<button>Play</button>\n</section>');
  });
});

function importReference(source: string, specifier: string) {
  const start = source.indexOf(`'${specifier}'`);

  return { specifier, kind: 'static' as const, start, end: start + specifier.length + 2, quote: "'" };
}
