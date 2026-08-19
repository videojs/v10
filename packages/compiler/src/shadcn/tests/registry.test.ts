import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { defineCatalog } from '../../catalog/define';
import { defineCatalogOutput } from '../../catalog/emit';
import { loadCatalog } from '../../catalog/resolve';
import { defineConfig, jsx } from '../../config';
import { defineShadcnRegistry, emitShadcnRegistry } from '../index';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('defineShadcnRegistry', () => {
  it('preserves publication metadata and catalog item names', () => {
    const definition = defineCatalog({ items: [{ name: 'root', source: './root.ts' }] });
    const registry = defineShadcnRegistry(definition, {
      name: 'example',
      homepage: 'https://example.com',
      namespace: '@example',
      paths: {
        output: 'registry',
        source: 'source',
        install: 'components/example',
        import: '@/components/example',
      },
      items: {
        published: ['root'],
        describe: () => ({
          type: 'registry:block',
          title: 'Root',
          description: 'Root block.',
        }),
      },
    });

    expect(registry).toMatchObject({
      paths: { output: 'registry' },
      items: { published: ['root'] },
    });
  });
});

describe('emitShadcnRegistry', () => {
  it('emits a catalog and partitions published, private, and shared dependencies', async () => {
    const root = setup({
      'root.ts': `import { Public } from './public'; import { Private } from './private'; import { cn } from '@/example/utils'; export const Root = [Public, Private, cn];`,
      'public.ts': `export const Public = true;`,
      'private.ts': `import value from 'private-package'; export const Private = value;`,
      'styles.css': `@import 'tailwindcss';`,
      'utils.ts': `export const cn = (...values) => values.filter(Boolean).join(' ');`,
    });
    const definition = defineCatalog({
      allowedImports: ['@/example/utils', 'private-package'],
      items: [
        { name: 'root', source: './root.ts', title: 'Root', type: 'block' },
        { name: 'public', source: './public.ts', title: 'Public', type: 'component' },
      ],
    });
    const loaded = await loadCatalog(definition, { rootDir: root });
    const registry = defineShadcnRegistry(definition, {
      name: 'example',
      homepage: 'https://example.com',
      namespace: '@example',
      paths: {
        output: 'registry',
        source: 'source',
        install: 'components/example',
        import: '@/components/example',
      },
      meta: { framework: 'react' },
      items: {
        published: ['root', 'public'],
        describe: (item) => ({
          type: item.type === 'block' ? 'registry:block' : 'registry:component',
          title: item.title,
          description: `${item.title}.`,
        }),
        shared: [
          {
            name: 'styles',
            type: 'registry:style',
            title: 'Styles',
            description: 'Shared styles.',
            requiredBy: 'all',
            files: [{ source: './styles.css' }],
          },
          {
            name: 'utils',
            type: 'registry:lib',
            title: 'Utilities',
            description: 'Shared utilities.',
            requiredBy: { imports: ['@/example/utils'] },
            dependencies: ['clsx'],
            files: [{ source: './utils.ts' }],
          },
        ],
      },
    });
    const output = await emitShadcnRegistry(loaded, registry, {
      output: defineCatalogOutput({ compiler: defineConfig({ external: ['private-package'], target: jsx() }) }),
    });

    expect(output.files.map((file) => file.path)).toEqual([
      'source/components/public/public.ts',
      'source/private.ts',
      'source/root.ts',
      'source/styles.css',
      'source/utils.ts',
    ]);
    expect(output.registry.items.map((item) => item.name)).toEqual(['styles', 'utils', 'root', 'public']);
    expect(output.registry.items.find((item) => item.name === 'root')).toMatchObject({
      files: [
        { path: 'registry/source/private.ts', target: 'components/example/root/private.ts' },
        { path: 'registry/source/root.ts', target: 'components/example/root/root.ts' },
      ],
      dependencies: ['private-package'],
      registryDependencies: ['@example/public', '@example/styles', '@example/utils'],
      meta: { framework: 'react' },
    });
    expect(output.registry.items.find((item) => item.name === 'public')).toMatchObject({
      registryDependencies: ['@example/styles'],
    });
    expect(output.registry.items.find((item) => item.name === 'utils')).toMatchObject({
      dependencies: ['clsx'],
      files: [{ type: 'registry:lib', target: 'components/example/utils.ts' }],
    });
  });
});

function setup(files: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), 'videojs-compiler-shadcn-'));
  roots.push(root);

  for (const [file, source] of Object.entries(files)) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source);
  }

  return root;
}
