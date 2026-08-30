import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { type Plugin, type RolldownOutput, rolldown } from 'rolldown';
import { registryItemSchema, registrySchema } from 'shadcn/schema';
import { describe, expect, it } from 'vite-plus/test';

import { shadcnRegistryPlugin, vjscPlugin } from '..';
import type { NamedModuleMeta } from '../../components';
import type { GraphModule } from '../../graph';
import type { ShadcnRegistryPluginOptions, VjscRegistryItem } from '../../shadcn';

interface FixtureMeta extends NamedModuleMeta {
  readonly type: 'block' | 'component' | 'support';
  readonly title: string;
  readonly description: string;
}

describe('shadcnRegistryPlugin', () => {
  it('emits schema-valid items from the shared component graph', async () => {
    const root = setup({
      'components/root.tsx': `import { Public } from './public'; import { Helper } from './helper'; import value from 'private-package/subpath'; export function Root() { return <main>{Public}{Helper}{value}</main>; } ${meta('root', 'block')}`,
      'components/public.tsx': `export function Public() { return <span/>; } ${meta('public')}`,
      'components/helper.tsx': `export function Helper() { return <aside/>; } ${meta('helper', 'support')}`,
    });
    const output = await build(root);
    const registry = assetJson(output, 'registry.json');
    const rootItem = registryItem(output, 'items', 'root');

    registrySchema.parse(registry);
    registryItemSchema.parse(rootItem);

    expect(rootItem).not.toHaveProperty('$vjsc');
    expect(rootItem).toMatchObject({
      dependencies: ['private-package', 'react'],
      registryDependencies: ['@example/helper', '@example/public'],
    });
    expect(rootItem.files.map((file: { target: string }) => file.target)).toEqual([
      'components/example/skins/root.tsx',
    ]);
    expect(registryFile(output, 'items', rootItem, '/root.tsx')).toContain(`from '@/components/example/ui/public'`);
    expect(output.output.some((item) => item.type === 'chunk')).toBe(false);
  });

  it('keeps transformed identities and dependencies selection-specific', async () => {
    const root = setup({
      'components/root.tsx': `import { Child } from './child'; export function Root() { return <main>{Child}</main>; } ${meta('root', 'block')}`,
      'components/child.tsx': `export const Child = <aside/>; ${meta('child')}`,
    });
    const transformations = () => [{ theme: 'default' }, { theme: 'minimal' }];
    const output = await build(root, { transformations }, [
      {
        name: 'test:theme-source',
        transform(code, id) {
          const theme = new URLSearchParams(id.split('?')[1]).get('theme');

          return theme ? code.replace('<main>', `<main data-theme="${theme}">`) : null;
        },
      },
    ]);
    const defaultItem = registryItem(output, 'items', 'root');
    const minimalItem = registryItem(output, 'items', 'root-minimal');

    expect(defaultItem.registryDependencies).toContain('@example/child');
    expect(minimalItem.registryDependencies).toContain('@example/child-minimal');
    expect(registryFile(output, 'items', minimalItem, '/root-minimal.tsx')).toContain('data-theme="minimal"');
  });

  it('rejects reachable modules without semantic ownership', async () => {
    const root = setup({
      'components/root.tsx': `import { Helper } from '../helper'; export function Root() { return <main>{Helper}</main>; } ${meta('root', 'block')}`,
      'helper.tsx': `export const Helper = <aside/>;`,
    });

    await expect(build(root)).rejects.toThrow(/cannot hide shared modules under compiler-shaped internal paths/);
  });

  it('captures finalized virtual style assets', async () => {
    const virtualStyle = 'virtual:vjsc/css/root';
    const root = setup({
      'components/root.tsx': `import ${JSON.stringify(virtualStyle)}; export const Root = <main />; ${meta('root', 'block')}`,
    });
    const output = await build(
      root,
      {
        items: (graph) =>
          describeItems([...graph.modules.values()]).map((item) =>
            item.name === 'root'
              ? { ...item, $vjsc: { ...item.$vjsc, stylesheet: { target: 'styles/root.css', import: true } } }
              : item
          ),
      },
      [
        {
          name: 'test:late-style',
          buildStart() {
            this.emitFile({ type: 'chunk', id: virtualStyle });
          },
          resolveId(id) {
            return id === virtualStyle ? `\0${virtualStyle}` : null;
          },
          load(id) {
            return id === `\0${virtualStyle}` ? '.root { color: red; }' : null;
          },
          transform(_code, id) {
            if (id === `\0${virtualStyle}`) return { code: 'export {};' };

            if (!id.endsWith('/components/root.tsx')) return null;

            return { meta: { moduleStyles: { files: [], assets: [virtualStyle] } } };
          },
        },
      ]
    );
    const item = registryItem(output, 'items', 'root');

    expect(registryFile(output, 'items', item, '/root.css')).toMatch(/\.root\s*\{\s*color:\s*red;/);
    expect(registryFile(output, 'items', item, '/root.tsx')).toContain(`import '../styles/root.css';`);
    expect(registryFile(output, 'items', item, '/root.tsx')).not.toContain('virtual:vjsc/css');
  });

  it('emits asynchronously prepared source-owned files', async () => {
    const root = setup({
      'components/root.tsx': `export const Root = <main />; ${meta('root', 'block')}`,
    });
    const output = await build(root, {
      async items() {
        return [
          {
            name: 'template',
            type: 'registry:block',
            title: 'Template',
            description: 'Template.',
            files: [
              {
                path: 'skin.html',
                target: 'components/example/skins/template/skin.html',
                type: 'registry:file',
                content: '<main></main>',
              },
            ],
            $vjsc: { kind: 'files', group: 'items' },
          },
        ];
      },
    });
    const item = registryItem(output, 'items', 'template');

    expect(item.files[0].content).toBeUndefined();
    expect(registryFile(output, 'items', item, '/skin.html')).toBe('<main></main>');
  });

  it('formats editable sources without passing manifests to the formatter', async () => {
    const root = setup({
      'components/root.tsx': `export const Root = <main />; ${meta('root', 'block')}`,
    });
    const formatted: string[] = [];
    const output = await build(root, {
      format(source) {
        formatted.push(source.path);

        return source.content.replace('<main />', '<main data-formatted />');
      },
    });
    const item = registryItem(output, 'items', 'root');

    expect(formatted).toEqual(['items/files/root/root.tsx']);
    expect(registryFile(output, 'items', item, '/root.tsx')).toContain('<main data-formatted />');
  });

  it('reuses one graph plugin safely across rebuilds', async () => {
    const root = setup({
      'components/root.tsx': `export const Root = <main>first</main>; ${meta('root', 'block')}`,
    });
    const transform = fixtureTransform(root);
    const first = await build(root, {}, [], transform);

    writeFileSync(
      join(root, 'components/root.tsx'),
      `export const Root = <main>second</main>; ${meta('root', 'block')}`
    );
    const second = await build(root, {}, [], transform);
    const firstItem = registryItem(first, 'items', 'root');
    const secondItem = registryItem(second, 'items', 'root');

    expect(registryFile(first, 'items', firstItem, '/root.tsx')).toContain('first');
    expect(registryFile(second, 'items', secondItem, '/root.tsx')).toContain('second');
  });
});

type FixtureOptions = ShadcnRegistryPluginOptions<FixtureMeta>;

async function build(
  root: string,
  overrides: Partial<FixtureOptions & { transformations: () => readonly Readonly<Record<string, string>>[] }> = {},
  additions: readonly Plugin[] = [],
  existingTransform?: Plugin[]
): Promise<RolldownOutput> {
  const { transformations, ...registryOverrides } = overrides;
  const transform = existingTransform ?? fixtureTransform(root, transformations);
  const registry = shadcnRegistryPlugin(baseOptions(registryOverrides));
  const bundle = await rolldown({
    input: [],
    experimental: { nativeMagicString: true },
    external: (id) => !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0'),
    plugins: [...transform, ...additions, registry],
  });

  return bundle.generate({ format: 'es', entryFileNames: '[name].js' });
}

function fixtureTransform(root: string, transformations?: () => readonly Readonly<Record<string, string>>[]): Plugin[] {
  return vjscPlugin<FixtureMeta>({
    entries: {
      root,
      include: './components/**/*.{ts,tsx}',
      ...(transformations ? { resolve: { params: transformations } } : {}),
    },
    transform: {
      components: () => [],
      styles: () => null,
    },
  });
}

function baseOptions(overrides: Partial<FixtureOptions> = {}): FixtureOptions {
  return {
    name: 'example',
    homepage: 'https://example.com',
    namespace: '@example',
    paths: { install: 'components/example', import: '@/components/example' },
    meta: { framework: 'react', style: 'tailwind' },
    items: (graph) => describeItems([...graph.modules.values()]),
    ...overrides,
  };
}

function describeItems(modules: readonly GraphModule<FixtureMeta>[]): VjscRegistryItem<FixtureMeta>[] {
  return modules.flatMap((module) => {
    const itemMeta = module.meta;
    if (!itemMeta) return [];

    const theme = module.params.theme;
    const name = theme === 'minimal' ? `${itemMeta.name}-minimal` : itemMeta.name;
    const support = itemMeta.type === 'support';

    return [
      {
        name,
        type: support ? 'registry:lib' : itemMeta.type === 'block' ? 'registry:block' : 'registry:ui',
        title: itemMeta.title,
        description: itemMeta.description,
        categories: support ? ['support'] : ['media'],
        meta: { public: !support },
        $vjsc: {
          module,
          group: 'items',
          target: `${itemMeta.type === 'block' ? 'skins' : 'ui'}/${name}.tsx`,
        },
      },
    ];
  });
}

function meta(name: string, type: FixtureMeta['type'] = 'component'): string {
  return `/** @jsxImportSource react */\nexport const meta = { name: '${name}', type: '${type}', title: '${name}', description: '${name}.' } as const;`;
}

function setup(files: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), 'vjsc-shadcn-'));

  for (const [filename, source] of Object.entries(files)) {
    const path = join(root, filename);

    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source);
  }

  return root;
}

function assetJson(output: RolldownOutput, filename: string): any {
  const asset = output.output.find((item) => item.type === 'asset' && item.fileName === filename);
  if (asset?.type !== 'asset') throw new Error(`Missing asset: ${filename}`);

  return JSON.parse(String(asset.source));
}

function registryItem(output: RolldownOutput, group: string, name: string): any {
  const registry = assetJson(output, `${group}/registry.json`);
  const item = registry.items.find((candidate: { name: string }) => candidate.name === name);
  if (!item) throw new Error(`Missing registry item: ${name}`);

  return item;
}

function registryFile(output: RolldownOutput, group: string, item: any, target: string): string {
  const file = item.files.find((candidate: { target?: string }) => candidate.target?.endsWith(target));
  if (!file) throw new Error(`Missing registry file: ${item.name}${target}`);

  const asset = output.output.find(
    (candidate) => candidate.type === 'asset' && candidate.fileName === `${group}/${file.path}`
  );
  if (asset?.type !== 'asset') throw new Error(`Missing registry source: ${group}/${file.path}`);

  return String(asset.source);
}
