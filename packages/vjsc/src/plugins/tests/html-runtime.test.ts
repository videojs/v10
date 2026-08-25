import { resolve } from 'node:path';

import { rolldown } from 'rolldown';
import { describe, expect, it } from 'vite-plus/test';

import { HTML_RUNTIME } from '../html-runtime';

interface HtmlRuntime {
  readonly Fragment: symbol;
  readonly Host: (props: Record<string, unknown>) => unknown;
  readonly Scope: (props: Record<string, unknown>) => unknown;
  jsx(type: string | symbol | ((props: Record<string, unknown>) => unknown), props: Record<string, unknown>): unknown;
}

describe('htmlRuntimePlugin', () => {
  it('resolves scoped IDs uniquely for repeated component instances', async () => {
    const runtime = await loadRuntime();
    const component = () =>
      runtime.jsx(runtime.Scope, {
        prefix: 'fixture',
        children: runtime.jsx('button', { id: '__vjsc-id-fixture-trigger' }),
      });
    const output = runtime.jsx(runtime.Fragment, { children: [component(), component()] });

    expect(String(output)).toBe(
      '<button id="vjs-fixture-trigger"></button><button id="vjs-fixture-2-trigger"></button>'
    );
  });

  it('forwards host attributes to one dynamic element child', async () => {
    const runtime = await loadRuntime();
    const output = runtime.jsx(runtime.Host, {
      id: 'trigger',
      children: runtime.jsx('button', { className: ['button', 'active'] }),
    });

    expect(String(output)).toBe('<button class="button active" id="trigger"></button>');
  });

  it('flattens class arrays after HTML attribute normalization', async () => {
    const runtime = await loadRuntime();
    const output = runtime.jsx('media-icon', { class: ['icon', ['active', false, undefined]] });

    expect(String(output)).toBe('<media-icon class="icon active"></media-icon>');
  });

  it('escapes attribute and child text with the shared HTML contract', async () => {
    const runtime = await loadRuntime();
    const value = `&<>"'\``;
    const output = runtime.jsx('span', { title: value, children: value });

    expect(String(output)).toBe('<span title="&amp;&lt;&gt;&quot;&#39;&#96;">&amp;&lt;&gt;&quot;&#39;&#96;</span>');
  });

  it('serializes SVG attribute names without corrupting case-sensitive names', async () => {
    const runtime = await loadRuntime();
    const output = runtime.jsx('svg', {
      viewBox: '0 0 18 18',
      preserveAspectRatio: 'xMidYMid meet',
      strokeWidth: 2,
      xlinkHref: '#icon',
    });

    expect(String(output)).toBe(
      '<svg viewBox="0 0 18 18" preserveAspectRatio="xMidYMid meet" stroke-width="2" xlink:href="#icon"></svg>'
    );
  });
});

async function loadRuntime(): Promise<HtmlRuntime> {
  const build = await rolldown({
    input: 'runtime',
    experimental: { nativeMagicString: true },
    plugins: [
      {
        name: 'test-runtime',
        resolveId(id) {
          if (id === 'runtime') return id;

          return id === 'vjsc/target' ? resolve(import.meta.dirname, '../../target/index.ts') : null;
        },
        load(id) {
          return id === 'runtime' ? HTML_RUNTIME : null;
        },
      },
    ],
  });
  const { output } = await build.generate({ format: 'esm' });
  const chunk = output.find((item) => item.type === 'chunk');
  if (!chunk) throw new Error('Expected the HTML runtime bundle to contain a chunk.');

  const url = `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`;

  return (await import(url)) as HtmlRuntime;
}
