import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { rolldown } from 'rolldown';
import { describe, expect, it, vi } from 'vitest';

import { vjscPlugin } from '../plugin';
import { schemaPlugin } from '../schema';

describe('vjscPlugin', () => {
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
        vjscPlugin({
          modules: [{ id: 'virtual:vjsc/entry.ts', load }],
          resolveModuleId: () => virtualFile,
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
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('uses native host filters for included and excluded modules', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vjsc-filter-'));
    const source = join(root, 'view.tsx');
    const excluded = join(root, 'view.test.tsx');
    writeFileSync(source, 'export const view = <div/>;');
    writeFileSync(excluded, 'export const testView = <div/>;');
    const transformed: string[] = [];

    const bundle = await rolldown({
      input: [source, excluded],
      external: /^react\//,
      plugins: [
        vjscPlugin({
          include: '**/*.tsx',
          exclude: '**/*.test.tsx',
          config: {
            plugins: [
              {
                name: 'record-transform',
                setup(context) {
                  transformed.push(context.filename);
                  return {};
                },
              },
            ],
          },
        }),
      ],
    });
    await bundle.generate({ format: 'es' });

    expect(transformed).toHaveLength(1);
    expect(transformed[0]).toMatch(/\/view\.tsx$/);
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
