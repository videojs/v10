import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { type Plugin, type RolldownOutput, rolldown } from 'rolldown';
import { registryItemSchema, registrySchema } from 'shadcn/schema';
import { describe, expect, it } from 'vite-plus/test';

import { shadcnPlugin, vjscPlugin } from '..';
import type { ComponentMeta } from '../../components';
import type { ShadcnItem, ShadcnPluginOptions } from '../../shadcn';
import { parseModuleId } from '../../utils/module-id';

interface FixtureMeta extends ComponentMeta {
  readonly type: 'block' | 'component';
  readonly title: string;
  readonly description: string;
}

describe('shadcnPlugin', () => {
  it('auto-publishes metadata modules and derives graph dependencies', async () => {
    const root = setup({
      'components/root.tsx': `import { Public } from './public'; import { Private } from './private'; import { cn } from '../utils'; import value from 'private-package/subpath'; export interface RootProps { label: string; } export function Root(props: RootProps) { return <main>{props.label}{Public}{Private}{cn(value)}</main>; } ${meta('root', 'block')}`,
      'components/public.tsx': `export function Public() { return <span/>; } ${meta('public')}`,
      'components/private.tsx': `export function Private() { return <aside/>; }`,
      'styles.css': `@import './theme.css';\n@import 'tailwindcss';`,
      'theme.css': `.theme { color: red; }`,
      'utils.ts': `export const cn = (...values: unknown[]) => values.filter(Boolean).join(' ');`,
    });
    const output = await build(root);

    expect(output.output.map((item) => item.fileName).sort()).toEqual([
      'react/components/files/public/public.tsx',
      'react/components/files/root/internal/private.tsx',
      'react/components/files/root/root.tsx',
      'react/components/registry.json',
      'registry.json',
      'shared/files/styles/tailwind.css',
      'shared/files/styles/theme.css',
      'shared/files/utils/utils.ts',
      'shared/registry.json',
    ]);
    const manifest = assetJson(output, 'registry.json');
    const rootItem = registryItem(output, 'react/components', 'root');

    registrySchema.parse(manifest);

    for (const group of manifest.include) {
      const registry = assetJson(output, group.replace(/^\.\//, ''));

      for (const item of registry.items) registryItemSchema.parse(item);
    }

    expect(rootItem).toMatchObject({
      dependencies: ['private-package', 'react'],
      registryDependencies: ['@example/public', '@example/styles', '@example/utils'],
    });
    expect(rootItem.files.map((file: { target: string }) => file.target)).toEqual([
      'components/example/root/internal/root/private.tsx',
      'components/example/root/root.tsx',
    ]);
    const rootSource = registryFile(output, 'react/components', rootItem, '/root.tsx');

    expect(rootSource).toContain('interface RootProps');
    expect(rootSource).toContain('<main>');
    expect(rootSource).toContain(`from '@/components/example/public/public'`);
    expect(rootSource).toContain(`from '@/components/example/utils'`);
    expect(rootSource).not.toContain('const meta');
    expect(rootSource).not.toContain('jsx-runtime');
    expect(registryItem(output, 'shared', 'styles').files.map((file: { target: string }) => file.target)).toEqual([
      'components/example/styles/tailwind.css',
      'components/example/styles/theme.css',
    ]);
    expect(output.output.some((item) => item.type === 'chunk')).toBe(false);
  });

  it('rewrites relative imports when private dependencies move at installation', async () => {
    const root = setup({
      'components/nested/root.tsx': `import { Private } from '../private'; export function Root() { return <main>{Private}</main>; } ${meta('root', 'block')}`,
      'components/private.tsx': `export const Private = <aside/>;`,
    });
    const output = await build(root, { styles: undefined });
    const item = registryItem(output, 'react/components', 'root');
    const source = registryFile(output, 'react/components', item, '/root.tsx');

    expect(item.files.map((file: { target: string }) => file.target)).toEqual([
      'components/example/root/internal/root/components/private.tsx',
      'components/example/root/root.tsx',
    ]);
    expect(source).toContain(`from './internal/root/components/private'`);
  });

  it('owns type-only and dynamic relative imports without synthetic chunks', async () => {
    const root = setup({
      'components/root.tsx': `import type { Label } from './types'; export const load = () => import('./lazy'); export function Root({ label }: { label: Label }) { return <main>{label}</main>; } ${meta('root', 'block')}`,
      'components/types.ts': `import type { Lazy } from './lazy'; export type Label = string | typeof Lazy;`,
      'components/lazy.tsx': `export const Lazy = <aside/>;`,
    });
    const output = await build(root, { styles: undefined });
    const item = registryItem(output, 'react/components', 'root');

    expect(item.files.map((file: { target: string }) => file.target)).toEqual([
      'components/example/root/internal/root/lazy.tsx',
      'components/example/root/internal/root/types.ts',
      'components/example/root/root.tsx',
    ]);
    expect(output.output.filter((entry) => entry.type === 'chunk')).toEqual([]);
  });

  it('preserves unrelated application output', async () => {
    const root = setup({
      'app.ts': `export const app = 'retained';`,
      'components/root.tsx': `export function Root() { return <main/>; } ${meta('root', 'block')}`,
    });
    const output = await build(root, { styles: undefined }, ['vjsc', 'shadcn'], join(root, 'app.ts'));

    expect(output.output.filter((entry) => entry.type === 'chunk').map((entry) => entry.fileName)).toEqual(['app.js']);
    expect(output.output.find((entry) => entry.fileName === 'app.js')).toMatchObject({ type: 'chunk' });
    const item = registryItem(output, 'react/components', 'root');

    expect(registryFile(output, 'react/components', item, '/root.tsx')).toContain('<main/>');
  });

  it('keeps transformed module identities and dependencies transform-specific', async () => {
    const root = setup({
      'components/root.tsx': `import { Child } from './child'; export function Root() { return <main>{Child}</main>; } ${meta('root', 'block')}`,
      'components/child.tsx': `export const Child = <aside/>; ${meta('child')}`,
    });
    const publishModules = () => [
      { framework: 'react', skin: 'default' },
      { framework: 'react', skin: 'minimal' },
    ];
    const output = await build(
      root,
      {
        styles: undefined,
        publish: { ...baseOptions().publish, modules: publishModules },
      },
      ['vjsc', 'shadcn'],
      [],
      [
        {
          name: 'test:variant-source',
          transform(code, id) {
            const skin = parseModuleId(id).parameters.get('skin');

            return skin
              ? code.replace('<main>', `<main data-skin="${skin}">`).replace('<aside/>', `<aside data-skin="${skin}"/>`)
              : null;
          },
        },
      ]
    );

    const rootItem = registryItem(output, 'react/components', 'root');
    const minimal = registryItem(output, 'react/components', 'root-minimal');

    expect(rootItem.registryDependencies).toContain('@example/child');
    expect(minimal.registryDependencies).toContain('@example/child-minimal');
    expect(registryFile(output, 'react/components', rootItem, '/root.tsx')).toContain('data-skin="default"');
    expect(registryFile(output, 'react/components', minimal, '/root.tsx')).toContain('data-skin="minimal"');
    expect(registryFile(output, 'react/components', minimal, '/root.tsx')).toContain(
      `from '@/components/example/child-minimal/child'`
    );
  });

  it('rejects type dependencies missing the requested transformation', async () => {
    const root = setup({
      'components/root.tsx': `import type { Label } from './types'; export function Root({ label }: { label: Label }) { return <main>{label}</main>; } ${meta('root', 'block')}`,
      'components/types.ts': `export type Label = string;`,
    });
    const publishModules: FixtureOptions['publish']['modules'] = (module) =>
      basename(module.filename) === 'root.tsx' ? [{ framework: 'react', skin: 'minimal' }] : [];

    await expect(
      build(root, { styles: undefined, publish: { ...baseOptions().publish, modules: publishModules } })
    ).rejects.toThrow(/source dependency was not captured/);
  });

  it('rejects unsafe paths and duplicate item names', async () => {
    const unsafeRoot = setup({
      'components/root.tsx': `${meta('root', 'block')} export const Root = <main/>;`,
    });
    const root = setup({
      'components/first.tsx': `${meta('root', 'block')} export const First = <main/>;`,
      'components/second.tsx': `${meta('root', 'block')} export const Second = <main/>;`,
    });

    await expect(
      build(unsafeRoot, {
        styles: undefined,
        publish: {
          ...baseOptions().publish,
          items: (modules) =>
            baseOptions()
              .publish.items(modules)
              .map((item) => ({ ...item, group: '../registry' })),
        },
      })
    ).rejects.toThrow(/group must be a non-empty relative path/);
    await expect(build(root, { styles: undefined })).rejects.toThrow(/is described by both/);
  });

  it('reads VJSC metadata regardless of plugin declaration order', async () => {
    const root = setup({
      'components/root.tsx': `export function Root() { return <main/>; } ${meta('root', 'block')}`,
    });
    const output = await build(root, { styles: undefined }, ['shadcn', 'vjsc']);

    const item = registryItem(output, 'react/components', 'root');

    expect(registryFile(output, 'react/components', item, '/root.tsx')).toContain('<main/>');
  });

  it('clears discovered and captured source before a rebuild', async () => {
    const root = setup({
      'components/root.tsx': `${meta('root', 'block')} export const Root = <main>first</main>;`,
    });
    const plugin = shadcnPlugin({ root, ...baseOptions({ styles: undefined }) });
    const first = await build(root, { styles: undefined }, ['vjsc', plugin]);

    writeFileSync(
      join(root, 'components/root.tsx'),
      `${meta('root', 'block')} export const Root = <main>second</main>;`
    );
    const second = await build(root, { styles: undefined }, ['vjsc', plugin]);

    const firstItem = registryItem(first, 'react/components', 'root');
    const secondItem = registryItem(second, 'react/components', 'root');

    expect(registryFile(first, 'react/components', firstItem, '/root.tsx')).toContain('first');
    expect(registryFile(second, 'react/components', secondItem, '/root.tsx')).toContain('second');
    expect(registryFile(second, 'react/components', secondItem, '/root.tsx')).not.toContain('first');
  });

  it('combines source-owned items with transformed items', async () => {
    const root = setup({
      'components/root.tsx': `export function Root() { return <main/>; } ${meta('root', 'block')}`,
    });
    const output = await build(root, {
      styles: undefined,
      items: [
        {
          name: 'react-video',
          group: 'react/players',
          type: 'registry:block',
          title: 'Video player',
          description: 'A source-owned player composition.',
          dependencies: ['@videojs/react', 'react'],
          registryDependencies: ['@example/root'],
          files: [
            {
              content: `export { VideoPlayer } from '@videojs/react/video';\n`,
              target: 'players/video.tsx',
              type: 'registry:component',
            },
          ],
          meta: { role: 'player' },
        },
      ],
    });
    const player = registryItem(output, 'react/players', 'react-video');

    expect(player).toMatchObject({
      dependencies: ['@videojs/react', 'react'],
      registryDependencies: ['@example/root'],
      meta: { role: 'player' },
    });
    expect(registryFile(output, 'react/players', player, '/players/video.tsx')).toContain('VideoPlayer');
  });
});

type FixtureOptions = Omit<ShadcnPluginOptions<FixtureMeta>, 'root'>;
type PluginOrder = readonly ('vjsc' | 'shadcn' | ReturnType<typeof shadcnPlugin>)[];

async function build(
  root: string,
  overrides: Partial<FixtureOptions> = {},
  order: PluginOrder = ['vjsc', 'shadcn'],
  input: string | readonly string[] = [],
  additions: readonly Plugin[] = []
): Promise<RolldownOutput> {
  const options = baseOptions(overrides);
  const transform = vjscPlugin({
    configure: ({ parameters }) => (parameters.has('framework') ? { targets: [] } : null),
  });
  const output = shadcnPlugin({ root, ...options });
  const plugins = [
    ...order.flatMap((plugin) => (plugin === 'vjsc' ? transform : plugin === 'shadcn' ? output : plugin)),
    ...additions,
  ];
  const bundle = await rolldown({
    input: typeof input === 'string' ? input : [...input],
    experimental: { nativeMagicString: true },
    external: (id) => !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0'),
    plugins,
  });

  return bundle.generate({ format: 'es', entryFileNames: '[name].js' });
}

function baseOptions(overrides: Partial<FixtureOptions> = {}): FixtureOptions {
  return {
    include: ['./components/**/*.{ts,tsx}', './utils.ts'],
    name: 'example',
    homepage: 'https://example.com',
    namespace: '@example',
    paths: {
      install: 'components/example',
      import: '@/components/example',
    },
    imports: { '@/source/utils': '@/components/example/utils' },
    meta: { framework: 'react', style: 'tailwind' },
    publish: {
      items: (modules) =>
        modules.flatMap<ShadcnItem<FixtureMeta>>((module) => {
          const { filename, meta: itemMeta, transform } = module;

          if (basename(filename) === 'utils.ts') {
            return [
              {
                module,
                name: 'utils',
                group: 'shared',
                type: 'registry:lib',
                title: 'Utilities',
                description: 'Shared utilities.',
                filename: 'utils.ts',
                target: 'utils.ts',
              },
            ];
          }

          if (!itemMeta) return [];

          const skin = transform.skin;
          const name = skin && skin !== 'default' ? `${itemMeta.name}-${skin}` : itemMeta.name;

          return [
            {
              module,
              name,
              group: 'react/components',
              type: itemMeta.type === 'block' ? 'registry:block' : 'registry:component',
              title: itemMeta.title,
              description: itemMeta.description,
              target: `${name}/${basename(filename)}`,
            },
          ];
        }),
    },
    styles: {
      input: './styles.css',
      filename: 'tailwind.css',
      group: 'shared',
      target: 'styles/tailwind.css',
    },
    ...overrides,
  };
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
