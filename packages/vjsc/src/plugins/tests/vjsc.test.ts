import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { rolldown } from 'rolldown';
import { describe, expect, it } from 'vite-plus/test';

import { vjscPlugin } from '..';
import { defineSchema } from '../../components/definition';
import type { Graph } from '../../graph';
import { defineComponentTarget } from '../../target/definition';
import { useTemporaryDirectories } from '../../tests/temp-directory';

const schema = defineSchema('@fixture/components', {});
const target = defineComponentTarget<typeof schema>()(() => ({
  source: '@fixture/components',
  components: { resolve: () => undefined },
  transforms: [
    {
      name: 'fixture:target-transform',
      transform({ code, magicString }) {
        const start = code.indexOf(`'before'`);
        if (start < 0) return false;

        magicString.overwrite(start, start + 8, `'after'`);
        return true;
      },
    },
  ],
  jsx: { importSource: 'react', attributes: 'react' },
}));
const temporaryDirectories = useTemporaryDirectories();

describe('vjscPlugin', () => {
  it('configures each module once and runs transforms owned by its selected targets', async () => {
    const root = temporaryDirectories.createSync('vjsc-plugin-');
    const filename = join(root, 'fixture.ts');
    const id = `${filename}?target=react`;
    const configurations = new Map<string, number>();

    writeFileSync(filename, `export const value = 'before';`);

    const plugins = vjscPlugin({
      transform: {
        components(module) {
          configurations.set(module.id, (configurations.get(module.id) ?? 0) + 1);
          return module.params.get('target') === 'react' ? [target] : null;
        },
        styles() {
          return null;
        },
      },
    });
    const bundle = await rolldown({
      cwd: root,
      input: id,
      experimental: { nativeMagicString: true },
      plugins,
    });
    const output = await bundle.generate({ format: 'es' });
    const chunk = output.output.find((item) => item.type === 'chunk');

    expect([...new Set(configurations.values())]).toEqual([1]);
    expect([...configurations.keys()].some((moduleId) => moduleId.endsWith('?target=react'))).toBe(true);
    expect(chunk?.code).toContain('after');
    expect([...(plugins[0]!.api as Graph).modules.values()].map((module) => module.source)).toEqual([
      expect.stringContaining('after'),
    ]);
  });
});
