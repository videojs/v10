import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { rolldown } from 'rolldown';
import { describe, expect, it } from 'vitest';

import { jsx } from '../../config';
import { schemaPlugin, vjscPlugin } from '../../rolldown';

describe('vjscPlugin', () => {
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
          transform: {
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

  it('projects real source modules and propagates the projection through relative imports', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vjsc-projection-'));
    const entry = join(root, 'entry.tsx');
    const child = join(root, 'child.tsx');
    writeFileSync(entry, `import { Child } from './child'; export const Entry = () => <Child/>;`);
    writeFileSync(child, `export const Child = () => <span/>;`);
    const transformed: string[] = [];

    const bundle = await rolldown({
      input: `${entry}?style=vanilla&framework=react`,
      external: /^react\//,
      plugins: [
        vjscPlugin({
          transform: ({ parameters }) =>
            parameters.get('framework') === 'react' ? { target: jsx({ importSource: 'react' }) } : null,
        }),
        {
          name: 'record-projected-modules',
          transform: {
            filter: { id: /\?framework=react&style=vanilla$/ },
            handler(_code, id) {
              transformed.push(id);
            },
          },
        },
      ],
    });
    const output = await bundle.generate({ format: 'es' });

    expect(output.output[0]?.code).toContain('react/jsx-runtime');
    expect(transformed).toHaveLength(2);
    expect(transformed).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/child\.tsx\?framework=react&style=vanilla$/),
        expect.stringMatching(/\/entry\.tsx\?framework=react&style=vanilla$/),
      ])
    );
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
      include: ['./*/*-component.ts'],
    });

    const bundle = await rolldown({ input: plugin.moduleId, plugins: [plugin] });
    const output = await bundle.generate({ format: 'es' });

    expect(output.output[0]?.code).toContain('PlayButton');
    expect(plugin.moduleId).toBe('virtual:vjsc/schema');
  });
});
