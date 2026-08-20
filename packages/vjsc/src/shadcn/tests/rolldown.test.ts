import { globSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { type RolldownOutput, rolldown } from 'rolldown';
import { registryItemSchema, registrySchema } from 'shadcn/schema';
import { describe, expect, it } from 'vitest';

import { type ComponentMeta, componentMetaPlugin } from '../../components';
import { shadcnPlugin, vjscPlugin } from '../../rolldown';
import { jsx } from '../../ts/types';
import type { ShadcnRegistryDefinition } from '../index';

interface FixtureMeta extends ComponentMeta {
  readonly name: string;
  readonly type: 'block' | 'component';
  readonly title: string;
  readonly description: string;
}

describe('shadcnPlugin', () => {
  it('emits editable registry assets from the transformed host graph', async () => {
    const root = setup({
      'app.ts': `export const app = 'unrelated';`,
      'components/root.tsx': `import { Public } from './public'; import { Private } from './private'; import { cn } from '@/source/utils'; import value from 'private-package/subpath'; export interface RootProps { label: string; } export function Root(props: RootProps) { return <main>{props.label}{Public}{Private}{cn(value)}</main>; } ${meta('root', 'block')}`,
      'components/public.tsx': `export function Public() { return <span/>; } ${meta('public')}`,
      'components/private.tsx': `export function Private() { return <aside/>; } ${meta('private')}`,
      'styles.css': `@import 'tailwindcss';`,
      'utils.ts': `export const cn = (...values: unknown[]) => values.filter(Boolean).join(' ');`,
    });
    const output = await build(root, registry(), ['vjsc', 'shadcn']);

    expect(output.output.map((item) => item.fileName).sort()).toEqual([
      'public.json',
      'registry.json',
      'root.json',
      'styles.json',
      'utils.json',
    ]);
    const manifest = assetJson(output, 'registry.json');
    const rootItem = assetJson(output, 'root.json');
    const publicItem = assetJson(output, 'public.json');
    registrySchema.parse(manifest);
    for (const item of output.output) {
      if (item.type !== 'asset' || item.fileName === 'registry.json') continue;
      registryItemSchema.parse(JSON.parse(String(item.source)));
    }

    expect(rootItem).toMatchObject({
      dependencies: ['private-package'],
      registryDependencies: ['@example/public', '@example/styles', '@example/utils'],
      meta: { framework: 'react', style: 'tailwind' },
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
    expect(publicItem.registryDependencies).toEqual(['@example/styles']);
    expect(output.output.some((item) => item.type === 'chunk')).toBe(false);
  });

  it('rewrites relative imports when private dependencies move at installation', async () => {
    const root = setup({
      'app.ts': `export const app = true;`,
      'components/nested/root.tsx': `import { Private } from '../private'; export function Root() { return <main>{Private}</main>; } ${meta('root', 'block')}`,
      'components/private.tsx': `export const Private = <aside/>; ${meta('private')}`,
    });
    const output = await build(root, registry({ published: ['root'], shared: [] }));
    const item = assetJson(output, 'root.json');
    const source = item.files.find((file: { target: string }) => file.target.endsWith('/root.tsx')).content;

    expect(item.files.map((file: { target: string }) => file.target)).toEqual([
      'components/example/root/internal/components/private.tsx',
      'components/example/root/root.tsx',
    ]);
    expect(source).toContain(`from './internal/components/private'`);
  });

  it('owns type-only and dynamic relative imports without emitting trigger chunks', async () => {
    const root = setup({
      'app.ts': `export const app = true;`,
      'components/root.tsx': `import type { Label } from './types'; export const load = () => import('./lazy'); export function Root({ label }: { label: Label }) { return <main>{label}</main>; } ${meta('root', 'block')}`,
      'components/types.ts': `import type { Lazy } from './lazy'; export type Label = string | typeof Lazy;`,
      'components/lazy.tsx': `export const Lazy = <aside/>;`,
    });
    const output = await build(root, registry({ published: ['root'], shared: [] }));
    const item = assetJson(output, 'root.json');

    expect(item.files.map((file: { target: string }) => file.target)).toEqual([
      'components/example/root/lazy.tsx',
      'components/example/root/root.tsx',
      'components/example/root/types.ts',
    ]);
    expect(output.output.filter((entry) => entry.type === 'chunk')).toEqual([]);
  });

  it('captures cyclic source modules without recursively loading from transform hooks', async () => {
    const root = setup({
      'app.ts': `export const app = true;`,
      'components/root.tsx': `import type { A } from './a'; export function Root({ value }: { value: A }) { return <main>{value}</main>; } ${meta('root', 'block')}`,
      'components/a.ts': `import type { B } from './b'; export type A = B;`,
      'components/b.ts': `import type { A } from './a'; export type B = string | A;`,
    });
    const output = await build(root, registry({ published: ['root'], shared: [] }));
    const item = assetJson(output, 'root.json');

    expect(item.files.map((file: { target: string }) => file.target)).toEqual([
      'components/example/root/a.ts',
      'components/example/root/b.ts',
      'components/example/root/root.tsx',
    ]);
  });

  it('rejects source dependencies omitted from the build entries', async () => {
    const root = setup({
      'components/root.tsx': `import type { Label } from './types'; export function Root({ label }: { label: Label }) { return <main>{label}</main>; } ${meta('root', 'block')}`,
      'components/types.ts': `export type Label = string;`,
    });

    await expect(
      build(root, registry({ published: ['root'], shared: [] }), ['vjsc', 'shadcn'], ['components/root.tsx'])
    ).rejects.toThrow(/source dependency was not transformed by VJSC/);
  });

  it('rejects unsafe paths and registry file collisions', async () => {
    const root = setup({
      'app.ts': `export const app = true;`,
      'components/root.tsx': `${meta('root', 'block')} export const Root = <main/>;`,
      'first.css': '.first{}',
      'second.css': '.second{}',
    });
    const definition = registry({ published: ['root'], shared: [] });
    const unsafe = { ...definition, paths: { ...definition.paths, output: '../registry' } };
    await expect(build(root, unsafe)).rejects.toThrow(/output path must be a non-empty relative path/);
    const embeddedTraversal = { ...definition, paths: { ...definition.paths, output: 'safe/../../registry' } };
    await expect(build(root, embeddedTraversal)).rejects.toThrow(/output path must be a non-empty relative path/);

    const collision = registry({
      published: ['root'],
      shared: [
        {
          name: 'styles',
          type: 'registry:style',
          title: 'Styles',
          description: 'Styles.',
          files: [
            { source: './first.css', path: 'styles.css' },
            { source: './second.css', path: 'styles.css' },
          ],
        },
      ],
    });
    await expect(build(root, collision)).rejects.toThrow(/source collision/);
  });

  it('reads completed VJSC metadata regardless of plugin declaration order', async () => {
    const root = setup({
      'app.ts': `export const app = true;`,
      'components/root.tsx': `export function Root() { return <main/>; } ${meta('root', 'block')}`,
    });

    const output = await build(root, registry({ published: ['root'], shared: [] }), ['shadcn', 'vjsc']);

    expect(assetJson(output, 'root.json').files[0].content).toContain('<main />');
  });

  it('rejects missing metadata, duplicate names, and missing published items', async () => {
    const missingMeta = setup({
      'app.ts': `export const app = true;`,
      'components/root.tsx': `export function Root() { return <main/>; }`,
    });
    await expect(build(missingMeta, registry({ published: ['root'], shared: [] }))).rejects.toThrow(
      /missing component `root`/
    );

    const duplicate = setup({
      'app.ts': `export const app = true;`,
      'components/first.tsx': `${meta('root', 'block')} export const First = <main/>;`,
      'components/second.tsx': `${meta('root', 'block')} export const Second = <main/>;`,
    });
    await expect(build(duplicate, registry({ published: ['root'], shared: [] }))).rejects.toThrow(
      /Component `root` is declared by both/
    );

    const missingPublished = setup({
      'app.ts': `export const app = true;`,
      'components/root.tsx': `${meta('root', 'block')} export const Root = <main/>;`,
    });
    await expect(build(missingPublished, registry({ published: ['missing'], shared: [] }))).rejects.toThrow(
      /missing component `missing`/
    );
  });

  it('clears captured source before a rebuild', async () => {
    const root = setup({
      'app.ts': `export const app = true;`,
      'components/root.tsx': `${meta('root', 'block')} export const Root = <main>first</main>;`,
    });
    const definition = registry({ published: ['root'], shared: [] });
    const outputPlugin = shadcnPlugin({
      root,
      registry: definition,
    });
    const first = await build(root, definition, ['vjsc', outputPlugin]);
    writeFileSync(
      join(root, 'components/root.tsx'),
      `${meta('root', 'block')} export const Root = <main>second</main>;`
    );
    const second = await build(root, definition, ['vjsc', outputPlugin]);

    expect(JSON.stringify(assetJson(first, 'root.json'))).toContain('first');
    expect(JSON.stringify(assetJson(second, 'root.json'))).toContain('second');
    expect(JSON.stringify(assetJson(second, 'root.json'))).not.toContain('first');
  });
});

type PluginOrder = readonly ('vjsc' | 'shadcn' | ReturnType<typeof shadcnPlugin>)[];

async function build(
  root: string,
  definition: ShadcnRegistryDefinition<FixtureMeta>,
  order: PluginOrder = ['vjsc', 'shadcn'],
  entries = globSync('components/**/*.{ts,tsx}', { cwd: root })
): Promise<RolldownOutput> {
  const transform = vjscPlugin({
    include: /\.[cm]?[jt]sx?$/,
    transform: { target: jsx({ importSource: 'react' }), plugins: [componentMetaPlugin()] },
  });
  const output = shadcnPlugin({
    root,
    registry: definition,
  });
  const plugins = order.map((plugin) => (plugin === 'vjsc' ? transform : plugin === 'shadcn' ? output : plugin));
  const bundle = await rolldown({
    input: entries.map((fileName) => join(root, fileName)),
    external: (id) => !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0'),
    plugins,
  });
  return bundle.generate({ format: 'es', entryFileNames: '[name].js' });
}

function registry(
  overrides: { published?: readonly string[]; shared?: ShadcnRegistryDefinition<FixtureMeta>['items']['shared'] } = {}
): ShadcnRegistryDefinition<FixtureMeta> {
  return {
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
    items: {
      published: overrides.published ?? ['root', 'public'],
      describe: (item) => ({
        type: item.type === 'block' ? 'registry:block' : 'registry:component',
        title: item.title,
        description: item.description,
      }),
      shared: overrides.shared ?? [
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
          dependencies: ['clsx'],
          requiredBy: { imports: ['@/components/example/utils'] },
          files: [{ source: './utils.ts', path: 'utils.ts' }],
        },
      ],
    },
  };
}

function meta(name: string, type: FixtureMeta['type'] = 'component'): string {
  return `export const meta = { name: '${name}', type: '${type}', title: '${name}', description: '${name}.' } as const;`;
}

function setup(files: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), 'vjsc-shadcn-'));
  for (const [fileName, source] of Object.entries(files)) {
    const path = join(root, fileName);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source);
  }
  return root;
}

function assetJson(output: RolldownOutput, fileName: string): any {
  const asset = output.output.find((item) => item.type === 'asset' && item.fileName === fileName);
  if (asset?.type !== 'asset') throw new Error(`Missing asset: ${fileName}`);
  return JSON.parse(String(asset.source));
}
