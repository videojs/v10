import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { catalog } from '../../catalog/define';
import { loadCatalog } from '../../catalog/resolve';
import { createShadcnRegistry } from '../shadcn';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('createShadcnRegistry', () => {
  it('partitions published dependencies from bundled catalog items', async () => {
    const root = setup({
      'root.ts': `import { Public } from './public'; import { Private } from './private'; export const Root = [Public, Private];`,
      'public.ts': `export const Public = true;`,
      'private.ts': `export const Private = true;`,
    });
    const definition = catalog({
      items: [
        { name: 'root', source: './root.ts', title: 'Root', type: 'block' },
        { name: 'public', source: './public.ts', title: 'Public', type: 'component' },
        { name: 'private', source: './private.ts', title: 'Private', type: 'component' },
      ],
    });
    const loaded = await loadCatalog(definition, { rootDir: root });
    const emittedItems = Object.fromEntries(
      loaded.items.map((item) => [
        item.name,
        {
          files: [{ path: `${item.name}.ts`, content: '' }],
          packageDependencies: item.name === 'private' ? ['private-package'] : [],
        },
      ])
    );

    const registry = createShadcnRegistry(loaded, {
      name: 'example',
      homepage: 'https://example.com',
      namespace: '@example',
      publishedItems: ['root', 'public'],
      emittedItems,
      shared: [
        {
          name: 'styles',
          type: 'registry:style',
          title: 'Styles',
          description: 'Shared styles.',
          files: [{ path: 'styles.css', content: '' }],
        },
      ],
      describeItem: (item) => ({
        type: item.type === 'block' ? 'registry:block' : 'registry:component',
        title: item.title,
        description: `${item.title}.`,
      }),
      registryDependencies: () => ['styles'],
      mapFile: (file) => ({ path: file.path, target: file.path, type: 'registry:component' }),
    });

    expect(registry.items.map((item) => item.name)).toEqual(['styles', 'root', 'public']);
    expect(registry.items.find((item) => item.name === 'root')).toMatchObject({
      files: [
        { path: 'private.ts', target: 'private.ts' },
        { path: 'root.ts', target: 'root.ts' },
      ],
      dependencies: ['private-package'],
      registryDependencies: ['@example/public', '@example/styles'],
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
