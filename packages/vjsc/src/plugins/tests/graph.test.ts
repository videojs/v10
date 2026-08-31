import { resolve } from 'node:path';

import { rolldown } from 'rolldown';
import { describe, expect, it } from 'vite-plus/test';

import { createGraphCapability, graphPlugin } from '../graph';

describe('graphPlugin', () => {
  it('reads stylesheet ownership from final transformed imports', async () => {
    const filename = resolve(import.meta.dirname, 'fixtures/graph-entry.ts');
    const id = `${filename}?target=react`;
    const styleId = 'virtual:vjsc/css/current/buttons.css';
    const staleStyleId = 'virtual:vjsc/css/stale/buttons.css';
    const graph = createGraphCapability();
    const bundle = await rolldown({
      input: id,
      plugins: [
        {
          name: 'fixture',
          resolveId(source) {
            if (source === id) return source;

            if (source === styleId) return `\0${source}`;

            return null;
          },
          load(source) {
            if (source === id) return `import ${JSON.stringify(styleId)};\nexport const value = true;`;

            if (source === `\0${styleId}`) return { code: 'export default ".current {}";', moduleType: 'js' };

            return null;
          },
          transform: {
            filter: { id },
            handler() {
              return {
                meta: {
                  moduleStyles: {
                    files: ['buttons.css'],
                    assets: [staleStyleId],
                  },
                },
              };
            },
          },
        },
        graphPlugin(undefined, graph),
      ],
    });

    await bundle.generate({ format: 'es' });

    expect(graph.api.modules.get(id)?.styles).toEqual({
      files: ['buttons.css'],
      assets: [styleId],
    });

    await bundle.close();
  });
});
