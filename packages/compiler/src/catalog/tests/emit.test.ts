import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, defineSchema } from '../../components';
import { defineConfig, jsx } from '../../config';
import { defineRegistry } from '../../registry';
import { defineCatalog } from '../define';
import { emitCatalog } from '../emit';
import { loadCatalog } from '../resolve';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('emitCatalog', () => {
  it('uses a component registry without exposing compiler configuration', async () => {
    const root = setup({
      'entry.tsx': `import { PlayButton } from '@fixture/components'; export const entry = <PlayButton disabled />;`,
    });
    const components = defineSchema('@fixture/components', {
      PlayButton: defineComponent<{ disabled?: boolean }>({ name: 'PlayButton' }),
    });
    const registry = defineRegistry({
      schema: components,
      entries: {
        PlayButton: { import: { from: '@fixture/react', name: 'PlayButton' } },
      },
    });
    const loaded = await loadCatalog(
      defineCatalog({
        components: [components.source],
        allowedImports: ['@fixture/components'],
        items: [{ name: 'entry', source: './entry.tsx' }],
      }),
      { rootDir: root }
    );

    const output = await emitCatalog(loaded, {
      output: { componentRegistry: registry },
      files: { source: ({ sourceFile }) => sourceFile },
    });

    expect(output.files.source[0]?.content).toContain('from "@fixture/react"');
    expect(output.files.source[0]?.content).toContain('<PlayButton disabled/>');
  });

  it('transforms, relinks, and collects dependencies for selected catalog items', async () => {
    const root = setup({
      'entry.tsx': `import { dependency } from './dependency'; import { helper } from './private/helper'; import React from 'react'; import { createElement } from 'react'; export const entry = [dependency, helper, React, createElement];`,
      'private/helper.ts': `export const helper: number = 1;`,
      'dependency.ts': `export const dependency: number = 2;`,
      'unused.ts': `export const unused = true;`,
    });
    const definition = defineCatalog({
      items: [
        { name: 'entry', source: './entry.tsx' },
        { name: 'dependency', source: './dependency.ts' },
        { name: 'unused', source: './unused.ts' },
      ],
    });
    const loaded = await loadCatalog(definition, { rootDir: root });

    const output = await emitCatalog(loaded, {
      items: ['entry'],
      output: {
        compiler: defineConfig({ target: jsx() }),
      },
      files: {
        source({ catalogItem, sourceFile }) {
          return sourceFile === catalogItem.source
            ? `${catalogItem.name}/index.ts`
            : `${catalogItem.name}/${sourceFile.slice(2)}`;
        },
      },
      resolve: {
        imports: {
          dependency: ({ dependency }) => `@/components/${dependency.name}`,
        },
      },
    });

    expect(Object.keys(output.items)).toEqual(['dependency', 'entry']);
    expect(output.items.entry?.files.map((file) => file.path)).toEqual(['entry/index.ts', 'entry/private/helper.ts']);
    expect(output.items.entry?.files.find((file) => file.path === 'entry/index.ts')?.content).toContain(
      'from "@/components/dependency"'
    );
    expect(output.items.entry?.files.find((file) => file.path === 'entry/index.ts')?.content).toMatch(
      /from ["']\.\/private\/helper["']/
    );
    expect(output.items.entry?.dependencies).toEqual(['react']);
    expect(output.items.entry?.imports).toEqual(['@/components/dependency', 'react']);
    expect(output.items.dependency?.imports).toEqual([]);
    expect(output.items.unused).toBeUndefined();
    expect(output.files.source.map((file) => file.path)).toEqual([
      'dependency/index.ts',
      'entry/index.ts',
      'entry/private/helper.ts',
    ]);
    expect(output.files.style).toEqual([]);
  });

  it('bundles each requested entry without separately emitting its catalog dependencies', async () => {
    const root = setup({
      'entry.ts': `import React from 'react'; import { dependency } from './dependency'; export const entry = [dependency + 1, React];`,
      'dependency.ts': `export const dependency = 1;`,
    });
    const loaded = await loadCatalog(
      defineCatalog({
        items: [
          { name: 'entry', source: './entry.ts' },
          { name: 'dependency', source: './dependency.ts' },
        ],
      }),
      { rootDir: root }
    );

    const output = await emitCatalog(loaded, {
      items: ['entry'],
      output: {
        mode: 'bundle',
        compiler: defineConfig({ external: ['react'], target: jsx() }),
      },
      files: {
        source: ({ catalogItem }) => `${catalogItem.name}/bundle.js`,
      },
    });

    expect(Object.keys(output.items)).toEqual(['entry']);
    expect(output.files.source).toHaveLength(1);
    expect(output.files.source[0]?.path).toBe('entry/bundle.js');
    expect(output.files.source[0]?.content).toContain('const entry = [2, React]');
    expect(output.items.entry?.imports).toEqual(['react']);
    expect(output.items.entry?.dependencies).toEqual(['react']);
  });

  it('projects catalog styles and emits referenced vanilla CSS', async () => {
    const root = setup({
      'entry.tsx': `import styles from './button.styles'; export const entry = <button className={styles.root}/>;`,
      'button.styles.ts': `
        import { styles } from 'vjsc/styles';
        export default styles({
          file: 'button.css',
          layer: 'fixture.components',
          rules: {
            root: {
              className: 'fixture-button',
              utilities: 'grid',
              variants: { compact: 'p-1' },
            },
            unused: { className: 'fixture-unused', utilities: 'block' },
          },
        });
      `,
    });
    const loaded = await loadCatalog(
      defineCatalog({
        allowedImports: ['vjsc/styles'],
        items: [{ name: 'entry', source: './entry.tsx' }],
      }),
      { rootDir: root }
    );

    const output = await emitCatalog(loaded, {
      items: ['entry'],
      output: {
        compiler: defineConfig({ target: jsx() }),
      },
      styles: {
        mode: 'css',
        input: resolve(import.meta.dirname, '../../styles/tests/fixtures/tailwind.css'),
        scope: '.fixture-skin',
        variant: 'compact',
      },
      files: {
        source: ({ sourceFile }) => sourceFile,
        style: ({ fileName }) => `styles/${fileName}`,
      },
    });

    expect(output.files.source[0]?.content).toContain('className="fixture-button"');
    expect(output.files.style).toHaveLength(1);
    expect(output.files.style[0]?.path).toBe('styles/button.css');
    expect(output.files.style[0]?.content).toContain('@scope (.fixture-skin)');
    expect(output.files.style[0]?.content).toContain('.fixture-button {');
    expect(output.files.style[0]?.content).not.toContain('.fixture-unused {');
  });
});

function setup(files: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), 'videojs-compiler-catalog-output-'));
  roots.push(root);
  for (const [file, source] of Object.entries(files)) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source);
  }
  return realpathSync(root);
}
