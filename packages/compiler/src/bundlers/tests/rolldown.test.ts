import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { rolldown } from 'rolldown';
import { describe, expect, it, vi } from 'vitest';

import { schemaPlugin, vjsCompiler } from '../rolldown';

describe('vjsCompiler', () => {
  it('bundles a generated entry and its relative source imports', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vjsc-rolldown-'));
    const source = join(root, 'value.ts');
    const virtualFile = join(root, '.vjsc/entry.ts');
    writeFileSync(source, 'export const value = 42;');
    const load = vi.fn(() => ({
      code: `export { value } from '../value';`,
      watchFiles: [source],
    }));

    const bundle = await rolldown({
      input: 'virtual:vjsc/entry.ts',
      plugins: [
        vjsCompiler({
          modules: [{ id: 'virtual:vjsc/entry.ts', load }],
          resolveId: () => virtualFile,
          declarations: [
            {
              id: 'virtual:vjsc/entry.ts',
              sourceFileName: virtualFile,
              fileName: 'entry.d.ts',
            },
          ],
        }),
      ],
    });
    const output = await bundle.generate({ format: 'es' });

    expect(output.output[0]?.code).toContain('const value = 42');
    expect(output.output.find((item) => item.fileName === 'entry.d.ts')).toMatchObject({
      source: "export { value } from '../value';\n",
    });
    expect(load).toHaveBeenCalledOnce();
  });

  it('creates a schema entry directly from inline bundler configuration', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vjsc-schema-plugin-'));
    const sourceDir = join(root, 'play-button');
    const source = join(sourceDir, 'play-button-component.ts');
    mkdirSync(sourceDir);
    writeFileSync(
      source,
      `const defineComponent: any = (value: any) => value; export default defineComponent({ name: 'PlayButton' });`
    );
    const plugin = schemaPlugin({
      cwd: root,
      source: '@fixture/components',
      files: ['./*/*-component.ts'],
    });

    const bundle = await rolldown({ input: plugin.moduleId, plugins: [plugin] });
    const output = await bundle.generate({ format: 'es' });

    expect(output.output[0]?.code).toContain('PlayButton');
    expect(plugin.moduleId).toBe('virtual:vjsc/schema');
  });
});
