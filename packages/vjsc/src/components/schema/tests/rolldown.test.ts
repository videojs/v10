import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { rolldown } from 'rolldown';
import { build } from 'tsdown';
import { describe, expect, it } from 'vitest';

import { schemaPlugin } from '../../../rolldown';

describe('schemaPlugin', () => {
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

  it('provides its companion declaration to the host build', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vjsc-schema-plugin-'));
    const sourceDir = join(root, 'play-button');
    mkdirSync(sourceDir);
    writeFileSync(
      join(sourceDir, 'play-button-component.ts'),
      `const defineComponent: any = (value: any) => value; export default defineComponent({ name: 'PlayButton' });`
    );
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { module: 'esnext', moduleResolution: 'bundler', target: 'es2022' } })
    );
    const vjscPackage = join(root, 'node_modules/vjsc');
    mkdirSync(vjscPackage, { recursive: true });
    writeFileSync(
      join(vjscPackage, 'package.json'),
      JSON.stringify({ name: 'vjsc', exports: { './components': './components.d.ts' } })
    );
    writeFileSync(
      join(vjscPackage, 'components.d.ts'),
      `export declare function createComponent<T>(definition: T): T;
       export declare function defineSchema<S, D>(source: S, definitions: D): { source: S; definitions: D };`
    );

    const plugin = schemaPlugin({
      cwd: root,
      source: '@fixture/components',
      include: ['./*/*-component.ts'],
    });
    const results = await build({
      cwd: root,
      entry: { schema: plugin.moduleId },
      format: 'es',
      platform: 'neutral',
      dts: {
        tsgo: true,
        tsconfig: 'tsconfig.json',
        entry: [relative(process.cwd(), join(root, 'vjsc.ts'))],
      },
      deps: { neverBundle: ['vjsc/components'] },
      plugins: [plugin],
      unbundle: true,
      write: false,
      clean: false,
      report: false,
    });
    const declaration = results[0]?.chunks.find((chunk) => /\.d\.[cm]?ts$/.test(chunk.fileName));

    if (declaration?.type !== 'chunk') throw new Error('The host build did not emit the schema declaration');
    expect(declaration?.code).toContain('declare const PlayButton');
  });
});
