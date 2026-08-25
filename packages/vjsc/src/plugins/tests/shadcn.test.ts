import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { type RolldownOutput, rolldown } from 'rolldown';
import { registryItemSchema, registrySchema } from 'shadcn/schema';
import { describe, expect, it } from 'vite-plus/test';

import { shadcnPlugin, vjscPlugin } from '..';
import type { ComponentMeta } from '../../components';
import type { ShadcnItem, ShadcnPluginOptions } from '../../shadcn';

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
      'public.json',
      'registry.json',
      'root.json',
      'styles.json',
      'utils.json',
    ]);
    const manifest = assetJson(output, 'registry.json');
    const rootItem = assetJson(output, 'root.json');

    registrySchema.parse(manifest);

    for (const outputItem of output.output) {
      if (outputItem.type !== 'asset' || outputItem.fileName === 'registry.json') continue;

      registryItemSchema.parse(JSON.parse(String(outputItem.source)));
    }

    expect(rootItem).toMatchObject({
      dependencies: ['private-package', 'react'],
      registryDependencies: ['@example/public', '@example/styles', '@example/utils'],
    });
    expect(rootItem.files.map((file: { target: string }) => file.target)).toEqual([
      'components/example/root/private.tsx',
      'components/example/root/root.tsx',
    ]);
    const rootSource = rootItem.files.find((file: { target: string }) => file.target.endsWith('/root.tsx')).content;

    expect(rootSource).toContain('interface RootProps');
    expect(rootSource).toContain('<main>');
    expect(rootSource).toContain(`from '@/components/example/public/public'`);
    expect(rootSource).toContain(`from '@/components/example/utils'`);
    expect(rootSource).not.toContain('const meta');
    expect(rootSource).not.toContain('jsx-runtime');
    expect(assetJson(output, 'styles.json').files.map((file: { target: string }) => file.target)).toEqual([
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
    const item = assetJson(output, 'root.json');
    const source = item.files.find((file: { target: string }) => file.target.endsWith('/root.tsx')).content;

    expect(item.files.map((file: { target: string }) => file.target)).toEqual([
      'components/example/root/internal/components/private.tsx',
      'components/example/root/root.tsx',
    ]);
    expect(source).toContain(`from './internal/components/private'`);
  });

  it('owns type-only and dynamic relative imports without synthetic chunks', async () => {
    const root = setup({
      'components/root.tsx': `import type { Label } from './types'; export const load = () => import('./lazy'); export function Root({ label }: { label: Label }) { return <main>{label}</main>; } ${meta('root', 'block')}`,
      'components/types.ts': `import type { Lazy } from './lazy'; export type Label = string | typeof Lazy;`,
      'components/lazy.tsx': `export const Lazy = <aside/>;`,
    });
    const output = await build(root, { styles: undefined });
    const item = assetJson(output, 'root.json');

    expect(item.files.map((file: { target: string }) => file.target)).toEqual([
      'components/example/root/lazy.tsx',
      'components/example/root/root.tsx',
      'components/example/root/types.ts',
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
    expect(assetJson(output, 'root.json').files[0].content).toContain('<main/>');
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
    const output = await build(root, {
      styles: undefined,
      publish: { ...baseOptions().publish, modules: publishModules },
    });

    expect(assetJson(output, 'root.json').registryDependencies).toContain('@example/child');
    expect(assetJson(output, 'root-minimal.json').registryDependencies).toContain('@example/child-minimal');
    expect(assetJson(output, 'root-minimal.json').files[0].content).toContain(
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
    const root = setup({
      'components/first.tsx': `${meta('root', 'block')} export const First = <main/>;`,
      'components/second.tsx': `${meta('root', 'block')} export const Second = <main/>;`,
    });

    await expect(
      build(root, { paths: { ...baseOptions().paths, output: '../registry' }, styles: undefined })
    ).rejects.toThrow(/output path must be a non-empty relative path/);
    await expect(build(root, { styles: undefined })).rejects.toThrow(/is described by both/);
  });

  it('reads VJSC metadata regardless of plugin declaration order', async () => {
    const root = setup({
      'components/root.tsx': `export function Root() { return <main/>; } ${meta('root', 'block')}`,
    });
    const output = await build(root, { styles: undefined }, ['shadcn', 'vjsc']);

    expect(assetJson(output, 'root.json').files[0].content).toContain('<main/>');
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

    expect(JSON.stringify(assetJson(first, 'root.json'))).toContain('first');
    expect(JSON.stringify(assetJson(second, 'root.json'))).toContain('second');
    expect(JSON.stringify(assetJson(second, 'root.json'))).not.toContain('first');
  });
});

type FixtureOptions = Omit<ShadcnPluginOptions<FixtureMeta>, 'root'>;
type PluginOrder = readonly ('vjsc' | 'shadcn' | ReturnType<typeof shadcnPlugin>)[];

async function build(
  root: string,
  overrides: Partial<FixtureOptions> = {},
  order: PluginOrder = ['vjsc', 'shadcn'],
  input: string | readonly string[] = []
): Promise<RolldownOutput> {
  const options = baseOptions(overrides);
  const transform = vjscPlugin({
    configure: ({ parameters }) => (parameters.has('framework') ? { targets: [] } : null),
  });
  const output = shadcnPlugin({ root, ...options });
  const plugins = order.flatMap((plugin) => (plugin === 'vjsc' ? transform : plugin === 'shadcn' ? output : plugin));
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
      output: 'registry/source',
      source: 'source',
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
                type: 'registry:lib',
                title: 'Utilities',
                description: 'Shared utilities.',
                filename: 'utils.ts',
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
              type: itemMeta.type === 'block' ? 'registry:block' : 'registry:component',
              title: itemMeta.title,
              description: itemMeta.description,
            },
          ];
        }),
    },
    styles: { input: './styles.css', filename: 'tailwind.css' },
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
