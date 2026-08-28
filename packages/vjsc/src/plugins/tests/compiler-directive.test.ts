import type { Plugin } from 'rolldown';
import { rolldown } from 'rolldown';
import { describe, expect, it } from 'vite-plus/test';

import { defineComponent, defineSchema } from '../../components/definition';
import { defineComponentTarget } from '../../target/definition';
import { compilerDirectivePlugin } from '../compiler-directive';

const moduleId = '\0fixture.tsx';
const schema = defineSchema('@fixture/components', {
  Button: defineComponent({ name: 'Button' }),
});
const target = defineComponentTarget<typeof schema>()(({ element }) => ({
  source: '@fixture/components',
  resolve: () => element('button'),
  jsx: { importSource: 'react', attributes: 'react' },
}));

describe('compilerDirectivePlugin', () => {
  it('reports directives left unhandled by the selected target', async () => {
    const build = await rolldown({
      input: 'fixture',
      external: () => true,
      transform: { jsx: 'preserve' },
      plugins: [
        fixturePlugin('export const button = <Button $unknown />;'),
        compilerDirectivePlugin({ targets: [target] }),
      ],
    });

    await expect(build.generate({ format: 'es' })).rejects.toMatchObject({
      errors: [
        {
          message: expect.stringContaining('Unhandled VJSC compiler directive `$unknown`'),
          pos: expect.any(Number),
        },
      ],
    });
  });
});

function fixturePlugin(source: string): Plugin {
  return {
    name: 'fixture:module',
    resolveId(id) {
      return id === 'fixture' ? moduleId : null;
    },
    load(id) {
      return id === moduleId ? { code: source, moduleType: 'tsx' } : null;
    },
  };
}
