import { describe, expect, it } from 'vite-plus/test';

import { bundleStyles } from '../styles';
import type { Graph, GraphModule } from '../types';

describe('bundleStyles', () => {
  it('emits dependency styles before the modules that compose them', async () => {
    const child = fixtureModule('child', ['virtual:vjsc/css/2/child.css']);
    const root = fixtureModule('root', ['virtual:vjsc/css/1/root.css'], [child.id]);
    const graph: Graph = {
      root: '/project',
      modules: new Map([
        [root.id, root],
        [child.id, child],
      ]),
      assets: new Map([
        ['virtual:vjsc/css/1/root.css', '.root { color: red; }'],
        ['virtual:vjsc/css/2/child.css', '.child { color: blue; }'],
      ]),
    };

    const css = await bundleStyles(graph, [root, child], { label: 'test' });

    expect(css.indexOf('.child')).toBeGreaterThanOrEqual(0);
    expect(css.indexOf('.child')).toBeLessThan(css.indexOf('.root'));
  });

  it('ignores imports outside the bundled module set', async () => {
    const root = fixtureModule('root', ['virtual:vjsc/css/1/root.css'], ['missing']);
    const graph: Graph = {
      root: '/project',
      modules: new Map([[root.id, root]]),
      assets: new Map([['virtual:vjsc/css/1/root.css', '.root { color: red; }']]),
    };

    await expect(bundleStyles(graph, [root], { label: 'test' })).resolves.toContain('.root');
  });
});

function fixtureModule(id: string, assets: readonly string[], dependencies: readonly string[] = []): GraphModule {
  return {
    id,
    filename: `/project/${id}.tsx`,
    sourcePath: `${id}.tsx`,
    params: {},
    source: '',
    imports: dependencies.map((resolvedId) => ({
      specifier: `./${resolvedId}`,
      kind: 'static',
      start: 0,
      end: 0,
      quote: "'",
      resolvedId,
    })),
    styles: { files: [], assets },
  };
}
