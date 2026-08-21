import { describe, expect, it } from 'vitest';

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
});

async function loadRuntime(): Promise<HtmlRuntime> {
  const url = `data:text/javascript;base64,${Buffer.from(HTML_RUNTIME).toString('base64')}`;
  return (await import(url)) as HtmlRuntime;
}
