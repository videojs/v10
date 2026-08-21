import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
      entry: 'schema',
      source: '@fixture/components',
      include: ['./*/*-component.ts'],
    });

    const bundle = await rolldown({ input: {}, plugins: [plugin] });
    const output = await bundle.generate({ format: 'es' });

    expect(output.output[0]?.code).toContain('PlayButton');
    expect(output.output[0]?.fileName).toBe('schema.js');
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
      join(sourceDir, 'play-button-component.d.ts'),
      `declare const manifest: { name: 'PlayButton' }; export default manifest;`
    );
    const plugin = schemaPlugin({
      cwd: root,
      entry: 'schema',
      declaration: true,
      source: '@fixture/components',
      include: ['./*/*-component.ts'],
    });
    const results = await build({
      cwd: root,
      entry: { fixture: join(sourceDir, 'play-button-component.ts') },
      format: 'es',
      platform: 'neutral',
      dts: {
        tsgo: true,
        tsconfig: join(process.cwd(), 'tsconfig.json'),
        entry: ['does-not-match.ts'],
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
