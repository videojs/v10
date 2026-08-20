import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { type RolldownOutput, rolldown } from 'rolldown';
import { registryItemSchema, registrySchema } from 'shadcn/schema';
import { describe, expect, it } from 'vitest';

import { componentMetaPlugin } from '../../components';
import { jsx } from '../../config';
import { shadcnPlugin, vjscPlugin } from '../../rolldown';
import type { ShadcnRegistryDefinition } from '../../shadcn';

interface FixtureMeta {
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
      'app.js',
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
    for (const item of output.output.filter((entry) => entry.type === 'asset' && entry.fileName !== 'registry.json')) {
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
    expect(output.output.find((item) => item.fileName === 'app.js')).toMatchObject({ type: 'chunk' });
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

  it('fails when ordered before VJSC source transformation', async () => {
    const root = setup({
      'app.ts': `export const app = true;`,
      'components/root.tsx': `export function Root() { return <main/>; } ${meta('root', 'block')}`,
    });

    await expect(build(root, registry({ published: ['root'], shared: [] }), ['shadcn', 'vjsc'])).rejects.toThrow(
      /Place shadcnPlugin after vjscPlugin/
    );
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
      /Component `root` is declared more than once/
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
      include: './components/**/*.tsx',
      query: { framework: 'react', style: 'tailwind' },
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
  order: PluginOrder = ['vjsc', 'shadcn']
): Promise<RolldownOutput> {
  const transform = vjscPlugin({
    transform: ({ parameters }) =>
      parameters.get('framework') === 'react'
        ? { target: jsx({ importSource: 'react' }), plugins: [componentMetaPlugin()] }
        : null,
  });
  const output = shadcnPlugin({
    root,
    include: './components/**/*.tsx',
    query: { framework: 'react', style: 'tailwind' },
    registry: definition,
  });
  const plugins = order.map((plugin) => (plugin === 'vjsc' ? transform : plugin === 'shadcn' ? output : plugin));
  const bundle = await rolldown({
    input: join(root, 'app.ts'),
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
