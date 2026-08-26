import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { rolldown } from 'rolldown';
import { describe, expect, it } from 'vite-plus/test';

import { vjscPlugin } from '..';
import { defineSchema } from '../../components/definition';
import { defineComponentTarget } from '../../target/definition';

const schema = defineSchema('@fixture/components', {});
const target = defineComponentTarget<typeof schema>()(() => ({
  source: '@fixture/components',
  resolve: () => undefined,
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

describe('vjscPlugin', () => {
  it('configures each module once and runs transforms owned by its selected targets', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vjsc-plugin-'));
    const filename = join(root, 'fixture.ts');
    const id = `${filename}?target=react`;
    const configurations = new Map<string, number>();

    writeFileSync(filename, `export const value = 'before';`);

    const bundle = await rolldown({
      input: id,
      experimental: { nativeMagicString: true },
      plugins: vjscPlugin({
        configure(module) {
          configurations.set(module.id, (configurations.get(module.id) ?? 0) + 1);
          return module.parameters.get('target') === 'react' ? { targets: [target] } : null;
        },
      }),
    });
    const output = await bundle.generate({ format: 'es' });
    const chunk = output.output.find((item) => item.type === 'chunk');

    expect([...new Set(configurations.values())]).toEqual([1]);
    expect([...configurations.keys()].some((moduleId) => moduleId.endsWith('?target=react'))).toBe(true);
    expect(chunk?.code).toContain('after');
  });
});
